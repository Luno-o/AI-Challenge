import { useState, useEffect, useRef } from 'react';
import { useChatWithPerplexity } from '../hooks/useChatWithPerplexity';

const ROLE_PRESETS = {
  tech: 'Ты — технический ИИ-ассистент. Объясняй код подробно и с примерами. Отвечай будто у тебя шизофрения',
//   tech: `Ты — опытный рекрутер с 10+ годами в подборе кадров и развитии talent acquisition стратегий.
// Твоя миссия — превращать любые вводные пользователя в детальные рекрутинговые требования, стратегии поиска и описания позиций, которые привлекают топ-таланты.

// Когда пользователь даёт задачу:
// 1. Выясни: должность, уровень (junior/middle/senior), команда, бюджет, сроки.
// 2. Сформируй:
// - Job Description (обязанности, требования, nice-to-have).
// - Candidate Profile (hard skills, soft skills, опыт, культурный fit).
// - Sourcing Strategy (где искать, какие каналы, ключевые слова).
// - Screening Questions (10–15 вопросов для первого звонка).
// - Процесс найма (этапы, таймлайн, интервьюеры).
// 3. Включай метрики успеха: время на заполнение позиции, качество кандидатов, retention.

// Язык: простой, деловой. Будь готов к уточнениям про компанию, бюджет, срочность.`,

  writer: 'Ты — помощник в написании текстов. Помогай с редактурой и стилем.',
  guide: `Ты — экспертный гид по интересным местам. 
  Твоя задача через диалог со мной собрать всю необходимую информацию и вывести готовый результат. 
  Результат должен быть максимально точным и быть после всех необходимых вопросов. 
  Не выводить промежуточные результаты. УСЛОВИЕ ДЛЯ ВЫВОДА РЕЗУЛЬТАТА И ЗАВЕРШЕНИЯ ДИАЛОГА: 
  ЗАДАТЬ 5 обязательных вопросов 
  Когда пользователь дал ответы на все заготовленные вопросы, закончи диалог и выведи результат.
    обязательные вопросы: 
   -Что вас больше привлекает:история и архитектура, природа и пейзажи, современная культура и развлечения, или гастрономия?
   - Какой темп путешествия вам комфортен: насыщенная программа с множеством мест за день или неспешное погружение в атмосферу? 
   - Вы предпочитаете активный отдых (походы, велопрогулки) или созерцательный (музеи, кафе, наблюдение за людьми)?
     Какой бюджет вы планируете на поездку?
     Что вы хотите почувствовать: вдохновение, расслабление, приключение или новые знания?
     Предпочитаете многолюдные популярные места или уединённые малоизвестные локации?
     При необходимости можешь задать дополнительные вопросы. 
     Результат:  в виде списка мест которые мне стоит посетить и
      число вероятности от 0 до 100 и цена такого путешествия,что это мне понравится и подходит. 
      Сортировка от большей вероятности к меньшей.`,
  default: 'Ты — универсальный ИИ-ассистент. Отвечай кратко и по-русски.'
};

export default function ChatPage() {
  const [input, setInput] = useState('');
  const [activeRole, setActiveRole] = useState('default');
  const [jsonMode, setJsonMode] = useState(false);
  const [temperature, setTemperature] = useState(0.7);
  const messagesEndRef = useRef(null);
  
  const { messages, isLoading, sendMessage, changeRole, loadHistory,tokenStats } = 
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
    
    await sendMessage(input, jsonMode,temperature);
    setInput('');
  };

  const handleRoleChange = (roleKey) => {
    setActiveRole(roleKey);
    changeRole(ROLE_PRESETS[roleKey]);
  };

  return (
    <div style={styles.container}>
     <div style={styles.tokenCounter}>
        <div>Запрос: {tokenStats.promptTokens} токенов</div>
        <div>Ответ: {tokenStats.completionTokens} токенов</div>
        <div>Всего: {tokenStats.totalTokens} токенов</div>
      </div>
      <label style={styles.jsonToggle}>
        <input 
          type="checkbox" 
          checked={jsonMode} 
          onChange={(e) => setJsonMode(e.target.checked)} 
        />
        JSON режим
      </label>
<div style={styles.temperatureControl}> {/* ← Добавь ползунок */}
        <label>
          Креативность: {temperature.toFixed(1)}
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={temperature}
            onChange={(e) => setTemperature(parseFloat(e.target.value))}
            style={styles.slider}
          />
        </label>
      </div>
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
 key === 'guide' ? '🗺️ Гид по местам' :
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
  tokenCounter: {
    fontSize: '12px',
    color: '#666',
    marginBottom: '10px',
    textAlign: 'right'
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
