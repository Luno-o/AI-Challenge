Вот обновленная структура проекта с интеграцией локальной LLM:

text
# MCP Server & Chat Integration Project with RAG + Git + Support + Team Assistant + Local LLM

## Общее описание
Полнофункциональное приложение для интеграции MCP (Model Context Protocol) серверов с React-чат интерфейсом, **RAG (Retrieval-Augmented Generation)** системой, **Support Assistant**, **Team Assistant** и **локальной LLM (Ollama)**. Архитектура включает микросервисы для управления задачами, документами, GitHub API, Docker, Git операций, Document Indexing Pipeline, поддержки пользователей, интеллектуального управления командой и локальной обработки запросов.

## Deployment Architecture

### Production Endpoints
- **Frontend (Vercel)**: `https://your-app.vercel.app`
  - React 18 + Vite
  - Serverless Functions
  - Environment: VITE_API_URL
  
- **Backend (Railway)**: `https://your-backend.railway.app`
  - Node.js Express API
  - Nixpacks builder
  - Root Directory: `/server`
  - Environment: PORT=4000 (Railway автоматически)

- **Local LLM (Ollama)**: `http://localhost:11434`
  - Запускается локально на машине разработчика
  - Модели: gemma3:4b, llama3.2:3b, nomic-embed-text
  - Интеграция через REST API

### GitHub Actions CI/CD Pipeline

**Workflow файл**: `.github/workflows/deploy.yml`

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: ./client
          vercel-args: '--prod'
          
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Railway
        run: |
          npm install -g @railway/cli
          railway up --service backend
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
          
  notify:
    needs: [deploy-frontend, deploy-backend]
    runs-on: ubuntu-latest
    steps:
      - name: Discord Notification
        uses: sarisia/actions-status-discord@v1
        with:
          webhook: ${{ secrets.DISCORD_WEBHOOK }}
          title: "Deployment Complete"
          description: |
            ✅ Frontend: ${{ secrets.VERCEL_URL }}
            ✅ Backend: ${{ secrets.RAILWAY_URL }}
GitHub Secrets Configuration
Required Secrets (Settings → Secrets and variables → Actions):

Secret Name	Description	Source
VERCEL_TOKEN	Vercel Access Token	vercel.com → Account Settings → Tokens
VERCEL_ORG_ID	Vercel Organization ID	vercel.com/account → Settings → General → Your ID
VERCEL_PROJECT_ID	Vercel Project ID	vercel.com/dashboard → Project → Settings → Project ID
RAILWAY_TOKEN	Railway API Token	railway.app → Account Settings → Tokens
PERPLEXITY_API_KEY	Perplexity AI API Key	perplexity.ai/settings/api
DOCKER_USERNAME	Docker Hub Username	hub.docker.com → Account
DOCKER_PASSWORD	Docker Hub Access Token	hub.docker.com → Account Settings → Security
DISCORD_WEBHOOK	Discord Webhook URL	Discord → Channel Settings → Integrations → Webhooks
VERCEL_URL	Frontend Production URL	После первого деплоя
RAILWAY_URL	Backend Production URL	После первого деплоя
Стек технологий
Язык backend: JavaScript (Node.js ESM)

Язык frontend: JavaScript (React 18)

Фреймворки: Express.js, React, Vite

AI/LLM:

Perplexity API (sonar model) - облачная

Ollama (gemma3:4b, llama3.2:3b) - локальная

MCP SDK: @modelcontextprotocol/sdk

Библиотеки: Axios, node-fetch, node-cron, dockerode

Инструменты: Docker, Docker Compose, Git

Deployment: Vercel (Frontend), Railway (Backend)

CI/CD: GitHub Actions

Структура директорий
text
AI_Challenge_23/
├── .github/                           # 🆕 GitHub Actions CI/CD
│   └── workflows/
│       └── deploy.yml                 # Deployment pipeline
│
├── server/                            # Backend (Node.js) - Railway
│   ├── index.js                       # Express сервер (PORT=4000)
│   │
│   ├── MCP Clients & Services
│   ├── mcpClient.js
│   ├── ragMcpClient.js
│   ├── gitMcpClient.js
│   ├── supportMcpClient.js
│   ├── localLlmClient.js             # 🆕 Клиент для Ollama
│   │
│   ├── Service Layer
│   ├── ragService.js
│   ├── assistantService.js
│   ├── supportAssistantService.js
│   ├── teamAssistantService.js       # 🔄 Обновлён (+ Local LLM)
│   ├── documentIndexer.js
│   │
│   ├── MCP Servers
│   ├── documents-mcp.js
│   ├── task-mcp-server.js
│   ├── git-mcp-server.js              # v1.2.1 (Railway compatible)
│   ├── docker-mcp-server.js
│   │
│   ├── Orchestration & Utils
│   ├── agent-orchestrator.js
│   ├── githubTools.js
│   ├── githubService.js
│   ├── prReviewService.js
│   │
│   ├── Data Storage
│   ├── documents/                     # Markdown документы
│   ├── indexes/                       # JSON индексы (343 embeddings)
│   ├── tasks.json                     # База задач
│   │
│   ├── Configuration
│   ├── .env                           # 🔄 Railway + Ollama Environment Variables
│   │   # PERPLEXITY_API_KEY (from Railway secrets)
│   │   # PERPLEXITY_MODEL=sonar
│   │   # OLLAMA_URL=http://localhost:11434  # 🆕
│   │   # OLLAMA_MODEL=gemma3:4b             # 🆕
│   │   # REPO_PATH=/app/repo (Railway volume)
│   │   # PORT=4000 (Railway auto-injected)
│   │
│   ├── railway.json                   # 🆕 Railway config
│   │   # {"builder": "NIXPACKS", "deploy": {"startCommand": "node index.js"}}
│   │
│   └── package.json
│
├── client/                            # Frontend (React + Vite) - Vercel
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── pages/
│   │   │   ├── ChatPage.jsx
│   │   │   ├── AssistantPage.jsx
│   │   │   ├── SupportPage.jsx
│   │   │   └── TeamAssistantPage.jsx  # 🔄 Обновлён (+ LLM Switcher)
│   │   ├── components/
│   │   ├── hooks/
│   │   │   └── useTeamAssistant.js    # Без изменений
│   │   └── styles/
│   │       └── TeamAssistantPage.css  # 🔄 Обновлён (+ LLM Switcher styles)
│   │
│   ├── .env                           # 🆕 Vercel Environment Variables
│   │   # VITE_API_URL=https://your-backend.railway.app
│   │
│   ├── vercel.json                    # 🆕 Vercel config
│   │   # {"buildCommand": "npm run build", "outputDirectory": "dist"}
│   │
│   └── package.json
│
└── Configuration
    ├── .env.example                   # 🔄 Шаблон для локальной разработки + Ollama
    ├── .gitignore                     # 🆕 Исключить .env, node_modules
    ├── package.json
    └── structure.md                   # Этот файл (v1.3.0)
Deployment Configuration
Railway (Backend)
Файл: server/railway.json

json
{
  "builder": "NIXPACKS",
  "deploy": {
    "startCommand": "node index.js",
    "healthcheckPath": "/api/health",
    "restartPolicyType": "ON_FAILURE"
  }
}
Environment Variables (Railway Dashboard):

bash
PERPLEXITY_API_KEY=pplx-xxxxxxxxxxxx
PERPLEXITY_MODEL=sonar
REPO_PATH=/app/repo
PORT=4000  # Auto-injected by Railway
NODE_ENV=production
Root Directory: /server (Settings → Source → Root Directory)

Vercel (Frontend)
Файл: client/vercel.json

json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "framework": "vite",
  "routes": [
    { "src": "/[^.]+", "dest": "/", "status": 200 }
  ]
}
Environment Variables (Vercel Dashboard):

bash
VITE_API_URL=https://your-backend.railway.app
NODE_VERSION=20
Ollama (Local LLM)
Установка (Windows):

bash
# 1. Скачать с ollama.com
# 2. Установить и запустить автоматически на localhost:11434

# 3. Скачать модели
ollama pull gemma3:4b
ollama pull llama3.2:3b
ollama pull nomic-embed-text

# 4. Проверить
ollama list
curl http://localhost:11434
Environment Variables (Local Development):

bash
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=gemma3:4b
Development vs Production
Local Development
bash
# Terminal 1 - Ollama (если не запущена автоматически)
ollama serve

# Terminal 2 - Backend
cd server
npm install
npm run dev  # http://localhost:4000

# Terminal 3 - Frontend  
cd client
npm install
npm run dev  # http://localhost:5173
Production (GitHub Actions)
bash
git add .
git commit -m "feat: deploy update"
git push origin main

# 🚀 Автоматический деплой:
# 1. GitHub Actions запускает workflow
# 2. Frontend → Vercel (serverless)
# 3. Backend → Railway (container)
# 4. Discord notification с результатом
API Endpoints (Production)
Base URL: https://your-backend.railway.app

✅ Team Assistant API
Endpoint	Method	Body	Description
/api/team/ask	POST	{query, user_id}	Natural Language запросы (Perplexity + Ollama)
🤖 Local LLM API (NEW)
Endpoint	Method	Body	Description
/api/local-llm/ask	POST	{prompt, temperature, top_p}	Прямой запрос к Ollama
/api/local-llm/health	GET	-	Проверка доступности Ollama
/api/local-llm/models	GET	-	Список установленных моделей
📚 Documents Pipeline
Endpoint	Method	Body	Description
/api/documents/index	POST	{directory, index_name}	Создать индекс
/api/documents/search	POST	{query, index_name, top_k}	Поиск
🤖 RAG API
Endpoint	Method	Body	Description
/api/rag/ask	POST	{question, mode, topK}	RAG запрос
💬 Support Assistant
Endpoint	Method	Body	Description
/api/support/ask	POST	{user_id, question}	Поддержка
✅ Git Assistant API
Endpoint	Method	Body	Description
/api/assistant/command	POST	{command}	Git команды
Environment Variables
Development (.env.example)
bash
# Perplexity AI
PERPLEXITY_API_KEY=pplx-xxxxxxxxxxxx
PERPLEXITY_MODEL=sonar

# Server
PORT=4000

# Git MCP (Local)
REPO_PATH=D:\perplexity-chat  # Windows: абсолютный путь

# Ollama (Local LLM) 🆕
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=gemma3:4b

# GitHub (optional)
GITHUB_TOKEN=ghp_xxxxxxxxxxxx
Production - Railway (Backend)
bash
PERPLEXITY_API_KEY=<from GitHub Secrets>
PERPLEXITY_MODEL=sonar
REPO_PATH=/app/repo
PORT=4000
NODE_ENV=production
# Ollama недоступна в production (только локально)
Production - Vercel (Frontend)
bash
VITE_API_URL=https://your-backend.railway.app
NODE_VERSION=20
Team Assistant Features
🌐 Perplexity Mode (Default)
✅ Управление задачами (создание, просмотр, удаление)

✅ Приоритизация задач с учётом Git изменений

✅ Статус проекта и аналитика

✅ Git операции (status, commits, history)

✅ RAG поиск в документации

✅ Умный анализ и рекомендации

Примеры команд:

text
"Покажи все задачи"
"Что делать первым?"
"Статус проекта"
"Создай задачу: исправить баг, приоритет high"
"Как работает RAG в этом проекте?"
"Покажи последние 5 коммитов"
🤖 Ollama Mode (Local LLM)
✅ Быстрые ответы без интернета

✅ Приватность (все данные локально)

✅ Поддержка русского языка

✅ Общие знания и объяснения

✅ Модели: gemma3:4b (3.3 GB), llama3.2:3b (2.0 GB)

Активация:

Переключить на "🤖 Ollama" в интерфейсе

Задать вопрос напрямую

Примеры запросов:

text
"Что такое MCP протокол?"
"Объясни как работает RAG"
"Как настроить Docker контейнер?"
"В чём разница между REST и GraphQL?"
LLM Switcher (Frontend)
jsx
// Переключатель между Perplexity и Ollama
[🌐 Perplexity] [🤖 Ollama]

// Perplexity - умный анализ задач/Git/проекта
// Ollama - быстрые ответы, общие знания
Monitoring & Debugging
Railway Logs
bash
railway logs --service backend --tail
Vercel Logs
bash
vercel logs https://your-app.vercel.app
Ollama Logs
bash
# Проверка статуса
curl http://localhost:11434

# Список моделей
ollama list

# Запуск модели
ollama run gemma3:4b

# Тест через API
curl -X POST http://localhost:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{"model": "gemma3:4b", "prompt": "Hello", "stream": false}'
Health Check
bash
# Backend
curl https://your-backend.railway.app/api/health

# Response: {"status": "ok", "timestamp": "2026-01-20T..."}

# Local LLM
curl http://localhost:4000/api/local-llm/health

# Response: {"status": "ok", "url": "http://localhost:11434", "model": "gemma3:4b"}
Testing
Local Testing
bash
# Backend health
curl http://localhost:4000/api/health

# Team Assistant test (Perplexity)
curl -X POST http://localhost:4000/api/team/ask \
  -H "Content-Type: application/json" \
  -d '{"query": "Статус проекта"}'

# Local LLM test (Ollama)
curl -X POST http://localhost:4000/api/local-llm/ask \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Что такое MCP?"}'
Production Testing
bash
# Frontend (Vercel)
curl https://your-app.vercel.app

# Backend (Railway)
curl https://your-backend.railway.app/api/health

# Team Assistant
curl -X POST https://your-backend.railway.app/api/team/ask \
  -H "Content-Type: application/json" \
  -d '{"query": "Покажи задачи"}'
Troubleshooting
Railway Deployment Fails
Error: Railpack could not determine how to build

Solution:

Установите Root Directory: /server (Settings → Source)

Создайте railway.json с startCommand

Проверьте package.json имеет start скрипт

Error: Module not found в production

Solution:

Проверьте зависимости в package.json (не в devDependencies)

Убедитесь что npm install выполняется перед start

Vercel Deployment Fails
Error: Build failed

Solution:

Проверьте vercel.json → buildCommand и outputDirectory

Установите Node.js версию через NODE_VERSION env var

Убедитесь что npm run build работает локально

Error: 404 on refresh

Solution:
Добавьте в vercel.json:

json
{
  "routes": [
    { "src": "/[^.]+", "dest": "/", "status": 200 }
  ]
}
Ollama Issues
Error: Connection refused (localhost:11434)

Solution:

bash
# Windows
ollama serve

# Проверка
curl http://localhost:11434
Error: Model not found

Solution:

bash
# Список моделей
ollama list

# Скачать модель
ollama pull gemma3:4b

# Проверить в коде
# server/.env: OLLAMA_MODEL=gemma3:4b
Error: 404 on /api/generate

Solution:

Проверьте версию Ollama: ollama --version

Обновите до последней: скачайте с ollama.com

Перезапустите: ollama serve

CORS Errors
Error: Access-Control-Allow-Origin

Solution (server/index.js):

javascript
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://your-app.vercel.app'
    : 'http://localhost:5173'
}));
Версионирование
Версия: v1.3.0
Дата обновления: 2026-01-20 00:14 MSK
Статус: ✅ Production Deployed + Local LLM Integrated

Изменения v1.3.0:
🤖 Добавлена интеграция с локальной LLM (Ollama)

✅ server/localLlmClient.js - клиент для Ollama API

✅ server/teamAssistantService.js - обновлён с поддержкой локальной LLM

✅ client/src/pages/TeamAssistantPage.jsx - добавлен LLM switcher

✅ client/src/styles/TeamAssistantPage.css - стили для switcher

✅ Новые API эндпоинты: /api/local-llm/*

✅ Документация по установке и использованию Ollama

✅ Приоритизация запросов (локальная LLM > RAG)

📚 Обновлён индекс документации (343 embeddings)

Изменения v1.2.0:
🚀 Добавлен CI/CD через GitHub Actions

☁️ Деплой на Vercel (Frontend) + Railway (Backend)

🔐 GitHub Secrets integration

📝 Документация по deployment

🔧 Railway/Vercel конфигурационные файлы

🐛 Исправления CORS для production

Изменения v1.1.1:
✅ Git MCP v1.2.1: исправлен парсинг коммитов

✅ Team Assistant: полностью протестирован

✅ Все тесты пройдены (10/10)

Roadmap
v1.4.0 (Next Release)
☁️ Ollama в Docker для production deployment

📊 Vercel Analytics integration

💾 Railway volume для persistent storage

🧪 Automated testing в CI/CD pipeline

🔄 Rollback mechanism для failed deployments

⚙️ Environment-specific configs (staging/production)

v1.5.0 (Future)
🎯 Streaming ответов от локальной LLM

🔄 Автоматический выбор LLM (routing)

📈 Метрики производительности LLM

🌍 Kubernetes deployment (alternative to Railway)

🚀 Multi-region deployment

🗄️ Redis caching layer

📊 Grafana/Prometheus monitoring

Лицензия
MIT

Разработка: AI Challenge 23 - MCP Integration + RAG + CI/CD + Local LLM
Статус: ✅ Production Ready (v1.3.0)
Последнее обновление: 2026-01-20 00:14 MSK