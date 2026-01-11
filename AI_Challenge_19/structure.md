AI Challenge 18 – RAG System with Cross-Encoder Reranker & Persistent Chat History (v1.4.0)
Общее описание
Полнофункциональное приложение для демонстрации RAG (Retrieval-Augmented Generation) с интеграцией MCP серверов, Perplexity AI и двухэтапным retrieval: базовый keyword-search → cross-encoder reranking (Perplexity Sonar).
​

Новое в v1.4.0:

✅ Persistent chat history (localStorage + sessionStorage)

✅ Отображение источников RAG в каждом сообщении (file, score, rerank score)

✅ Режимы RAG: basic_rag, reranked_rag, compare_rerank

✅ UI улучшения: rag-tag, sources блок, typing indicator

Система поддерживает индексацию markdown-документов, семантический поиск, сравнение ответов с/без RAG, управление Docker/GitHub/Tasks через чат.
​

Стек технологий
Backend: Node.js (ESM), Express.js
​

Frontend: React 18, Vite
​

AI: Perplexity API (sonar / sonar-large для rerank)
​

MCP: @modelcontextprotocol/sdk (Documents, Tasks, GitHub, Docker)
​

Storage: JSON-based vector index (indexes/docs_index.json), localStorage (chat history)
​

Прочее: Axios, node-fetch, dockerode, Docker, Docker Compose
​

Структура директорий
text
ai_challenge_18/
├── server/                         # Backend (Node.js)
│   ├── index.js                    # Express API (chat, RAG, documents, tasks, docker)
│   │
│   ├── MCP Clients & Services
│   │   ├── mcpClient.js           # Task/GitHub/Docker MCP клиент
│   │   ├── ragMcpClient.js        # Documents MCP клиент
│   │   ├── documentIndexer.js     # Fallback индексация без MCP
│   │   └── ragService.js          # RAG: answerWithoutRag, answerWithRagViaMcp,
│   │                              #      compareRagVsNoRagViaMcp, rerankChunks,
│   │                              #      answerWithRerankedRag, compareRerank
│   │
│   ├── MCP Servers
│   │   ├── documents-mcp.js       # Documents MCP (index_documents, search_in_index)
│   │   ├── task-mcp-server.js     # Task MCP (SQLite)
│   │   ├── github-mcp-server.js   # GitHub MCP
│   │   └── docker-mcp-server.js   # Docker MCP (dockerode)
│   │
│   ├── Orchestration & Utils
│   │   ├── agent-orchestrator.js  # Multi-agent workflows
│   │   └── githubTools.js         # GitHub REST API utils
│   │
│   ├── Data Storage
│   │   ├── documents/             # Markdown docs для индексации
│   │   │   ├── README.md
│   │   │   ├── docker-compose.md  # Источник: порт API = 4000
│   │   │   └── api-docs.md        # API endpoints reference
│   │   └── indexes/
│   │       └── docs_index.json    # JSON index с mock embeddings
│   │
│   └── package.json               # Backend deps
│
├── perplexity-chat/                        # Frontend (React + Vite)
│   ├── src/
│   │   ├── main.jsx               # Entry point
│   │   ├── App.jsx                # Root component
│   │   ├── components/
│   │   │   ├── ChatPage.jsx       # Главная страница чата:
│   │   │   │                      #  - messages container с sources
│   │   │   │                      #  - doc panel (indexing, rag mode selector)
│   │   │   │                      #  - quick prompts, input form
│   │   │   └── RagModeSelector.jsx# UI: Basic Chat, RAG Basic, RAG Reranked, Compare
│   │   ├── hooks/
│   │   │   └── useChatWithPerplexity.js # Hook: chat, RAG API, docs pipeline,
│   │   │                                #  persistent history (localStorage)
│   │   └── styles/
│   │       └── ChatPage.css       # Стили: rag-tag, rag-sources, typing-indicator
│   │
│   ├── index.html                 # HTML template
│   ├── vite.config.js             # Vite config
│   └── package.json               # Frontend deps
│
├── .env                           # Environment variables
├── package.json                   # Root config
└── structure.md                   # Этот файл (v1.4.0)
Environment Variables (.env)
text
# Perplexity AI
PERPLEXITY_API_KEY=pplx-xxxxxxxxxxxx
PERPLEXITY_MODEL=sonar

# Rerank settings (new in v1.3+)
RERANK_THRESHOLD=0.7               # Порог отсечения нерелевантных чанков (0.6–0.8)
RERANK_TOPK=3                      # Сколько чанков оставить после rerank (2–5)

# Server
PORT=4000                          # API сервер порт (docker-compose: 4000:4000)

# GitHub (optional)
GITHUB_TOKEN=ghp_xxxxxxxxxxxx
API Endpoints
📚 Documents Pipeline
Endpoint	Method	Body	Description
/api/documents/indexes	GET	–	Список индексов
/api/documents/index	POST	{ directory, index_name, file_patterns, backend }	Индексация через MCP
/api/documents/search	POST	{ query, index_name, top_k }	Поиск (MCP)
🤖 RAG API (обновлено в v1.4)
Endpoint: /api/rag/ask (POST)

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

with_rag / basic_rag — RAG на сырых чанках (answerWithRagViaMcp)

compare — no_rag vs with_rag + LLM-анализ (compareRagVsNoRagViaMcp)

reranked_rag — двухэтапный RAG: search → rerankChunks → LLM (answerWithRerankedRag)

compare_rerank — basic_rag vs reranked_rag + LLM-анализ (compareRerank)

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
Пример ответа (reranked_rag):

json
{
  "mode": "reranked_rag",
  "question": "...",
  "rawChunksCount": 10,
  "filteredChunksCount": 2,
  "filteredChunks": [
    {
      "id": "8",
      "file_path": "docker-compose.md",
      "chunk_index": 2,
      "text": "API сервер работает на **порту 4000**.",
      "score": 0.4,
      "rerankScore": 1.0
    },
    {
      "id": "9",
      "file_path": "docker-compose.md",
      "text": "ports: \"4000:4000\"",
      "score": 0.1,
      "rerankScore": 0.9
    }
  ],
  "llmInput": "...",
  "llmAnswer": "API сервер работает на порту 4000..."
}
Пример ответа (compare_rerank, сокращённо):

json
{
  "mode": "compare_rerank",
  "question": "...",
  "basicRag": { "mode": "with_rag", "retrievedChunks": [...], "llmAnswer": "..." },
  "rerankedRag": { "mode": "reranked_rag", "rawChunksCount": 10, "filteredChunksCount": 2, "filteredChunks": [...], "llmAnswer": "..." },
  "analysis": {
    "whereRerankHelped": ["..."],
    "whereRerankIsRisky": ["..."],
    "summary": "..."
  }
}
💬 Chat / 📋 Tasks / 🐳 Docker / 🎯 Orchestration / 🧪 Testing
Остаются как в v1.3 (см. прежний structure.md)
​

RAG Architecture (обновлено)
Поток:

Вопрос пользователя → ChatPage.jsx → useChatWithPerplexity

В зависимости от ragMode:

null → /api/chat (обычный чат без RAG)

basic_rag → /api/rag/ask (mode=basic_rag)

reranked_rag → /api/rag/ask (mode=reranked_rag)

compare_rerank → /api/rag/ask (mode=compare_rerank)

Backend:

answerWithoutRag — прямой вызов LLM
​

answerWithRagViaMcp — searchInIndexDirect + LLM с сырым контекстом
​

rerankChunks — cross-encoder Sonar: выдаёт rerankScore 0–1, фильтрует по threshold, режет до topK
​

answerWithRerankedRag — использует только отфильтрованные чанки
​

compareRerank — запускает оба режима и просит LLM сделать JSON-анализ
​

Ключевой кейс (порт API):

Basic RAG: 10 чанков, много шума из api-docs.md, один правильный из docker-compose.md

Reranked RAG: 2–3 чанка, почти исключительно docker-compose.md с явным порт 4000 и ports: "4000:4000"

Frontend Features (v1.4)
ChatPage.jsx
Структура:

.messages-container — лента сообщений с:

.message-header (role, timestamp, rag-tag)

.message-content (текст ответа)

.rag-sources (блок источников: file, score/rerankScore, preview)

Typing indicator при loading

Doc panel (sidebar):

Index Documents кнопка

Выбор индекса (docs_index)

RagModeSelector (4 режима: Basic Chat, RAG Basic, RAG Reranked, Compare)

Подсказка про Sonar rerank

Quick prompts: Tests, Issues, PRs, Docker, Docs

Input form + placeholder с текущим режимом

Новое:

msg.ragMode → тег в заголовке (⚖️ Compare, 🔥 Reranked, etc.)

msg.sources → массив с file_path, score, rerankScore, preview

extractSources(res) — извлекает источники из filteredChunks / retrievedChunks

RagModeSelector.jsx
4 кнопки:

null → Basic Chat

basic_rag → RAG Basic

reranked_rag → RAG Reranked (по умолчанию)

compare_rerank → Compare

useChatWithPerplexity.js
Persistent History:

useState(() => { ... localStorage.getItem('rag-chat-history') })

useEffect(() => { localStorage.setItem('rag-chat-history', ...) }, [messages])

sessionStorage backup при перезагрузке вкладки

clearMessages() стирает localStorage + sessionStorage

handleChat (обновлён):

Добавляет userMsg с ragMode и timestamp

Для обычного чата (ragMode=null) → /api/chat

Для RAG режимов → askWithRagMode / compareRagModes

assistantMsg получает:

content — res.llmAnswer или форматированный текст

sources — extractSources(res) (top 3 чанка)

rawData — полные данные для debug

timestamp

extractSources:

js
function extractSources(res) {
  if (!res || (!res.filteredChunks?.length && !res.retrievedChunks?.length)) return null;
  
  return (res.filteredChunks || res.retrievedChunks || [])
    .slice(0, 3)
    .map(chunk => ({
      id: chunk.id,
      file: chunk.file_path,
      score: chunk.score?.toFixed(3),
      rerankScore: chunk.rerankScore?.toFixed(3),
      preview: chunk.text.substring(0, 100) + '...'
    }));
}
CSS Updates (v1.4)
Новые классы:

css
/* RAG Tag в заголовке */
.rag-tag {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  margin-left: 8px;
  box-shadow: 0 2px 4px rgba(16, 185, 129, 0.3);
}

/* Источники RAG */
.rag-sources {
  margin-top: 16px;
  padding: 16px;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  border-left: 4px solid #0ea5e9;
  border-radius: 8px;
}

.source-item {
  padding: 10px;
  background: white;
  border-radius: 6px;
  border-left: 3px solid #60a5fa;
  cursor: pointer;
  transition: all 0.2s;
}

.source-item:hover {
  background: #f8fafc;
  transform: translateX(2px);
}

.source-file {
  font-weight: 600;
  color: #1e40af;
  font-size: 13px;
}

.source-score {
  color: #059669;
  font-size: 11px;
  font-family: 'SF Mono', Monaco, monospace;
  background: #d1fae5;
  padding: 1px 6px;
  border-radius: 4px;
}

.source-preview {
  color: #64748b;
  font-size: 12px;
  font-style: italic;
}

/* Typing Indicator */
.typing-indicator {
  display: flex;
  gap: 4px;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  background: #cbd5e1;
  border-radius: 50%;
  animation: typing 1.4s infinite ease-in-out;
}

@keyframes typing {
  0%, 60%, 100% { transform: scale(1); opacity: 0.4; }
  30% { transform: scale(1.2); opacity: 1; }
}
Версия и история изменений
Версия: v1.4.0 (12.01.2026)

История:

[24.12.2025] v1.0 — Базовая MCP RAG система (no_rag / with_rag / compare)
​

[24.12.2025] v1.3 — Cross-encoder reranker (Sonar), режимы reranked_rag и compare_rerank
​

[12.01.2026] v1.4 — Persistent chat history (localStorage + sessionStorage), отображение источников RAG в каждом сообщении (file, score, rerank score, preview), UI улучшения (rag-tag, sources блок, typing indicator)

Deployment
Development
bash
# Terminal 1 - Backend
cd server
npm install
npm run dev  # http://localhost:4000

# Terminal 2 - Frontend
cd client
npm install
npm run dev  # http://localhost:3000 (или 5173 в Vite)
Production (Docker Compose)
text
version: '3.8'
services:
  api:
    build: ./server
    ports:
      - "4000:4000"
    environment:
      - PERPLEXITY_API_KEY=${PERPLEXITY_API_KEY}
      - RERANK_THRESHOLD=0.7
      - RERANK_TOPK=3
    volumes:
      - ./server/indexes:/app/indexes
      - ./server/documents:/app/documents

  frontend:
    build: ./client
    ports:
      - "3000:3000"
    depends_on:
      - api
Тестирование
Запусти backend + frontend

Индексация: Docs панель → Index Documents → проверь docs_index.json

RAG режимы:

Basic Chat → обычный чат без RAG

RAG Basic → 10 чанков, может быть шум

RAG Reranked → 2-3 чанка, только релевантные (threshold 0.7)

Compare → сравнение basic vs reranked с LLM-анализом

Тестовые вопросы:

«На каком порту работает API сервер?» → reranked должен оставить только docker-compose.md

«Как работает RAG в этом проекте?» → проверь sources

History: обнови страницу → история сохранилась из localStorage

Источники: под каждым RAG-ответом видишь блок с файлами + score/rerankScore

Troubleshooting
История не сохраняется
Проверь, что localStorage.setItem вызывается в useEffect

Открой DevTools → Application → Local Storage → rag-chat-history

Если quota exceeded — очисти старые данные

Источники не показываются
Убедись, что extractSources вызывается в handleSubmit после askWithRagMode

Проверь, что msg.sources не null в render

В DevTools Console: console.log(msg.sources) должен показать массив

useCallback ошибка
Добавь в импорт: import { useState, useRef, useEffect, useCallback } from 'react';

Или убери useCallback и используй обычную функцию scrollToBottom

Порт 4000 занят
bash
# Windows
netstat -ano | findstr :4000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:4000 | xargs kill -9
Roadmap v1.5
 Markdown рендеринг в ответах (react-markdown)

 Streaming ответов (SSE)

 Экспорт истории чата (JSON/MD)

 Подсветка источников при клике на source-item

 Real embeddings (OpenAI text-embedding-3-small)

 Hybrid search (keyword + semantic + BM25)

 Contextual compression для длинных чанков

License: MIT
Автор: AI Challenge 18 — RAG Integration with Persistent History & Sources Display