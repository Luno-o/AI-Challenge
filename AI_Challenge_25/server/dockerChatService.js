// server/dockerChatService.js

import { callDockerTool, listDockerTools } from './mcpClient.js';

/**
 * Обработка Docker команды из чата
 */
export async function processDockerCommand(userMessage) {
  try {
    console.log(`[DockerChat] Processing: "${userMessage}"`);

    // 1. Определить намерение
    const intent = detectDockerIntent(userMessage);
    
    if (!intent) {
      return {
        success: false,
        answer: '❓ Не понял команду. Попробуйте:\n' +
                '- "подними postgres"\n' +
                '- "подними redis"\n' +
                '- "список контейнеров"\n' +
                '- "останови <container>"\n' +
                '- "создай тестовое окружение"'
      };
    }

    console.log(`[DockerChat] Intent: ${intent.tool}`, intent.params);

    // 2. Вызвать Docker MCP tool
    const result = await callDockerTool(intent.tool, intent.params);

    // 3. Форматировать ответ
    const answer = formatDockerResponse(intent.tool, result, userMessage);

    return {
      success: true,
      answer,
      tool_used: intent.tool,
      docker_result: result
    };

  } catch (error) {
    console.error('[DockerChat] Error:', error.message);
    return {
      success: false,
      answer: `❌ Ошибка: ${error.message}`
    };
  }
}

/**
 * Определить Docker намерение из пользовательского сообщения
 */
function detectDockerIntent(message) {
  const lower = message.toLowerCase();

  // === ЗАПУСТИТЬ POSTGRES ===
  if (lower.match(/подним|запусти|старт|start|run/i) && 
      lower.match(/postgres|postgresql|pg/i)) {
    return {
      tool: 'start_container',
      params: {
        image: 'postgres:16',
        name: `postgres-${Date.now()}`,
        ports: { '5432': '5432' },
        env: { 
          POSTGRES_PASSWORD: 'postgres',
          POSTGRES_USER: 'postgres',
          POSTGRES_DB: 'testdb'
        }
      }
    };
  }

  // === ЗАПУСТИТЬ REDIS ===
  if (lower.match(/подним|запусти|старт|start|run/i) && 
      lower.match(/redis/i)) {
    return {
      tool: 'start_container',
      params: {
        image: 'redis:7',
        name: `redis-${Date.now()}`,
        ports: { '6379': '6379' }
      }
    };
  }

  // === ЗАПУСТИТЬ MONGO ===
  if (lower.match(/подним|запусти|старт|start|run/i) && 
      lower.match(/mongo|mongodb/i)) {
    return {
      tool: 'start_container',
      params: {
        image: 'mongo:7',
        name: `mongo-${Date.now()}`,
        ports: { '27017': '27017' },
        env: {
          MONGO_INITDB_ROOT_USERNAME: 'root',
          MONGO_INITDB_ROOT_PASSWORD: 'password'
        }
      }
    };
  }

  // === СПИСОК КОНТЕЙНЕРОВ ===
  if (lower.match(/покажи|список|list|show|какие/i) && 
      lower.match(/контейнер|container/i)) {
    return {
      tool: 'list_containers',
      params: { all: true }
    };
  }

  // === ОСТАНОВИТЬ КОНТЕЙНЕР ===
  if (lower.match(/останови|stop|выключи|kill/i)) {
    // Попытка извлечь имя контейнера
    const nameMatch = lower.match(/(?:контейнер|container)\s+(\S+)/i);
    if (nameMatch) {
      return {
        tool: 'stop_container',
        params: { container: nameMatch[1] }
      };
    }
    
    // Если просто "останови postgres"
    if (lower.includes('postgres')) {
      return {
        tool: 'stop_container',
        params: { container: 'postgres' }
      };
    }
  }

  // === УДАЛИТЬ КОНТЕЙНЕР ===
  if (lower.match(/удали|remove|delete/i) && 
      lower.match(/контейнер|container/i)) {
    const nameMatch = lower.match(/(?:контейнер|container)\s+(\S+)/i);
    if (nameMatch) {
      return {
        tool: 'remove_container',
        params: { 
          container: nameMatch[1],
          force: true 
        }
      };
    }
  }

  // === СОЗДАТЬ ТЕСТОВОЕ ОКРУЖЕНИЕ ===
  if (lower.match(/создай|setup|create|подними/i) && 
      lower.match(/тестовое|test|окружение|env/i)) {
    return {
      tool: 'create_test_env',
      params: {
        postgres_version: '16',
        redis_version: '7',
        postgres_password: 'testpass',
        network_name: 'test-network'
      }
    };
  }

  // === ЛОГИ КОНТЕЙНЕРА ===
  if (lower.match(/логи|logs/i) && lower.match(/контейнер|container/i)) {
    const nameMatch = lower.match(/(?:контейнер|container)\s+(\S+)/i);
    if (nameMatch) {
      return {
        tool: 'get_logs',
        params: { 
          container: nameMatch[1],
          tail: 100 
        }
      };
    }
  }

  // === HEALTH CHECK ===
  if (lower.match(/проверь|check|health|статус/i)) {
    const nameMatch = lower.match(/(?:контейнер|container)\s+(\S+)/i);
    if (nameMatch) {
      return {
        tool: 'health_check',
        params: { 
          container: nameMatch[1],
          max_wait: 30,
          retries: 3
        }
      };
    }
  }

  // Не удалось определить намерение
  return null;
}

/**
 * Форматировать ответ от Docker tool
 */
function formatDockerResponse(toolName, result, originalMessage) {
  if (!result.success) {
    return `❌ **Ошибка Docker:**\n\`\`\`\n${result.error}\n\`\`\`\n\n💡 Убедитесь что Docker Desktop запущен.`;
  }

  switch (toolName) {
    case 'start_container':
      return `✅ **Контейнер успешно запущен!**\n\n` +
             `📦 **Имя:** \`${result.name}\`\n` +
             `🆔 **ID:** \`${result.container_id?.substring(0, 12)}\`\n` +
             `🔌 **Порты:** ${formatPorts(result.ports)}\n\n` +
             `💡 Контейнер доступен на localhost`;

    case 'stop_container':
      return `🛑 **Контейнер остановлен**\n\n${result.message}`;

    case 'remove_container':
      return `🗑️ **Контейнер удалён**\n\n${result.message}`;

    case 'list_containers':
      if (result.count === 0) {
        return `ℹ️ **Нет запущенных контейнеров**\n\nВы можете запустить:\n` +
               `- "подними postgres"\n` +
               `- "подними redis"\n` +
               `- "создай тестовое окружение"`;
      }
      
      const containersList = result.containers
        .map(c => `- **${c.name}**\n  └ 📦 ${c.image}\n  └ 🔴 ${c.state} (${c.status})\n  └ 🆔 \`${c.id}\``)
        .join('\n\n');
      
      return `📋 **Контейнеры (${result.count}):**\n\n${containersList}`;

    case 'create_test_env':
      return `✅ **Тестовое окружение создано!**\n\n` +
             `🐘 **PostgreSQL:**\n` +
             `   - Порт: ${result.environment.postgres.port}\n` +
             `   - ID: \`${result.environment.postgres.id.substring(0, 12)}\`\n` +
             `   - Password: \`${result.environment.postgres.password}\`\n\n` +
             `🔴 **Redis:**\n` +
             `   - Порт: ${result.environment.redis.port}\n` +
             `   - ID: \`${result.environment.redis.id.substring(0, 12)}\`\n\n` +
             `🌐 **Network:** \`${result.environment.network}\``;

    case 'get_logs':
      return `📜 **Логи контейнера:**\n\n\`\`\`\n${result.logs.substring(0, 1000)}\n\`\`\``;

    case 'health_check':
      if (result.success) {
        return `✅ **Health Check: OK**\n\n` +
               `Status: ${result.status}\n` +
               `Container is running normally`;
      } else {
        return `⚠️ **Health Check: Failed**\n\n${result.message}`;
      }

    default:
      return `✅ **Команда выполнена**\n\n\`\`\`json\n${JSON.stringify(result, null, 2).substring(0, 500)}\n\`\`\``;
  }
}

/**
 * Форматировать порты
 */
function formatPorts(ports) {
  if (!ports || typeof ports !== 'object') {
    return 'default';
  }
  
  return Object.entries(ports)
    .map(([container, host]) => `${container} → localhost:${host}`)
    .join(', ');
}

/**
 * Получить список доступных Docker команд
 */
export async function getDockerCommands() {
  try {
    const tools = await listDockerTools();
    return {
      success: true,
      commands: [
        { text: 'подними postgres', description: 'Запустить PostgreSQL 16' },
        { text: 'подними redis', description: 'Запустить Redis 7' },
        { text: 'подними mongo', description: 'Запустить MongoDB 7' },
        { text: 'список контейнеров', description: 'Показать все контейнеры' },
        { text: 'останови <имя>', description: 'Остановить контейнер' },
        { text: 'удали контейнер <имя>', description: 'Удалить контейнер' },
        { text: 'создай тестовое окружение', description: 'PostgreSQL + Redis + Network' },
        { text: 'логи контейнера <имя>', description: 'Показать логи' },
        { text: 'проверь контейнер <имя>', description: 'Health check' }
      ],
      available_tools: tools.length,
      tools_list: tools.map(t => ({ name: t.name, description: t.description }))
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}
