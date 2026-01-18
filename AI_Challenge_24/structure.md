📄 Обновленная structure.md v1.1.1
text
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
│ ├── teamAssistantService.js # ✅ Team Assistant (задачи + Git + RAG)
│ ├── documentIndexer.js # Прямая индексация (fallback без MCP)
│ │
│ ├── MCP Servers
│ ├── documents-mcp.js # MCP сервер для индексации документов
│ ├── task-mcp-server.js # MCP сервер для управления задачами
│ ├── git-mcp-server.js # ✅ MCP сервер для Git операций (v1.2.1)
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
│ │ ├── auth.md
│ │ ├── structure.md
│ │ ├── SUPPORT_ASSISTANT_DOCS.md
│ │ └── ADDING_DOCUMENTATION_GUIDE.md
│ ├── indexes/ # JSON индексы с embeddings
│ │ └── docs_index.json # 320 embeddings
│ ├── tasks.json # ✅ База задач (Task MCP)
│ │
│ ├── Configuration
│ ├── .env # Environment variables
│ │ # PERPLEXITY_API_KEY=pplx-...
│ │ # PERPLEXITY_MODEL=sonar
│ │ # REPO_PATH=D:\perplexity-chat
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
│ │ │ └── TeamAssistantPage.jsx # ✅ Team Assistant страница
│ │ ├── components/
│ │ │ ├── RagModeSelector.jsx # Выбор режима RAG
│ │ │ └── MessageList.jsx # Список сообщений
│ │ ├── hooks/
│ │ │ ├── useChatWithPerplexity.js # Hook для chat & RAG API
│ │ │ ├── useAssistant.js # ✅ Hook для Git Assistant
│ │ │ ├── useSupport.js # ✅ Hook для Support Assistant
│ │ │ └── useTeamAssistant.js # ✅ Hook для Team Assistant
│ │ └── styles/
│ │ ├── ChatPage.css
│ │ ├── AssistantPage.css
│ │ ├── SupportPage.css
│ │ └── TeamAssistantPage.css # ✅
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

## ✅ Team Assistant (Production Ready)

### Функционал
- 🤖 **Natural Language Interface** — парсинг запросов без слэш-команд
- 🎯 **Priority & Recommendations Engine** — интеллектуальный scoring задач
- 🔀 **Multi-MCP Orchestration** — Task MCP + Git MCP + RAG
- 📚 **RAG Integration** — поиск ответов в документации проекта (320 embeddings)
- 🧠 **LLM-based Intent Router** — понимание намерений пользователя (Hybrid подход)
- 📊 **Project Status Dashboard** — статистика задач + Git контекст

### Поддерживаемые команды

| Категория | Команда | Пример |
|-----------|---------|--------|
| **Управление задачами** | Создание | "Создай задачу: исправить баг, приоритет high" |
| | Просмотр | "Покажи задачи с приоритетом high" |
| | Фильтрация | "Покажи задачи со статусом todo" |
| | Все задачи | "Покажи все задачи" / "задачи" |
| **Рекомендации** | Приоритет | "Что делать первым?" |
| | Статус | "Статус проекта" |
| **Git операции** | Status | "git status" |
| | Commits | "Покажи последние 3 коммита" / "покажи коммиты" |
| **Знания проекта** | RAG запросы | "Как работает RAG в этом проекте?" |
| | Документация | "Расскажи про Support Assistant" |

### API Endpoint
```bash
POST /api/team/ask
Body: {
  "query": "Покажи задачи high и предложи, что делать первым",
  "user_id": "team_user"
}

Response: {
  "success": true,
  "intent": {
    "action": "recommend_next",
    "params": {},
    "tools": ["task_mcp", "git_mcp"]
  },
  "tasks": [
    {
      "id": "1768513577883",
      "title": "исправить баг в авторизации",
      "priority": "high",
      "status": "todo",
      "score": 29
    }
  ],
  "recommendation": "**Начни с:** исправить баг в авторизации\n\n**Причина:** Приоритет high, блокирует 2 задач",
  "git_context": {
    "branch": "main",
    "modified_files": 5,
    "staged_files": 1
  },
  "next_actions": [
    "📝 Закоммитить изменения",
    "🚀 Начать работу над задачей #1768513577883"
  ],
  "answer": "**Начни с:** исправить баг в авторизации\n\n**Причина:** Приоритет high, блокирует 2 задач"
}
Архитектура
text
User Query: "Покажи задачи high и предложи, что делать первым"
↓
[teamAssistantService.js] processTeamQuery()
├─→ [parseIntent()] Intent Router (Hybrid: правила → LLM)
│   ├─→ Rule-based matching (создание, рекомендации, RAG, просмотр)
│   ├─→ LLM fallback через Perplexity API
│   └─→ {"action": "recommend_next", "params": {}, "tools": ["task_mcp", "git_mcp"]}
│
├─→ [callTaskTool('list_tasks')] Task MCP
│   ├─→ tasks.json → [14 задач]
│   └─→ parseMcpResponse() → безопасный парсинг
│
├─→ [callGitTool('get_git_status')] Git MCP
│   ├─→ git status --porcelain
│   └─→ {branch: "main", modified: [5 files], staged: }[1]
│
├─→ [recommendNextTask()] Priority Engine
│   ├─→ Фильтр: status !== 'done' → 7 активных задач
│   ├─→ Scoring алгоритм:
│   │   ├─→ priority='high' → +10
│   │   ├─→ priority='medium' → +5
│   │   ├─→ blocks N tasks → +8×N
│   │   ├─→ related to modified files → +3
│   │   └─→ status='in_progress' → +4
│   ├─→ Sort by score DESC
│   └─→ Top task: {id: "1768513577883", title: "Fix auth", score: 29}
│
├─→ [Format Response] Natural language explanation
│
└─→ Response: {
     "success": true,
     "tasks": [Top 5 scored tasks],
     "recommendation": "Начни с: Fix auth...",
     "git_context": {...},
     "next_actions": [...]
   }
Файлы
Файл	Описание	Статус	Строк кода
teamAssistantService.js	Backend логика + Intent Router + Priority Engine	✅ Production	~450
TeamAssistantPage.jsx	React UI компонент с quick actions	✅ Production	~210
TeamAssistantPage.css	Стили (карточки задач, badges, scoring)	✅ Production	~380
useTeamAssistant.js	React hook для API вызовов	✅ Production	~35
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
✅ Team Assistant API
Endpoint	Method	Body	Description
/api/team/ask	POST	{query, user_id}	Team Assistant запрос (Natural Language)
Поддерживаемые actions:

list_tasks — список задач с фильтрами (priority, status)

create_task — создание новой задачи (title, priority)

update_task — обновление задачи (id, updates)

delete_task — удаление задачи (id)

recommend_next — рекомендация следующей задачи (Priority Engine)

project_status — статус проекта (задачи + Git stats)

knowledge_query — вопросы о проекте через RAG (320 embeddings)

git_status — Git status (branch, modified, staged files)

git_commits — последние N коммитов (count)

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
Версия: 1.0.0
Функции:

index_documents() — индексирует markdown файлы (*.md, *.txt)

search_in_index() — семантический поиск по embeddings

get_index_info() — информация об индексе

Данные: 320 embeddings в indexes/docs_index.json

2. Git MCP (git-mcp-server.js)
Версия: 1.2.1 ✅ Windows-compatible
Функции:

get_current_branch() — текущая ветка

get_git_status() — git status (modified, staged, untracked)

get_recent_commits(count) — последние коммиты (безопасный парсинг через null-byte разделитель)

get_file_content(file_path) — содержимое файла

search_in_repo(pattern) — git grep

get_repo_structure(depth) — дерево файлов

Исправления v1.2.1:

✅ Windows: cmd.exe вместо /bin/bash

✅ Git commits: безопасный парсинг через %x00 разделитель

✅ Обработка пустого репозитория

3. Task MCP (task-mcp-server.js)
Версия: 1.0.0
Функции:

create_task — создать задачу (title, priority, description)

list_tasks — список задач (фильтр по status)

update_task — обновить задачу (id + updates)

delete_task — удалить задачу (id)

get_tasks_summary — сводка для reminders (hourly cron)

Хранилище: tasks.json (JSON file-based storage)
Features: Hourly reminders через node-cron

4. Docker MCP (docker-mcp-server.js)
Версия: 1.0.0
Функции:

listContainers — список контейнеров

startContainer — запустить контейнер

stopContainer — остановить контейнер

removeContainer — удалить контейнер

Точки входа
Файл	Команда	Порт	Назначение
server/index.js	npm run dev (в server/)	4000	Backend API сервер
client/src/main.jsx	npm run dev (в client/)	5173	React frontend
server/git-mcp-server.js	Через MCP Client	stdio	Git operations (v1.2.1)
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
REPO_PATH=D:\perplexity-chat  # Windows: абсолютный путь

# GitHub (optional)
GITHUB_TOKEN=ghp_xxxxxxxxxxxx
Frontend Routes
Route	Component	Description
/	ChatPage.jsx	RAG чат с документами (320 embeddings)
/assistant	AssistantPage.jsx	✅ Git Assistant (slash-команды)
/support	SupportPage.jsx	✅ Support Assistant (RAG + CRM)
/team	TeamAssistantPage.jsx	✅ Team Assistant (NL + Priority Engine)
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
Проверка работоспособности
bash
# Backend health check
curl http://localhost:4000/api/health

# Team Assistant test
curl -X POST http://localhost:4000/api/team/ask \
  -H "Content-Type: application/json" \
  -d '{"query": "Статус проекта"}'
Открыть интерфейсы:
RAG Chat: http://localhost:5173/

Git Assistant: http://localhost:5173/assistant

Support Assistant: http://localhost:5173/support

Team Assistant: http://localhost:5173/team ✅

Версионирование
Версия: 1.1.1
Дата обновления: 2026-01-16 01:10 MSK
Статус: ✅ Production Ready

Изменения v1.1.1:

✅ Git MCP v1.2.1: исправлен парсинг коммитов (null-byte разделитель)

✅ Team Assistant: полностью протестирован

✅ Все тесты пройдены:

✅ Создание задач

✅ Просмотр с фильтрами

✅ Рекомендации (Priority Engine)

✅ Статус проекта

✅ RAG запросы (с источниками)

✅ Git status

✅ Git commits (исправлено)

✅ Edge cases

Изменения v1.1.0:

✅ Team Assistant интегрирован (Natural Language + Priority Engine + Multi-MCP)

✅ LLM Intent Router с правилами

✅ Priority & Recommendations Engine (scoring алгоритм)

✅ Git MCP Windows-совместимый

✅ Task MCP с JSON storage

Особенности Team Assistant
🧠 Intent Router (Hybrid Approach)
Архитектура:

Rule-based matching (приоритет)

Создание задач → create_task

Рекомендации → recommend_next

RAG запросы → knowledge_query

Git операции → git_status, git_commits

Просмотр задач → list_tasks (последний)

LLM Fallback (Perplexity API)

Сложные запросы

Неоднозначные команды

Комбинированные действия

Default

list_tasks если ничего не распознано

Преимущества:

⚡ Быстрый ответ на типичные запросы (правила)

🧠 Интеллектуальная обработка сложных случаев (LLM)

🛡️ Надежный fallback

🎯 Priority Engine
Scoring алгоритм:

javascript
function calculateScore(task, tasks, gitStatus) {
  let score = 0;
  
  // 1. Priority weight
  if (task.priority === 'high') score += 10;
  else if (task.priority === 'medium') score += 5;
  else if (task.priority === 'low') score += 2;
  
  // 2. Dependency blocking
  const blocksCount = tasks.filter(t => 
    t.dependencies?.includes(task.id)
  ).length;
  score += blocksCount * 8;
  
  // 3. Git context relevance
  const relatedToChanges = gitStatus.modified.some(file => 
    task.title.toLowerCase().includes(
      file.split('/').pop().replace('.js', '').toLowerCase()
    )
  );
  if (relatedToChanges) score += 3;
  
  // 4. Current status bonus
  if (task.status === 'in_progress') score += 4;
  
  return score;
}
Пример scoring:

Задача	Priority	Blocks	Git Related	Status	Score
Fix auth bug	high	2 tasks	Yes (auth.js modified)	todo	29 ⭐
Update docs	high	0	No	todo	10
Add tests	medium	0	No	in_progress	9
Refactor code	medium	1	No	todo	13
Рекомендация: "Начни с Fix auth bug (score: 29)"

🔀 Multi-MCP Orchestration
Интеграция:

Task MCP → tasks.json (14 задач)

Git MCP → git operations (branch, status, commits, files)

Documents MCP → RAG search (320 embeddings)

Workflow пример:

text
Query: "Что делать первым?"
↓
Task MCP: получить все задачи → [14 tasks]
Git MCP: git status → {modified: 5 files, branch: "main"}
Priority Engine: scoring → task #123 (score: 29)
Response: "Начни с task #123, блокирует 2 задач, связана с auth.js"
Примеры использования Team Assistant
1. Создание задачи
bash
Input: "Создай задачу: исправить баг в авторизации, приоритет high"
Output: "✅ Создана задача: исправить баг в авторизации (приоритет: high, ID: #1768513577883)"
2. Просмотр с фильтром
bash
Input: "Покажи задачи с приоритетом high"
Output: "Найдено 8 задач с приоритетом high.
📋 Задачи (8):
#1768513577883 | high | todo | исправить баг в авторизации
..."
3. Рекомендация (Priority Engine)
bash
Input: "Что делать первым?"
Output: "**Начни с:** исправить баг в авторизации

**Причина:** Приоритет high, блокирует 2 задач, связана с изменениями в server/auth.js

🚀 Следующие шаги:
- 📝 Закоммитить изменения
- 🚀 Начать работу над задачей #1768513577883"
4. Статус проекта
bash
Input: "Статус проекта"
Output: "📊 Статус проекта

Задачи: 7/14 выполнено, 3 в работе, 2 high-приоритетных

Git: ветка main, 5 измененных файлов, 1 подготовленных"
5. RAG запрос
bash
Input: "Как работает RAG в этом проекте?"
Output: "RAG в проекте работает через индексацию markdown-документов из папки server/documents с созданием JSON-индекса embeddings в server/indexes/docs_index.json (320 embeddings)...

📚 Источники:
- structure.md (релевантность: 95%)
- api-docs.md (релевантность: 87%)
- README.md (релевантность: 82%)"
6. Git операции
bash
Input: "git status"
Output: "🔀 Git Status

Ветка: main
Измененных файлов: 5
Подготовленных файлов: 1

Измененные:
- AI_Challenge_23/server/teamAssistantService.js
- AI_Challenge_23/server/git-mcp-server.js
- AI_Challenge_23/client/src/pages/TeamAssistantPage.jsx"
bash
Input: "Покажи последние 3 коммита"
Output: "📝 Последние 3 коммитов:

- `abc1234` Add Team Assistant (John Doe)
- `def5678` Fix Git MCP commits parsing (John Doe)
- `ghi9012` Update documentation (Jane Smith)"
7. Короткие команды
bash
Input: "задачи"
Output: "Найдено 14 задач. [список всех задач]"

Input: "Что делать?"
Output: [То же, что "Что делать первым?"]
Тестирование
✅ Прошедшие тесты (2026-01-16)
#	Тест	Статус	Результат
1	Создание задачи с приоритетом	✅ Pass	Task создан с ID, priority сохранен
2	Просмотр задач high	✅ Pass	Фильтрация работает, 8 задач
3	Рекомендация (Priority Engine)	✅ Pass	Scoring корректный, учёт Git context
4	Статус проекта	✅ Pass	Stats корректные (7 todo, 2 high, ...)
5	RAG запрос	✅ Pass	Ответ с источниками, 320 embeddings
6	Git status	✅ Pass	Modified/staged файлы показаны
7	Git commits	✅ Pass	Парсинг через null-byte работает
8	Создание без приоритета	✅ Pass	Default priority=medium
9	Фильтр по статусу	✅ Pass	Только todo задачи
10	Edge cases (короткие команды)	✅ Pass	"задачи", "Что делать?" работают
Известные ограничения
Task MCP Storage: JSON file (не масштабируется на >10k задач)

Решение в будущем: Миграция на SQLite/PostgreSQL

Git commits: Работает только если репозиторий инициализирован

Решение: Обработка пустого репозитория (возвращает [])

RAG embeddings: 320 документов (ограничение для больших проектов)

Решение: Chunking стратегия, векторная БД (Pinecone/Weaviate)

Intent Router: LLM latency ~1-2s для сложных запросов

Решение: Кеширование частых команд

Roadmap
v1.2.0 (Planned)
 Task dependencies UI (граф зависимостей)

 Bulk operations ("Удали все done задачи")

 Task templates ("Создай задачу по шаблону bug-report")

 Git branch operations через Team Assistant

 Advanced filters (assignee, date range)

v1.3.0 (Planned)
 SQLite storage для Task MCP

 Real-time collaboration (WebSocket)

 Notifications для high-priority задач

 Analytics dashboard (velocity, burndown)

Лицензия
MIT

Разработка: AI Challenge 23 - Team Assistant + RAG + Git + Support Integration
Статус: ✅ Production Ready (v1.1.1)
Последнее обновление: 2026-01-16 01:10 MSK