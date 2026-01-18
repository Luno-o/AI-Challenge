// client/src/pages/TeamAssistantPage.jsx
import React, { useState } from 'react';
import { useTeamAssistant } from '../hooks/useTeamAssistant';
import '../styles/TeamAssistantPage.css';

export const TeamAssistantPage = () => {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const { ask, loading } = useTeamAssistant();

  const handleAsk = async () => {
    if (!query.trim()) return;

    const userMessage = { role: 'user', content: query };
    setMessages(prev => [...prev, userMessage]);

    const result = await ask(query);

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
      <header className="header">
        <h1>🤖 Team Assistant</h1>
        <p className="subtitle">Управление задачами, Git и знаниями проекта</p>
      </header>

      <div className="quick-actions">
        <button onClick={() => handleQuickAction('Покажи все задачи')} className="quick-btn">
          📋 Все задачи
        </button>
        <button onClick={() => handleQuickAction('Что делать первым?')} className="quick-btn primary">
          🎯 Рекомендация
        </button>
        <button onClick={() => handleQuickAction('Статус проекта')} className="quick-btn">
          📊 Статус
        </button>
        <button onClick={() => handleQuickAction('Покажи задачи с приоритетом high')} className="quick-btn">
          🔥 High priority
        </button>
      </div>

      <div className="messages">
        {messages.length === 0 && (
          <div className="welcome">
            <h2>👋 Привет!</h2>
            <p>Я помогу управлять задачами и проектом. Попробуй:</p>
            <ul>
              <li>"Покажи задачи с приоритетом high"</li>
              <li>"Что делать первым?"</li>
              <li>"Создай задачу: исправить баг в авторизации, приоритет high"</li>
              <li>"Как работает RAG в этом проекте?"</li>
            </ul>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role} ${msg.error ? 'error' : ''}`}>
            <div className="message-content">
              <div className="text" dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.content) }} />

              {/* Tasks List */}
              {msg.tasks && msg.tasks.length > 0 && (
                <div className="tasks-list">
                  <h4>📋 Задачи ({msg.tasks.length}):</h4>
                  {msg.tasks.map(task => (
                    <div key={task.id} className={`task-card priority-${task.priority}`}>
                      <div className="task-header">
                        <span className="task-id">#{task.id}</span>
                        <span className={`priority-badge ${task.priority}`}>{task.priority}</span>
                        <span className={`status-badge ${task.status}`}>{task.status}</span>
                        {task.score !== undefined && <span className="score">⭐ {task.score}</span>}
                      </div>
                      <div className="task-title">{task.title}</div>
                      {task.assigned_to && <div className="task-meta">👤 {task.assigned_to}</div>}
                    </div>
                  ))}
                </div>
              )}

              {/* Task Stats */}
              {msg.task_stats && (
                <div className="stats-grid">
                  <div className="stat-card">
                    <span className="stat-value">{msg.task_stats.total}</span>
                    <span className="stat-label">Всего задач</span>
                  </div>
                  <div className="stat-card success">
                    <span className="stat-value">{msg.task_stats.done}</span>
                    <span className="stat-label">Выполнено</span>
                  </div>
                  <div className="stat-card warning">
                    <span className="stat-value">{msg.task_stats.in_progress}</span>
                    <span className="stat-label">В работе</span>
                  </div>
                  <div className="stat-card danger">
                    <span className="stat-value">{msg.task_stats.high_priority}</span>
                    <span className="stat-label">High priority</span>
                  </div>
                </div>
              )}

              {/* Git Context */}
              {msg.git_context && (
                <div className="git-context">
                  <span className="git-badge">🔀 {msg.git_context.branch}</span>
                  {msg.git_context.modified_files > 0 && (
                    <span className="git-badge modified">📝 {msg.git_context.modified_files} изменено</span>
                  )}
                  {msg.git_context.staged_files > 0 && (
                    <span className="git-badge staged">✅ {msg.git_context.staged_files} подготовлено</span>
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
                        <strong>{src.document}</strong>
                        {src.relevance && <span className="relevance">{src.relevance}%</span>}
                      </div>
                      <div className="source-preview">{src.preview}</div>
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
          </div>
        ))}

        {loading && (
          <div className="message assistant loading">
            <div className="loader">⏳ Обработка запроса...</div>
          </div>
        )}
      </div>

      <div className="input-area">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Задай вопрос или команду..."
          onKeyPress={e => e.key === 'Enter' && !loading && handleAsk()}
          disabled={loading}
        />
        <button onClick={handleAsk} disabled={loading || !query.trim()} className="send-btn">
          {loading ? '⏳' : '▶️'}
        </button>
      </div>
    </div>
  );
};

// Simple Markdown formatter
function formatMarkdown(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/## (.*?)$/gm, '<h3>$1</h3>')
    .replace(/\n/g, '<br/>');
}
