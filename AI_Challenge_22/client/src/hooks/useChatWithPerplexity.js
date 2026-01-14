import { useState, useRef, useEffect, useCallback } from 'react';

const CHAT_HISTORY_KEY = 'rag-chat-history';

export function useChatWithPerplexity() {
  const [messages, setMessages] = useState(() => {
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

  // Автосохранение
  useEffect(() => {
    try {
      localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages));
    } catch (e) {
      console.warn('localStorage save failed:', e);
    }
  }, [messages]);

  useEffect(() => {
    loadIndexes();
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // ===== Load indexes =====
  async function loadIndexes() {
    try {
      const response = await fetch('/api/documents/indexes');
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

  // ===== Index documents =====
  async function indexDocuments(directory = './documents') {
    try {
      const response = await fetch('/api/documents/index', {
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
          content: `✅ **Документы проиндексированы!**\n\n📂 Файлы: ${data.summary.files_processed}\n✂️ Чанки: ${data.summary.chunks_created}`,
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
        content: `❌ Ошибка: ${err.message}`,
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages((prev) => [...prev, msg]);
    }
  }

  // ===== RAG API =====
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
    return askWithRagMode(question, 'compare_rerank');
  }

  // ===== Main chat =====
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
        // Обычный чат без RAG
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
          sources: null
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
        content: res.llmAnswer || formatRagResponse(res),
        timestamp: new Date().toLocaleTimeString(),
        sources: extractSources(res),
        rawData: res
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

  // Извлекаем источники
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

  // Форматируем ответ
  function formatRagResponse(res) {
    let formatted = res.llmAnswer || '';
    if (res.filteredChunks?.length) {
      formatted += `\n\n📚 **Источники (${res.filteredChunksCount}/${res.rawChunksCount})**:`;
      res.filteredChunks.slice(0, 3).forEach((chunk, i) => {
        formatted += `\n${i + 1}. [${chunk.score?.toFixed(2)}/${chunk.rerankScore?.toFixed(2)}] ${chunk.file_path}`;
      });
    }
    return formatted;
  }

  function clearMessages() {
    setMessages([]);
    localStorage.removeItem(CHAT_HISTORY_KEY);
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
