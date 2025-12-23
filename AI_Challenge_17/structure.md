# AI Challenge 17 - RAG System with MCP & Perplexity Integration

## Общее описание
Полнофункциональное приложение для демонстрации RAG (Retrieval-Augmented Generation) системы с интеграцией MCP серверов и Perplexity AI. Проект включает систему индексации документов, семантический поиск, сравнение ответов с RAG и без RAG, а также управление Docker контейнерами и GitHub задачами через чат-интерфейс.

## Стек технологий
- **Backend**: Node.js, Express.js
- **Frontend**: React, Vite
- **AI**: Perplexity API (sonar model)
- **MCP**: @modelcontextprotocol/sdk
- **Document Storage**: JSON-based vector index
- **Tools**: Docker, Git

## Структура директорий

ai_challenge_17/
├── server/
│ ├── index.js # Главный Express сервер
│ ├── mcpClient.js # Клиент для Task/Docker/GitHub MCP
│ ├── ragMcpClient.js # Клиент для Documents MCP
│ ├── ragService.js # RAG логика (with/without/compare)
│ ├── documentIndexer.js # Прямая индВот обновлённый structure.md с RAG системой и всеми новыми компонентами:

text
# MCP Server & Chat Integration Project with RAG

## Общее описание
Полнофункциональное приложение для интеграции MCP (Model Context Protocol) серверов с React-чат интерфейсом и **RAG (Retrieval-Augmented Generation) системой**. Архитектура включает микросервисы для управления задачами, документами, GitHub API, Docker и **Document Indexing Pipeline**. Позволяет взаимодействовать с AI-агентами через унифицированный чат-интерфейс с поддержкой контекстного поиска по документам.

## Стек технологий
- **Язык backend**: JavaScript (Node.js ESM)
- **Язык frontend**: JavaScript (React 18)
- **Фреймворки**: Express.js, React, Vite
- **AI/LLM**: Perplexity API (sonar model)
- **MCP SDK**: @modelcontextprotocol/sdk
- **Библиотеки**: Axios, node-fetch, dockerode
- **Инструменты**: Docker, Docker Compose, Git

## Структура директорий

ai_challenge_17/
├── server/ # Backend (Node.js)
│ ├── index.js # Главный Express сервер с API endpoints
│ │
│ ├── MCP Clients & Services
│ ├── mcpClient.js # Клиент для Task/GitHub/Docker MCP
│ ├── ragMcpClient.js # Клиент для Documents MCP
│ ├── ragService.js # RAG логика (с/без RAG, сравнение)
│ ├── documentIndexer.js # Прямая индексация (fallback без MCP)
│ │
│ ├── MCP Servers
│ ├── documents-mcp.js # MCP сервер для индексации документов
│ ├── task-mcp-server.js # MCP сервер для управления задачами
│ ├── github-mcp-server.js # MCP сервер для GitHub API
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
│ └── package.json # Backend зависимости
│
├── client/ # Frontend (React + Vite)
│ ├── src/
│ │ ├── main.jsx # Entry point React app
│ │ ├── App.jsx # Root component
│ │ ├── pages/
│ │ │ └── ChatPage.jsx # Главная страница чата
│ │ ├── hooks/
│ │ │ └── useChatWithPerplexity.js # Hook для chat & RAG API
│ │ └── styles/
│ │ └── ChatPage.css # Стили чата
│ │
│ ├── index.html # HTML template
│ ├── vite.config.js # Vite configuration
│ └── package.json # Frontend зависимости
│
├── Configuration
├── .env # Environment variables
├── package.json # Root workspace config
└── structure.md # Этот файл

text

## Ключевые зависимости

### Backend (server/package.json):
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

text

### Frontend (client/package.json):
{
"dependencies": {
"react": "^18.2.0",
"react-dom": "^18.2.0"
},
"devDependencies": {
"@vitejs/plugin-react": "^4.2.0",
"vite": "^5.0.0"
}
}

text

## Точки входа

| Файл | Команда | Порт | Назначение |
|------|---------|------|-----------|
| `server/index.js` | `npm run dev` (в server/) | 4000 | Backend API сервер |
| `client/src/main.jsx` | `npm run dev` (в client/) | 3000 | React frontend |
| `server/documents-mcp.js` | Запускается через MCP Client | stdio | Document indexing server |

## Environment Variables (.env)

Perplexity AI
PERPLEXITY_API_KEY=pplx-xxxxxxxxxxxx
PERPLEXITY_MODEL=sonar

Server
PORT=4000

GitHub (optional)
GITHUB_TOKEN=ghp_xxxxxxxxxxxx

text

## API Endpoints

### 📚 Documents Pipeline
| Endpoint | Method | Body | Description |
|----------|--------|------|-------------|
| `/api/documents/indexes` | GET | - | Список доступных индексов |
| `/api/documents/index` | POST | `{directory, index_name, file_patterns, backend}` | Создать индекс документов |
| `/api/documents/search` | POST | `{query, index_name, top_k}` | Поиск в индексе |

### 🤖 RAG API
| Endpoint | Method | Body | Description |
|----------|--------|------|-------------|
| `/api/rag/ask` | POST | `{question, mode, indexName, topK}` | RAG запрос |

**Режимы (`mode`)**:
- `no_rag` — ответ без документов (чистый LLM)
- `with_rag` — ответ с контекстом из документов
- `compare` — сравнение обоих режимов

**Пример запроса**:
{
"question": "На каком порту работает API сервер?",
"mode": "compare",
"indexName": "docs_index",
"topK": 5
}

text

**Пример ответа (compare)**:
{
"mode": "compare",
"question": "...",
"noRag": {
"mode": "no_rag",
"llmAnswer": "Общий ответ без контекста...",
"llmInput": { "messages": [...] }
},
"withRag": {
"mode": "with_rag",
"llmAnswer": "API сервер работает на порту 4000...",
"retrievedChunks": [
{
"file_path": "docker-compose.md",
"text": "API сервер работает на порту 4000.",
"score": 0.95
}
],
"llmInput": { "messages": [...] }
},
"analysis": {
"whereRagHelped": ["Предоставил точный порт"],
"whereRagNotNeeded": ["Объяснение концепции"],
"summary": "RAG улучшил ответ..."
},
"formatted": "📌 ВОПРОС:\n...\n🧠 ОТВЕТ БЕЗ RAG:\n..."
}

text

### 💬 Chat
| Endpoint | Method | Body | Description |
|----------|--------|------|-------------|
| `/api/chat` | POST | `{message, context?}` | Отправка сообщения в чат |

### 📋 Tasks
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/tasks` | GET | Список задач |
| `/api/tasks` | POST | Создать задачу |
| `/api/tasks/:id` | PATCH | Обновить задачу |
| `/api/tasks/:id` | DELETE | Удалить задачу |

### 🐳 Docker
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/docker/containers` | GET | Список контейнеров |
| `/api/docker/start` | POST | Запустить контейнер |
| `/api/docker/stop/:container` | POST | Остановить контейнер |

### 🎯 Orchestration
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/orchestrate/setup-test-env` | POST | Поднять PostgreSQL + Redis |
| `/api/orchestrate/cleanup-env` | POST | Очистить окружение |
| `/api/orchestrate/summary-chain` | POST | Суммаризация задач → GitHub |

### 🧪 Testing
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/test/run` | POST | Запустить mock-тесты |
| `/api/health` | GET | Health check |
| `/api/stats` | GET | Token usage статистика |

## MCP Servers

### 1. Documents MCP (`documents-mcp.js`)
**Tools**:
- `index_documents(directory, file_patterns, index_name, backend)` — индексирует markdown файлы
- `search_in_index(index_name, query, top_k)` — семантический поиск
- `get_index_info(index_name)` — информация об индексе

**Storage**: `indexes/*.json` (embeddings в JSON формате)

**Search Algorithm**:
- Keyword matching с весами
- Приоритет ключевым терминам (порт, сервер, 4000, etc.)
- Сортировка по relevance score

### 2. Task MCP (`task-mcp-server.js`)
**Tools**: `createTask`, `updateTask`, `listTasks`, `deleteTask`

**Storage**: SQLite database

### 3. GitHub MCP (`github-mcp-server.js`)
**Tools**: `getRepos`, `getIssues`, `createIssue`, `summarizeToGitHub`

**API**: GitHub REST API

### 4. Docker MCP (`docker-mcp-server.js`)
**Tools**: `listContainers`, `startContainer`, `stopContainer`, `removeContainer`

**SDK**: Dockerode

## RAG Architecture

User Question
↓
[ragService.js]
├─→ [Mode: no_rag] → Perplexity API → Answer
├─→ [Mode: with_rag] → Documents MCP → Search → Chunks → LLM with context → Answer
└─→ [Mode: compare] → Both modes → Analysis → Formatted comparison

text

### RAG Service (`ragService.js`)

**Functions**:
1. `answerWithoutRag(question)` — Чистый LLM без контекста
2. `answerWithRagViaMcp(question, indexName, topK)` — RAG с документами
3. `compareRagVsNoRagViaMcp(question, indexName, topK)` — Сравнение + анализ

**Analysis Logic**:
- Сравнивает длину ответов
- Находит различия в контенте
- Определяет, где RAG помог, а где не нужен
- Генерирует итоговый вывод

## Frontend Features

### ChatPage.jsx
**Components**:
- Чат интерфейс с историей сообщений
- Quick prompts (🧪 Tests, 📋 Issues, 🐳 Docker, 📚 Docs)
- Document panel для индексации
- RAG mode selector (🧠 Without RAG, 📚 With RAG, ⚖️ Compare)

**Modes**:
const [ragMode, setRagMode] = useState(null); // null | 'no_rag' | 'with_rag' | 'compare'

text

**Quick Actions**:
- "🔄 Index Documents" → индексация `./documents`
- Выбор режима RAG кнопками
- Триггеры для Docker команд ("подними postgres")

### useChatWithPerplexity.js
**Hook Functions**:
- `handleChat(message, ragMode)` — основная функция отправки
- `indexDocuments(directory)` — индексация через `/api/documents/index`
- `searchDocuments(query)` — поиск через `/api/documents/search`
- `compareRagModes(question)` — сравнение через `/api/rag/ask`
- `askWithRagMode(question, mode)` — запрос с выбором режима
- `loadIndexes()` — загрузка списка индексов

**Docker Triggers**:
Распознаёт команды в тексте:
- "подними postgres/redis" → `/api/orchestrate/setup-test-env`
- "список контейнеров" → `/api/docker/containers`
- "очисти" → `/api/orchestrate/cleanup-env`

## Workflow Examples

### 1. Индексация документов
User → [🔄 Index Documents]
↓
Frontend → POST /api/documents/index {directory: "./documents"}
↓
Backend → callDocumentTool('index_documents', {...})
↓
Documents MCP → Read files → Generate embeddings → Save to indexes/docs_index.json
↓
Response: {success: true, files_processed: 3, chunks_created: 24}

text

### 2. RAG Compare Query
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

text

### 3. Docker Orchestration
User → "подними postgres"
↓
Frontend → executeDockerCommand() → detected: true
↓
Backend → POST /api/orchestrate/setup-test-env
↓
orchestrateSetupTestEnv()
├─→ Docker MCP: startContainer(postgres)
├─→ Docker MCP: startContainer(redis)
├─→ Task MCP: createTask("Environment setup")
└─→ GitHub MCP: createIssue("Setup completed")
↓
Response: {environment: {postgres: {...}, redis: {...}}, task_id, github_summary}

text

## Deployment

### Development
Terminal 1 - Backend
cd server
npm install
npm run dev # http://localhost:4000

Terminal 2 - Frontend
cd client
npm install
npm run dev # http://localhost:3000

text

### Production (Docker Compose)
version: '3.8'
services:
api:
build: ./server
ports:
- "4000:4000"
environment:
- PERPLEXITY_API_KEY=${PERPLEXITY_API_KEY}
volumes:
- ./server/indexes:/app/indexes
- ./server/documents:/app/documents

frontend:
build: ./client
ports:
- "3000:3000"
depends_on:
- api

text

## Важные концепции

### 1. RAG (Retrieval-Augmented Generation)
- **Без RAG**: LLM отвечает на основе внутренних знаний
- **С RAG**: LLM получает релевантные чанки из документов → более точные ответы
- **Compare**: Показывает разницу и анализирует, где RAG помог

### 2. MCP Protocol
- Унифицированный интерфейс для tools
- Stdio transport (JSON-RPC over stdin/stdout)
- Client → Server коммуникация

### 3. Embeddings (Mock)
Сейчас используются **mock embeddings** (случайные векторы 384 dim).

**Для production**:
- Замените на real embeddings (OpenAI, Cohere, SentenceTransformers)
- Используйте векторную БД (Pinecone, Weaviate, FAISS)

### 4. Search Algorithm
Текущий: **keyword-based с весами**

**Улучшения**:
- Semantic search с real embeddings
- BM25 для hybrid search
- Reranking моделями (Cohere Rerank)

## Возможные улучшения

### Backend:
- [ ] Real embeddings (OpenAI text-embedding-3-small)
- [ ] Vector DB (FAISS, Chroma, Pinecone)
- [ ] Chunking strategies (RecursiveCharacterTextSplitter)
- [ ] Cache для частых запросов (Redis)
- [ ] Аутентификация (JWT)
- [ ] Rate limiting
- [ ] Логирование (Winston, Pino)

### Frontend:
- [ ] Streaming ответов (SSE)
- [ ] Markdown рендеринг в ответах
- [ ] История поиска
- [ ] Подсветка релевантных чанков
- [ ] Drag & drop для загрузки файлов

### RAG:
- [ ] Multi-query retrieval
- [ ] Contextual compression
- [ ] Parent-child chunking
- [ ] Metadata filtering
- [ ] Hybrid search (keyword + semantic)

## Testing

Mock tests через UI
POST /api/test/run

Manual test search
node server/test-search.js

text

## Troubleshooting

### Проблема: api-docs.md доминирует в результатах
**Решение**: Удалить или переименовать `documents/api-docs.md`

### Проблема: Порт 4000 занят
**Решение**:
Windows
netstat -ano | findstr :4000
taskkill /PID <PID> /F

Linux/Mac
lsof -ti:4000 | xargs kill -9

text

### Проблема: MCP сервер не запускается
**Проверить**:
- `#!/usr/bin/env node` в первой строке
- `chmod +x documents-mcp.js`
- Путь в `ragMcpClient.js` корректен

## Для новичков

1. **Начни с фронтенда**: Изучи `ChatPage.jsx` → понять UI
2. **API endpoints**: Прочитай `index.js` → endpoints структура
3. **RAG логика**: Открой `ragService.js` → как работает RAG
4. **MCP**: Изучи `documents-mcp.js` → как индексируются документы
5. **Тестируй**: Запусти оба сервера и попробуй все 3 режима RAG

## License

MIT

## Автор

AI Challenge 17 - RAG Integration Project