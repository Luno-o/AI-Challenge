import { useState, useRef, useEffect } from 'react';

export function useChatWithPerplexity() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [indexes, setIndexes] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState('docs_index');
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

  // Load available document indexes
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

  // Index documents from directory
  async function indexDocuments(directory = './documents') {
    try {
      const response = await fetch('http://localhost:4000/api/documents/index', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          directory,
          file_patterns: ['*.md', '*.txt'],
          index_name: 'docs_index',
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

  // Search in document index
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

  // ✅ НОВОЕ: RAG Compare API
  async function compareRagModes(question) {
    try {
      const response = await fetch('http://localhost:4000/api/rag/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          mode: 'compare',
          indexName: selectedIndex,
          topK: 5
        })
      });

      const data = await response.json();
      if (data.mode === 'compare') {
        return {
          success: true,
          formatted: data.formatted || formatCompareForUI(data)
        };
      }
    } catch (err) {
      console.error('RAG compare error:', err);
      return { success: false, error: err.message };
    }
  }

  // ✅ НОВОЕ: RAG Answer (with or without RAG)
async function askWithRagMode(question, mode = 'with_rag') {
  try {
    const response = await fetch('http://localhost:4000/api/rag/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        mode, // 'with_rag' or 'no_rag'
        indexName: selectedIndex,
        topK: 5
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.details || errorData.error || 'RAG API error');
    }

    const data = await response.json();
    return {
      success: true,
      mode: data.mode,
      answer: data.answer,
      chunks: data.retrievedChunks || []
    };
  } catch (err) {
    console.error('RAG ask error:', err);
    return { 
      success: false, 
      error: err.message,
      answer: `❌ Ошибка: ${err.message}`
    };
  }
}


  // Helper: format compare result for UI
  function formatCompareForUI(data) {
    const topChunks = (data.withRag.retrievedChunks || []).slice(0, 3)
      .map((c, i) => `- [score=${c.score.toFixed(2)}] ${c.file_path}: "${c.text.substring(0, 100)}..."`)
      .join('\n');

    return `📌 ВОПРОС:
${data.question}

🧠 ОТВЕТ БЕЗ RAG:
${data.noRag.llmAnswer}

📚 ОТВЕТ С RAG:
${data.withRag.llmAnswer}

🔍 ГДЕ RAG ПОМОГ:
${(data.analysis.whereRagHelped || []).map(p => `- ${p}`).join('\n')}

😐 ГДЕ RAG НЕ НУЖЕН:
${(data.analysis.whereRagNotNeeded || []).map(p => `- ${p}`).join('\n')}

📎 ИСПОЛЬЗОВАННЫЕ ЧАНКИ:
${topChunks}

💡 ОБЩИЙ ВЫВОД:
${data.analysis.summary}`;
  }

  // Docker команды
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

async function handleChat(userMessage, ragMode = null) {
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
    // ✅ КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ: Если выбран RAG режим — сразу обрабатываем через RAG API
    // НИКАКИЕ триггеры (Docker, docs search) НЕ должны срабатывать!
    if (ragMode) {
      console.log(`🎯 RAG mode detected: ${ragMode}`); // Для отладки

      if (ragMode === 'compare') {
        const compareResult = await compareRagModes(userMessage);
        if (compareResult.success) {
          const compareMsg = {
            role: 'assistant',
            content: compareResult.formatted,
            timestamp: new Date().toLocaleTimeString()
          };
          setMessages(prev => [...prev, compareMsg]);
          setLoading(false);
          return; // ✅ ВЫХОД из функции, Docker триггеры не выполняются
        }
      } else if (ragMode === 'with_rag' || ragMode === 'no_rag') {
        const ragResult = await askWithRagMode(userMessage, ragMode);
        if (ragResult.success) {
          let content = `**[${ragMode === 'with_rag' ? '📚 С RAG' : '🧠 Без RAG'}]**\n\n${ragResult.answer}`;
          if (ragResult.chunks && ragResult.chunks.length > 0) {
            const sources = ragResult.chunks.slice(0, 3)
              .map((c, i) => `${i + 1}. [score=${c.score.toFixed(2)}] ${c.file_path}`)
              .join('\n');
            content += `\n\n📎 **Источники:**\n${sources}`;
          }
          const ragMsg = {
            role: 'assistant',
            content,
            timestamp: new Date().toLocaleTimeString()
          };
          setMessages(prev => [...prev, ragMsg]);
          setLoading(false);
          return; // ✅ ВЫХОД из функции
        }
      }
    }

    // ✅ Docker команды проверяются ТОЛЬКО если НЕ выбран RAG режим
    console.log('🐳 Checking Docker triggers...'); // Для отладки
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

    // ✅ Проверяем если это запрос о документах (старая логика)
    const docMsg = userMessage.toLowerCase();
    let searchResults = null;

    if (
      docMsg.includes('найди') ||
      docMsg.includes('поиск') ||
      docMsg.includes('документ') ||
      docMsg.includes('где') ||
      docMsg.includes('как')
    ) {
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

    // Отправляем на LLM с контекстом документов если есть
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
    // Document Pipeline API
    indexDocuments,
    searchDocuments,
    indexes,
    selectedIndex,
    setSelectedIndex,
    loadIndexes,
 // ✅ ДОБАВИТЬ ЭТИ ДВЕ СТРОКИ:
  compareRagModes,
  askWithRagMode
  };
}
