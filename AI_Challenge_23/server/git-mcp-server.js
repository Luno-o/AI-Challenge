// server/git-mcp-server.js
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const REPO_PATH = process.env.REPO_PATH || process.cwd();

// ✅ Windows-совместимая функция выполнения Git команд
function runGitCommand(command, options = {}) {
  try {
    const fullCommand = `git ${command}`;
    const result = execSync(fullCommand, {
      cwd: REPO_PATH,
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
      // ✅ Исправление для Windows: используем cmd.exe вместо bash
      shell: process.platform === 'win32' ? 'cmd.exe' : '/bin/bash',
      ...options,
    });
    return result.trim();
  } catch (error) {
    throw new Error(`Git command failed: ${error.message}`);
  }
}

const server = new Server(
  {
    name: 'git-mcp-server',
    version: '1.2.0', // ✅ Обновили версию
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tools definitions
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'get_current_branch',
      description: 'Get the current Git branch name',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'get_git_status',
      description: 'Get Git status (modified, staged, untracked files)',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'get_recent_commits',
      description: 'Get recent Git commits',
      inputSchema: {
        type: 'object',
        properties: {
          count: {
            type: 'number',
            description: 'Number of commits to retrieve (default: 10)',
            default: 10,
          },
        },
      },
    },
    {
      name: 'get_file_content',
      description: 'Get content of a file from the repository',
      inputSchema: {
        type: 'object',
        properties: {
          file_path: {
            type: 'string',
            description: 'Relative path to file from repository root',
          },
        },
        required: ['file_path'],
      },
    },
    {
      name: 'search_in_repo',
      description: 'Search for text pattern in repository using git grep',
      inputSchema: {
        type: 'object',
        properties: {
          pattern: {
            type: 'string',
            description: 'Search pattern (regex supported)',
          },
          file_pattern: {
            type: 'string',
            description: 'File pattern to limit search (e.g., "*.js")',
          },
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
          depth: {
            type: 'number',
            description: 'Maximum depth of tree (default: 3)',
            default: 3,
          },
        },
      },
    },
  ],
}));

// Tool handlers
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'get_current_branch': {
        const branch = runGitCommand('branch --show-current');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ branch }),
            },
          ],
        };
      }

      case 'get_git_status': {
        const statusOutput = runGitCommand('status --porcelain');
        const lines = statusOutput.split('\n').filter(Boolean);

        const status = {
          modified: [],
          staged: [],
          untracked: [],
          branch: runGitCommand('branch --show-current'),
        };

        lines.forEach((line) => {
          const statusCode = line.substring(0, 2);
          const filePath = line.substring(3);

          if (statusCode[0] === 'M' || statusCode[1] === 'M') {
            status.modified.push(filePath);
          }
          if (statusCode[0] !== ' ' && statusCode[0] !== '?') {
            status.staged.push(filePath);
          }
          if (statusCode === '??') {
            status.untracked.push(filePath);
          }
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(status, null, 2),
            },
          ],
        };
      }

      case 'get_recent_commits': {
        const count = args?.count || 10;
        const format = '--pretty=format:{"hash":"%H","author":"%an","date":"%ad","message":"%s"},';
        const commits = runGitCommand(`log -${count} ${format} --date=iso`);
        
        // Parse JSON (remove trailing comma and wrap in array)
        const commitsArray = JSON.parse(`[${commits.slice(0, -1)}]`);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(commitsArray, null, 2),
            },
          ],
        };
      }

      case 'get_file_content': {
        const filePath = args?.file_path;
        if (!filePath) throw new Error('file_path is required');

        const fullPath = join(REPO_PATH, filePath);
        if (!existsSync(fullPath)) {
          throw new Error(`File not found: ${filePath}`);
        }

        const content = readFileSync(fullPath, 'utf-8');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                file_path: filePath,
                content,
                lines: content.split('\n').length,
              }),
            },
          ],
        };
      }

      case 'search_in_repo': {
        const pattern = args?.pattern;
        if (!pattern) throw new Error('pattern is required');

        const filePattern = args?.file_pattern || '';
        const grepCmd = `grep -n "${pattern}" ${filePattern}`;
        
        let results;
        try {
          results = runGitCommand(grepCmd);
        } catch {
          results = ''; // No matches found
        }

        const matches = results
          .split('\n')
          .filter(Boolean)
          .map((line) => {
            const [file, lineNum, ...textParts] = line.split(':');
            return {
              file,
              line: parseInt(lineNum, 10),
              text: textParts.join(':'),
            };
          });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                pattern,
                matches_count: matches.length,
                matches: matches.slice(0, 50), // Limit results
              }),
            },
          ],
        };
      }

      case 'get_repo_structure': {
        const depth = args?.depth || 3;
        
        // ✅ Windows-совместимая команда tree
        let tree;
        if (process.platform === 'win32') {
          // Windows: использовать dir или git ls-tree
          tree = runGitCommand('ls-tree -r --name-only HEAD');
        } else {
          // Linux/Mac: использовать tree или ls-tree
          try {
            tree = execSync(`tree -L ${depth}`, {
              cwd: REPO_PATH,
              encoding: 'utf-8',
            });
          } catch {
            tree = runGitCommand('ls-tree -r --name-only HEAD');
          }
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ structure: tree }),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: error.message,
            tool: name,
          }),
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Git MCP Server v1.2.0 running on stdio (Windows-compatible)');
}

main().catch((error) => {
  console.error('Git MCP Server error:', error);
  process.exit(1);
});
