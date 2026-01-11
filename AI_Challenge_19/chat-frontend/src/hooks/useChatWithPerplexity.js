import { useState, useRef, useEffect, useCallback } from 'react';  // ← + useCallback



const CHAT_HISTORY_KEY = 'rag-chat-history';

export function useChatWithPerplexity() {
  const [messages, setMessages] = useState(() => {
    // Восстанавливаем из localStorage
    try {
      const saved = localStorage.getItem(CHAT_HISTORY_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [indexes, setIndexes] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState('docs_index');
  const messagesEndRef = useRef(null);
  const [ragMode, setRagMode] = useState('reranked_rag');

  // Автосохранение в localStorage
  useEffect(() => {
    try {
      localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages));
    } catch (e) {
      console.warn('localStorage save failed:', e);
    }
  }, [messages]);

  // Session restore при открытии новой вкладки
  useEffect(() => {
    const sessionKey = `${CHAT_HISTORY_KEY}_session`;
    const sessionData = sessionStorage.getItem(sessionKey);
    if (sessionData && messages.length === 0) {
      try {
        const parsed = JSON.parse(sessionData);
        setMessages(parsed);
      } catch {}
    }
    sessionStorage.setItem(sessionKey, JSON.stringify(messages));
  }, []);

  useEffect(() => {
    loadIndexes();
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);


  // ===== Documents indexes =====

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
        setMessages((prev) => [...prev, msg]);
        await loadIndexes();
      } else {
        throw new Error(data.error || 'Indexing failed');
      }
    } catch (err) {
      const msg = {
        role: 'assistant',
        content: `❌ Ошибка при индексировании: ${err.message}`,
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages((prev) => [...prev, msg]);
    }
  }

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

      return { found: false, error: data.error || 'Search failed' };
    } catch (err) {
      console.error('Search error:', err);
      return { found: false, error: err.message };
    }
  }

  // ===== RAG API: универсальный вызов =====

  async function askWithRagMode(question, mode = ragMode) {
    const body = {
      question,
      mode,
      indexName: selectedIndex || 'docs_index',
      topK: 10
    };

    const resp = await fetch('/api/rag/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!resp.ok) {
      throw new Error(`RAG request failed: ${resp.status}`);
    }

    return resp.json();
  }

  async function compareRagModes(question) {
    // Просто прокидываем режим compare_rerank
    return askWithRagMode(question, 'compare_rerank');
  }

  // ===== Docker / orchestration (оставляю как было) =====
  // executeDockerCommand, summary-chain и т.п. — возьми из твоего текущего файла,
  // здесь не трогаем, чтобы не ломать.

  async function executeDockerCommand(userMessage) {
    const msg = userMessage.toLowerCase();

    // setup-test-env
    if (
      (msg.includes('подними') || msg.includes('создай')) &&
      (msg.includes('postgres') ||
        msg.includes('redis') ||
        msg.includes('тестовое') ||
        msg.includes('окружение'))
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
            response: `✅ **Тестовое окружение создано!**\n\n📦 PostgreSQL:\n- ID: ${result.environment.postgres.id.substring(
              0,
              12
            )}\n- Порт: ${
              result.environment.postgres.port
            }\n- Пароль: ${result.environment.postgres.password}\n\n🔴 Redis:\n- ID: ${result.environment.redis.id.substring(
              0,
              12
            )}\n- Порт: ${
              result.environment.redis.port
            }\n\n📋 Задача создана: ${result.task_id}\n🔗 GitHub summary: ${result.github_summary}`
          };
        }
        return { detected: true, response: `❌ Ошибка при создании окружения: ${result.error}` };
      } catch (e) {
        return {
          detected: true,
          response: `❌ Ошибка при создании окружения: ${e.message}`
        };
      }
    }

    // cleanup-env
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
            response: `✅ **Окружение очищено!**\n\n🗑️ Удалено контейнеров: ${
              result.cleanup.containers_removed
            }\n📋 Архивировано задач: ${
              result.cleanup.tasks_archived
            }\n🔗 GitHub summary: ${result.cleanup.github_summary}`
          };
        }
        return { detected: true, response: `❌ Ошибка при очистке: ${result.error}` };
      } catch (e) {
        return {
          detected: true,
          response: `❌ Ошибка при очистке: ${e.message}`
        };
      }
    }

    // list containers
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
            .map((c) => `- **${c.name}** (${c.image})\n  📊 Status: ${c.status}`)
            .join('\n');

          return {
            detected: true,
            response: `📦 **Контейнеры в системе (${result.count}):**\n\n${containersList}`
          };
        }
        return { detected: true, response: `❌ Ошибка при получении списка: ${result.error}` };
      } catch (e) {
        return {
          detected: true,
          response: `❌ Ошибка при получении списка: ${e.message}`
        };
      }
    }

    return { detected: false };
  }

  // ===== Основной чат =====

 // Обновлённый handleChat с источниками RAG
  async function handleChat(userMessage) {
    setLoading(true);
    setError('');

    const userMsg = {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toLocaleTimeString(),
      ragMode
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      if (!ragMode) {
        // Обычный чат
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: userMessage })
        });
        const data = await response.json();

        const assistantMsg = {
          role: 'assistant',
          content: data.answer || data.message || JSON.stringify(data),
          timestamp: new Date().toLocaleTimeString(),
          sources: null // нет RAG
        };
        setMessages(prev => [...prev, assistantMsg]);
        return;
      }

      // RAG запрос
      const res = ragMode === 'compare_rerank' 
        ? await compareRagModes(userMessage)
        : await askWithRagMode(userMessage, ragMode);

      const assistantMsg = {
        role: 'assistant',
        content: res.llmAnswer || formatRagResponse(res), // красиво форматируем
        timestamp: new Date().toLocaleTimeString(),
        sources: extractSources(res), // извлекаем источники
        rawData: res // полные данные для отладки
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Chat error:', err);
      const errMsg = {
        role: 'assistant',
        content: `❌ Ошибка: ${err.message}`,
        timestamp: new Date().toLocaleTimeString(),
        sources: null
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  }

  // Извлекаем источники из RAG ответа
  function extractSources(res) {
    if (!res || !res.filteredChunks?.length) return null;
    
    return res.filteredChunks.map((chunk, i) => ({
      id: chunk.id,
      file: chunk.file_path,
      score: chunk.score?.toFixed(3),
      rerankScore: chunk.rerankScore?.toFixed(3),
      preview: chunk.text.substring(0, 100) + '...'
    })).slice(0, 3);
  }

  // Форматируем RAG ответ для UI
  function formatRagResponse(res) {
    let formatted = res.llmAnswer || '';
    
    if (res.filteredChunks?.length) {
      formatted += `\n\n📚 **Источники (${res.filteredChunksCount}/${res.rawChunksCount})**:`;
      res.filteredChunks.slice(0, 3).forEach((chunk, i) => {
        formatted += `\n${i+1}. [${chunk.score?.toFixed(2)}/${chunk.rerankScore?.toFixed(2)}] ${chunk.file_path}`;
      });
    }
    
    return formatted;
  }

  function clearMessages() {
    setMessages([]);
    localStorage.removeItem(CHAT_HISTORY_KEY);
    sessionStorage.removeItem(`${CHAT_HISTORY_KEY}_session`);
  }

  return {
    messages,
    setMessages,
    loading,
    error,
    handleChat,
    clearMessages,
    messagesEndRef,
    indexDocuments,
    searchDocuments,
    indexes,
    selectedIndex,
    setSelectedIndex,
    loadIndexes,
    ragMode,
    setRagMode,
    askWithRagMode,
    compareRagModes
  };
}
