// chat-frontend/src/components/ChatPage.jsx
import { useState, useEffect, useRef } from 'react';
import { useChatWithPerplexity } from '../hooks/useChatWithPerplexity';
import './ChatPage.css';

export default function ChatPage() {
  const [input, setInput] = useState('');
  const [tools, setTools] = useState([]);
  const [showTools, setShowTools] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const { 
    messages, 
    isLoading, 
    sendMessage, 
    loadHistory, 
    clearHistory, 
    getGitHubTools,
    stats ,
        addSummary,       // ✅ НОВОЕ
  } = useChatWithPerplexity();

  useEffect(() => {
    loadHistory();
    loadGitHubTools();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadGitHubTools = async () => {
    const githubTools = await getGitHubTools();
    setTools(githubTools);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    await sendMessage(input);
    setInput('');
    inputRef.current?.focus();
  };
   const handleSummarize = async () => {
    if (isLoading) return;
    await addSummary();
  };

  const quickPrompts = [
    { text: '📋 Issues', emoji: '📋', prompt: 'Какие открытые issues в моем репозитории?' },
    { text: '🔀 PRs', emoji: '🔀', prompt: 'Покажи все открытые pull requests' },
    { text: '🌳 Branches', emoji: '🌳', prompt: 'Список всех веток в репозитории' },
    { text: '📊 Info', emoji: '📊', prompt: 'Информация о репозитории' },
  ];

  return (
    <div className="chat-page">
      {/* Header */}
      <header className="chat-header">
             <button
          onClick={handleSummarize}
          disabled={isLoading || messages.length < 4}
        >
          🔄 Сжать диалог
        </button>
        <button onClick={clearHistory} disabled={isLoading}>
          🧹 Очистить историю
        </button>
        <div className="header-content">
          <div className="header-left">
            <div className="logo">
              <span className="logo-emoji">🤖</span>
              <div>
                <h1>GitHub Assistant</h1>
                <p>Powered by Perplexity AI + MCP</p>
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
                <span className="stat-label">Tools</span>
                <span className="stat-value">{tools.length}</span>
              </div>
            </div>
            
            <button 
              onClick={() => setShowTools(!showTools)}
              className="tools-toggle"
              title="Toggle tools"
            >
              🔧
            </button>
            
            <button 
              onClick={clearHistory}
              className="clear-btn"
              title="Clear history"
            >
              🗑️
            </button>
          </div>
        </div>
      </header>

      {/* Tools Panel */}
      {showTools && (
        <div className="tools-panel">
          <div className="tools-content">
            <h3>🔧 Available GitHub Tools ({tools.length})</h3>
            <div className="tools-grid">
              {tools.map(tool => (
                <div key={tool.name} className="tool-card">
                  <div className="tool-icon">
                    {tool.name.includes('issue') && '📋'}
                    {tool.name.includes('pr') && '🔀'}
                    {tool.name.includes('branch') && '🌳'}
                    {tool.name.includes('commit') && '📝'}
                    {tool.name.includes('repo') && '📦'}
                  </div>
                  <div className="tool-info">
                    <strong>{tool.name}</strong>
                    <p>{tool.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quick Prompts */}
      {messages.length === 0 && (
        <div className="quick-prompts">
          <h2>💡 Quick Actions</h2>
          <div className="prompts-grid">
            {quickPrompts.map((item, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setInput(item.prompt);
                  setTimeout(() => inputRef.current?.focus(), 0);
                }}
                className="prompt-btn"
              >
                <span className="prompt-emoji">{item.emoji}</span>
                <span className="prompt-text">{item.text}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
     <div className="messages-container">
  {messages.length === 0 ? (
    <div className="empty-state">
      <div className="empty-icon">💬</div>
      <h2>Начните диалог</h2>
      <p>Задайте вопрос о своем репозитории</p>
    </div>
  ) : (
    <div className="messages-list">
      {messages.map((m, i) => {
        const isUser = m.role === 'user';
        const wrapperClass =
          'message-wrapper ' +
          (isUser ? 'message-user' : 'message-assistant') +
          (m.isSummary ? ' summary' : '');

        return (
          <div key={i} className={wrapperClass}>
            <div className="message-avatar">
              {isUser ? '🧑‍💻' : m.isSummary ? '📝' : '🤖'}
            </div>
            <div className="message-bubble">
              {m.isSummary && (
                <div className="summary-label">Резюме диалога</div>
              )}
              <div className="message-content">{m.content}</div>
              {/* при желании можно добавить время */}
              {/* <span className="message-time">{...}</span> */}
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  )}
</div>


      {/* Input */}
      <div className="input-area">
        <form onSubmit={handleSubmit} className="input-form">
          <div className="input-wrapper">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about issues, PRs, branches, commits..."
              disabled={isLoading}
              className="input-field"
              autoFocus
            />
            <button 
              type="submit" 
              disabled={isLoading || !input.trim()}
              className="send-btn"
            >
              {isLoading ? '⏳' : '📤'}
            </button>
          </div>
          <p className="input-hint">
            💡 Tip: Ask about your GitHub repository, powered by MCP tools
          </p>
        </form>
      </div>
    </div>
  );
}
