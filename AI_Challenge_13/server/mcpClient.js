import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

let taskClient = null;

export async function getTaskMcpClient() {
  if (taskClient) return taskClient;

  try {
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
  } catch (error) {
    console.error("❌ Failed to connect Task MCP:", error.message);
    taskClient = null;
    throw error;
  }
}

export async function callTaskTool(toolName, params = {}) {
  try {
    const client = await getTaskMcpClient();
    console.log(`🔧 Calling task tool: ${toolName}`, params);

    const safeParams = JSON.parse(JSON.stringify(params || {}));
    const rawResult = await client.callTool({
      name: toolName,
      arguments: safeParams
    });

    const result = JSON.parse(JSON.stringify(rawResult));
    
    if (result && result.content && Array.isArray(result.content)) {
      const content = result.content[0];
      if (content.type === "text") {
        try {
          return JSON.parse(content.text);
        } catch {
          return { result: content.text };
        }
      }
    }
    return result;
  } catch (error) {
    console.error(`❌ Task tool error (${toolName}):`, error.message);
    throw error;
  }
}

export async function listTaskTools() {
  try {
    const client = await getTaskMcpClient();
    const result = await client.listTools();
    console.log("📋 Tools from MCP:", result);
    return result.tools || [];
  } catch (error) {
    console.error("❌ Failed to list task tools:", error.message);
    return [];
  }
}

export async function closeTaskMcpClient() {
  if (taskClient) {
    try {
      await taskClient.close();
      console.log("✅ Task MCP client closed");
    } catch (error) {
      console.error("❌ Error closing Task MCP:", error.message);
    } finally {
      taskClient = null;
    }
  }
}

process.on("SIGINT", async () => {
  await closeTaskMcpClient();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await closeTaskMcpClient();
  process.exit(0);
});
