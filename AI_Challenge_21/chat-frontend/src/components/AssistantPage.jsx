import { useState, useRef, useEffect } from 'react';
import './AssistantPage.css';

export default function AssistantPage() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem('assistant-history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem('assistant-history', JSON.stringify(messages));
    } catch (e) {
      console.warn('localStorage save failed:', e);
    }
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const command = input.trim();
    const userMsg = {
      role: 'user',
      content: command,
      timestamp: new Date().toLocaleTimeString()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Проверка на GitHub PR команду
      if (command.toLowerCase().includes('pull request') || 
          command.toLowerCase().includes('pr') ||
          command === '/pr') {
        
        const response = await fetch('/api/github/pulls');
        const data = await response.json();

        if (data.success) {
          const prList = data.pulls.length > 0
            ? data.pulls.map(pr => `**#${pr.number}** ${pr.title}\n- Author: ${pr.author}\n- ${pr.base} ← ${pr.head}`).join('\n\n')
            : 'No pull requests found';

          const assistantMsg = {
            role: 'assistant',
            content: `📋 **Pull Requests (${data.count}):**\n\n${prList}`,
            timestamp: new Date().toLocaleTimeString()
          };

          setMessages(prev => [...prev, assistantMsg]);
          return;
        }
      }

      // Обычные Assistant команды (/help, /code, /review)
      const response = await fetch('/api/assistant/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Command failed');
      }

      const assistantMsg = {
        role: 'assistant',
        content: data.answer || data.analysis || data.review || JSON.stringify(data),
        timestamp: new Date().toLocaleTimeString(),
        command: data.command,
        sources: data.sources,
        gitContext: data.gitContext,
        code: data.code,
        filePath: data.filePath
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Assistant error:', err);
      const errMsg = {
        role: 'assistant',
        content: `❌ Ошибка: ${err.message}`,
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const quickCommands = [
    { label: '📚 /help', cmd: '/help как работает RAG?' },
    { label: '📝 /code', cmd: '/code server/ragService.js' },
    { label: '🔍 /review', cmd: '/review' },
    { label: '🔀 /pr', cmd: '/pr' },
    { label: '🌿 Branch', cmd: '/help текущая ветка' },
  ];

  const clearHistory = () => {
    setMessages([]);
    localStorage.removeItem('assistant-history');
  };

  return (
    <div className="assistant-page">
      <div className="assistant-header">
        <h1>🤖 AI Developer Assistant</h1>
        <button onClick={clearHistory} className="clear-btn">Clear</button>
      </div>

      <div className="assistant-messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`assistant-msg ${msg.role}`}>
            <div className="msg-header">
              <span className="role">{msg.role === 'user' ? 'You' : 'Assistant'}</span>
              {msg.timestamp && <span className="timestamp">{msg.timestamp}</span>}
              {msg.command && <span className="cmd-tag">{msg.command}</span>}
            </div>

            <div className="msg-content">
              {msg.content.split('\n').map((line, i) => <p key={i}>{line}</p>)}
            </div>

            {msg.code && (
              <div className="code-block">
                <div className="code-header">{msg.filePath}</div>
                <pre><code>{msg.code}</code></pre>
              </div>
            )}

            {msg.sources && msg.sources.length > 0 && (
              <div className="sources">
                <strong>📚 Sources:</strong>
                {msg.sources.map((src, i) => (
                  <div key={i} className="source-item">
                    {src.file} ({src.score?.toFixed(2)})
                  </div>
                ))}
              </div>
            )}

            {msg.gitContext && (
              <div className="git-context">
                <strong>🌿 Git:</strong> {msg.gitContext.branch} | {msg.gitContext.status?.substring(0, 50)}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="assistant-msg assistant loading">
            <div className="msg-content">Analyzing...</div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="quick-commands">
        {quickCommands.map((q, i) => (
          <button key={i} onClick={() => setInput(q.cmd)}>{q.label}</button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="assistant-input">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="/help | /code <file> | /review | /pr"
          disabled={loading}
        />
        <button type="submit" disabled={loading || !input.trim()}>Send</button>
      </form>
    </div>
  );
}
