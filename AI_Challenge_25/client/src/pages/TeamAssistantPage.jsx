// client/src/pages/TeamAssistantPage.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useVoiceInput } from '../hooks/useVoiceInput';
import '../styles/TeamAssistantPage.css';

const TeamAssistantPage = () => {
  // ======================================== 
  // STATE
  // ======================================== 
  const [messages, setMessages] = useState([
    {
      type: 'assistant',
      content: 'Привет! 👋 Я твой ассистент. Как я могу помочь?',
      metadata: { timestamp: new Date() }
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [llmMode, setLlmMode] = useState('ollama');
  const [personalizationEnabled, setPersonalizationEnabled] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [userId] = useState('luno-o');

  // 🆕 Voice input state
  const [voiceLanguage, setVoiceLanguage] = useState('ru-RU');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // 🆕 Voice input hook
  const {
    isListening,
    transcript,
    error: voiceError,
    isSupported: isVoiceSupported,
    startListening,
    stopListening
  } = useVoiceInput(
    (text, confidence) => {
      console.log('✅ Voice recognized:', text, `confidence: ${(confidence * 100).toFixed(1)}%`);
      setInputValue(text);
      if (confidence > 0.8) {
        setTimeout(() => {
          handleSendMessage(null, text, true);
        }, 300);
      }
    },
    (error) => {
      console.error('❌ Voice error:', error);
      setMessages(prev => [
        ...prev,
        {
          type: 'system',
          content: `⚠️ ${error}`,
          metadata: { timestamp: new Date(), error: true }
        }
      ]);
    },
    voiceLanguage
  );

  // ======================================== 
  // EFFECTS
  // ======================================== 
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (personalizationEnabled && userId) {
      loadUserProfile();
    }
  }, [personalizationEnabled, userId]);

  // ======================================== 
  // HANDLERS
  // ======================================== 
  const loadUserProfile = async () => {
    try {
      console.log(`[Frontend] Loading profile for ${userId}`);
      const response = await fetch(
        `http://localhost:5000/api/personalization/profile/${userId}`
      );
      if (!response.ok) {
        console.warn(`[Frontend] Profile not found for ${userId}`);
        return;
      }
      const data = await response.json();
      setUserProfile(data.profile);
      console.log(`[Frontend] Profile loaded:`, data.profile.name);
    } catch (error) {
      console.error('[Frontend] Error loading profile:', error);
    }
  };

  const handleSendMessage = async (e, messageText = null, isVoice = false) => {
    if (e) {
      e.preventDefault();
    }

    const queryText = messageText || inputValue;
    if (!queryText.trim()) return;

    const userMessage = {
      type: 'user',
      content: queryText,
      metadata: {
        timestamp: new Date(),
        voiceInput: isVoice
      }
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setLoading(true);

    try {
      console.log('[Frontend] Sending query...');
      console.log(`[Frontend] LLM: ${llmMode}`);
      console.log(`[Frontend] Personalization: ${personalizationEnabled}`);
      console.log(`[Frontend] Voice Input: ${isVoice}`);

      const response = await fetch('http://localhost:5000/api/team/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: queryText,
          llmMode,
          personalizationEnabled,
          user_id: personalizationEnabled ? userId : null
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      const assistantMessage = {
        type: 'assistant',
        content: data.answer,
        metadata: {
          timestamp: data.timestamp ? new Date(data.timestamp) : new Date(), // 🔥 ИСПРАВЛЕНИЕ
          personalized: data.personalized,
          personalizationProfile: data.personalizationProfile,
          llmUsed: data.llmUsed
        }
      };

      setMessages(prev => [...prev, assistantMessage]);
      console.log('[Frontend] Response received');

    } catch (error) {
      console.error('[Frontend] Error sending message:', error);
      const errorMessage = {
        type: 'assistant',
        content: `❌ Ошибка: ${error.message}. Проверь, что backend запущен на http://localhost:5000`,
        metadata: {
          timestamp: new Date(),
          error: true
        }
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleVoiceInput = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleTogglePersonalization = () => {
    setPersonalizationEnabled(!personalizationEnabled);
  };

  const handleSwitchLLM = () => {
    const newMode = llmMode === 'ollama' ? 'perplexity' : 'ollama';
    setLlmMode(newMode);
    console.log(`[Frontend] Switched to ${newMode}`);
  };

  const handleClearChat = () => {
    if (window.confirm('Очистить весь чат?')) {
      setMessages([
        {
          type: 'assistant',
          content: 'Чат очищен. Как я могу помочь?',
          metadata: { timestamp: new Date() }
        }
      ]);
    }
  };

  // ======================================== 
  // RENDERING
  // ======================================== 
  // 🔥 ИСПРАВЛЕННАЯ ФУНКЦИЯ
  const getMessageTime = (timestamp) => {
    if (!timestamp) return '';
    
    try {
      const date = new Date(timestamp);
      // Проверка на валидность даты
      if (isNaN(date.getTime())) {
        console.warn('Invalid timestamp:', timestamp);
        return '';
      }
      
      return date.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting time:', error);
      return '';
    }
  };

  return (
    <div className="team-assistant-page">
      {/* Header */}
      <header className="assistant-header">
        <h1>🤖 Team Assistant</h1>
        <div className="header-controls">
          <button
            className={`control-btn ${personalizationEnabled ? 'active' : ''}`}
            onClick={handleTogglePersonalization}
            title="Персонализация"
          >
            {personalizationEnabled ? '✅ Персонализация' : '❌ Персонализация'}
          </button>
          <button
            className="control-btn"
            onClick={handleSwitchLLM}
            title="Переключить LLM"
          >
            🏠 {llmMode === 'ollama' ? 'Ollama' : 'Perplexity'}
          </button>
          <button
            className="control-btn"
            onClick={handleClearChat}
            title="Очистить чат"
          >
            🗑️ Очистить
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="messages-container">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`message ${msg.type}-message ${msg.metadata?.error ? 'error-message' : ''}`}
          >
            <div className="message-content">
              <div className="message-text">{msg.content}</div>
              <div className="message-meta">
                <span className="message-time">
                  {getMessageTime(msg.metadata?.timestamp)}
                </span>
                {msg.metadata?.personalized && (
                  <span className="personalization-badge" title="Персонализировано">
                    ✨ Персонализировано
                  </span>
                )}
                {msg.metadata?.personalizationProfile && (
                  <span className="profile-badge" title={`Профиль: ${msg.metadata.personalizationProfile}`}>
                    👤 {msg.metadata.personalizationProfile}
                  </span>
                )}
                {msg.metadata?.llmUsed && (
                  <span className="llm-badge" title={`LLM: ${msg.metadata.llmUsed}`}>
                    🏠 {msg.metadata.llmUsed}
                  </span>
                )}
                {msg.metadata?.voiceInput && (
                  <span className="voice-badge" title="Голосовой ввод">
                    🎤
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="message assistant-message">
            <div className="message-content">
              <div className="message-text typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form className="input-form" onSubmit={handleSendMessage}>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Спроси меня о чём угодно..."
          disabled={loading}
          className="message-input"
        />
        
        {/* Voice Input Button */}
        {isVoiceSupported && (
          <button
            type="button"
            onClick={handleVoiceInput}
            className={`voice-btn ${isListening ? 'listening' : ''}`}
            title={isListening ? 'Остановить запись' : 'Голосовой ввод'}
            disabled={loading}
          >
            🎤
          </button>
        )}

        <button
          type="submit"
          disabled={loading || !inputValue.trim()}
          className="send-btn"
        >
          📤
        </button>
      </form>

      {/* Status Bar */}
      <div className="status-bar">
        <span className="status-item">
          <strong>LLM:</strong> 🏠 {llmMode === 'ollama' ? 'Ollama (локальная)' : 'Perplexity'}
        </span>
        <span className="status-item">
          <strong>Персонализация:</strong> {personalizationEnabled ? '✅ ВКЛ' : '❌ ВЫКЛ'}
        </span>
        {personalizationEnabled && userProfile && (
          <span className="status-item">
            <strong>Профиль:</strong> 👤 {userProfile.name}
          </span>
        )}
        {isVoiceSupported && (
          <span className="status-item">
            <strong>Голос:</strong> 🎤 {isListening ? 'Слушаю...' : 'Готов'}
          </span>
        )}
      </div>
    </div>
  );
};

export default TeamAssistantPage;
