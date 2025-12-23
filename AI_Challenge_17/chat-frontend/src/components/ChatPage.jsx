import { useState, useEffect, useRef } from 'react';
import { useChatWithPerplexity } from '../hooks/useChatWithPerplexity';
import './ChatPage.css';

export default function ChatPage() {
  const [input, setInput] = useState('');
  const [testResults, setTestResults] = useState(null);
  const [testLoading, setTestLoading] = useState(false);
  const [showDocPanel, setShowDocPanel] = useState(false);
  const [indexLoading, setIndexLoading] = useState(false);
  const [ragMode, setRagMode] = useState(null); // ✅ НОВОЕ: null | 'with_rag' | 'no_rag' | 'compare'
  const inputRef = useRef(null);

  const {
    messages,
    setMessages,
    loading,
    error,
    handleChat,
    clearMessages,
    messagesEndRef,
    // Document Pipeline functions
    indexDocuments,
    searchDocuments,
    indexes,
    selectedIndex,
    setSelectedIndex,
    loadIndexes,
    // ✅ НОВОЕ: RAG Compare
    compareRagModes,
    askWithRagMode
  } = useChatWithPerplexity();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Index documents button
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

  console.log('📤 Submitting with ragMode:', ragMode); // Для отладки

  await handleChat(input, ragMode); // ✅ Передаём ragMode
  setInput('');
  setRagMode(null); // Сброс режима после отправки
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
      <div className="chat-header">
        <h1>🤖 AI + Docker + Documents</h1>
        <button onClick={clearMessages} className="clear-btn">
          Clear Chat
        </button>
      </div>

      {/* ✅ НОВОЕ: Document Panel с RAG кнопками */}
      {showDocPanel && (
        <div className="doc-panel">
          <div className="doc-panel-header">
            <h3>📚 Document Index Management</h3>
            <button onClick={() => setShowDocPanel(false)}>✕</button>
          </div>

          <div className="doc-actions">
            <button 
              onClick={handleIndexDocuments} 
              disabled={indexLoading}
              className="index-btn"
            >
              {indexLoading ? '⏳ Indexing...' : '🔄 Index Documents'}
            </button>
            <p className="doc-hint">Index files from ./documents folder</p>
          </div>

          <div className="index-selector">
            <label>Select index for search:</label>
            <select 
              value={selectedIndex} 
              onChange={(e) => setSelectedIndex(e.target.value)}
            >
              {indexes.map(idx => (
                <option key={idx.name} value={idx.name}>
                  {idx.name} ({idx.count} chunks)
                </option>
              ))}
            </select>
            <p className="doc-hint">
              {indexes.find(i => i.name === selectedIndex)?.file || 'No file'}
            </p>
          </div>

          {/* ✅ НОВОЕ: RAG Mode Buttons */}
          <div className="rag-modes">
            <h4>🔍 RAG Answer Modes:</h4>
            <div className="rag-buttons">
              <button 
                onClick={() => setRagMode('no_rag')}
                className={`rag-btn ${ragMode === 'no_rag' ? 'active' : ''}`}
              >
                🧠 Without RAG
              </button>
              <button 
                onClick={() => setRagMode('with_rag')}
                className={`rag-btn ${ragMode === 'with_rag' ? 'active' : ''}`}
              >
                📚 With RAG
              </button>
              <button 
                onClick={() => setRagMode('compare')}
                className={`rag-btn ${ragMode === 'compare' ? 'active' : ''}`}
              >
                ⚖️ Compare Both
              </button>
            </div>
            <p className="doc-hint">
              {ragMode === null && 'Select a mode before asking'}
              {ragMode === 'no_rag' && '🧠 Next question will be answered WITHOUT document context'}
              {ragMode === 'with_rag' && '📚 Next question will use document search (RAG)'}
              {ragMode === 'compare' && '⚖️ Next question will show both answers side-by-side'}
            </p>
          </div>

          <div className="doc-usage">
            <p>💡 Ask questions about documents naturally</p>
          </div>
        </div>
      )}

      <div className="messages-container">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role}`}>
            <div className="message-header">
              <span className="role">{msg.role === 'user' ? '👤 You' : '🤖 AI'}</span>
              <span className="timestamp">{msg.timestamp}</span>
            </div>
            <div className="message-content">
              {msg.content.split('\n').map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          </div>
        ))}
        {loading && (
          <div className="message assistant loading">
            <div className="message-content">⏳ Thinking...</div>
          </div>
        )}
        {error && (
          <div className="message error">
            <div className="message-content">❌ {error}</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="quick-prompts">
        {quickPrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleQuickPrompt(p)}
            className="quick-prompt-btn"
            disabled={loading}
          >
            {p.emoji} {p.text}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="input-form">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            ragMode 
              ? `Ask with ${ragMode === 'compare' ? 'comparison' : ragMode === 'with_rag' ? 'RAG' : 'no RAG'}...`
              : 'Ask me anything or use quick commands below'
          }
          disabled={loading}
          className="chat-input"
        />
        <button type="submit" disabled={loading || !input.trim()} className="send-btn">
          {loading ? '⏳' : '➤'}
        </button>
      </form>

      {/* ✅ RAG Mode Indicator */}
      {ragMode && (
        <div className="rag-indicator">
          Mode: <strong>{ragMode === 'compare' ? '⚖️ Compare' : ragMode === 'with_rag' ? '📚 With RAG' : '🧠 No RAG'}</strong>
          <button onClick={() => setRagMode(null)} className="clear-mode-btn">✕</button>
        </div>
      )}
    </div>
  );
}
