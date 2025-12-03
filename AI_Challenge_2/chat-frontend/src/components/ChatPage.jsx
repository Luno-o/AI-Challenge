import { useState, useEffect, useRef } from 'react';
import { useChatWithPerplexity } from '../hooks/useChatWithPerplexity';

const ROLE_PRESETS = {
  tech: 'Ты — технический ИИ-ассистент. Объясняй код подробно и с примерами.',
  writer: 'Ты — помощник в написании текстов. Помогай с редактурой и стилем.',
  default: 'Ты — универсальный ИИ-ассистент. Отвечай кратко и по-русски.'
};

export default function ChatPage() {
  const [input, setInput] = useState('');
  const [activeRole, setActiveRole] = useState('default');
  const [jsonMode, setJsonMode] = useState(false);
  const messagesEndRef = useRef(null);
  
  const { messages, isLoading, sendMessage, changeRole, loadHistory } = 
    useChatWithPerplexity(ROLE_PRESETS.default);

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    await sendMessage(input, jsonMode);
    setInput('');
  };

  const handleRoleChange = (roleKey) => {
    setActiveRole(roleKey);
    changeRole(ROLE_PRESETS[roleKey]);
  };

  return (
    <div style={styles.container}>
      <label style={styles.jsonToggle}>
        <input 
          type="checkbox" 
          checked={jsonMode} 
          onChange={(e) => setJsonMode(e.target.checked)} 
        />
        JSON режим
      </label>

      <div style={styles.roleButtons}>
        {Object.keys(ROLE_PRESETS).map(key => (
          <button
            key={key}
            onClick={() => handleRoleChange(key)}
            style={{
              ...styles.roleButton,
              ...(activeRole === key ? styles.activeRole : {})
            }}
          >
            {key === 'tech' ? '👨‍💻 Объясняй код' : 
             key === 'writer' ? '✍️ Помогай с текстами' : 
             '💬 Обычный режим'}
          </button>
        ))}
      </div>

      <div style={styles.messagesContainer}>
        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              ...styles.message,
              ...(msg.role === 'user' ? styles.userMessage : styles.assistantMessage)
            }}
          >
            <strong>{msg.role === 'user' ? 'Вы:' : 'AI:'}</strong>
            <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
          </div>
        ))}
        {isLoading && <div style={styles.thinking}>Thinking…</div>}
        <div ref={messagesEndRef} />
      </div>

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
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    maxWidth: '800px',
    margin: '0 auto',
    padding: '20px'
  },
  jsonToggle: {
    marginBottom: '10px',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    cursor: 'pointer'
  },
  roleButtons: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px',
    flexWrap: 'wrap'
  },
  roleButton: {
    padding: '8px 16px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    background: 'white',
    cursor: 'pointer',
    fontSize: '14px'
  },
  activeRole: {
    background: '#007bff',
    color: 'white',
    borderColor: '#007bff'
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
  thinking: {
    fontStyle: 'italic',
    color: '#666',
    textAlign: 'center'
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
  }
};
