

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import Docker from 'dockerode';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGS_DIR = path.join(__dirname, 'logs');
const DOCKER_LOG = path.join(__dirname, 'docker-operations.log');

// ===== DOCKER CONNECTION =====
let docker;

// Определение Docker connection
if (process.env.DOCKER_HOST) {
  const dockerHost = process.env.DOCKER_HOST;
  console.error(`🐳 Using DOCKER_HOST: ${dockerHost}`);
  
  // Если unix socket
  if (dockerHost.startsWith('unix://')) {
    const socketPath = dockerHost.replace('unix://', '');
    console.error(`🐳 Connecting via socket: ${socketPath}`);
    docker = new Docker({ socketPath });
  } 
  // Если TCP
  else if (dockerHost.startsWith('tcp://')) {
    const url = new URL(dockerHost);
    console.error(`🐳 Connecting via TCP: ${url.hostname}:${url.port}`);
    docker = new Docker({
      host: url.hostname,
      port: url.port || 2375
    });
  }
  // Прямой путь к socket
  else if (dockerHost.startsWith('/')) {
    console.error(`🐳 Connecting via socket path: ${dockerHost}`);
    docker = new Docker({ socketPath: dockerHost });
  }
  // Хост без протокола
  else {
    console.error(`🐳 Connecting via host: ${dockerHost}`);
    docker = new Docker({ host: dockerHost, port: 2375 });
  }
} else if (os.platform() === 'win32') {
  console.error('🐳 Windows detected, connecting via pipe');
  docker = new Docker({ socketPath: '//./pipe/docker_engine' });
} else {
  console.error('🐳 Unix detected, using default socket');
  docker = new Docker({ socketPath: '/var/run/docker.sock' });
}

// ===== HELPER FUNCTIONS =====

/**
 * Инициализация директорий
 */
async function initDirs() {
  try {
    await fs.mkdir(LOGS_DIR, { recursive: true });
    console.error('✅ Logs directory initialized');
  } catch (error) {
    console.error('⚠️ Failed to create logs dir:', error.message);
  }
}

/**
 * Логирование Docker операций
 */
async function logDockerOperation(operation, status, details) {
  const timestamp = new Date().toISOString();
  const message = `[${timestamp}] ${operation}: ${status} | ${JSON.stringify(details)}\n`;
  
  try {
    await fs.appendFile(DOCKER_LOG, message);
  } catch (e) {
    console.error('Failed to log:', e.message);
  }
  
  console.error(`🐳 ${operation}: ${status}`);
}

/**
 * Health check контейнера
 */
async function healthCheck(containerId, maxWait = 30, retries = 3) {
  console.error(`🏥 Health checking container ${containerId.substring(0, 12)}...`);
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const container = docker.getContainer(containerId);
      const data = await container.inspect();
      
      if (data.State.Running) {
        console.error(`✅ Container is running (attempt ${attempt}/${retries})`);
        return { success: true, status: 'running', data };
      }
      
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, maxWait * 1000));
      }
      
    } catch (error) {
      console.error(`⚠️ Health check attempt ${attempt} failed: ${error.message}`);
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }
  
  return { success: false, status: 'unhealthy', message: 'Max retries exceeded' };
}

/**
 * Получить логи контейнера
 */
async function getContainerLogs(containerId, tail = 100) {
  try {
    const container = docker.getContainer(containerId);
    const logs = await container.logs({
      stdout: true,
      stderr: true,
      tail: tail
    });
    return logs.toString('utf-8');
  } catch (error) {
    throw new Error(`Failed to get logs: ${error.message}`);
  }
}
const server = new Server(
  { name: "docker-manager", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "start_container",
        description: "Запустить контейнер",
        inputSchema: {
          type: "object",
          properties: {
            image: { type: "string" },
            name: { type: "string" },
            ports: { type: "object" },
            env: { type: "object" }
          },
          required: ["image", "name"]
        }
      },
      {
        name: "stop_container",
        description: "Остановить контейнер",
        inputSchema: {
          type: "object",
          properties: {
            container: { type: "string" },
            timeout: { type: "number", default: 10 }
          },
          required: ["container"]
        }
      },
      {
        name: "remove_container",
        description: "Удалить контейнер",
        inputSchema: {
          type: "object",
          properties: {
            container: { type: "string" },
            force: { type: "boolean", default: true }
          },
          required: ["container"]
        }
      },
      {
        name: "list_containers",
        description: "Список контейнеров",
        inputSchema: {
          type: "object",
          properties: {
            all: { type: "boolean", default: true }
          }
        }
      },
      {
        name: "create_test_env",
        description: "Создать тестовое окружение",
        inputSchema: {
          type: "object",
          properties: {
            postgres_version: { type: "string", default: "16" },
            redis_version: { type: "string", default: "7" },
            postgres_password: { type: "string" },
            network_name: { type: "string", default: "test-network" }
          }
        }
      },
      {
        name: "health_check",
        description: "Проверить статус контейнера",
        inputSchema: {
          type: "object",
          properties: {
            container: { type: "string" },
            max_wait: { type: "number", default: 30 },
            retries: { type: "number", default: 3 }
          },
          required: ["container"]
        }
      },
      {
        name: "get_logs",
        description: "Получить логи контейнера",
        inputSchema: {
          type: "object",
          properties: {
            container: { type: "string" },
            tail: { type: "number", default: 100 }
          },
          required: ["container"]
        }
      },
      {
        name: "cleanup_old_containers",
        description: "Очистить старые контейнеры",
        inputSchema: {
          type: "object",
          properties: {
            dry_run: { type: "boolean", default: true }
          }
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "list_containers": {
        const { all = true } = args;
        console.error(`🐳 Listing containers...`);
        const containers = await docker.listContainers({ all });
        const formatted = containers.map(c => ({
          id: c.Id.substring(0, 12),
          name: c.Names[0]?.replace(/^\//, ''),
          image: c.Image,
          state: c.State,
          status: c.Status
        }));
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ success: true, containers: formatted, count: formatted.length })
          }]
        };
      }

      case "start_container": {
        const { image, name: containerName, ports = {}, env = {} } = args;
        console.error(`🐳 Starting: ${containerName}`);
        const portBindings = {};
        Object.entries(ports).forEach(([containerPort, hostPort]) => {
          portBindings[`${containerPort}/tcp`] = [{ HostPort: String(hostPort) }];
        });
        const envArray = Object.entries(env).map(([k, v]) => `${k}=${v}`);
        const container = await docker.createContainer({
          Image: image,
          name: containerName,
          Env: envArray,
          HostConfig: { PortBindings: portBindings },
          ExposedPorts: Object.fromEntries(Object.keys(ports).map(p => [`${p}/tcp`, {}]))
        });
        await container.start();
        await logDockerOperation("start_container", "success", { container: containerName });
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ success: true, container_id: container.id, name: containerName })
          }]
        };
      }

      case "stop_container": {
        const { container: containerRef } = args;
        console.error(`🐳 Stopping: ${containerRef}`);
        const container = docker.getContainer(containerRef);
        await container.stop({ t: 10 });
        await logDockerOperation("stop_container", "success", { container: containerRef });
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ success: true, message: `Stopped ${containerRef}` })
          }]
        };
      }

      case "remove_container": {
        const { container: containerRef, force = true } = args;
        console.error(`🐳 Removing: ${containerRef}`);
        const container = docker.getContainer(containerRef);
        await container.remove({ force });
        await logDockerOperation("remove_container", "success", { container: containerRef });
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ success: true, message: `Removed ${containerRef}` })
          }]
        };
      }

      case "create_test_env": {
        const { postgres_version = "16", redis_version = "7", postgres_password = "testpass123", network_name = "test-network" } = args;
        console.error(`🐳 Creating test env...`);
        try {
          await docker.createNetwork({ Name: network_name, Driver: "bridge" });
        } catch (e) {
          console.error(`Network exists`);
        }
        const pgContainer = await docker.createContainer({
          Image: `postgres:${postgres_version}`,
          name: `test-postgres-${Date.now()}`,
          Env: [`POSTGRES_PASSWORD=${postgres_password}`],
          HostConfig: {
            PortBindings: { "5432/tcp": [{ HostPort: "5432" }] },
            NetworkMode: network_name
          },
          ExposedPorts: { "5432/tcp": {} }
        });
        await pgContainer.start();
        const redisContainer = await docker.createContainer({
          Image: `redis:${redis_version}`,
          name: `test-redis-${Date.now()}`,
          HostConfig: {
            PortBindings: { "6379/tcp": [{ HostPort: "6379" }] },
            NetworkMode: network_name
          },
          ExposedPorts: { "6379/tcp": {} }
        });
        await redisContainer.start();
        await logDockerOperation("create_test_env", "success", { postgres: pgContainer.id.substring(0, 12), redis: redisContainer.id.substring(0, 12) });
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              environment: {
                postgres: { id: pgContainer.id, port: 5432, password: postgres_password },
                redis: { id: redisContainer.id, port: 6379 },
                network: network_name
              }
            })
          }]
        };
      }

      case "health_check": {
        const { container: containerRef, max_wait = 30, retries = 3 } = args;
        const result = await healthCheck(containerRef, max_wait, retries);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(result)
          }]
        };
      }

      case "get_logs": {
        const { container: containerRef, tail = 100 } = args;
        const logs = await getContainerLogs(containerRef, tail);
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ success: true, logs })
          }]
        };
      }

      case "cleanup_old_containers": {
        const { dry_run = true } = args;
        const containers = await docker.listContainers({ all: true });
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        const toRemove = containers.filter(c => c.Created * 1000 < oneDayAgo);
        if (!dry_run) {
          for (const c of toRemove) {
            await docker.getContainer(c.Id).remove({ force: true });
          }
        }
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              dry_run,
              would_remove: toRemove.map(c => ({ id: c.Id.substring(0, 12), name: c.Names[0] })),
              count: toRemove.length
            })
          }]
        };
      }

      default:
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ success: false, error: `Unknown tool: ${name}` })
          }],
          isError: true
        };
    }
  } catch (error) {
    console.error(`❌ Error (${name}):`, error.message);
    await logDockerOperation(name, "error", { error: error.message });
    return {
      content: [{
        type: "text",
        text: JSON.stringify({ success: false, error: error.message })
      }],
      isError: true
    };
  }
});

async function main() {
  await initDirs();
  try {
    const version = await docker.version();
    console.error(`✅ Docker connected (v${version.Version})`);
  } catch (error) {
    console.error(`❌ Docker not available: ${error.message}`);
    console.error(`   Start Docker Desktop!`);
    process.exit(1);
  }
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("✅ Docker MCP Server running");
}

process.on("SIGINT", async () => {
  console.error("\n🛑 Shutting down...");
  process.exit(0);
});

main().catch((error) => {
  console.error("Fatal:", error);
  process.exit(1);
});
