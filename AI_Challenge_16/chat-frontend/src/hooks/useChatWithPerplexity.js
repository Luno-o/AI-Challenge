import { useState, useRef, useEffect } from 'react';

export function useChatWithPerplexity() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [indexes, setIndexes] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState('documents');
  const messagesEndRef = useRef(null);

  // Load available indexes on mount
  useEffect(() => {
    loadIndexes();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // ✅ НОВОЕ: Load available document indexes
  async function loadIndexes() {
    try {
      const response = await fetch('http://localhost:4000/api/documents/indexes');
      const data = await response.json();
      if (data.success && data.indexes) {
        setIndexes(data.indexes);
        if (data.indexes.length > 0) {
          setSelectedIndex(data.indexes[0].name);
        }
      }
    } catch (err) {
      console.error('Error loading indexes:', err);
    }
  }

  // ✅ НОВОЕ: Index documents from directory
  async function indexDocuments(directory = './documents') {
    try {
      const response = await fetch('http://localhost:4000/api/documents/index', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          directory,
          file_patterns: ['*.md', '*.txt'],
          index_name: 'documents',
          backend: 'json'
        })
      });

      const data = await response.json();
      if (data.success) {
        const msg = {
          role: 'assistant',
          content: `✅ **Документы проиндексированы!**\n\n📂 Файлы: ${data.summary.files_processed}\n✂️ Чанки: ${data.summary.chunks_created}\n🧠 Эмбеддинги: ${data.summary.embeddings_generated}\n💾 Индекс: ${data.summary.path}`,
          timestamp: new Date().toLocaleTimeString()
        };
        setMessages(prev => [...prev, msg]);
        await loadIndexes();
      }
    } catch (err) {
      const msg = {
        role: 'assistant',
        content: `❌ Ошибка при индексировании: ${err.message}`,
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, msg]);
    }
  }

  // ✅ НОВОЕ: Search in document index
  async function searchDocuments(query) {
    try {
      const response = await fetch('http://localhost:4000/api/documents/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          index_name: selectedIndex,
          top_k: 5
        })
      });

      const data = await response.json();
      if (data.success) {
        const sources = data.search_results.sources
          .map((s, i) => `${i + 1}. ${s.file} (score: ${s.score.toFixed(3)})`)
          .join('\n');
        
        return {
          found: true,
          sources,
          context: data.search_results.context
        };
      }
    } catch (err) {
      console.error('Search error:', err);
      return { found: false, error: err.message };
    }
  }

  // ✅ НОВОЕ: Docker команды
  async function executeDockerCommand(userMessage) {
    const msg = userMessage.toLowerCase();

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
            .map(c => `- **${c.name}** (${c.image})\n 📊 Status: ${c.status}`)
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

    const userMsg = {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toLocaleTimeString()
    };

    setMessages(prev => [...prev, userMsg]);

    try {
      // ✅ Сначала проверяем Docker команды
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

      // ✅ НОВОЕ: Проверяем если это запрос о документах
      const docMsg = userMessage.toLowerCase();
      let searchResults = null;

      if (
        docMsg.includes('найди') ||
        docMsg.includes('поиск') ||
        docMsg.includes('документ') ||
        docMsg.includes('где') ||
        docMsg.includes('как')
      ) {
        // Try document search
        searchResults = await searchDocuments(userMessage);
        if (searchResults.found) {
          const sourceMsg = {
            role: 'assistant',
            content: `📚 **Найденные источники:**\n\n${searchResults.sources}`,
            timestamp: new Date().toLocaleTimeString()
          };
          setMessages(prev => [...prev, sourceMsg]);
        }
      }

      // ✅ Отправляем на LLM с контекстом документов если есть
      const chatPayload = {
        message: userMessage,
        index_name: selectedIndex,
        top_k: 3
      };

      if (searchResults?.context) {
        chatPayload.context = searchResults.context;
      }

      const response = await fetch('http://localhost:4000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(chatPayload)
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();

      if (data.message) {
        const assistantMsg = {
          role: 'assistant',
          content: data.message,
          sources: data.sources,
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
    setMessages,
    loading,
    error,
    handleChat,
    clearMessages,
    messagesEndRef,
    // ✅ НОВОЕ: Document Pipeline API
    indexDocuments,
    searchDocuments,
    indexes,
    selectedIndex,
    setSelectedIndex,
    loadIndexes
  };
}
