import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

let client = null;

export async function getMcpClient() {
  if (client) {
    return client;
  }

  try {
    console.log("🚀 Запускаю MCP GitHub сервер...");

    const transport = new StdioClientTransport({
      command: "node",
      args: ["github-mcp-server.js"],
      env: {
        ...process.env,
        GITHUB_TOKEN: process.env.GITHUB_TOKEN || process.env.GH_TOKEN
      }
    });

    client = new Client(
      {
        name: "github-client",
        version: "1.0.0"
      },
      {
        capabilities: {}
      }
    );

    await client.connect(transport);
    console.log("✅ MCP-сервер подключен успешно");

    return client;
  } catch (error) {
    console.error("❌ Failed to connect MCP:", error.message);
    client = null;
    throw error;
  }
}

export async function callGithubTool(toolName, params) {
  try {
    const mcpClient = await getMcpClient();
    console.log("🔧 Вызываю tool:", toolName, params);

    // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Сериализуем params перед отправкой
    const safeParams = JSON.parse(JSON.stringify(params || {}));

    const rawResult = await Promise.race([
      mcpClient.request({
        method: "tools/call",
        params: {
          name: toolName,
          arguments: safeParams
        }
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Tool ${toolName} timeout`)), 45000)
      )
    ]);

    // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Глубокая десериализация результата
    const result = JSON.parse(JSON.stringify(rawResult));

    console.log("✅ Tool result:", toolName);

    // Обработка ответа
    if (result && result.content) {
      if (Array.isArray(result.content) && result.content.length > 0) {
        const content = result.content[0];
        
        if (content.type === "text" && typeof content.text === "string") {
          try {
            return JSON.parse(content.text);
          } catch (parseError) {
            return { result: content.text };
          }
        }
        
        return content;
      }
      
      return result.content;
    }

    return result;

  } catch (error) {
    console.error("❌ Tool error (" + toolName + "):", error.message);
    throw new Error(`MCP tool ${toolName} failed: ${error.message}`);
  }
}

export async function listGithubTools() {
  try {
    const mcpClient = await getMcpClient();
    const rawResult = await mcpClient.request({
      method: "tools/list",
      params: {}
    });
    
    // Десериализация для удаления Zod
    const result = JSON.parse(JSON.stringify(rawResult));
    return result.tools || [];
  } catch (error) {
    console.error("❌ Failed to list tools:", error.message);
    return [];
  }
}

export async function closeMcpClient() {
  if (client) {
    try {
      await client.close();
      console.log("✅ MCP клиент закрыт");
    } catch (error) {
      console.error("❌ Error closing MCP client:", error.message);
    } finally {
      client = null;
    }
  }
}

process.on("SIGINT", async () => {
  await closeMcpClient();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await closeMcpClient();
  process.exit(0);
});
