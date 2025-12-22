import { useState, useEffect, useRef } from 'react';
import { useChatWithPerplexity } from '../hooks/useChatWithPerplexity';
import './ChatPage.css';

export default function ChatPage() {
  const [input, setInput] = useState('');
  const [testResults, setTestResults] = useState(null);
  const [testLoading, setTestLoading] = useState(false);
  const [showDocPanel, setShowDocPanel] = useState(false);
  const [indexLoading, setIndexLoading] = useState(false);
  const inputRef = useRef(null);

  const {
    messages,
    setMessages,
    loading,
    error,
    handleChat,
    clearMessages,
    messagesEndRef,
    // ✅ НОВОЕ: Document Pipeline functions
    indexDocuments,
    searchDocuments,
    indexes,
    selectedIndex,
    setSelectedIndex,
    loadIndexes
  } = useChatWithPerplexity();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ✅ НОВОЕ: Index documents button
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
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIndexLoading(false);
    }
  };

  // Запуск тестов
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
            .map(t => `${t.status === 'PASSED' ? '✅' : '❌'} ${t.name} (${t.duration}ms)`)
            .join('\n')}\n\n**Summary:** ${data.summary}\n**Total Time:** ${data.duration}ms`,
          timestamp: new Date().toLocaleTimeString()
        };
        setMessages(prev => [...prev, testMsg]);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    await handleChat(input);
    setInput('');
    inputRef.current?.focus();
  };

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
      {/* HEADER */}
      <div className="chat-header">
        <div className="header-content">
          <div className="header-left">
            <div className="logo">
              <span className="logo-emoji">💬</span>
              <div>
                <h1>AI Assistant</h1>
                <p>AI + Docker + Documents</p>
              </div>
            </div>
          </div>

          <div className="header-right">
            <div className="stats-mini">
              <div className="stat">
                <span className="stat-label">Messages</span>
                <span className="stat-value">{messages.length}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Indexes</span>
                <span className="stat-value">{indexes.length}</span>
              </div>
            </div>

            <button
              className="tools-toggle"
              onClick={() => setShowDocPanel(!showDocPanel)}
              title="Toggle Document Panel"
            >
              📚
            </button>

            <button
              className="clear-btn"
              onClick={clearMessages}
              title="Clear Messages"
            >
              🗑️
            </button>
          </div>
        </div>
      </div>

      {/* ✅ НОВОЕ: DOCUMENT PANEL */}
      {showDocPanel && (
        <div className="tools-panel">
          <div className="tools-content">
            <h3>📚 Document Pipeline</h3>
            <div className="tools-grid">
              <div className="tool-card">
                <div className="tool-icon">📂</div>
                <div className="tool-info">
                  <strong>Index Documents</strong>
                  <p>Index files from ./documents folder</p>
                </div>
                <button
                  onClick={handleIndexDocuments}
                  disabled={indexLoading}
                  style={{
                    padding: '6px 12px',
                    background: '#64b5f6',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '12px',
                    marginLeft: 'auto'
                  }}
                >
                  {indexLoading ? '⏳...' : '✅ Index'}
                </button>
              </div>

              <div className="tool-card">
                <div className="tool-icon">📚</div>
                <div className="tool-info">
                  <strong>Available Indexes</strong>
                  <p>Select index for search</p>
                </div>
              </div>

              {indexes.length > 0 && (
                <div className="tool-card">
                  <div className="tool-icon">🎯</div>
                  <div className="tool-info">
                    <strong>Index: {selectedIndex}</strong>
                    <p>{indexes.find(i => i.name === selectedIndex)?.file || 'No file'}</p>
                  </div>
                </div>
              )}

              <div className="tool-card">
                <div className="tool-icon">💡</div>
                <div className="tool-info">
                  <strong>Search Tips</strong>
                  <p>Ask questions about documents naturally</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MESSAGES AREA */}
      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">💭</div>
            <h2>Welcome to AI Assistant</h2>
            <p>Ask me anything or use quick commands below</p>
          </div>
        ) : (
          <div className="messages-list">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`message-wrapper ${msg.role === 'user' ? 'message-user' : ''}`}
              >
                <div className="message-avatar">
                  {msg.role === 'user' ? '👤' : '🤖'}
                </div>
                <div className="message-bubble">
                  <div className="message-content">
                    {msg.content}
                  </div>
                  {msg.sources && (
                    <div style={{
                      marginTop: '8px',
                      paddingTop: '8px',
                      borderTop: '1px solid rgba(255,255,255,0.2)',
                      fontSize: '11px',
                      color: 'rgba(100, 181, 246, 0.8)'
                    }}>
                      📚 Sources: {msg.sources.length}
                    </div>
                  )}
                  <span className="message-time">
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            ))}
            {loading && (
              <div className="message-wrapper">
                <div className="message-avatar">🤖</div>
                <div className="message-bubble loading-bubble">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* QUICK PROMPTS */}
      {messages.length === 0 && (
        <div className="quick-prompts">
          <h2>✨ Quick Commands</h2>
          <div className="prompts-grid">
            {quickPrompts.map((prompt, idx) => (
              <button
                key={idx}
                className="prompt-btn"
                onClick={() => handleQuickPrompt(prompt)}
                disabled={loading || testLoading}
              >
                <span className="prompt-emoji">{prompt.emoji}</span>
                {prompt.text}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* INPUT AREA */}
      <div className="input-area">
        <form className="input-form" onSubmit={handleSubmit}>
          <div className="input-wrapper">
            <input
              ref={inputRef}
              type="text"
              className="input-field"
              placeholder="Ask me anything... (or type to search documents)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <button
              type="submit"
              className="send-btn"
              disabled={loading || !input.trim()}
            >
              {loading ? '⏳' : '📤'}
            </button>
          </div>
          {error && (
            <p style={{ color: '#ff5459', margin: '8px 0 0 0', fontSize: '12px' }}>
              ❌ {error}
            </p>
          )}
          <p className="input-hint">
            💡 Tip: Use quick commands or ask questions about your documents
          </p>
        </form>
      </div>
    </div>
  );
}
