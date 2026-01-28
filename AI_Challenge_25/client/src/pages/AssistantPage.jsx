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
      // Команда: /pr review <number>
      const prReviewMatch = command.match(/\/pr\s+review\s+(\d+)/i);
      if (prReviewMatch) {
        const prNumber = prReviewMatch[1];
        
const response = await fetch(`http://localhost:5000/api/pr/review/${prNumber}`, {
  method: 'POST'  // ← Эта строка ДОЛЖНА быть!
});
        const data = await response.json();

        if (data.success) {
          let content = `## 🤖 PR #${data.pr.number} Review\n\n`;
          content += `**Title:** ${data.pr.title}\n`;
          content += `**Author:** ${data.pr.author}\n`;
          content += `**URL:** ${data.pr.url}\n\n`;
          content += `---\n\n`;
          content += `### 📊 Summary\n\n${data.review.summary}\n\n`;
          
          if (data.review.fileReviews && data.review.fileReviews.length > 0) {
            content += `### 📝 File Reviews (${data.review.filesCount} files)\n\n`;
            data.review.fileReviews.slice(0, 5).forEach(fr => {
              content += `#### 📄 ${fr.file} (${fr.status})\n\n${fr.review}\n\n---\n\n`;
            });
            
            if (data.review.fileReviews.length > 5) {
              content += `*... and ${data.review.fileReviews.length - 5} more files*\n\n`;
            }
          }
          
          content += `\n*Powered by RAG + Perplexity AI*`;

          const assistantMsg = {
            role: 'assistant',
            content,
            timestamp: new Date().toLocaleTimeString()
          };

          setMessages(prev => [...prev, assistantMsg]);
          return;
        } else {
          throw new Error(data.error || 'PR review failed');
        }
      }

      // Команда: /pr (список PR)
      if (command.toLowerCase() === '/pr' || 
          command.toLowerCase().includes('pull request') ||
          command.toLowerCase().includes('покажи pr')) {
        
        const response = await fetch('http://localhost:5000/api/github/pulls');
        const data = await response.json();

        if (data.success) {
          const prList = data.pulls.length > 0
            ? data.pulls.map(pr => 
                `**#${pr.number}** ${pr.title}\n` +
                `- 👤 Author: ${pr.author}\n` +
                `- 🌿 ${pr.base} ← ${pr.head}\n` +
                `- 🔗 ${pr.url}`
              ).join('\n\n')
            : 'No pull requests found';

          const assistantMsg = {
            role: 'assistant',
            content: `📋 **Pull Requests (${data.count}):**\n\n${prList}\n\n` +
                     `💡 *Use \`/pr review <number>\` to get AI analysis*`,
            timestamp: new Date().toLocaleTimeString()
          };

          setMessages(prev => [...prev, assistantMsg]);
          return;
        } else {
          throw new Error(data.error || 'Failed to fetch PRs');
        }
      }

      // Остальные Assistant команды (/help, /code, /review)
      const response = await fetch('http://localhost:5000/api/assistant/command', {
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
    { label: '🤖 Review PR', cmd: '/pr review 1' },
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
            <div className="msg-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <p>Analyzing...</p>
            </div>
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
          placeholder="/help | /code <file> | /review | /pr | /pr review <number>"
          disabled={loading}
        />
        <button type="submit" disabled={loading || !input.trim()}>
          {loading ? '...' : 'Send'}
        </button>
      </form>
    </div>
  );
}
