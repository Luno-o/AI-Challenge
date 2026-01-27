Ниже полный structure.md с добавленными описаниями персонализации Team Assistant и нового поведения через Perplexity, без удаления предыдущего содержимого.
​

text
# MCP Server & Chat Integration Project with RAG + Git + Support + Team Assistant + Local LLM + Analytics

## Общее описание
Полнофункциональное приложение для интеграции MCP (Model Context Protocol) серверов с React-чат интерфейсом, **RAG (Retrieval-Augmented Generation)** системой, **Support Assistant**, **Team Assistant**, **локальной LLM (Ollama)** и **Analytics Assistant** для анализа логов и продуктовой воронки. Архитектура включает микросервисы для управления задачами, документами, GitHub API, Docker, Git-операциями, Document Indexing Pipeline, поддержки пользователей, интеллектуального управления командой, локальной обработки запросов и аналитики. [file:86]

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
│   ├── envBootstrap.js                # 🆕 Bootstrap env (file.env → process.env)
│   ├── check-env.js                   # 🆕 Утилита проверки переменных окружения
│   │
│   ├── MCP Clients & Services
│   │   ├── mcpClient.js
│   │   ├── ragMcpClient.js
│   │   ├── gitMcpClient.js
│   │   ├── supportMcpClient.js
│   │   ├── localLlmClient.js         # Клиент для Ollama (локальная LLM)
│   │
│   ├── Service Layer
│   │   ├── ragService.js
│   │   ├── assistantService.js
│   │   ├── supportAssistantService.js
│   │   ├── teamAssistantService.js   # 🔄 Обновлён: Perplexity + персонализация профилей
│   │   ├── userPersonalizationService.js  # 🆕 Профили пользователей (Сергей, и др.)
│   │   ├── documentIndexer.js
│   │   ├── analyticsService.js       # Аналитика логов/воронки
│   │   ├── analyticsChatService.js   # LLM-обёртка над analyticsService
│   │
│   ├── Configuration
│   │   ├── analyticsConfig.js        # Пути источников (ANALYTICS_CSV/LOG/JSON)
│   │   ├── ollamaConfig.js           # Конфиг моделей и пресетов
│   │   ├── promptTemplates.js        # Шаблоны промптов (включая персонализированные)
│   │
│   ├── MCP Servers
│   │   ├── documents-mcp.js
│   │   ├── task-mcp-server.js
│   │   ├── git-mcp-server.js         # v1.2.1 (Railway compatible)
│   │   ├── docker-mcp-server.js
│   │
│   ├── Orchestration & Utils
│   │   ├── agent-orchestrator.js
│   │   ├── githubTools.js
│   │   ├── githubService.js
│   │   ├── prReviewService.js
│   │   ├── health-check.js           # /api/health для CI/CD и Railway
│   │   ├── mcpSerialize.js
│   │
│   ├── Data Storage
│   │   ├── documents/                # Markdown документы
│   │   ├── indexes/                  # JSON индексы (343 embeddings)
│   │   ├── data/                     # Тестовые данные аналитики
│   │   │   ├── events.csv            # События (timestamp, level, route, status_code)
│   │   │   ├── errors.log            # Логи ошибок (ERROR [route=...])
│   │   │   └── funnel.json           # Воронка: [{ step, users }, ...]
│   │   ├── tasks.json
│   │   ├── userProfiles/             # 🆕 JSON‑профили для персонализации Team Assistant
│   │   │   └── luno-o.json           # Профиль Сергея (язык, стек, стиль ответов)
│   │
│   ├── Configuration
│   │   ├── file.env                  # Локальные переменные (OLLAMA_URL, OLLAMA_MODEL, ANALYTICS_*)
│   │   ├── file.env.production       # Production-конфиг (Railway)
│   │   ├── docker-compose.yml
│   │   ├── Dockerfile
│   │   ├── railway.json
│   │   └── railway.toml
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
│   │   │   ├── TeamAssistantPage.jsx       # 🔄 Обновлён: LLM Switcher + флаг персонализации
│   │   │   ├── LlmOptimizationPage.jsx     # Тестирование локальной LLM
│   │   │   ├── AnalyticsPage.jsx          # UI для Analytics Assistant
│   │   ├── components/
│   │   │   ├── ChatMessageList.jsx
│   │   │   ├── ChatInput.jsx
│   │   │   ├── AnalyticsQueryForm.jsx     # Форма для запросов в аналитику
│   │   │   ├── AnalyticsResultView.jsx    # Отображение ответа и агрегатов
│   │   ├── hooks/
│   │   │   └── useTeamAssistant.js        # Логика вызова /api/team/ask с personalizationEnabled
│   │   └── styles/
│   │       ├── TeamAssistantPage.css      # 🔄 Стили для LLM Switcher и бейджей персонализации
│   │       ├── LlmOptimizationPage.css    # Стили для LLM оптимизации
│   │       └── AnalyticsPage.css          # Стили для аналитики
│   │
│   ├── .env                           # Vercel Environment Variables
│   ├── vercel.json                    # Vercel config
│   └── package.json
│
├── scripts/                           # Скрипты для тестов и отладки
│   ├── test-docker-chain.sh          # Проверка Docker-цепочки (build, run, MCP)
│   ├── test-rag-compare.sh           # Запуск RAG сравнения (with/without RAG, rerank)
│   ├── test-search.js                # Тестовый поиск по документам через MCP
│   └── health-check-local.sh         # Локальный health check
│
└── structure.md                       # Этот файл (v1.5.0+)
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
/api/team/ask	POST	{query, user_id, llmMode, personalizationEnabled}	Natural Language запросы (Perplexity + персонализация профиля)
🤖 Local LLM API
Endpoint	Method	Body	Description
/api/local-llm/ask	POST	{prompt, temperature, top_p}	Прямой запрос к Ollama
/api/local-llm/health	GET	-	Проверка доступности Ollama
/api/local-llm/models	GET	-	Список установленных моделей
📊 Analytics API
Endpoint	Method	Body	Description
/api/analytics/query	POST	{query}	Прямой запрос к аналитике
/api/analytics/chat	POST	{query}	LLM-обёртка (ответ + агрегаты)
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
🧪 LLM Optimization API
Endpoint	Method	Body	Description
/api/llm/models	GET	-	Список моделей, пресетов, промптов
/api/llm/optimized	POST	{prompt, temperature, ...}	Запрос с кастомными параметрами
/api/llm/test-config	POST	{prompt, configs[]}	Сравнение конфигураций
/api/llm/template	POST	{template_name, data, preset}	Использование шаблона промпта
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

# Ollama (Local LLM)
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=gemma3:4b

# Analytics
ANALYTICS_CSV=data/events.csv
ANALYTICS_LOG=data/errors.log
ANALYTICS_JSON=data/funnel.json

# GitHub (optional)
GITHUB_TOKEN=ghp_xxxxxxxxxxxx
GITHUB_OWNER=Luno-o
GITHUB_REPO=perplexity-chat
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
🌐 Perplexity Mode (Default) + Персонализация
✅ Управление задачами (создание, просмотр, удаление)
✅ Приоритизация задач с учётом Git изменений
✅ Статус проекта и аналитика
✅ Git операции (status, commits, history)
✅ RAG поиск в документации
✅ Персонализированные ответы на основе профиля пользователя (userPersonalizationService)
✅ Финальная формулировка ответа через Perplexity с кастомным system prompt, в который подмешиваются:

имя пользователя (например, Сергей),

предпочитаемый язык и стиль,

стек (Node.js, React, Docker, MCP, Ollama),

текущий проект (perplexity-chat),

предпочтения по формату ответов (кратко, с кодом и т.д.). [file:77][file:84]

Примеры команд:

text
"Покажи все задачи"
"Что делать первым?"
"Статус проекта"
"Создай задачу: исправить баг, приоритет high"
"Как работает RAG в этом проекте?"
"Покажи последние 5 коммитов"
"Как оптимизировать Docker?"
"Как оптимизировать Docker для perplexity-chat?"
🤖 Ollama Mode (Local LLM)
✅ Быстрые ответы без интернета
✅ Приватность (все данные локально)
✅ Поддержка русского языка
✅ Общие знания и объяснения
✅ Модели: gemma3:4b (3.3 GB), llama3.2:3b (2.0 GB)

Активация:

Переключить на "🤖 Ollama" в интерфейсе Team Assistant.

Задать вопрос напрямую (в текущей версии Team Assistant финальный ответ формирует Perplexity; локальная LLM используется для других сценариев и может быть возвращена в Team Assistant позже). [file:83][file:84]

Примеры запросов:

text
"Что такое MCP протокол?"
"Объясни как работает RAG"
"Как настроить Docker контейнер?"
"В чём разница между REST и GraphQL?"
🧪 LLM Optimization
Страница для тестирования и настройки параметров локальной LLM:

✅ Просмотр доступных моделей и пресетов
✅ Отправка запросов с кастомными параметрами (temperature, top_p, top_k, num_predict, repeat_penalty)
✅ Сравнение производительности разных конфигураций
✅ Использование готовых шаблонов промптов

📊 Analytics Assistant
Чат для анализа логов и продуктовой воронки:

✅ Вопросы про шаги воронки и drop-off пользователей
✅ Анализ ошибок по маршрутам (/api/login, /api/signup и т.п.)
✅ Рекомендации по приоритету исправлений
✅ Работает с локальной LLM (Ollama) для быстрых ответов

Примеры запросов:

text
"На каком шаге воронки больше всего потеря пользователей?"
"Какой маршрут имеет больше всего ошибок?"
"Дай рекомендации по улучшению воронки"
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

# Team Assistant test (Perplexity + personalization)
curl -X POST http://localhost:4000/api/team/ask \
  -H "Content-Type: application/json" \
  -d '{"query": "Как оптимизировать Docker?", "user_id": "luno-o", "llmMode": "perplexity", "personalizationEnabled": true}'

# Local LLM test (Ollama)
curl -X POST http://localhost:4000/api/local-llm/ask \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Что такое MCP?"}'

# Analytics test
curl -X POST http://localhost:4000/api/analytics/chat \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"На каком шаге воронки больше потерь?\"}"
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

Solution: Добавьте в vercel.json:

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
Analytics Issues
Error: __dirname is not defined при загрузке индексов

Solution: В файлах, где читаются индексы (ragService, analyticsService), добавьте:

javascript
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
Error: analyticsService возвращает пустые агрегаты

Solution: Убедитесь что data/events.csv, data/errors.log, data/funnel.json существуют и заполнены тестовыми данными

Версионирование
Версия: v1.5.0
Дата обновления: 2026-01-27 22:27 MSK
Статус: ✅ Production Ready + Local LLM + Analytics + Персонализация Team Assistant

Изменения v1.5.0:
🆕 userPersonalizationService.js

Хранение профилей пользователей в server/userProfiles/*.json

Генерация персонализированного system prompt (язык, стиль, стек, проект, тон)

Возврат метаданных профиля для UI (имя, роль, предпочтения). [file:77]

🆕 Персонализированный Team Assistant

teamAssistantService.processTeamQuery:

принимает userId, llmMode, personalizationEnabled,

использует MCP (Tasks, Git, RAG) для получения структурированных данных,

собирает персонализированный system prompt через userPersonalizationService,

вызывает Perplexity (sonar) с этим system prompt для финальной формулировки ответа. [file:84]

Поддержка флагов и метаданных:

result.personalized,

result.personalizationProfile,

result.llmUsed. [file:84]

🔄 TeamAssistantPage.jsx

Добавлена кнопка “🎯 Персонализация: ВКЛ/ВЫКЛ”.

При включении:

загружает профиль пользователя (/api/personalization/profile/:user_id),

отправляет в /api/team/ask флаг personalizationEnabled: true и user_id: "luno-o",

отображает бейджи “Персонализировано” и имя профиля (например, Сергей). [file:19]

✅ /api/team/ask

Обновлён эндпоинт в server/index.js:

принимает {query, user_id, llmMode, personalizationEnabled},

логирует параметры,

прокидывает их в processTeamQuery. [file:85]

Изменения v1.4.0:
🆕 analyticsService.js — полная реализация:

loadAndParse() — читает events.csv, errors.log, funnel.json

aggregate() — считает воронку, drop-off по шагам, ошибки по маршрутам

analyzeData() — готовит JSON-агрегаты и спрашивает локальную LLM

🆕 analyticsChatService.js — LLM-обёртка над analyticsService

🆕 analyticsConfig.js — конфигурация путей источников данных

🆕 envBootstrap.js — bootstrap окружения через file.env

🆕 check-env.js — утилита проверки переменных окружения

🆕 data/ — директория с тестовыми данными для аналитики:

events.csv (события с маршрутами и статус-кодами)

errors.log (логи ошибок с route в квадратных скобках)

funnel.json (воронка с шагами и количеством пользователей)

🆕 AnalyticsPage.jsx + компоненты — UI для Analytics Assistant

✅ /api/analytics/query и /api/analytics/chat эндпоинты в index.js

Изменения v1.3.0:
🤖 Добавлена интеграция с локальной LLM (Ollama)

server/localLlmClient.js - клиент для Ollama API

server/teamAssistantService.js - обновлён с поддержкой локальной LLM (в v1.5.0 финальный ответ перенесён на Perplexity, локальная LLM остаётся для других сценариев)

client/src/pages/TeamAssistantPage.jsx - добавлен LLM switcher

Документация по установке и использованию Ollama

Изменения v1.2.0:
🚀 Добавлен CI/CD через GitHub Actions

Деплой на Vercel (Frontend) + Railway (Backend)

GitHub Secrets integration

Документация по deployment

Roadmap
v1.6.0 (Next Release)
🎯 Streaming ответов от локальной LLM в UI Team Assistant

🔄 Автоматический выбор LLM (routing) между Perplexity и Ollama

📈 Более тонкая персонализация (контекст проекта, активные задачи, статус Git)

📌 Сохранение истории персонализации и предпочтений пользователя

v2.0.0 (Future)
🤖 Advanced RAG с re-ranking

🎭 Multi-modal LLM (vision models)

🔐 Fine-tuned models для domain-specific задач

📱 Mobile apps (React Native)

🌐 WebSocket для real-time updates

Лицензия
MIT

Разработка: AI Challenge 23 - MCP Integration + RAG + CI/CD + Local LLM + Analytics + Personalized Team Assistant
Статус: ✅ Production Ready (v1.5.0)
Последнее обновление: 2026-01-27 22:27 MSK