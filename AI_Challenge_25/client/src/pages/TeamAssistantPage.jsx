// client/src/pages/TeamAssistantPage.jsx
import React, { useState } from 'react';
import { useTeamAssistant } from '../hooks/useTeamAssistant';
import '../styles/TeamAssistantPage.css';

export const TeamAssistantPage = () => {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [llmProvider, setLlmProvider] = useState('perplexity');
  
  const { ask, loading } = useTeamAssistant();

  const handleAsk = async () => {
    if (!query.trim()) return;

    const userMessage = { role: 'user', content: query };
    setMessages(prev => [...prev, userMessage]);

    const actualQuery = llmProvider === 'local' 
      ? `Спроси локальную: ${query}` 
      : query;

    const result = await ask(actualQuery);

    if (result.success) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: result.answer,
          tasks: result.tasks,
          recommendation: result.recommendation,
          git_context: result.git_context,
          task_stats: result.task_stats,
          sources: result.sources,
          next_actions: result.next_actions,
          commits: result.commits,
          model: result.model,
          source: result.source,
        },
      ]);
    } else {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: result.answer || '⚠️ Ошибка обработки',
          error: true,
        },
      ]);
    }

    setQuery('');
  };

  const handleQuickAction = (text) => {
    setQuery(text);
    setTimeout(() => handleAsk(), 100);
  };

  return (
    <div className="team-assistant">
      {/* Header */}
      <div className="header">
        <h1>🤖 Team Assistant</h1>
        <p className="subtitle">
          Управление задачами, Git, документацией и локальной LLM
        </p>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <button className="quick-btn" onClick={() => handleQuickAction('Покажи все задачи')}>
          📋 Все задачи
        </button>
        <button className="quick-btn" onClick={() => handleQuickAction('Что делать первым?')}>
          🎯 Рекомендация
        </button>
        <button className="quick-btn" onClick={() => handleQuickAction('Статус проекта')}>
          📊 Статус
        </button>
        <button className="quick-btn primary" onClick={() => handleQuickAction('Создай задачу: исправить баг, приоритет high')}>
          ➕ Создать задачу
        </button>
      </div>

      {/* Messages Area */}
      <div className="messages">
        {messages.length === 0 ? (
          <div className="welcome">
            <h2>👋 Привет! Я твой Team Assistant</h2>
            <p>Я помогу с задачами, Git, документацией и могу использовать локальную LLM</p>
            <ul>
              <li>📋 Управление задачами (создание, просмотр, рекомендации)</li>
              <li>🔀 Git операции (статус, коммиты, история)</li>
              <li>📚 Поиск в документации (RAG)</li>
              <li>🤖 Локальная LLM через Ollama</li>
            </ul>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className={`message ${msg.role}`}>
              {/* Message Header */}
              <div className="message-header" style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontWeight: 600, color: msg.role === 'user' ? '#667eea' : '#333' }}>
                  {msg.role === 'user' ? '👤 Вы' : '🤖 Assistant'}
                </span>
                {msg.model && (
                  <span className="message-model">
                    {msg.source === 'local_llm' ? '🤖 Ollama' : '🌐 Perplexity'} ({msg.model})
                  </span>
                )}
              </div>

              {/* Message Content */}
              <div
                className="message-content"
                dangerouslySetInnerHTML={{
                  __html: msg.content
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/`([^`]+)`/g, '<code>$1</code>')
                    .replace(/\n/g, '<br/>'),
                }}
              />

              {/* Tasks List */}
              {msg.tasks && msg.tasks.length > 0 && (
                <div className="tasks-list">
                  <h4>📋 Задачи ({msg.tasks.length})</h4>
                  {msg.tasks.map((task) => (
                    <div key={task.id} className={`task-card priority-${task.priority}`}>
                      <div className="task-header">
                        <span className="task-id">#{task.id}</span>
                        <span className={`priority-badge ${task.priority}`}>{task.priority}</span>
                        <span className={`status-badge ${task.status}`}>{task.status}</span>
                        {task.score && <span className="score">⭐ {task.score}</span>}
                      </div>
                      <div className="task-title">{task.title}</div>
                      {task.description && <div className="task-meta">{task.description}</div>}
                    </div>
                  ))}
                </div>
              )}

              {/* Git Context */}
              {msg.git_context && (
                <div className="git-context">
                  <span className="git-badge">🌿 {msg.git_context.branch}</span>
                  {msg.git_context.modified_files > 0 && (
                    <span className="git-badge modified">
                      📝 {msg.git_context.modified_files} изменено
                    </span>
                  )}
                  {msg.git_context.staged_files > 0 && (
                    <span className="git-badge staged">
                      ✅ {msg.git_context.staged_files} staged
                    </span>
                  )}
                </div>
              )}

              {/* Task Stats */}
              {msg.task_stats && (
                <div className="stats-grid">
                  <div className="stat-card success">
                    <span className="stat-value">{msg.task_stats.done}</span>
                    <span className="stat-label">Выполнено</span>
                  </div>
                  <div className="stat-card warning">
                    <span className="stat-value">{msg.task_stats.in_progress}</span>
                    <span className="stat-label">В работе</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-value">{msg.task_stats.todo}</span>
                    <span className="stat-label">Запланировано</span>
                  </div>
                  {msg.task_stats.high_priority > 0 && (
                    <div className="stat-card danger">
                      <span className="stat-value">{msg.task_stats.high_priority}</span>
                      <span className="stat-label">Высокий приоритет</span>
                    </div>
                  )}
                </div>
              )}

              {/* Next Actions */}
              {msg.next_actions && msg.next_actions.length > 0 && (
                <div className="next-actions">
                  <h4>🚀 Следующие шаги:</h4>
                  <ul>
                    {msg.next_actions.map((action, i) => (
                      <li key={i}>{action}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Sources (RAG) */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="sources">
                  <h4>📚 Источники:</h4>
                  {msg.sources.map((src, i) => (
                    <div key={i} className="source-card">
                      <div className="source-header">
                        <strong>📄 {src.document}</strong>
                        {src.relevance && (
                          <span className="relevance">{src.relevance}%</span>
                        )}
                      </div>
                      {src.preview && (
                        <div className="source-preview">{src.preview}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Commits */}
              {msg.commits && msg.commits.length > 0 && (
                <div className="commits-list">
                  {msg.commits.map((commit, i) => (
                    <div key={i} className="commit-card">
                      <code>{commit.hash.substring(0, 7)}</code>
                      <span>{commit.message}</span>
                      <small>{commit.author}</small>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}

        {/* Loading Indicator */}
        {loading && (
          <div className="message loading">
            <div className="loader">⏳ Думаю...</div>
          </div>
        )}
      </div>

      {/* Input Area with LLM Selector */}
      <div className="team-assistant-input-container">
        <div className="llm-provider-selector">
          <button
            className={`llm-provider-btn ${llmProvider === 'perplexity' ? 'active' : ''}`}
            onClick={() => setLlmProvider('perplexity')}
            title="Perplexity API (онлайн, умный анализ)"
          >
            🌐 Perplexity
          </button>
          <button
            className={`llm-provider-btn ${llmProvider === 'local' ? 'active' : ''}`}
            onClick={() => setLlmProvider('local')}
            title="Локальная LLM (Ollama)"
          >
            🤖 Ollama
          </button>
        </div>

        <div className="team-assistant-input">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !loading && handleAsk()}
            placeholder={
              llmProvider === 'local'
                ? "Спроси локальную LLM..."
                : "Спроси Team Assistant..."
            }
            disabled={loading}
          />
          <button onClick={handleAsk} disabled={loading || !query.trim()}>
            {loading ? '⏳' : '📤'}
          </button>
        </div>
      </div>
    </div>
  );
};
