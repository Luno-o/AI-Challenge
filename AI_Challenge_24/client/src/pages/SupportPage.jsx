import React, { useState } from 'react';
import './SupportPage.css';

export default function SupportPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState('user_' + Date.now());

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:4000/api/support/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          question: input
        })
      });

      const data = await response.json();

      const assistantMessage = {
        role: 'assistant',
        content: data.answer,
        sources: data.sources || [],
        context: data.user_context
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Ошибка при получении ответа: ' + error.message
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="support-container">
      <div className="support-header">
        <h1>💬 Support Assistant</h1>
        <p className="user-id">User ID: {userId}</p>
      </div>

      <div className="support-chat">
        {messages.map((msg, idx) => (
          <div key={idx} className={'message ' + msg.role}>
            <p>{msg.content}</p>
            {msg.sources && msg.sources.length > 0 && (
              <div className="sources">
                <strong>📚 Sources:</strong>
                <ul>
                  {msg.sources.map((source, sidx) => (
                    <li key={sidx}>
                      <strong>{source.document}</strong>
                      <p className="source-preview">
                        relevance: {(source.relevance * 100).toFixed(0)}%
                      </p>
                      <p className="source-preview">{source.chunk}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {msg.context && (
              <div className="context">
                <strong>👤 User Context:</strong>
                <p>Open issues: {msg.context.open_issues}</p>
                <p>Past issues: {msg.context.past_issues_count}</p>
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="message assistant">
            <p>⏳ Думаю...</p>
          </div>
        )}
      </div>

      <div className="support-input">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Задайте вопрос о поддержке..."
          disabled={loading}
        />
        <button onClick={handleSendMessage} disabled={loading}>
          {loading ? '⏳ Loading...' : '📤 Send'}
        </button>
      </div>
    </div>
  );
}
