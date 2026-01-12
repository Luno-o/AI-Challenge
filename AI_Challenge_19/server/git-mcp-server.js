#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Загружаем .env
dotenv.config({ path: resolve(__dirname, '.env') });

const REPO_PATH = process.env.REPO_PATH || 'D:\\perplexity-chat';

function executeGitCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    const git = spawn(command, args, {  // ← Объект, не массив!
      cwd: REPO_PATH,
      shell: true
    });

    let stdout = '';
    let stderr = '';

    git.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    git.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    git.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Command failed: ${command} ${args.join(' ')}\n${stderr}`));
      } else {
        resolve(stdout.trim());
      }
    });

    git.on('error', (err) => {
      reject(err);
    });
  });
}


const server = new Server(
  {
    name: 'git-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

function runGit(args) {
  try {
    const result = execSync(`git ${args}`, {
      cwd: REPO_PATH,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true  // ← для Windows
    });
    
    const output = result.trim();
    console.error(`✅ git ${args}: ${output}`);  // stderr для отладки (не мешает stdio)
    
    return { 
      success: true, 
      output: output || '(empty)' 
    };
  } catch (error) {
    console.error(`❌ git ${args} error:`, error.message);
    return { 
      success: false, 
      error: error.message, 
      stderr: error.stderr?.toString() || ''
    };
  }
}


// Tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'get_current_branch',
      description: 'Get current git branch name',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'get_git_status',
      description: 'Get git status (modified, staged, untracked files)',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'get_recent_commits',
      description: 'Get recent commit history',
      inputSchema: {
        type: 'object',
        properties: {
          count: { type: 'number', description: 'Number of commits to fetch', default: 5 }
        },
      },
    },
    {
      name: 'get_file_content',
      description: 'Read file content from repository',
      inputSchema: {
        type: 'object',
        properties: {
          file_path: { type: 'string', description: 'Relative path to file' }
        },
        required: ['file_path'],
      },
    },
    {
      name: 'search_in_repo',
      description: 'Search for text pattern in repository (git grep)',
      inputSchema: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: 'Search pattern (regex)' },
          file_pattern: { type: 'string', description: 'File pattern (e.g., "*.js")', default: '*' }
        },
        required: ['pattern'],
      },
    },
    {
      name: 'get_repo_structure',
      description: 'Get repository file tree structure',
      inputSchema: {
        type: 'object',
        properties: {
          depth: { type: 'number', description: 'Max depth', default: 3 }
        },
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'get_current_branch': {
      const result = runGit('branch --show-current');
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }

    case 'get_git_status': {
      const result = runGit('status --short');
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }

    case 'get_recent_commits': {
      const count = args.count || 5;
      const result = runGit(`log --oneline -n ${count}`);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }

    case 'get_file_content': {
      try {
        const filePath = path.join(REPO_PATH, args.file_path);
        if (!fs.existsSync(filePath)) {
          return {
            content: [{ type: 'text', text: JSON.stringify({ success: false, error: 'File not found' }) }],
          };
        }
        const content = fs.readFileSync(filePath, 'utf-8');
        return {
          content: [{ type: 'text', text: JSON.stringify({ success: true, file_path: args.file_path, content }) }],
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ success: false, error: error.message }) }],
        };
      }
    }

    case 'search_in_repo': {
      const pattern = args.pattern;
      const filePattern = args.file_pattern || '*';
      const result = runGit(`grep -n "${pattern}" -- "${filePattern}"`);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }

    case 'get_repo_structure': {
      const depth = args.depth || 3;
      const result = runGit(`ls-tree -r --name-only HEAD`);
      if (result.success) {
        const files = result.output.split('\n').filter(f => f.trim());
        const tree = buildTree(files, depth);
        return {
          content: [{ type: 'text', text: JSON.stringify({ success: true, tree }, null, 2) }],
        };
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Построение дерева файлов (упрощённо)
function buildTree(files, maxDepth) {
  const tree = {};
  files.forEach(file => {
    const parts = file.split('/');
    if (parts.length > maxDepth) return;
    let current = tree;
    parts.forEach((part, i) => {
      if (i === parts.length - 1) {
        current[part] = 'file';
      } else {
        current[part] = current[part] || {};
        current = current[part];
      }
    });
  });
  return tree;
}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Git MCP Server running on stdio');
}

main().catch(console.error);
