#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import fs from 'fs/promises';
import path from 'path';
import cron from 'node-cron';

const TASKS_FILE = path.join(process.cwd(), 'tasks.json');

// Инициализация файла задач
async function initTasksFile() {
  try {
    await fs.access(TASKS_FILE);
  } catch {
    await fs.writeFile(TASKS_FILE, JSON.stringify({ tasks: [] }, null, 2));
  }
}

async function readTasks() {
  await initTasksFile();
  const data = await fs.readFile(TASKS_FILE, 'utf-8');
  return JSON.parse(data);
}

async function saveTasks(data) {
  await fs.writeFile(TASKS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// Получение summary задач
async function getTasksSummary() {
  const tasksData = await readTasks();
  const activeTasks = tasksData.tasks.filter(t => t.status !== 'done');
  const highPriority = activeTasks.filter(t => t.priority === 'high');
  
  return {
    timestamp: new Date().toISOString(),
    totalActive: activeTasks.length,
    highPriority: highPriority.length,
    todo: tasksData.tasks.filter(t => t.status === 'todo').length,
    inProgress: tasksData.tasks.filter(t => t.status === 'in-progress').length,
    done: tasksData.tasks.filter(t => t.status === 'done').length,
    tasks: activeTasks.slice(0, 10).map(t => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      status: t.status,
      dueDate: t.dueDate
    }))
  };
}

// MCP Server
const server = new Server(
  { name: "task-manager", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// ИСПРАВЛЕНИЕ: Правильный способ регистрации handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "create_task",
        description: "Создать новую задачу в JSON-файле",
        inputSchema: {
          type: "object",
          properties: {
            title: { type: "string", description: "Название задачи" },
            description: { type: "string", description: "Описание задачи" },
            priority: { 
              type: "string", 
              enum: ["low", "medium", "high"],
              description: "Приоритет" 
            },
            dueDate: { type: "string", description: "Дедлайн (ISO 8601)" }
          },
          required: ["title"]
        }
      },
      {
        name: "list_tasks",
        description: "Получить список всех задач или фильтр по статусу",
        inputSchema: {
          type: "object",
          properties: {
            status: { 
              type: "string", 
              enum: ["todo", "in-progress", "done"],
              description: "Фильтр по статусу (опционально)" 
            }
          }
        }
      },
      {
        name: "update_task",
        description: "Обновить задачу по ID",
        inputSchema: {
          type: "object",
          properties: {
            id: { type: "string", description: "ID задачи" },
            title: { type: "string" },
            description: { type: "string" },
            priority: { type: "string", enum: ["low", "medium", "high"] },
            status: { type: "string", enum: ["todo", "in-progress", "done"] },
            dueDate: { type: "string" }
          },
          required: ["id"]
        }
      },
      {
        name: "delete_task",
        description: "Удалить задачу по ID",
        inputSchema: {
          type: "object",
          properties: {
            id: { type: "string", description: "ID задачи" }
          },
          required: ["id"]
        }
      },
      {
        name: "get_tasks_summary",
        description: "Получить краткую сводку по задачам (для reminder)",
        inputSchema: {
          type: "object",
          properties: {}
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "create_task": {
        const tasksData = await readTasks();
        const newTask = {
          id: Date.now().toString(),
          title: args.title,
          description: args.description || '',
          priority: args.priority || 'medium',
          status: 'todo',
          createdAt: new Date().toISOString(),
          dueDate: args.dueDate || null
        };
        tasksData.tasks.push(newTask);
        await saveTasks(tasksData);
        return {
          content: [{ 
            type: "text", 
            text: JSON.stringify({ success: true, task: newTask }) 
          }]
        };
      }

      case "list_tasks": {
        const tasksData = await readTasks();
        let tasks = tasksData.tasks;
        if (args.status) {
          tasks = tasks.filter(t => t.status === args.status);
        }
        return {
          content: [{ 
            type: "text", 
            text: JSON.stringify({ success: true, tasks }) 
          }]
        };
      }

      case "update_task": {
        const tasksData = await readTasks();
        const taskIndex = tasksData.tasks.findIndex(t => t.id === args.id);
        if (taskIndex === -1) {
          return {
            content: [{ 
              type: "text", 
              text: JSON.stringify({ success: false, error: "Task not found" }) 
            }]
          };
        }
        tasksData.tasks[taskIndex] = {
          ...tasksData.tasks[taskIndex],
          ...args,
          updatedAt: new Date().toISOString()
        };
        await saveTasks(tasksData);
        return {
          content: [{ 
            type: "text", 
            text: JSON.stringify({ success: true, task: tasksData.tasks[taskIndex] }) 
          }]
        };
      }

      case "delete_task": {
        const tasksData = await readTasks();
        const initialLength = tasksData.tasks.length;
        tasksData.tasks = tasksData.tasks.filter(t => t.id !== args.id);
        await saveTasks(tasksData);
        return {
          content: [{ 
            type: "text", 
            text: JSON.stringify({ 
              success: tasksData.tasks.length < initialLength,
              deleted: initialLength - tasksData.tasks.length 
            }) 
          }]
        };
      }

      case "get_tasks_summary": {
        const summary = await getTasksSummary();
        return {
          content: [{ 
            type: "text", 
            text: JSON.stringify({ success: true, summary }) 
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
    return {
      content: [{ 
        type: "text", 
        text: JSON.stringify({ success: false, error: error.message }) 
      }],
      isError: true
    };
  }
});

// Reminder cron job
let reminderInterval = null;

function setupReminder(intervalMinutes = 60) {
  if (reminderInterval) {
    reminderInterval.stop();
  }
  
  reminderInterval = cron.schedule(`*/${intervalMinutes} * * * *`, async () => {
    const summary = await getTasksSummary();
    if (summary.totalActive > 0) {
      console.error(`\n🔔 [REMINDER ${new Date().toLocaleTimeString('ru-RU')}]`);
      console.error(`📋 Active tasks: ${summary.totalActive} (${summary.highPriority} high priority)`);
      console.error(`📊 Status: TODO(${summary.todo}) | IN-PROGRESS(${summary.inProgress}) | DONE(${summary.done})`);
      if (summary.tasks.length > 0) {
        console.error('Top tasks:');
        summary.tasks.slice(0, 5).forEach((t, i) => {
          console.error(`  ${i + 1}. [${t.priority}] ${t.title} (${t.status})`);
        });
      }
      console.error('');
    }
  });
}

// Старт сервера
async function main() {
  await initTasksFile();
  setupReminder(1); // Напоминание каждый час
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("✅ Task MCP Server running with hourly reminders");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
