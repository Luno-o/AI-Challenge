import { useState, useEffect, useRef } from 'react';
import { useChatWithPerplexity } from '../hooks/useChatWithPerplexity';
import { RagModeSelector } from './RagModeSelector';
import './ChatPage.css';

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
      const response = await fetch('http://localhost:4000/api/test/run', {
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

  // ===== Submit =====

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const question = input.trim();
    console.log('Submitting with ragMode:', ragMode);

    try {
      if (!ragMode) {
        // обычный чат без RAG
        await handleChat(question);
      } else if (ragMode === 'compare_rerank') {
        const res = await compareRagModes(question);
        const msg = {
          role: 'assistant',
          content: JSON.stringify(res, null, 2),
          timestamp: new Date().toLocaleTimeString()
        };
        setMessages((prev) => [
          ...prev,
          { role: 'user', content: question, timestamp: new Date().toLocaleTimeString() },
          msg
        ]);
      } else {
        // basic_rag / reranked_rag
        const res = await askWithRagMode(question, ragMode);
        const msg = {
          role: 'assistant',
          content: res.llmAnswer || JSON.stringify(res),
          timestamp: new Date().toLocaleTimeString()
        };
        setMessages((prev) => [
          ...prev,
          { role: 'user', content: question, timestamp: new Date().toLocaleTimeString() },
          msg
        ]);
      }
    } catch (err) {
      console.error('Submit error:', err);
      const errMsg = {
        role: 'assistant',
        content: `❌ Ошибка: ${err.message}`,
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setInput('');
      inputRef.current?.focus();
    }
  };

  // ===== Quick prompts =====

  const quickPrompts = [
    { text: '🧪 Tests', emoji: '🧪', action: 'test' },
    { text: '📋 Issues', emoji: '📋', prompt: 'Какие открытые issues?' },
    { text: '🔀 PRs', emoji: '🔀', prompt: 'Покажи pull requests' },
    { text: '🐳 Docker', emoji: '🐳', prompt: 'подними postgres' },
    { text: '📚 Docs', emoji: '📚', action: 'docs' }
  ];

  const handleQuickPrompt = async (prompt) => {
    if (prompt.action === 'test') {
      runTests();
    } else if (prompt.action === 'docs') {
      setShowDocPanel(!showDocPanel);
    } else if (prompt.prompt) {
      await handleChat(prompt.prompt);
      setInput('');
    }
  };

  return (
    <div className="chat-page">
      <div className="chat-header">
        <h1>AI Docker Document</h1>
        <button onClick={clearMessages} className="clear-btn">
          Clear Chat
        </button>
      </div>

      <div className="chat-content">
        {/* Document Panel */}
        {showDocPanel && (
          <div className="doc-panel">
            <div className="doc-panel-header">
              <h3>Document Index Management</h3>
              <button onClick={() => setShowDocPanel(false)}>×</button>
            </div>

            <div className="doc-actions">
              <button
                onClick={handleIndexDocuments}
                disabled={indexLoading}
                className="index-btn"
              >
                {indexLoading ? 'Indexing...' : 'Index Documents'}
              </button>
              <p className="doc-hint">Index files from ./documents folder</p>
            </div>

            <div className="index-selector">
              <label>Select index for search</label>
              <select
                value={selectedIndex}
                onChange={(e) => setSelectedIndex(e.target.value)}
              >
                {(indexes || []).map((idx) => (
                  <option key={idx.name} value={idx.name}>
                    {idx.name} ({idx.count} chunks)
                  </option>
                ))}
              </select>
              <p className="doc-hint">
                {indexes.find((i) => i.name === selectedIndex)?.file || 'No file'}
              </p>
            </div>

            <div className="rag-modes">
              <h4>RAG</h4>
              <RagModeSelector ragMode={ragMode} setRagMode={setRagMode} />
              <p className="doc-usage">
                Выбери режим и задай вопрос. Reranked использует cross-encoder (Sonar) для
                фильтрации нерелевантных чанков.
              </p>
              <p className="doc-usage">💡 Ask questions about documents naturally</p>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="messages-container">
          {(messages || []).map((msg, idx) => (
            <div key={idx} className={`message ${msg.role}`}>
              <div className="message-header">
                <span className="role">{msg.role === 'user' ? 'You' : 'AI'}</span>
                {msg.timestamp && <span className="timestamp">{msg.timestamp}</span>}
              </div>
              <div className="message-content">
                {String(msg.content || '')
                  .split('\n')
                  .map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
              </div>
            </div>
          ))}
          {loading && (
            <div className="message assistant loading">
              <div className="message-content">Thinking...</div>
            </div>
          )}
          {error && (
            <div className="message error">
              <div className="message-content">{error}</div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Quick prompts */}
      <div className="quick-prompts">
        {(quickPrompts || []).map((p, idx) => (
          <button key={idx} onClick={() => handleQuickPrompt(p)} disabled={loading}>
            <span className="quick-prompt-btn">
              {p.emoji} {p.text}
            </span>
          </button>
        ))}
      </div>

      {/* Input */}
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
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="send-btn"
        >
          {loading ? '...' : 'Send'}
        </button>
      </form>

      {/* RAG Mode indicator */}
      <div className="rag-indicator">
        Mode:{' '}
        <strong>
          {ragMode === 'compare_rerank'
            ? 'Compare'
            : ragMode === 'reranked_rag'
            ? 'RAG Reranked'
            : ragMode === 'basic_rag'
            ? 'RAG Basic'
            : 'No RAG'}
        </strong>
        <button onClick={() => setRagMode(null)} className="clear-mode-btn">
          Clear mode
        </button>
      </div>
    </div>
  );
}
