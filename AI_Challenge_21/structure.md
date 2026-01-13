# MCP Server & Chat Integration Project with RAG + Git Integration

## Общее описание
Полнофункциональное приложение для интеграции MCP (Model Context Protocol) серверов с React-чат интерфейсом и **RAG (Retrieval-Augmented Generation) системой**. Архитектура включает микросервисы для управления задачами, документами, GitHub API, Docker, **Git операций** и **Document Indexing Pipeline**. Позволяет взаимодействовать с AI-агентами через унифицированный чат-интерфейс с поддержкой контекстного поиска по документам и анализа git-репозиториев.

## Стек технологий
- **Язык backend**: JavaScript (Node.js ESM)
- **Язык frontend**: JavaScript (React 18)
- **Фреймворки**: Express.js, React, Vite
- **AI/LLM**: Perplexity API (sonar model)
- **MCP SDK**: @modelcontextprotocol/sdk
- **Библиотеки**: Axios, node-fetch, dockerode
- **Инструменты**: Docker, Docker Compose, Git

## Структура директорий

AI_Challenge_21/
├── server/ # Backend (Node.js)
│ ├── index.js # Главный Express сервер с API endpoints
│ │
│ ├── MCP Clients & Services
│ ├── mcpClient.js # Клиент для Task/GitHub/Docker MCP
│ ├── ragMcpClient.js # Клиент для Documents MCP
│ ├── gitMcpClient.js # ✅ Клиент для Git MCP
│ ├── ragService.js # RAG логика (с/без RAG, сравнение)
│ ├── documentIndexer.js # Прямая индексация (fallback без MCP)
│ ├── assistantService.js # ✅ Assistant команды (/help, /code, /review)
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
│ │
│ ├── Data Storage
│ ├── documents/ # Markdown документы для индексации
│ │ ├── README.md
│ │ ├── docker-compose.md
│ │ └── api-docs.md (optional)
│ ├── indexes/ # JSON индексы с embeddings
│ │ └── docs_index.json
│ │
│ ├── .env # ✅ Environment variables (REPO_PATH, PERPLEXITY_API_KEY)
│ └── package.json # Backend зависимости
│
├── client/ # Frontend (React + Vite)
│ ├── src/
│ │ ├── main.jsx # Entry point React app
│ │ ├── App.jsx # Root component с маршрутизацией
│ │ ├── pages/
│ │ │ ├── ChatPage.jsx # RAG чат страница
│ │ │ └── AssistantPage.jsx # ✅ Git Assistant страница
│ │ ├── hooks/
│ │ │ ├── useChatWithPerplexity.js # Hook для chat & RAG API
│ │ │ └── useAssistant.js # ✅ Hook для Git Assistant
│ │ └── styles/
│ │ ├── ChatPage.css # Стили RAG чата
│ │ └── AssistantPage.css # ✅ Стили Git Assistant
│ │
│ ├── index.html # HTML template
│ ├── vite.config.js # Vite configuration
│ └── package.json # Frontend зависимости
│
├── Configuration
├── .env # Environment variables (root)
├── package.json # Root workspace config
└── structure.md # Этот файл

text

## Ключевые зависимости

### Backend (server/package.json):
```json
{
  "type": "module",
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "node-fetch": "^3.3.2",
    "@modelcontextprotocol/sdk": "^0.6.0"
  }
}
Frontend (client/package.json):
json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.0",
    "vite": "^5.0.0"
  }
}
Точки входа
Файл	Команда	Порт	Назначение
server/index.js	npm run dev (в server/)	4000	Backend API сервер
client/src/main.jsx	npm run dev (в client/)	5173	React frontend
server/documents-mcp.js	Запускается через MCP Client	stdio	Document indexing server
server/git-mcp-server.js	✅ Запускается через MCP Client	stdio	Git operations server
Environment Variables (.env)
bash
# Perplexity AI
PERPLEXITY_API_KEY=pplx-xxxxxxxxxxxx
PERPLEXITY_MODEL=sonar

# Server
PORT=4000

# Git MCP
REPO_PATH=/mnt/d/AI-Challenge

# GitHub (optional)
GITHUB_TOKEN=ghp_xxxxxxxxxxxx
API Endpoints
📚 Documents Pipeline
Endpoint	Method	Body	Description
/api/documents/indexes	GET	-	Список доступных индексов
/api/documents/index	POST	{directory, index_name, file_patterns, backend}	Создать индекс документов
/api/documents/search	POST	{query, index_name, top_k}	Поиск в индексе
🤖 RAG API
Endpoint	Method	Body	Description
/api/rag/ask	POST	{question, mode, indexName, topK}	RAG запрос
Режимы (mode):

no_rag — ответ без документов (чистый LLM)

with_rag — ответ с контекстом из документов

compare — сравнение обоих режимов

reranked_rag — ✅ с reranking

compare_rerank — ✅ сравнение basic vs reranked

✅ Git Assistant API
Endpoint	Method	Body	Description
/api/assistant/command	POST	{command}	Выполнить команду Assistant
Команды:

/help <query> — вопрос с Git контекстом (branch, status, commits)

/code <file> — показать содержимое файла + LLM анализ

/review — code review изменённых файлов

/search <pattern> — поиск в репозитории (git grep)

/commits [count] — показать последние коммиты

/status — git status

Пример запроса:

json
{
  "command": "/help текущая ветка"
}
Пример ответа:

json
{
  "success": true,
  "response": "**Git Context:**\n- Branch: main\n- Status: 2 modified files\n- Last commit: feat: add git mcp integration\n\nТекущая ветка — **main**. Это основная ветка разработки..."
}
💬 Chat
Endpoint	Method	Body	Description
/api/chat	POST	{message, context?}	Отправка сообщения в чат
📋 Tasks
Endpoint	Method	Description
/api/tasks	GET	Список задач
/api/tasks	POST	Создать задачу
/api/tasks/:id	PATCH	Обновить задачу
/api/tasks/:id	DELETE	Удалить задачу
🐳 Docker
Endpoint	Method	Description
/api/docker/containers	GET	Список контейнеров
/api/docker/start	POST	Запустить контейнер
/api/docker/stop/:container	POST	Остановить контейнер
🎯 Orchestration
Endpoint	Method	Description
/api/orchestrate/setup-test-env	POST	Поднять PostgreSQL + Redis
/api/orchestrate/cleanup-env	POST	Очистить окружение
/api/orchestrate/summary-chain	POST	Суммаризация задач → GitHub
🧪 Testing
Endpoint	Method	Description
/api/test/run	POST	Запустить mock-тесты
/api/health	GET	Health check
/api/stats	GET	Token usage статистика
MCP Servers
1. Documents MCP (documents-mcp.js)
Tools:

index_documents(directory, file_patterns, index_name, backend) — индексирует markdown файлы

search_in_index(index_name, query, top_k) — семантический поиск

get_index_info(index_name) — информация об индексе

Storage: indexes/*.json (embeddings в JSON формате)

2. ✅ Git MCP (git-mcp-server.js)
Tools:

get_current_branch() — текущая ветка

get_git_status() — git status (modified, staged, untracked)

get_recent_commits(count) — последние коммиты

get_file_content(file_path) — содержимое файла из репо

search_in_repo(pattern, file_pattern) — git grep

get_repo_structure(depth) — дерево файлов репозитория

Working Directory: REPO_PATH из .env (например, D:\AI-Challenge)

Transport: stdio (JSON-RPC)

3. Task MCP (task-mcp-server.js)
Tools: createTask, updateTask, listTasks, deleteTask

Storage: SQLite database

4. Docker MCP (docker-mcp-server.js)
Tools: listContainers, startContainer, stopContainer, removeContainer

SDK: Dockerode

Assistant Architecture
text
User Command: "/help текущая ветка"
↓
[assistantService.js] parseCommand()
↓
Command: help, Args: "текущая ветка"
↓
[gitMcpClient.js] callGitTool('get_current_branch')
                  callGitTool('get_git_status')
                  callGitTool('get_recent_commits', {count: 3})
↓
Git Context:
- Branch: main
- Status: M server/git-mcp-server.js
- Commits: [...]
↓
[Perplexity API] with Git context
↓
Response: "Текущая ветка — **main**. Есть 2 изменённых файла..."
Frontend Routes
Route	Component	Description
/	ChatPage.jsx	RAG чат с документами
/assistant	✅ AssistantPage.jsx	Git Assistant с командами
RAG Architecture
text
User Question
↓
[ragService.js]
├─→ [Mode: no_rag] → Perplexity API → Answer
├─→ [Mode: with_rag] → Documents MCP → Search → Chunks → LLM with context → Answer
├─→ [Mode: compare] → Both modes → Analysis → Formatted comparison
├─→ [Mode: reranked_rag] → Documents MCP → Search → Rerank → Top chunks → LLM → Answer
└─→ [Mode: compare_rerank] → Basic vs Reranked → Analysis
Workflow Examples
1. Git Assistant Command
text
User → "/code server/ragService.js" в AssistantPage
↓
Frontend → POST /api/assistant/command {command: "/code server/ragService.js"}
↓
Backend → assistantService.processAssistantCommand()
↓
Parse: command = "code", args = "server/ragService.js"
↓
Git MCP → callGitTool('get_file_content', {file_path: "server/ragService.js"})
↓
Response: {success: true, content: "import ..."}
↓
Perplexity API → Analyze code + explain
↓
Response: "**File: server/ragService.js**\n\nЭтот файл реализует RAG логику..."
2. Code Review
text
User → "/review" в AssistantPage
↓
Backend → callGitTool('get_git_status')
↓
Modified files: ["server/git-mcp-server.js", "gitMcpClient.js"]
↓
Loop through files:
  callGitTool('get_file_content', {file_path: "server/git-mcp-server.js"})
  callGitTool('get_file_content', {file_path: "gitMcpClient.js"})
↓
Perplexity API → Review code changes
↓
Response: "**Code Review:**\n\n1. server/git-mcp-server.js: ✅ Good practices..."
3. RAG Compare Query
text
User → [⚖️ Compare Both] → "На каком порту работает API сервер?"
↓
Frontend → POST /api/rag/ask {mode: "compare", question: "..."}
↓
ragService.compareRagVsNoRagViaMcp()
├─→ answerWithoutRag() → Perplexity → General answer
└─→ answerWithRagViaMcp()
    ↓
    searchInIndex("docs_index", query, 5) → Documents MCP
    ↓
    [0.95] docker-compose.md: "API сервер работает на порту 4000"
    ↓
    Perplexity with context → Specific answer
↓
analyzeRagDifference() → Compare answers
↓
Response: {noRag: {...}, withRag: {...}, analysis: {...}}
Deployment
Development
bash
# Terminal 1 - Backend (используйте Windows CMD/PowerShell, не WSL!)
cd D:\AI-Challenge\AI_Challenge_21\server
npm install
npm run dev  # http://localhost:4000

# Terminal 2 - Frontend
cd D:\AI-Challenge\AI_Challenge_21\client
npm install
npm run dev  # http://localhost:5173
Важные концепции
1. Git MCP Integration
Working Directory: Все git команды выполняются в REPO_PATH (из .env)

Context Enrichment: Assistant автоматически добавляет git контекст (branch, status, commits) к запросам

Code Analysis: LLM анализирует содержимое файлов и изменения

2. RAG (Retrieval-Augmented Generation)
Без RAG: LLM отвечает на основе внутренних знаний

С RAG: LLM получает релевантные чанки из документов → более точные ответы

Compare: Показывает разницу и анализирует, где RAG помог

Reranked: Улучшенный поиск с reranking для лучшей релевантности

3. MCP Protocol
Унифицированный интерфейс для tools

Stdio transport (JSON-RPC over stdin/stdout)

Client → Server коммуникация

Troubleshooting

Проблема: Git MCP ошибка "spawnSync /bin/sh ENOENT" в WSL
Решение:
- Запускайте сервер через Windows CMD/PowerShell, а не WSL bash
- Или измените REPO_PATH=/mnt/d/AI-Challenge и shell: '/bin/bash' в git-mcp-server.js

Проблема: Git MCP ошибка "not a git repository"
Решение:

Проверь .env: REPO_PATH=D:\AI-Challenge (используй \ для Windows)

Убедись, что путь валидный git-репозиторий: cd D:\AI-Challenge && git status

Проверь, что gitMcpClient.js загружает dotenv и передаёт REPO_PATH в spawn env

Проблема: Порт 4000 занят
Решение:

bash
# Windows
netstat -ano | findstr :4000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:4000 | xargs kill -9
Проблема: MCP сервер не запускается
Проверить:

#!/usr/bin/env node в первой строке

chmod +x git-mcp-server.js (Linux/Mac)

Путь в gitMcpClient.js корректен

License
MIT

Версия
AI Challenge 21 - RAG + Git Integration