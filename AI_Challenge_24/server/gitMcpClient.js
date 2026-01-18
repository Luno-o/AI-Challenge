import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Загружаем .env
dotenv.config({ path: path.join(__dirname, '.env') });

let serverProcess = null;
let messageId = 0;
let pendingRequests = new Map();

export async function initGitMcpClient() {
  if (serverProcess) return true;

  try {
    const serverPath = path.join(__dirname, 'git-mcp-server.js');
    console.log('🔧 Git MCP server:', serverPath);

    // ✅ Читаем REPO_PATH из .env
    const repoPath = process.env.REPO_PATH || '/mnt/d/AI-Challenge';
    console.log('📂 REPO_PATH:', repoPath);

    serverProcess = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, REPO_PATH: repoPath }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error('Git MCP:', data.toString().trim());
    });

    serverProcess.on('error', (err) => {
      console.error('❌ Git MCP spawn error:', err);
    });

    serverProcess.on('exit', (code) => {
      console.warn(`⚠️ Git MCP process exited with code ${code}`);
      serverProcess = null;
    });

    // ✅ Читаем ответы построчно
    const readline = createInterface({
      input: serverProcess.stdout,
      crlfDelay: Infinity
    });

    readline.on('line', (line) => {
      try {
        const response = JSON.parse(line);
        const id = response.id;

        if (pendingRequests.has(id)) {
          const { resolve, reject } = pendingRequests.get(id);
          pendingRequests.delete(id);

          if (response.error) {
            reject(new Error(response.error.message || 'Unknown error'));
          } else {
            resolve(response.result);
          }
        }
      } catch (err) {
        console.error('Git MCP parse error:', err.message);
      }
    });

    console.log('✅ Git MCP connected');

    // Тест
    const test = await callGitTool('get_current_branch');
    console.log('🧪 Git test:', test);

    return true;
  } catch (error) {
    console.error('❌ Git MCP error:', error.message);
    throw error;
  }
}

export async function callGitTool(toolName, args = {}) {
  try {
    if (!serverProcess) await initGitMcpClient();

    const id = ++messageId;
    const request = {
      jsonrpc: '2.0',
      id,
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args
      }
    };

    // ✅ Отправляем JSON-RPC запрос
    return new Promise((resolve, reject) => {
      pendingRequests.set(id, { resolve, reject });
      serverProcess.stdin.write(JSON.stringify(request) + '\n');

      // Timeout
      setTimeout(() => {
        if (pendingRequests.has(id)) {
          pendingRequests.delete(id);
          reject(new Error(`Timeout waiting for ${toolName}`));
        }
      }, 30000);
    }).then(result => {
      // ✅ Парсим content
      const text = result.content?.[0]?.text;
      return text ? JSON.parse(text) : { success: false, error: 'No response' };
    });
  } catch (error) {
    console.error(`Git tool error (${toolName}):`, error.message);
    return { success: false, error: error.message };
  }
}

export async function closeGitMcpClient() {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
    console.log('✅ Git MCP closed');
  }
}

// Graceful shutdown
process.on('exit', closeGitMcpClient);
process.on('SIGINT', closeGitMcpClient);
process.on('SIGTERM', closeGitMcpClient);
