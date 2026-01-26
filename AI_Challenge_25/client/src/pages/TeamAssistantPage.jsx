// client/src/pages/TeamAssistantPage.jsx

import React, { useState, useRef, useEffect } from 'react';
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

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

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
   * Отправить сообщение
   */
  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!inputValue.trim()) return;

    // Добавить сообщение пользователя
    const userMessage = {
      type: 'user',
      content: inputValue,
      metadata: { timestamp: new Date() }
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setLoading(true);

    try {
      console.log('[Frontend] Sending query...');
      console.log(`[Frontend] LLM: ${llmMode}`);
      console.log(`[Frontend] Personalization: ${personalizationEnabled}`);

      // Отправить запрос на backend
      const response = await fetch('http://localhost:5000/api/team/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: inputValue,
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
        metadata: { timestamp: new Date(), error: true }
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
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
    <div className="team-assistant-container">
      {/* ========== HEADER ========== */}
      <header className="team-assistant-header">
        <div className="header-left">
          <h1>🤖 Team Assistant</h1>
          <p>Персонализированный AI помощник разработчика</p>
        </div>

        <div className="header-right">
          {/* Профиль пользователя */}
          {personalizationEnabled && userProfile && (
            <div className="user-profile-badge">
              <span className="profile-avatar">👤</span>
              <div className="profile-info">
                <div className="profile-name">{userProfile.name}</div>
                <div className="profile-role">{userProfile.role}</div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ========== CONTROLS ========== */}
      <div className="team-assistant-controls">
        {/* Кнопка персонализации */}
        <button
          className={`btn-personalization ${personalizationEnabled ? 'active' : ''}`}
          onClick={handleTogglePersonalization}
          title={personalizationEnabled ? 'Отключить персонализацию' : 'Включить персонализацию'}
        >
          <span className="btn-icon">🎯</span>
          <span className="btn-text">
            {personalizationEnabled ? 'Персонализация: ВКЛ' : 'Персонализация: ВЫКЛ'}
          </span>
        </button>

        {/* LLM Switcher */}
        <button
          className="btn-llm-switch"
          onClick={handleSwitchLLM}
          title="Переключить LLM модель"
        >
          <span className="btn-icon">{llmMode === 'ollama' ? '🏠' : '☁️'}</span>
          <span className="btn-text">{llmMode === 'ollama' ? 'Ollama' : 'Perplexity'}</span>
        </button>

        {/* Очистить чат */}
        <button
          className="btn-clear"
          onClick={handleClearChat}
          title="Очистить историю чата"
        >
          <span className="btn-icon">🗑️</span>
          <span className="btn-text">Очистить</span>
        </button>
      </div>

      {/* ========== MESSAGES ========== */}
      <div className="messages-container">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message message-${msg.type}`}>
            <div className="message-avatar">
              {msg.type === 'user' ? '👨‍💻' : '🤖'}
            </div>

            <div className="message-content-wrapper">
              <div className="message-content">
                <p>{msg.content}</p>
              </div>

              {/* Метаданные */}
              {msg.metadata && (
                <div className="message-metadata">
                  <span className="timestamp">
                    {getMessageTime(msg.metadata.timestamp)}
                  </span>

                  {/* Индикатор персонализации */}
                  {msg.metadata.personalized && (
                    <span className="badge badge-personalized" title="Ответ персонализирован">
                      🎯 Персонализировано
                    </span>
                  )}

                  {/* Индикатор LLM */}
                  {msg.metadata.llmUsed && (
                    <span
                      className={`badge badge-llm badge-${msg.metadata.llmUsed}`}
                      title={`LLM: ${msg.metadata.llmUsed}`}
                    >
                      {msg.metadata.llmUsed === 'ollama' ? '🏠 Ollama' : '☁️ Perplexity'}
                    </span>
                  )}

                  {/* Профиль в метаданных */}
                  {msg.metadata.personalizationProfile && (
                    <span className="badge badge-profile">
                      👤 {msg.metadata.personalizationProfile}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Индикатор загрузки */}
        {loading && (
          <div className="message message-assistant loading">
            <div className="message-avatar">🤖</div>
            <div className="message-content-wrapper">
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ========== INPUT ========== */}
      <form className="input-form" onSubmit={handleSendMessage}>
        <input
          ref={inputRef}
          type="text"
          className="message-input"
          placeholder="Введи вопрос или команду..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={loading}
          autoFocus
        />
        <button
          type="submit"
          className="btn-send"
          disabled={loading || !inputValue.trim()}
          title="Отправить сообщение"
        >
          <span className="btn-icon">📤</span>
        </button>
      </form>

      {/* ========== STATUS BAR ========== */}
      <div className="status-bar">
        <div className="status-item">
          <span className="status-label">LLM:</span>
          <span className={`status-value llm-${llmMode}`}>
            {llmMode === 'ollama' ? '🏠 Ollama (локальная)' : '☁️ Perplexity (облако)'}
          </span>
        </div>

        <div className="status-item">
          <span className="status-label">Персонализация:</span>
          <span className={`status-value personalization-${personalizationEnabled}`}>
            {personalizationEnabled ? '✅ ВКЛ' : '❌ ВЫКЛ'}
          </span>
        </div>

        <div className="status-item">
          <span className="status-label">Сообщений:</span>
          <span className="status-value">{messages.length}</span>
        </div>
      </div>
    </div>
  );
};

export default TeamAssistantPage;
