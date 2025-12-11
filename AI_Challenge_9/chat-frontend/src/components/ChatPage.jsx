// chat-frontend/src/components/ChatPage.jsx
import { useState, useEffect, useRef } from 'react';
import { useChatWithPerplexity } from '../hooks/useChatWithPerplexity';

export default function ChatPage() {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  
  const { 
    messages, 
    isLoading, 
    sendMessage, 
    loadHistory, 
    clearHistory,
    compressedCount,
    stats
  } = useChatWithPerplexity();

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    await sendMessage(input);
    setInput('');
  };

  return (
    <div style={styles.container}>
      <div style={styles.statsBar}>
        <div style={styles.statsBlock}>
          <div style={styles.statLabel}>📊 Статистика токенов</div>
          <div style={styles.statRow}>
            <span>📤 Запросов:</span>
            <strong>{stats.totalPromptTokens}</strong>
          </div>
          <div style={styles.statRow}>
            <span>📥 Ответов:</span>
            <strong>{stats.totalCompletionTokens}</strong>
          </div>
          <div style={styles.statRow}>
            <span>📈 Всего:</span>
            <strong style={{ color: '#ff6b6b' }}>{stats.totalTokens}</strong>
          </div>
          <div style={styles.statRow}>
            <span>🔄 Запросов:</span>
            <strong>{stats.requests}</strong>
          </div>
          {stats.compressRequests > 0 && (
            <div style={styles.statRow}>
              <span>📦 Сжатий:</span>
              <strong>{stats.compressRequests}</strong>
            </div>
          )}
        </div>
      </div>

      {compressedCount > 0 && (
        <div style={styles.compressInfo}>
          📦 История сжата {compressedCount} раз
        </div>
      )}

      <div style={styles.messagesContainer}>
        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              ...styles.message,
              ...(msg.isSummary ? styles.summaryMessage :
                  msg.role === 'user' ? styles.userMessage : styles.assistantMessage)
            }}
          >
            <strong>
              {msg.isSummary ? '📦 РЕЗЮМЕ' : 
               msg.role === 'user' ? 'Вы:' : 'AI:'}
            </strong>
            <div style={{ whiteSpace: 'pre-wrap', marginTop: '5px', fontSize: msg.isSummary ? '12px' : '14px' }}>
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && <div style={styles.thinking}>Thinking…</div>}
        <div ref={messagesEndRef} />
      </div>

      <div style={styles.formContainer}>
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Напишите сообщение..."
            style={styles.input}
            disabled={isLoading}
          />
          <button type="submit" style={styles.button} disabled={isLoading}>
            Отправить
          </button>
        </form>

        <button 
          onClick={clearHistory} 
          style={styles.clearButton}
        >
          Очистить историю
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    maxWidth: '900px',
    margin: '0 auto',
    padding: '20px'
  },
  statsBar: {
    marginBottom: '15px',
    padding: '15px',
    background: '#f0f8ff',
    border: '1px solid #87ceeb',
    borderRadius: '8px'
  },
  statsBlock: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '15px'
  },
  statLabel: {
    gridColumn: '1 / -1',
    fontWeight: 'bold',
    color: '#0066cc',
    marginBottom: '5px'
  },
  statRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
    padding: '5px 0'
  },
  compressInfo: {
    background: '#fff3cd',
    border: '1px solid #ffc107',
    padding: '10px',
    borderRadius: '6px',
    marginBottom: '10px',
    fontSize: '12px',
    color: '#856404'
  },
  messagesContainer: {
    flex: 1,
    overflowY: 'auto',
    marginBottom: '20px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '15px',
    background: '#fafafa'
  },
  message: {
    marginBottom: '15px',
    padding: '10px',
    borderRadius: '8px'
  },
  userMessage: {
    background: '#e3f2fd',
    marginLeft: '20%'
  },
  assistantMessage: {
    background: '#f5f5f5',
    marginRight: '20%'
  },
  summaryMessage: {
    background: '#fff3cd',
    border: '1px solid #ffc107',
    marginLeft: '5%',
    marginRight: '5%'
  },
  thinking: {
    fontStyle: 'italic',
    color: '#666',
    textAlign: 'center'
  },
  formContainer: {
    display: 'flex',
    gap: '10px',
    flexDirection: 'column'
  },
  form: {
    display: 'flex',
    gap: '10px'
  },
  input: {
    flex: 1,
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '16px'
  },
  button: {
    padding: '10px 20px',
    background: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '16px'
  },
  clearButton: {
    padding: '10px 20px',
    background: '#ff6b6b',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px'
  }
};
