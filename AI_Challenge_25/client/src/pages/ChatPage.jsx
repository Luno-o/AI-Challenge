// client/src/pages/ChatPage.jsx

import { useState, useEffect, useRef } from 'react';
import { useChatWithPerplexity } from '../hooks/useChatWithPerplexity';
import { RagModeSelector } from './RagModeSelector';
import './ChatPage.css';

// Извлекаем источники из RAG ответа
function extractSources(res) {
  if (!res || (!res.filteredChunks?.length && !res.retrievedChunks?.length)) return null;

  const sources = (res.filteredChunks || res.retrievedChunks || [])
    .slice(0, 3)
    .map(chunk => ({
      id: chunk.id,
      file: chunk.file_path,
      score: chunk.score?.toFixed(3),
      rerankScore: chunk.rerankScore?.toFixed(3),
      preview: chunk.text.substring(0, 100) + '...'
    }));

  return sources;
}

export default function ChatPage() {
  const [input, setInput] = useState('');
  const [testResults, setTestResults] = useState(null);
  const [testLoading, setTestLoading] = useState(false);
  const [showDocPanel, setShowDocPanel] = useState(false);
  const [indexLoading, setIndexLoading] = useState(false);
  const inputRef = useRef(null);

  const {
    messages = [],
    setMessages,
    loading,
    error,
    handleChat,
    clearMessages,
    messagesEndRef,
    // Document Pipeline
    indexDocuments,
    searchDocuments,
    indexes = [],
    selectedIndex,
    setSelectedIndex,
    loadIndexes,
    // RAG
    ragMode,
    setRagMode,
    compareRagModes,
    askWithRagMode
  } = useChatWithPerplexity();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, messagesEndRef]);

  // ===== Index documents =====
  const handleIndexDocuments = async () => {
    setIndexLoading(true);
    try {
      await indexDocuments('./documents');
      await loadIndexes();
    } catch (err) {
      const errMsg = {
        role: 'assistant',
        content: `❌ Ошибка: ${err.message}`,
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIndexLoading(false);
    }
  };

  // ===== Tests =====
  const runTests = async () => {
    setTestLoading(true);
    setTestResults(null);
    try {
      const response = await fetch('http://localhost:5000/api/test/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();
      setTestResults(data);

      if (data.tests) {
        const testMsg = {
          role: 'assistant',
          content: `🧪 **Test Results**\n\n${data.tests
            .map((t) => `${t.status === 'PASSED' ? '✅' : '❌'} ${t.name} (${t.duration}ms)`)
            .join('\n')}\n\n**Summary:** ${data.summary}\n**Total Time:** ${data.duration}ms`,
          timestamp: new Date().toLocaleTimeString()
        };
        setMessages((prev) => [...prev, testMsg]);
      }

      console.log('✅ Test results:', data);
    } catch (err) {
      setTestResults({
        error: err.message,
        summary: '❌ Error running tests',
        passed: 0,
        failed: 1
      });
      console.error('Test error:', err);
    } finally {
      setTestLoading(false);
    }
  };

  // 🆕 ===== Docker Command Handler =====
  const handleDockerCommand = async (command) => {
    const userMsg = {
      role: 'user',
      content: command,
      timestamp: new Date().toLocaleTimeString()
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      console.log(`🐳 Sending Docker command: "${command}"`);
      
 const response = await fetch('/api/docker/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: command })
});

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('🐳 Docker response:', data);

      const assistantMsg = {
        role: 'assistant',
        content: data.answer || data.error || 'No response',
        timestamp: new Date().toLocaleTimeString(),
        dockerResult: data.docker_result,
        toolUsed: data.tool_used
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (error) {
      console.error('🐳 Docker command error:', error);
      const errMsg = {
        role: 'assistant',
        content: `❌ Ошибка Docker: ${error.message}\n\n💡 Убедитесь что:\n- Backend запущен на порту 4000\n- Docker Desktop запущен\n- Docker MCP сервер инициализирован`,
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, errMsg]);
    }
  };

  // ===== Submit =====
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const question = input.trim();
    console.log('Submitting with ragMode:', ragMode);

    const userMsg = {
      role: 'user',
      content: question,
      timestamp: new Date().toLocaleTimeString(),
      ragMode
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');

    try {
      // 1. Проверка на GitHub PR (приоритетнее RAG)
      if (question.toLowerCase().includes('pull request') || question.toLowerCase().includes('pr')) {
        const response = await fetch('/api/github/pulls');
        const data = await response.json();
        // TODO: handle PR data
      }

      // 2. Обычный чат без RAG
      if (!ragMode) {
        await handleChat(question);
        inputRef.current?.focus();
        return;
      }

      // 3. RAG запрос
      const res =
        ragMode === 'compare_rerank'
          ? await compareRagModes(question)
          : await askWithRagMode(question, ragMode);

      const assistantMsg = {
        role: 'assistant',
        content: res.llmAnswer || JSON.stringify(res, null, 2),
        timestamp: new Date().toLocaleTimeString(),
        sources: extractSources(res),
        rawData: res
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Submit error:', err);
      const errMsg = {
        role: 'assistant',
        content: `❌ Ошибка: ${err.message}`,
        timestamp: new Date().toLocaleTimeString(),
        sources: null
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      inputRef.current?.focus();
    }
  };

  // ===== Quick prompts =====
  const quickPrompts = [
    { text: '🧪 Tests', emoji: '🧪', action: 'test' },
    { text: '📋 Issues', emoji: '📋', prompt: 'Какие открытые issues?' },
    { text: '🐳 Docker', emoji: '🐳', prompt: 'подними postgres', isDocker: true },
    { text: '📚 Docs', emoji: '📚', action: 'docs' }
  ];

  const handleQuickPrompt = async (prompt) => {
    if (prompt.action === 'test') {
      runTests();
    } else if (prompt.action === 'docs') {
      setShowDocPanel(!showDocPanel);
    } else if (prompt.prompt) {
      // 🔥 Если это Docker команда - использовать Docker handler
      if (prompt.isDocker || prompt.text.includes('🐳')) {
        await handleDockerCommand(prompt.prompt);
      } else {
        await handleChat(prompt.prompt);
      }
      setInput('');
    }
  };

  return (
    <div className="chat-page">
      {/* ========== HEADER ========== */}
      <div className="chat-header">
        <h1>🤖 AI Docker Document</h1>
        <button onClick={clearMessages} className="clear-btn">
          🗑️ Clear Chat
        </button>
      </div>

      <div className="chat-content">
        {/* ========== DOCUMENT PANEL (SIDEBAR) ========== */}
        {showDocPanel && (
          <div className="doc-panel">
            <div className="doc-panel-header">
              <h3>📚 Document Index Management</h3>
              <button onClick={() => setShowDocPanel(false)}>✖</button>
            </div>

            <div className="doc-actions">
              <button
                onClick={handleIndexDocuments}
                disabled={indexLoading}
                className="index-btn"
              >
                {indexLoading ? '⏳ Indexing...' : '📂 Index Documents'}
              </button>
              <p className="doc-hint">Index files from ./documents folder</p>
            </div>

            <div className="index-selector">
              <label>Select index for search:</label>
              <select
                value={selectedIndex}
                onChange={(e) => setSelectedIndex(e.target.value)}
              >
                {indexes.map((idx) => (
                  <option key={idx.name} value={idx.name}>
                    {idx.name} ({idx.count} chunks)
                  </option>
                ))}
              </select>
              <p className="doc-hint">
                📄 {indexes.find((i) => i.name === selectedIndex)?.file || 'No file'}
              </p>
            </div>

            <div className="rag-modes">
              <h4>🔍 RAG Mode</h4>
              <RagModeSelector ragMode={ragMode} setRagMode={setRagMode} />
              <p className="doc-usage">
                💡 Выбери режим и задай вопрос. Reranked использует cross-encoder (Sonar) для фильтрации
                нерелевантных чанков.
              </p>
              <p className="doc-usage">💡 Ask questions about documents naturally</p>
            </div>
          </div>
        )}

        {/* ========== MESSAGES ========== */}
        <div className="messages-container">
          {messages.map((msg, idx) => (
            <div key={idx} className={`message ${msg.role}`}>
              <div className="message-header">
                <span className="role">{msg.role === 'user' ? '👨‍💻 You' : '🤖 AI'}</span>
                {msg.timestamp && <span className="timestamp">{msg.timestamp}</span>}
                {msg.ragMode && <span className="rag-tag">{msg.ragMode === 'compare_rerank' ? '🔄 Compare' : msg.ragMode === 'reranked_rag' ? '⭐ Reranked' : '📄 Basic RAG'}</span>}
              </div>

              <div className="message-content">
                {String(msg.content)
                  .split('\n')
                  .map((line, i) => (
                    <p key={i} className="message-line">
                      {line}
                    </p>
                  ))}
              </div>

              {/* RAG источники (только для assistant с sources) */}
              {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                <div className="rag-sources">
                  <div className="sources-header">📚 {msg.sources.length} источников</div>
                  <div className="sources-list">
                    {msg.sources.map((source, i) => (
                      <div key={i} className="source-item" title={source.preview}>
                        <span className="source-file">{source.file}</span>
                        <span className="source-score">
                          {source.rerankScore ? `r:${source.rerankScore}` : source.score}
                        </span>
                        <span className="source-preview">{source.preview}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {msg.role === 'assistant' && error && (
                <div className="error-details">{error}</div>
              )}
            </div>
          ))}

          {loading && (
            <div className="message assistant loading">
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <p>Thinking... (RAG + Sonar rerank)</p>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} className="messages-end" />
        </div>
      </div>

      {/* ========== QUICK PROMPTS ========== */}
      <div className="quick-prompts">
        {quickPrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleQuickPrompt(p)}
            disabled={loading}
            className="quick-prompt-btn"
          >
            <span>{p.emoji} {p.text}</span>
          </button>
        ))}
      </div>

      {/* ========== INPUT FORM ========== */}
      <form onSubmit={handleSubmit} className="input-form">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            ragMode === 'compare_rerank'
              ? 'Ask for RAG compare (basic vs reranked)...'
              : ragMode === 'reranked_rag'
              ? 'Ask with RAG Reranked...'
              : ragMode === 'basic_rag'
              ? 'Ask with basic RAG...'
              : 'Ask me anything or use quick commands below'
          }
          disabled={loading}
          className="chat-input"
        />
        <button type="submit" disabled={loading || !input.trim()} className="send-btn">
          {loading ? '⏳' : '📤 Send'}
        </button>
      </form>

      {/* ========== RAG MODE INDICATOR ========== */}
      {ragMode && (
        <div className="rag-indicator">
          Mode: <strong>{ragMode === 'compare_rerank' ? '🔄 Compare' : ragMode === 'reranked_rag' ? '⭐ RAG Reranked' : ragMode === 'basic_rag' ? '📄 RAG Basic' : 'No RAG'}</strong>
          <button onClick={() => setRagMode(null)} className="clear-mode-btn">
            ✖ Clear mode
          </button>
        </div>
      )}
    </div>
  );
}
