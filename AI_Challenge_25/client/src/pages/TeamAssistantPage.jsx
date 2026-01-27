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
  const [userId] = useState('luno-o'); // Можно сделать динамичным
  
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
      // Callback при успешном распознавании
      console.log('✅ Voice recognized:', text, `confidence: ${(confidence * 100).toFixed(1)}%`);
      setInputValue(text);
      
      // Автоматическая отправка если уверенность > 80%
      if (confidence > 0.8) {
        // Отправить через небольшую задержку чтобы пользователь увидел текст
        setTimeout(() => {
          handleSendMessage(null, text, true);
        }, 300);
      }
    },
    (error) => {
      // Callback при ошибке
      console.error('❌ Voice error:', error);
      setMessages(prev => [...prev, {
        type: 'system',
        content: `⚠️ ${error}`,
        metadata: { timestamp: new Date(), error: true }
      }]);
    },
    voiceLanguage
  );

  // ========================================
  // EFFECTS
  // ========================================
  
  // Скролл к последнему сообщению
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Загрузить профиль при включении персонализации
  useEffect(() => {
    if (personalizationEnabled && userId) {
      loadUserProfile();
    }
  }, [personalizationEnabled, userId]);

  // ========================================
  // HANDLERS
  // ========================================

  /**
   * Загрузить профиль пользователя
   */
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

  /**
   * 🔄 Отправить сообщение (обновлено для поддержки голосового ввода)
   * @param {Event|null} e - Event от формы (может быть null для voice)
   * @param {string|null} messageText - Текст сообщения (для voice input)
   * @param {boolean} isVoice - Флаг голосового ввода
   */
  const handleSendMessage = async (e, messageText = null, isVoice = false) => {
    // Предотвратить default только если это событие формы
    if (e) {
      e.preventDefault();
    }

    const queryText = messageText || inputValue;
    
    if (!queryText.trim()) return;

    // Добавить сообщение пользователя
    const userMessage = {
      type: 'user',
      content: queryText,
      metadata: { 
        timestamp: new Date(),
        voiceInput: isVoice // 🆕 Отметка голосового ввода
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

      // Отправить запрос на backend
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

      // Добавить ответ ассистента с метаданными
      const assistantMessage = {
        type: 'assistant',
        content: data.answer,
        metadata: {
          timestamp: new Date(data.timestamp),
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

  /**
   * 🆕 Обработчик голосового ввода
   */
  const handleVoiceInput = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  /**
   * Переключить персонализацию
   */
  const handleTogglePersonalization = () => {
    setPersonalizationEnabled(!personalizationEnabled);
  };

  /**
   * Переключить LLM
   */
  const handleSwitchLLM = () => {
    const newMode = llmMode === 'ollama' ? 'perplexity' : 'ollama';
    setLlmMode(newMode);
    console.log(`[Frontend] Switched to ${newMode}`);
  };

  /**
   * Очистить чат
   */
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

  const getMessageTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="team-assistant-page">
      {/* ======================================== */}
      {/* HEADER */}
      {/* ======================================== */}
      <div className="assistant-header">
        <div className="header-top">
          <h1 className="assistant-title">
            🤖 Team Assistant
            {personalizationEnabled && userProfile && (
              <span className="profile-name"> ({userProfile.name})</span>
            )}
          </h1>
          
          <button 
            onClick={handleClearChat}
            className="clear-button"
            title="Очистить чат"
          >
            🗑️
          </button>
        </div>

        <div className="controls">
          {/* LLM Switcher */}
          <div className="control-group">
            <label className="control-label">Модель:</label>
            <button
              onClick={handleSwitchLLM}
              className={`llm-switch-button ${llmMode}`}
              title={`Текущая модель: ${llmMode}`}
            >
              {llmMode === 'ollama' ? '🤖 Ollama' : '🌐 Perplexity'}
            </button>
          </div>

          {/* Персонализация */}
          <div className="control-group">
            <label className="control-label">Персонализация:</label>
            <button
              onClick={handleTogglePersonalization}
              className={`personalization-button ${personalizationEnabled ? 'enabled' : ''}`}
              title={personalizationEnabled ? 'Отключить персонализацию' : 'Включить персонализацию'}
            >
              {personalizationEnabled ? '🎯 ВКЛ' : '⭕ ВЫКЛ'}
            </button>
          </div>

          {/* 🆕 Голосовой ввод статус */}
          {isVoiceSupported && (
            <div className="control-group">
              <label className="control-label">Голос:</label>
              <div className={`voice-status-badge ${isListening ? 'listening' : ''}`}>
                {isListening ? '🎤 Слушаю...' : '🎤 Готов'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ======================================== */}
      {/* MESSAGES */}
      {/* ======================================== */}
      <div className="messages-container">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`message ${msg.type} ${msg.metadata?.error ? 'error' : ''}`}
          >
            <div className="message-content">
              {/* 🆕 Voice badge для голосовых сообщений */}
              {msg.metadata?.voiceInput && (
                <span className="voice-badge" title="Голосовой ввод">🎤</span>
              )}
              
              <div className="message-text">{msg.content}</div>
              
              <div className="message-meta">
                <span className="message-time">
                  {getMessageTime(msg.metadata.timestamp)}
                </span>
                
                {/* Метаданные ответа */}
                {msg.type === 'assistant' && msg.metadata.llmUsed && (
                  <span className="llm-badge">
                    {msg.metadata.llmUsed === 'ollama' ? '🤖' : '🌐'} {msg.metadata.llmUsed}
                  </span>
                )}
                
                {msg.metadata?.personalized && (
                  <span className="personalized-badge" title="Персонализированный ответ">
                    🎯 Персонализировано
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div className="message assistant loading">
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <div className="message-text">Думаю...</div>
            </div>
          </div>
        )}

        {/* 🆕 Voice error display */}
        {voiceError && !loading && (
          <div className="message system error">
            <div className="message-content">
              <div className="message-text">⚠️ {voiceError}</div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ======================================== */}
      {/* 🆕 VOICE STATUS BAR (когда слушаем) */}
      {/* ======================================== */}
      {isListening && (
        <div className="voice-listening-bar">
          <div className="pulse-indicator" />
          <span className="listening-text">Говорите сейчас...</span>
          <button 
            onClick={stopListening}
            className="stop-listening-button"
          >
            ⏹️ Остановить
          </button>
        </div>
      )}

      {/* ======================================== */}
      {/* 🔄 INPUT FORM (обновлено с голосом) */}
      {/* ======================================== */}
      <form onSubmit={handleSendMessage} className="input-form">
        <div className="input-container">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={
              isListening 
                ? "🎤 Слушаю..." 
                : "Введите запрос или используйте голосовой ввод..."
            }
            disabled={loading || isListening}
            className={`message-input ${isListening ? 'listening' : ''}`}
          />

          {/* 🆕 Кнопка голосового ввода */}
          {isVoiceSupported && (
            <button
              type="button"
              onClick={handleVoiceInput}
              disabled={loading}
              className={`voice-button ${isListening ? 'listening' : ''}`}
              title={isListening ? 'Остановить запись' : 'Начать голосовой ввод'}
            >
              🎤
            </button>
          )}

          {/* 🆕 Переключатель языка распознавания */}
          {isVoiceSupported && !isListening && (
            <select
              value={voiceLanguage}
              onChange={(e) => setVoiceLanguage(e.target.value)}
              className="language-selector"
              disabled={loading || isListening}
              title="Язык распознавания речи"
            >
              <option value="ru-RU">🇷🇺 RU</option>
              <option value="en-US">🇺🇸 EN</option>
            </select>
          )}

          <button
            type="submit"
            disabled={loading || !inputValue.trim() || isListening}
            className="send-button"
          >
            {loading ? '⏳' : '📤'}
          </button>
        </div>

        {/* 🆕 Voice support warning */}
        {!isVoiceSupported && (
          <div className="voice-warning">
            ⚠️ Голосовой ввод не поддерживается в этом браузере. 
            Используйте Chrome или Edge.
          </div>
        )}
      </form>
    </div>
  );
};

export default TeamAssistantPage;
