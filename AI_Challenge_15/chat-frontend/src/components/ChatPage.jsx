import { useState, useEffect, useRef } from 'react';
import { useChatWithPerplexity } from '../hooks/useChatWithPerplexity';
import './ChatPage.css';

export default function ChatPage() {
  const [input, setInput] = useState('');
  const [testResults, setTestResults] = useState(null);
  const [testLoading, setTestLoading] = useState(false);
  const inputRef = useRef(null);

   const { 
    messages,      // ✅ ДОБАВИЛ
    setMessages,   // ✅ ДОБАВИЛ - это важно!
    loading, 
    error, 
    handleChat, 
    clearMessages, 
    messagesEndRef 
  } = useChatWithPerplexity();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 🆕 Запуск тестов
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

    // Добавь результаты в чат
    if (data.tests) {
      const testMsg = {
        role: 'assistant',
        content: `🧪 **Test Results**\n\n${data.tests.map(t => 
          `${t.status === 'PASSED' ? '✅' : '❌'} ${t.name} (${t.duration}ms)`
        ).join('\n')}\n\n**Summary:** ${data.summary}\n**Total Time:** ${data.duration}ms`,
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
    { 
      text: '🧪 Tests', 
      emoji: '🧪', 
      action: 'test'
    },
    { 
      text: '📋 Issues', 
      emoji: '📋', 
      prompt: 'Какие открытые issues?' 
    },
    { 
      text: '🔀 PRs', 
      emoji: '🔀', 
      prompt: 'Покажи pull requests' 
    },
    { 
      text: '🐳 Docker', 
      emoji: '🐳', 
      prompt: 'подними postgres' 
    },
  ];

  return (
    <div className="chat-page">
      {/* HEADER */}
      <div className="chat-header">
        <div className="header-content">
          <div className="header-left">
            <div className="logo">
              <span className="logo-emoji">💬</span>
              <div>
                <h1>PerplexityChat</h1>
                <p>AI + Docker + Tests</p>
              </div>
            </div>
          </div>
          <div className="header-right">
            <button 
              className="test-btn"
              onClick={runTests}
              disabled={testLoading}
              title="Run tests"
            >
              {testLoading ? '⏳' : '🧪'} Tests
            </button>
            <button 
              className="clear-btn"
              onClick={clearMessages}
              title="Clear messages"
            >
              🗑️
            </button>
          </div>
        </div>

        {/* Результаты тестов */}
        {testResults && (
          <div className="test-results">
            {testResults.error ? (
              <div className="test-error">❌ {testResults.error}</div>
            ) : (
              <div className="test-success">
                <div>✅ Tests: {testResults.passed} passed, {testResults.failed} failed</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
                  ⏱️ {testResults.duration}ms
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MESSAGES */}
      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">💭</div>
            <h2>Начни разговор</h2>
            <p>Спроси что-нибудь или используй быстрые команды</p>
          </div>
        ) : (
          <div className="messages-list">
            {messages.map((msg, idx) => (
              <div 
                key={idx}
                className={`message-wrapper ${msg.role === 'user' ? 'message-user' : ''}`}
              >
                <span className="message-avatar">
                  {msg.role === 'user' ? '👤' : '🤖'}
                </span>
                <div className="message-bubble">
                  <div className="message-content">{msg.content}</div>
                  <span className="message-time">{msg.timestamp}</span>
                </div>
              </div>
            ))}
            {loading && (
              <div className="message-wrapper">
                <span className="message-avatar">🤖</span>
                <div className="message-bubble loading-bubble">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            {error && (
              <div className="message-wrapper">
                <span className="message-avatar">⚠️</span>
                <div className="message-bubble" style={{ borderColor: 'rgba(255, 84, 89, 0.5)' }}>
                  <div className="message-content" style={{ color: '#ff5459' }}>
                    {error}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {messages.length === 0 && (
          <div className="quick-prompts">
            <h2>Быстрые команды</h2>
            <div className="prompts-grid">
              {quickPrompts.map((p, idx) => (
                <button
                  key={idx}
                  className="prompt-btn"
                  onClick={() => p.action === 'test' ? runTests() : handleChat(p.prompt)}
                  disabled={loading || testLoading}
                >
                  <span className="prompt-emoji">{p.emoji}</span>
                  {p.text}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* INPUT */}
      <div className="input-area">
        <form className="input-form" onSubmit={handleSubmit}>
          <div className="input-wrapper">
            <input
              ref={inputRef}
              type="text"
              className="input-field"
              placeholder="Задай вопрос или команду Docker..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading || testLoading}
            />
            <button
              type="submit"
              className="send-btn"
              disabled={loading || !input.trim()}
            >
              {loading ? '⏳' : '📤'}
            </button>
          </div>
          <p className="input-hint">
            🧪 Click Tests button или напиши команду Docker/Perplexity
          </p>
        </form>
      </div>
    </div>
  );
}
