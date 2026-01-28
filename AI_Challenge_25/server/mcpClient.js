// server/mcpClient.js

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===== TASK MCP CLIENT =====
let taskClient = null;

export async function getTaskMcpClient() {
  if (taskClient) return taskClient;

  try {
    const serverPath = path.join(__dirname, 'task-mcp-server.js');
    console.log(`📋 Starting Task MCP: ${serverPath}`);

    const transport = new StdioClientTransport({
      command: "node",
      args: [serverPath],
      env: { ...process.env }
    });

    taskClient = new Client(
      { name: "task-client", version: "1.0.0" },
      { capabilities: {} }
    );

    await taskClient.connect(transport);
    console.log("✅ Task MCP Client connected");
  } catch (e) {
    console.warn("⚠️ Task MCP not available, using mock mode");
    console.warn(`   Reason: ${e.message}`);
    taskClient = { mock: true };
  }

  return taskClient;
}

export async function callTaskTool(toolName, params = {}) {
  try {
    const client = await getTaskMcpClient();
    if (client?.mock) {
      return { success: true, message: `Mock: ${toolName} called`, data: params };
    }

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
  } catch (e) {
    console.error(`❌ Task tool error: ${e.message}`);
    return { success: false, error: e.message };
  }
}

export async function listTaskTools() {
  try {
    const client = await getTaskMcpClient();
    if (client?.mock) return [];

    const result = await client.listTools();
    return result.tools || [];
  } catch (e) {
    console.error("❌ List task tools error:", e.message);
    return [];
  }
}

// ===== DOCKER MCP CLIENT =====
let dockerClient = null;

export async function getDockerMcpClient() {
  if (dockerClient) return dockerClient;

  try {
    const serverPath = path.join(__dirname, 'docker-mcp-server.js');
    console.log(`🐳 Starting Docker MCP: ${serverPath}`);

    const transport = new StdioClientTransport({
      command: "node",
      args: [serverPath],
      env: { ...process.env }
    });

    dockerClient = new Client(
      { name: "docker-client", version: "1.0.0" },
      { capabilities: {} }
    );

    await dockerClient.connect(transport);
    console.log("✅ Docker MCP Client connected");
  } catch (e) {
    console.warn("⚠️ Docker MCP not available, using mock mode");
    console.warn(`   Reason: ${e.message}`);
    dockerClient = { mock: true };
  }

  return dockerClient;
}

export async function callDockerTool(toolName, params = {}) {
  try {
    const client = await getDockerMcpClient();
    
    if (client?.mock) {
      // Return mock docker responses
      if (toolName === 'list_containers') {
        return {
          success: true,
          containers: [
            { name: "mock_postgres", image: "postgres:15", status: "running", id: "abc123" },
            { name: "mock_redis", image: "redis:7", status: "running", id: "def456" }
          ],
          count: 2
        };
      }
      return { success: true, message: `Mock: ${toolName} called`, data: params };
    }

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
  } catch (e) {
    console.error(`❌ Docker tool error: ${e.message}`);
    return { success: false, error: e.message };
  }
}

export async function listDockerTools() {
  try {
    const client = await getDockerMcpClient();
    
    if (client?.mock) {
      return [
        { name: "list_containers", description: "List Docker containers" },
        { name: "start_container", description: "Start a container" },
        { name: "stop_container", description: "Stop a container" },
        { name: "remove_container", description: "Remove a container" },
        { name: "create_test_env", description: "Create test environment" },
        { name: "health_check", description: "Health check container" },
        { name: "get_logs", description: "Get container logs" },
        { name: "cleanup_old_containers", description: "Cleanup old containers" }
      ];
    }

    const result = await client.listTools();
    return result.tools || [];
  } catch (e) {
    console.error("❌ List docker tools error:", e.message);
    return [];
  }
}

// ===== CLOSE ALL CLIENTS =====
export async function closeMcpClients() {
  if (taskClient && !taskClient.mock) {
    try {
      await taskClient.close();
      console.log("✅ Task MCP closed");
    } catch (e) {
      console.error("Error closing Task:", e.message);
    }
    taskClient = null;
  }

  if (dockerClient && !dockerClient.mock) {
    try {
      await dockerClient.close();
      console.log("✅ Docker MCP closed");
    } catch (e) {
      console.error("Error closing Docker:", e.message);
    }
    dockerClient = null;
  }
}
