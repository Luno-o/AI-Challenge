AI Challenge 17 – MCP RAG System with Cross‑Encoder Reranker (v1.3.0)
Общее описание
Полнофункциональное приложение для демонстрации RAG (Retrieval‑Augmented Generation) с интеграцией MCP серверов, Perplexity AI и двухэтапным retrieval: базовый keyword‑search по индексу + reranking через cross‑encoder (Perplexity Sonar).
​
​
Система поддерживает индексацию markdown‑документов, семантический поиск, сравнение ответов с/без RAG, режим сравнения basic_rag vs reranked_rag и управление Docker/GitHub/Tasks через чат.
​
​

Стек технологий
Backend: Node.js (ESM), Express.js
​

Frontend: React 18, Vite
​

AI: Perplexity API (sonar / sonar-large-online для rerank)
​

MCP: @modelcontextprotocol/sdk (Documents, Tasks, GitHub, Docker MCP)
​

Storage: JSON‑based vector index (indexes/docs_index.json)
​

Прочее: Axios, node-fetch, dockerode, Docker, Docker Compose
​

Структура директорий
text
ai_challenge_17/
├── server/                         # Backend (Node.js)
│   ├── index.js                    # Express API (chat, RAG, documents, tasks, docker, orchestrator)
│   │
│   ├── MCP Clients & Services
│   │   ├── mcpClient.js           # Клиент для Task/GitHub/Docker MCP
│   │   ├── ragMcpClient.js        # Клиент для Documents MCP (search_in_index, index_documents)
│   │   ├── documentIndexer.js     # Прямая индексация (fallback без MCP)
│   │   └── ragService.js          # RAG логика:
│   │                              #  - answerWithoutRag (no_rag)
│   │                              #  - answerWithRagViaMcp (with_rag / basic_rag)
│   │                              #  - compareRagVsNoRagViaMcp (compare)
│   │                              #  - rerankChunks (cross-encoder)
│   │                              #  - answerWithRerankedRag (reranked_rag)
│   │                              #  - compareRerank (compare_rerank)
│   │
│   ├── MCP Servers
│   │   ├── documents-mcp.js       # Documents MCP: index_documents, search_in_index, get_index_info
│   │   ├── task-mcp-server.js     # Task MCP (SQLite)
│   │   ├── github-mcp-server.js   # GitHub MCP
│   │   └── docker-mcp-server.js   # Docker MCP (dockerode)
│   │
│   ├── Orchestration & Utils
│   │   ├── agent-orchestrator.js  # Orchestration: setup-test-env, cleanup-env, summary-chain
│   │   └── githubTools.js         # GitHub утилиты
│   │
│   ├── Data Storage
│   │   ├── documents/             # Markdown-документы для индексации
│   │   │   ├── README.md
│   │   │   ├── docker-compose.md  # Источник правды о порте API (4000)
│   │   │   └── api-docs.md        # Общие API-доки (шум для RAG)
│   │   └── indexes/
│   │       └── docs_index.json    # JSON-индекс с embeddings/чанками
│   │
│   └── package.json               # Backend зависимости
│
├── client/                        # Frontend (React + Vite)
│   ├── src/
│   │   ├── main.jsx               # Entry point React
│   │   ├── App.jsx                # Root component
│   │   ├── components/
│   │   │   ├── ChatPage.jsx       # Главная страница чата + Docs панель + RAG режимы
│   │   │   └── RagModeSelector.jsx# UI селектор режимов: Basic Chat, RAG Basic, RAG Reranked, Compare
│   │   ├── hooks/
│   │   │   └── useChatWithPerplexity.js # Hook: chat, docs pipeline, RAG API, docker triggers
│   │   └── styles/
│   │       └── ChatPage.css       # UI чата, панель документов, RAG-индикатор
│   │
│   ├── index.html                 # HTML template
│   ├── vite.config.js             # Vite конфиг
│   └── package.json               # Frontend зависимости
│
├── .env                           # Environment variables
├── package.json                   # Root config
└── structure.md                   # Этот файл (v1.3.0)
Environment Variables (.env)
PERPLEXITY_API_KEY — API ключ Perplexity
​

PERPLEXITY_MODEL=sonar — базовая модель LLM
​

PORT=4000 — порт API сервера (совпадает с docker‑compose 4000:4000)
​

RERANK_THRESHOLD=0.7 — порог отсечения нерелевантных чанков (0.6/0.7/0.8)
​

RERANK_TOPK=3 — сколько чанков оставить после rerank (2/3/5)
​

GITHUB_TOKEN — опционально для GitHub MCP
​

API Endpoints
📚 Documents Pipeline
Endpoint	Method	Body	Description
/api/documents/indexes	GET	–	Список индексов
/api/documents/index	POST	{ directory, index_name, file_patterns, backend }	Индексация документов через MCP
/api/documents/search	POST	{ query, index_name, top_k }	Поиск в индексе (MCP)
🤖 RAG API (дополнено)
Endpoint: /api/rag/ask (POST)
​

Body:

json
{
  "question": "string",
  "mode": "no_rag | with_rag | basic_rag | compare | reranked_rag | compare_rerank",
  "indexName": "docs_index",
  "topK": 10,
  "rerankThreshold": 0.7,
  "rerankTopK": 3
}
Режимы:

no_rag — чистый LLM без контекста (answerWithoutRag)
​

with_rag / basic_rag — RAG на сырых чанках без rerank (answerWithRagViaMcp)
​

compare — сравнение no_rag vs with_rag (compareRagVsNoRagViaMcp)
​

reranked_rag — двухэтапный RAG: search → rerankChunks → LLM (answerWithRerankedRag)
​

compare_rerank — сравнение basic_rag vs reranked_rag + LLM‑анализ (compareRerank)
​

Пример запроса (reranked_rag):

json
{
  "question": "На каком порту работает API сервер?",
  "mode": "reranked_rag",
  "indexName": "docs_index",
  "topK": 10,
  "rerankThreshold": 0.7,
  "rerankTopK": 3
}
Пример ответа (compare_rerank, сокращённо):

json
{
  "mode": "compare_rerank",
  "question": "...",
  "basicRag": {
    "mode": "with_rag",
    "retrievedChunks": [...10 чанков...],
    "llmAnswer": "API сервер работает на порту 4000..."
  },
  "rerankedRag": {
    "mode": "reranked_rag",
    "rawChunksCount": 10,
    "filteredChunksCount": 2,
    "filteredChunks": [
      { "file_path": "docker-compose.md", "text": "API сервер работает на **порту 4000**.", "score": 0.4, "rerankScore": 1.0 },
      { "file_path": "docker-compose.md", "text": "ports: \"4000:4000\"", "score": 0.1, "rerankScore": 0.9 }
    ],
    "llmAnswer": "API сервер работает на порту 4000..."
  },
  "analysis": {
    "whereRerankHelped": [...],
    "whereRerankIsRisky": [...],
    "summary": "Rerank улучшил краткость и конкретику, но есть риск потери полноты..."
  }
}
💬 Chat
POST /api/chat — обычный чат без RAG (используется, когда ragMode=null во фронте).
​
​

📋 Tasks / 🐳 Docker / 🎯 Orchestration / 🧪 Testing
Остаются как в предыдущей версии structure.md (Tasks, Docker, orchestrate, test/run, health, stats).
​
​

RAG Architecture (обновлённая)
Поток:

Вопрос пользователя → ChatPage.jsx → useChatWithPerplexity
​

В зависимости от выбранного ragMode:

null → /api/chat (чистый чат)

basic_rag → /api/rag/ask (mode=basic_rag)

reranked_rag → /api/rag/ask (mode=reranked_rag)

compare_rerank → /api/rag/ask (mode=compare_rerank)
​

Backend:

answerWithoutRag — прямой вызов LLM
​

answerWithRagViaMcp — searchInIndexDirect + LLM с сырым контекстом
​

rerankChunks — cross‑encoder Sonar: выдаёт rerankScore 0–1, фильтрует по threshold, режет до topK
​

answerWithRerankedRag — использует только отфильтрованные чанки
​

compareRerank — запускает оба режима и просит LLM сделать сравнительный JSON‑анализ
​

Важный кейс (порт API сервера):

Basic RAG: 10 чанков, много шума из api-docs.md, один правильный из docker-compose.md.
​

Reranked RAG: 2–3 чанка, почти исключительно docker-compose.md с API сервер работает на порту 4000 и ports: "4000:4000".
​

Frontend Features (обновлённые)
ChatPage.jsx
Чат‑лента с авто‑скроллом вниз (messagesEndRef).
​

Док‑панель (sidebar) с:

Index Documents

выбором индекса

пояснениями по RAG и Sonar rerank
​

RagModeSelector.jsx:

Basic Chat → ragMode = null

RAG Basic → ragMode = 'basic_rag'

RAG Reranked → ragMode = 'reranked_rag'

Compare → ragMode = 'compare_rerank'
​

Быстрые кнопки: Tests, Issues, PRs, Docker, Docs.
​

useChatWithPerplexity.js
ragMode, setRagMode в состоянии хука.
​

askWithRagMode(question, mode) → /api/rag/ask с нужным mode.
​

compareRagModes(question) → mode='compare_rerank'.
​

Документный пайплайн: indexDocuments, loadIndexes, searchDocuments.
​

Docker orchestration (setup‑test‑env, cleanup‑env, list).
​

Версия и история изменений
Версия: v1.3.0 (24.12.2025)
История изменений:

[2025‑12‑23] Базовая MCP RAG система (no_rag / with_rag / compare)
​

[2025‑12‑24] Добавлен cross‑encoder reranker (Perplexity Sonar), режимы reranked_rag и compare_rerank в backend и UI (RagModeSelector, обновлённый useChatWithPerplexity / ChatPage)
​