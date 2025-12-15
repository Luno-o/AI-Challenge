// server/mcpClient.js
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

let clientPromise = null;

async function createClient() {
const transport = new StdioClientTransport({
  command: 'docker',
  args: [
    'run',
    '-i',
    '--rm',
    '-e',
    `GITHUB_PERSONAL_ACCESS_TOKEN=${process.env.GITHUB_TOKEN}`,
    'ghcr.io/github/github-mcp-server',
  ],
});


  const client = new Client({
    name: 'perplexity-node-chat',
    version: '1.0.0',
  });

  await client.connect(transport);

  const listResult = await client.listTools();
// В SDK обычно { tools: [{ name, description, ... }, ...] }
const tools = listResult.tools || [];

console.log('GitHub MCP tools:');
for (const tool of tools) {
  console.log(`- ${tool.name}${tool.description ? ` — ${tool.description}` : ''}`);
}

  return client;
}

export async function getMcpClient() {
  if (!clientPromise) {
    clientPromise = createClient().catch(err => {
      clientPromise = null;
      throw err;
    });
  }
  return clientPromise;
}

// Универсальный вызов любого GitHub‑инструмента
export async function callGithubTool(toolName, args = {}) {
  const client = await getMcpClient();

  const result = await client.callTool({
    name: toolName,   // например "get_file_contents" [web:32]
    arguments: args,  // { owner, repo, path, ref, ... }
  });

  return result;
}
