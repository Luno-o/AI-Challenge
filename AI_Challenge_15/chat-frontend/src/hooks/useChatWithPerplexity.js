import { useState, useRef, useEffect } from 'react';

export function useChatWithPerplexity() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 🆕 Docker команды из чата
  async function executeDockerCommand(userMessage) {
    const msg = userMessage.toLowerCase();

    // Создание тестового окружения
    if (
      (msg.includes('подними') || msg.includes('создай')) &&
      (msg.includes('postgres') || msg.includes('redis') || msg.includes('тестовое') || msg.includes('окружение'))
    ) {
      try {
        const response = await fetch('/api/orchestrate/setup-test-env', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        const result = await response.json();
        if (result.success) {
          return {
            detected: true,
            response: `✅ **Тестовое окружение создано!**\n\n📦 PostgreSQL:\n- ID: ${result.environment.postgres.id.substring(0, 12)}\n- Порт: ${result.environment.postgres.port}\n- Пароль: ${result.environment.postgres.password}\n\n🔴 Redis:\n- ID: ${result.environment.redis.id.substring(0, 12)}\n- Порт: ${result.environment.redis.port}\n\n📋 Задача создана: ${result.task_id}\n🔗 GitHub summary: ${result.github_summary}`
          };
        }
      } catch (e) {
        return {
          detected: true,
          response: `❌ Ошибка при создании окружения: ${e.message}`
        };
      }
    }

    // Очистка окружения
    if (
      msg.includes('очисти') ||
      msg.includes('удали') ||
      (msg.includes('контейнеры') && (msg.includes('stop') || msg.includes('remove')))
    ) {
      try {
        const response = await fetch('/api/orchestrate/cleanup-env', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        const result = await response.json();
        if (result.success) {
          return {
            detected: true,
            response: `✅ **Окружение очищено!**\n\n🗑️ Удалено контейнеров: ${result.cleanup.containers_removed}\n📋 Архивировано задач: ${result.cleanup.tasks_archived}\n🔗 GitHub summary: ${result.cleanup.github_summary}`
          };
        }
      } catch (e) {
        return {
          detected: true,
          response: `❌ Ошибка при очистке: ${e.message}`
        };
      }
    }

    // Список контейнеров
    if (
      msg.includes('список') ||
      msg.includes('контейнеры') ||
      msg.includes('какие') ||
      msg.includes('показ')
    ) {
      try {
        const response = await fetch('/api/docker/containers', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        const result = await response.json();
        if (result.success) {
          const containersList = result.containers
            .map(c => `- **${c.name}** (${c.image})\n  📊 Status: ${c.status}`)
            .join('\n');
          return {
            detected: true,
            response: `📦 **Контейнеры в системе (${result.count}):**\n\n${containersList}`
          };
        }
      } catch (e) {
        return {
          detected: true,
          response: `❌ Ошибка при получении списка: ${e.message}`
        };
      }
    }

    // Суммаризация задач и push на GitHub
    if (msg.includes('суммариз') || msg.includes('отправить') || msg.includes('github')) {
      try {
        const response = await fetch('/api/orchestrate/summary-chain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        const result = await response.json();
        if (result.success) {
          const steps = result.steps
            .map(s => `${s.step}. ${s.description} - ✅ ${s.status}`)
            .join('\n');
          return {
            detected: true,
            response: `✅ **Задачи суммаризированы и отправлены на GitHub!**\n\n${steps}\n\n🔗 URL: ${result.steps[2]?.url}`
          };
        }
      } catch (e) {
        return {
          detected: true,
          response: `❌ Ошибка при суммаризации: ${e.message}`
        };
      }
    }

    return { detected: false };
  }

async function handleChat(userMessage) {
  if (!userMessage.trim()) return;

  setError('');
  setLoading(true);

  // Добавляем сообщение пользователя
  const userMsg = {
    role: 'user',
    content: userMessage,
    timestamp: new Date().toLocaleTimeString()
  };

  setMessages(prev => [...prev, userMsg]);

  try {
    // 🆕 Сначала проверяем Docker команды
    const dockerResult = await executeDockerCommand(userMessage);
    if (dockerResult.detected) {
      const dockerMsg = {
        role: 'assistant',
        content: dockerResult.response,
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, dockerMsg]);
      setLoading(false);
      return;
    }

    // ✅ ИСПРАВЛЕНО: Отправляем правильный формат
    const response = await fetch('http://localhost:4000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [
          ...messages,
          userMsg
        ],
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();

    // ✅ ИСПРАВЛЕНО: Правильно парсим ответ
    if (data.content || data.message) {
      const assistantMsg = {
        role: 'assistant',
        content: data.content || data.message,
        timestamp: new Date().toLocaleTimeString()
      };

      setMessages(prev => [...prev, assistantMsg]);
    } else {
      throw new Error(data.error || 'Unknown error');
    }
  } catch (err) {
    setError(err.message || 'Failed to get response');
    console.error('Chat error:', err);
  } finally {
    setLoading(false);
  }
}


  const clearMessages = () => {
    setMessages([]);
    setError('');
  };

return {
  messages,
  setMessages,  // ← ДОБАВЬ ЭТО!
  loading,
  error,
  handleChat,
  clearMessages,
  messagesEndRef
};
}
