# MCP Server & Chat Integration Project with RAG + Git + Support + Team Assistant

## Общее описание
Полнофункциональное приложение для интеграции MCP (Model Context Protocol) серверов с React-чат интерфейсом, **RAG (Retrieval-Augmented Generation)** системой, **Support Assistant** и **Team Assistant**. Архитектура включает микросервисы для управления задачами, документами, GitHub API, Docker, Git операций, Document Indexing Pipeline, поддержки пользователей и интеллектуального управления командой. Позволяет взаимодействовать с AI-агентами через унифицированный чат-интерфейс с поддержкой контекстного поиска по документам, анализа git-репозиториев, автоматических ответов на вопросы пользователей и приоритизации задач.

## Стек технологий
- **Язык backend**: JavaScript (Node.js ESM)
- **Язык frontend**: JavaScript (React 18)
- **Фреймворки**: Express.js, React, Vite
- **AI/LLM**: Perplexity API (sonar model)
- **MCP SDK**: @modelcontextprotocol/sdk
- **Библиотеки**: Axios, node-fetch, node-cron, dockerode
- **Инструменты**: Docker, Docker Compose, Git

---

## Структура директорий

AI_Challenge_23/
├── server/ # Backend (Node.js)
│ ├── index.js # Главный Express сервер с API endpoints
│ │
│ ├── MCP Clients & Services
│ ├── mcpClient.js # Клиент для Task/GitHub/Docker MCP
│ ├── ragMcpClient.js # Клиент для Documents MCP
│ ├── gitMcpClient.js # ✅ Клиент для Git MCP
│ ├── supportMcpClient.js # ✅ Support Helper (CRM контекст)
│ │
│ ├── Service Layer
│ ├── ragService.js # RAG логика (с/без RAG, сравнение, rerank)
│ ├── assistantService.js # ✅ Git Assistant (/help, /code, /review)
│ ├── supportAssistantService.js # ✅ Support Assistant с RAG поиском
│ ├── teamAssistantService.js # 🆕 Team Assistant (задачи + Git + RAG)
│ ├── documentIndexer.js # Прямая индексация (fallback без MCP)
│ │
│ ├── MCP Servers
│ ├── documents-mcp.js # MCP сервер для индексации документов
│ ├── task-mcp-server.js # MCP сервер для управления задачами
│ ├── git-mcp-server.js # ✅ MCP сервер для Git операций
│ ├── docker-mcp-server.js # MCP сервер для Docker операций
│ │
│ ├── Orchestration & Utils
│ ├── agent-orchestrator.js # Оркестрация multi-agent workflows
│ ├── githubTools.js # Утилиты для GitHub API
│ ├── githubService.js # GitHub PR/Issues API
│ ├── prReviewService.js # Code Review сервис
│ │
│ ├── Data Storage
│ ├── documents/ # Markdown документы для индексации
│ │ ├── README.md
│ │ ├── docker-compose.md
│ │ ├── api-docs.md
│ │ └── auth.md
│ ├── indexes/ # JSON индексы с embeddings
│ │ └── docs_index.json (320 embeddings)
│ ├── tasks.json # 🆕 База задач (Task MCP)
│ │
│ ├── Configuration
│ ├── .env # Environment variables
│ │ # PERPLEXITY_API_KEY=pplx-...
│ │ # PERPLEXITY_MODEL=sonar
│ │ # REPO_PATH=/path/to/repo
│ │ # PORT=4000
│ │
│ └── package.json # Backend зависимости
│
├── client/ # Frontend (React + Vite)
│ ├── src/
│ │ ├── main.jsx # Entry point React app
│ │ ├── App.jsx # Root component с маршрутизацией
│ │ ├── pages/
│ │ │ ├── ChatPage.jsx # RAG чат страница
│ │ │ ├── AssistantPage.jsx # ✅ Git Assistant страница
│ │ │ ├── SupportPage.jsx # ✅ Support Assistant страница
│ │ │ └── TeamAssistantPage.jsx # 🆕 Team Assistant страница
│ │ ├── components/
│ │ │ ├── RagModeSelector.jsx # Выбор режима RAG
│ │ │ └── MessageList.jsx # Список сообщений
│ │ ├── hooks/
│ │ │ ├── useChatWithPerplexity.js # Hook для chat & RAG API
│ │ │ ├── useAssistant.js # ✅ Hook для Git Assistant
│ │ │ ├── useSupport.js # ✅ Hook для Support Assistant
│ │ │ └── useTeamAssistant.js # 🆕 Hook для Team Assistant
│ │ └── styles/
│ │ ├── ChatPage.css
│ │ ├── AssistantPage.css
│ │ ├── SupportPage.css
│ │ └── TeamAssistantPage.css # 🆕
│ │
│ ├── index.html # HTML template
│ ├── vite.config.js # Vite configuration
│ └── package.json # Frontend зависимости
│
└── Configuration
├── .env # Environment variables (root)
├── package.json # Root workspace config
└── structure.md # Этот файл

text

---

## 🆕 Team Assistant (НОВОЕ)

### Функционал
- 🤖 **Natural Language Interface** — парсинг запросов без слэш-команд
- 🎯 **Priority & Recommendations Engine** — интеллектуальный scoring задач
- 🔀 **Multi-MCP Orchestration** — Task MCP + Git MCP + RAG
- 📚 **RAG Integration** — поиск ответов в документации проекта
- 🧠 **LLM-based Intent Router** — понимание намерений пользователя
- 📊 **Project Status Dashboard** — статистика задач + Git контекст

### Возможности
| Команда | Действие | Пример |
|---------|----------|--------|
| Создание задач | `create_task` | "Создай задачу: исправить баг, приоритет high" |
| Просмотр задач | `list_tasks` | "Покажи задачи с приоритетом high" |
| Рекомендации | `recommend_next` | "Что делать первым?" |
| Статус проекта | `project_status` | "Статус проекта" |
| RAG запросы | `knowledge_query` | "Как работает RAG в этом проекте?" |
| Git операции | `git_status`, `git_commits` | "git status", "Покажи последние 3 коммита" |

### API Endpoint
```bash
POST /api/team/ask
Body: {
  "query": "Покажи задачи high и предложи, что делать первым",
  "user_id": "team_user"
}

Response: {
  "success": true,
  "intent": {"action": "recommend_next", "params": {}, "tools": ["task_mcp", "git_mcp"]},
  "tasks": [5 приоритетных задач с scoring],
  "recommendation": "Начни с: исправить баг в авторизации. Причина: Приоритет high, блокирует 2 задач",
  "git_context": {
    "branch": "main",
    "modified_files": 5,
    "staged_files": 1
  },
  "next_actions": ["📝 Закоммитить изменения", "🚀 Начать работу над задачей #123"],
  "answer": "**Начни с:** исправить баг в авторизации\n\n**Причина:** Приоритет high, блокирует 2 задач"
}
Файлы
Файл	Описание	Статус
teamAssistantService.js	Логика Team Assistant	✅ Production
TeamAssistantPage.jsx	UI страница	✅ Production
TeamAssistantPage.css	Стили	✅ Production
useTeamAssistant.js	React hook	✅ Production
Архитектура
text
User Query: "Покажи задачи high и предложи, что делать первым"
↓
[teamAssistantService.js] processTeamQuery()
├─→ [parseIntent()] LLM Router → {action: "recommend_next", params: {priority: "high"}}
│
├─→ [mcpClient.js] callTaskTool('list_tasks', {})
│   └─→ tasks.json → [14 задач]
│
├─→ [Filter] priority === 'high' → [8 задач high]
│
├─→ [gitMcpClient.js] callGitTool('get_git_status')
│   └─→ {branch: "main", modified: [5 files], staged: [1 file]}
│
├─→ [recommendNextTask()] Priority Engine
│   ├─→ Scoring: high=+10, blocks tasks=+8, git context=+3, in_progress=+4
│   ├─→ Task #1: score 18 (high + blocks 2 tasks + related to modified file)
│   └─→ Recommendation: "Начни с task #1, блокирует 2 задач, связана с изменениями"
│
└─→ Response: {
     "tasks": [Top 5 scored tasks],
     "recommendation": "Начни с...",
     "git_context": {...},
     "next_actions": ["Commit changes", "Start task #1"]
   }
✅ Support Assistant
Функционал
📚 Автоматический поиск по документам базы знаний

👤 Контекст пользователя (открытые тикеты, историю проблем)

🔍 RAG для поиска решений в документах

📝 Формирование полных ответов с источниками

🎯 Эскалация на тикеты поддержки

API Endpoint
bash
POST /api/support/ask
Body: {
  "user_id": "user_123",
  "question": "почему не работает авторизация"
}

Response: {
  "success": true,
  "answer": "Авторизация может не работать по следующим причинам...",
  "sources": [
    { "document": "docs/auth.md", "relevance": 92, "preview": "..." }
  ],
  "user_context": { "open_issues": 2, "past_issues_count": 5 },
  "confidence": 0.85,
  "timestamp": "2026-01-16T00:00:00.000Z"
}
API Endpoints
🆕 Team Assistant API
Endpoint	Method	Body	Description
/api/team/ask	POST	{query, user_id}	Team Assistant запрос
Режимы работы:

list_tasks — список задач с фильтрами

create_task — создание новой задачи

recommend_next — рекомендация следующей задачи (Priority Engine)

project_status — статус проекта (задачи + Git)

knowledge_query — вопросы о проекте через RAG

git_status — Git status

git_commits — последние коммиты

📚 Documents Pipeline
Endpoint	Method	Body	Description
/api/documents/indexes	GET	-	Список доступных индексов
/api/documents/index	POST	{directory, index_name, file_patterns, backend}	Создать индекс документов
/api/documents/search	POST	{query, index_name, top_k}	Поиск в индексе
🤖 RAG API
Endpoint	Method	Body	Description
/api/rag/ask	POST	{question, mode, indexName, topK}	RAG запрос
Режимы:

no_rag — ответ без документов (чистый LLM)

with_rag — ответ с контекстом из документов

compare — сравнение обоих режимов

reranked_rag — с reranking

compare_rerank — сравнение basic vs reranked

💬 Support Assistant
Endpoint	Method	Body	Description
/api/support/ask	POST	{user_id, question}	Поддержка пользователя с RAG
/api/support/escalate	POST	{user_id, issue, description}	Эскалация на тикет
/api/support/history	GET	?user_id=xxx	История поддержки
✅ Git Assistant API
Endpoint	Method	Body	Description
/api/assistant/command	POST	{command}	Выполнить команду Assistant
Команды: /help, /code, /review, /search, /commits, /status

💬 Chat
Endpoint	Method	Body	Description
/api/chat	POST	{message, context?}	Отправка сообщения в чат
MCP Servers
1. Documents MCP (documents-mcp.js)
index_documents() — индексирует markdown файлы

search_in_index() — семантический поиск

get_index_info() — информация об индексе

2. Git MCP (git-mcp-server.js) ✅ Windows-compatible
get_current_branch() — текущая ветка

get_git_status() — git status

get_recent_commits(count) — последние коммиты

get_file_content(file_path) — содержимое файла

search_in_repo(pattern) — git grep

get_repo_structure(depth) — дерево файлов

3. Task MCP (task-mcp-server.js)
create_task — создать задачу

list_tasks — список задач

update_task — обновить задачу

delete_task — удалить задачу

get_tasks_summary — сводка для reminders

Хранилище: tasks.json (JSON file-based storage)

4. Docker MCP (docker-mcp-server.js)
listContainers — список контейнеров

startContainer — запустить контейнер

stopContainer — остановить контейнер

removeContainer — удалить контейнер

Workflow: Team Assistant
text
User Question: "Покажи задачи high и предложи, что делать первым"
↓
[teamAssistantService.js] processTeamQuery()
├─→ [parseIntent()] Intent Router (LLM + правила)
│   ├─→ Анализ запроса через Perplexity API
│   └─→ {"action": "recommend_next", "params": {}, "tools": ["task_mcp", "git_mcp"]}
│
├─→ [callTaskTool('list_tasks')] Task MCP
│   └─→ tasks.json → [14 задач]
│
├─→ [callGitTool('get_git_status')] Git MCP
│   └─→ {branch: "main", modified: [5 files], staged: }[1]
│
├─→ [recommendNextTask()] Priority Engine
│   ├─→ Фильтр: status !== 'done' → 7 активных задач
│   ├─→ Scoring:
│   │   ├─→ priority='high' → +10
│   │   ├─→ priority='medium' → +5
│   │   ├─→ blocks 2 tasks → +16 (8×2)
│   │   ├─→ related to modified files → +3
│   │   └─→ status='in_progress' → +4
│   ├─→ Sort by score DESC
│   └─→ Top task: {id: 123, title: "Fix auth", score: 29}
│
├─→ [Format Response]
│   └─→ Natural language explanation
│
└─→ Response: {
     "success": true,
     "tasks": [Top 5 scored tasks],
     "recommendation": "Начни с: Fix auth. Причина: Приоритет high, блокирует 2 задач",
     "git_context": {modified_files: 5, staged_files: 1, branch: "main"},
     "next_actions": ["📝 Закоммитить изменения", "🚀 Начать задачу #123"],
     "answer": "**Начни с:** Fix auth\n\n**Причина:** Приоритет high..."
   }
Точки входа
Файл	Команда	Порт	Назначение
server/index.js	npm run dev (в server/)	4000	Backend API сервер
client/src/main.jsx	npm run dev (в client/)	5173	React frontend
server/git-mcp-server.js	Через MCP Client	stdio	Git operations
server/documents-mcp.js	Через MCP Client	stdio	Document indexing
server/task-mcp-server.js	Через MCP Client	stdio	Task management
Environment Variables (.env)
bash
# Perplexity AI
PERPLEXITY_API_KEY=pplx-xxxxxxxxxxxx
PERPLEXITY_MODEL=sonar

# Server
PORT=4000

# Git MCP
REPO_PATH=/path/to/your/repo

# GitHub (optional)
GITHUB_TOKEN=ghp_xxxxxxxxxxxx
Frontend Routes
Route	Component	Description
/	ChatPage.jsx	RAG чат с документами
/assistant	AssistantPage.jsx	✅ Git Assistant
/support	SupportPage.jsx	✅ Support Assistant
/team	TeamAssistantPage.jsx	🆕 Team Assistant
Развертывание
Development
bash
# Terminal 1 - Backend
cd server
npm install
npm run dev  # http://localhost:4000

# Terminal 2 - Frontend  
cd client
npm install
npm run dev  # http://localhost:5173
Открыть интерфейсы:
RAG Chat: http://localhost:5173/

Git Assistant: http://localhost:5173/assistant

Support Assistant: http://localhost:5173/support

Team Assistant: http://localhost:5173/team 🆕

Версионирование
Версия: 1.1.0
Дата обновления: 2026-01-16 01:00 MSK
Статус: ✅ Production Ready

Изменения:

🆕 Team Assistant интегрирован (Natural Language + Priority Engine + Multi-MCP)

✅ LLM Intent Router с правилами

✅ Priority & Recommendations Engine (scoring алгоритм)

✅ Git MCP Windows-совместимый

✅ Task MCP с JSON storage

✅ RAG Integration в Team Assistant

✅ Полная документация обновлена

Особенности Team Assistant
🧠 Intent Router
Hybrid подход: Правила + LLM fallback

Приоритет правил: Создание → Рекомендации → RAG → Просмотр

LLM: Perplexity API для сложных запросов

Fallback: Default на list_tasks

🎯 Priority Engine
Scoring алгоритм:

javascript
score = 0
if (priority === 'high') score += 10
if (priority === 'medium') score += 5
if (blocks N tasks) score += N × 8
if (related to Git changes) score += 3
if (status === 'in_progress') score += 4
Факторы:

Приоритет задачи (high/medium/low)

Блокирует ли другие задачи

Связь с измененными файлами

Текущий статус

🔀 Multi-MCP Orchestration
Task MCP: Управление задачами (tasks.json)

Git MCP: Git операции (status, commits, files)

Documents MCP: RAG для документации (320 embeddings)

Примеры использования Team Assistant
1. Создание задачи
bash
Query: "Создай задачу: исправить баг в авторизации, приоритет high"
Response: "✅ Создана задача: исправить баг в авторизации (приоритет: high, ID: #123)"
2. Рекомендация
bash
Query: "Что делать первым?"
Response: "**Начни с:** исправить баг в авторизации
**Причина:** Приоритет high, блокирует 2 задач, связана с изменениями в server/auth.js"
3. Статус проекта
bash
Query: "Статус проекта"
Response: "📊 Статус проекта
Задачи: 7/14 выполнено, 3 в работе, 2 high-приоритетных
Git: ветка main, 5 измененных файлов, 1 подготовленных"
4. RAG запрос
bash
Query: "Как работает RAG в этом проекте?"
Response: "RAG в проекте работает через индексацию markdown-документов..."
Источники: [structure.md, api-docs.md, ...]
5. Git операции
bash
Query: "git status"
Response: "🔀 Git Status
Ветка: main
Измененных файлов: 5
- AI_Challenge_23/server/teamAssistantService.js
- AI_Challenge_23/client/src/pages/TeamAssistantPage.jsx
..."
Лицензия
MIT

Разработка: AI Challenge 23 - Team Assistant + RAG + Git + Support Integration