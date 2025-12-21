import { spawn } from 'node:child_process';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/transport/stdio.js';
import { McpClient } from '@modelcontextprotocol/sdk/client/mcp.js';

let cachedClient: McpClient | null = null;

export async function getGithubMcpClient(): Promise<McpClient> {
  if (cachedClient) return cachedClient;

  const command = process.env.GITHUB_MCP_COMMAND || 'node';
  const args = (process.env.GITHUB_MCP_ARGS || '')
    .split(' ')
    .filter(Boolean);

  const child = spawn(command, args, {
    stdio: ['pipe', 'pipe', 'inherit'],
    env: {
      ...process.env,
      GH_TOKEN: process.env.GITHUB_MCP_GH_TOKEN!,
      GH_DEFAULT_OWNER: process.env.GITHUB_MCP_DEFAULT_OWNER,
      GH_DEFAULT_REPO: process.env.GITHUB_MCP_DEFAULT_REPO,
      GH_ALLOWED_REPOS: process.env.GITHUB_MCP_ALLOWED_REPOS,
      GH_ALLOWED_TOOLS: process.env.GITHUB_MCP_ALLOWED_TOOLS,
    },
  });

  const transport = new StdioClientTransport({
    input: child.stdout!,
    output: child.stdin!,
  });

  const client = new McpClient(transport);
  await client.connect();

  cachedClient = client;
  return client;
}
