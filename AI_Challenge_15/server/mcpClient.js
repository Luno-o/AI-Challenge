import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

// ===== TASK MCP CLIENT =====
let taskClient = null;

export async function getTaskMcpClient() {
  if (taskClient) return taskClient;
  const transport = new StdioClientTransport({
    command: "node",
    args: ["task-mcp-server.js"],
    env: { ...process.env }
  });
  taskClient = new Client(
    { name: "task-client", version: "1.0.0" },
    { capabilities: {} }
  );
  await taskClient.connect(transport);
  console.log("✅ Task MCP Client connected");
  return taskClient;
}

export async function callTaskTool(toolName, params = {}) {
  const client = await getTaskMcpClient();
  console.log(`🔧 Calling task tool: ${toolName}`);
  const result = await client.callTool({
    name: toolName,
    arguments: JSON.parse(JSON.stringify(params || {}))
  });
  if (result?.content?.[0]?.type === "text") {
    try {
      return JSON.parse(result.content[0].text);
    } catch {
      return { result: result.content[0].text };
    }
  }
  return result;
}

export async function listTaskTools() {
  const client = await getTaskMcpClient();
  const result = await client.listTools();
  return result.tools || [];
}

// ===== GITHUB MCP CLIENT =====
let githubClient = null;

export async function getGitHubMcpClient() {
  if (githubClient) return githubClient;
  const transport = new StdioClientTransport({
    command: "node",
    args: ["github-mcp-server.js"],
    env: { ...process.env }
  });
  githubClient = new Client(
    { name: "github-client", version: "1.0.0" },
    { capabilities: {} }
  );
  await githubClient.connect(transport);
  console.log("✅ GitHub MCP Client connected");
  return githubClient;
}

export async function callGitHubTool(toolName, params = {}) {
  const client = await getGitHubMcpClient();
  console.log(`🔧 Calling GitHub tool: ${toolName}`);
  const result = await client.callTool({
    name: toolName,
    arguments: JSON.parse(JSON.stringify(params || {}))
  });
  if (result?.content?.[0]?.type === "text") {
    try {
      return JSON.parse(result.content[0].text);
    } catch {
      return { result: result.content[0].text };
    }
  }
  return result;
}

export async function listGitHubTools() {
  const client = await getGitHubMcpClient();
  const result = await client.listTools();
  return result.tools || [];
}

// ===== DOCKER MCP CLIENT =====
let dockerClient = null;

export async function getDockerMcpClient() {
  if (dockerClient) return dockerClient;
  const transport = new StdioClientTransport({
    command: "node",
    args: ["docker-mcp-server.js"],
    env: { ...process.env }
  });
  dockerClient = new Client(
    { name: "docker-client", version: "1.0.0" },
    { capabilities: {} }
  );
  await dockerClient.connect(transport);
  console.log("✅ Docker MCP Client connected");
  return dockerClient;
}

export async function callDockerTool(toolName, params = {}) {
  const client = await getDockerMcpClient();
  console.log(`🔧 Calling Docker tool: ${toolName}`);
  const result = await client.callTool({
    name: toolName,
    arguments: JSON.parse(JSON.stringify(params || {}))
  });
  if (result?.content?.[0]?.type === "text") {
    try {
      return JSON.parse(result.content[0].text);
    } catch {
      return { result: result.content[0].text };
    }
  }
  return result;
}

export async function listDockerTools() {
  const client = await getDockerMcpClient();
  const result = await client.listTools();
  return result.tools || [];
}

// ===== CLOSE ALL CLIENTS =====
export async function closeMcpClients() {
  if (taskClient) {
    try {
      await taskClient.close();
      console.log("✅ Task MCP closed");
    } catch (e) {
      console.error("Error closing Task:", e.message);
    }
    taskClient = null;
  }
  if (githubClient) {
    try {
      await githubClient.close();
      console.log("✅ GitHub MCP closed");
    } catch (e) {
      console.error("Error closing GitHub:", e.message);
    }
    githubClient = null;
  }
  if (dockerClient) {
    try {
      await dockerClient.close();
      console.log("✅ Docker MCP closed");
    } catch (e) {
      console.error("Error closing Docker:", e.message);
    }
    dockerClient = null;
  }
}
