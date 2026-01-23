
import "./envBootstrap.js";


console.log("[ENV BOOT] OLLAMA_MODEL =", process.env.OLLAMA_MODEL);
import express from 'express';
import fetch from 'node-fetch';

import { execSync } from 'child_process';


import cors from 'cors';
import { analyticsChat } from "./analyticsChatService.js";
import { analyzeData } from "./analyticsService.js";
import localLlmClient from './localLlmClient.js';
import { reviewPullRequest } from './prReviewService.js';
import { initGitMcpClient } from './gitMcpClient.js';
import { processAssistantCommand } from './assistantService.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { processTeamQuery } from './teamAssistantService.js';
import { listPullRequests, getPullRequest } from './githubService.js';
import { OLLAMA_MODELS, TASK_PRESETS } from './ollamaConfig.js';
import { PROMPT_TEMPLATES, SYSTEM_PROMPTS } from './promptTemplates.js';
import { callDockerTool, listDockerTools } from './mcpClient.js';
import {
  orchestrateSetupTestEnv,
  orchestrateDeployApp,
  orchestrateCleanupEnvironment
} from './agent-orchestrator.js';
import { callTaskTool, listTaskTools, callGitHubTool, listGitHubTools } from './mcpClient.js';
import { orchestrateSummaryChain } from './agent-orchestrator.js';
import {
  answerWithoutRag,
  answerWithRagViaMcp,
  compareRagVsNoRagViaMcp,
  answerWithRerankedRag,
  compareRerank
} from './ragService.js';
import { callDocumentTool } from './ragMcpClient.js';
import { processUserQuestion } from './supportAssistantService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


if (!process.env.PERPLEXITY_API_KEY) {
  console.error('❌ PERPLEXITY_API_KEY not found in .env file!');
} else {
  console.log('✅ PERPLEXITY_API_KEY loaded successfully');
}

const app = express();
const PORT = process.env.PORT || 4000;

let tokenStats = {
  totalPromptTokens: 0,
  totalCompletionTokens: 0,
  totalTokens: 0,
  requests: 0
};

// ✅ MIDDLEWARE
app.use(cors({
  origin: [
       'http://localhost',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:5174',
    'http://127.0.0.1:5173',
    'http://45.90.33.211',              // ← Замените на ваш IP
    'https://YOUR_DOMAIN.com'          // ← Если есть домен
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ✅ MCP initialization
initGitMcpClient().catch(console.error);

// ✅ HEALTH CHECK
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/support/ask', async (req, res) => {
const { user_id, question } = req.body;

if (!user_id || !question) {
return res.status(400).json({ error: 'user_id и question обязательны' });
}

const result = await processUserQuestion(user_id, question);
res.json(result);
});

// Добавьте новые роуты
// 🤖 Local LLM API
app.post('/api/local-llm/ask', async (req, res) => {
  try {
    const { prompt, temperature, top_p } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const answer = await localLlmClient.chat(prompt, {
      temperature,
      top_p
    });

    res.json({
      success: true,
      answer,
      model: localLlmClient.model,
      source: 'local-llm'
    });
  } catch (error) {
    console.error('Local LLM Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check для локальной LLM
app.get('/api/local-llm/health', async (req, res) => {
  const isHealthy = await localLlmClient.healthCheck();
  res.json({
    status: isHealthy ? 'ok' : 'unavailable',
    url: localLlmClient.baseUrl,
    model: localLlmClient.model
  });
});

// Список моделей
app.get('/api/local-llm/models', async (req, res) => {
  const models = await localLlmClient.listModels();
  res.json({ models });
});

app.post('/api/analytics/query', async (req, res) => {
  const { query, filters, limit } = req.body;
  const result = await analyzeData(query, filters, limit);
  res.json(result);
});
app.get('/api/analytics/preview', (req, res) => {
  // схема полей из config + sample строки
  res.json({ schema: ANALYTICS_SOURCES, sample: loadSample() });
});


app.post("/api/analytics/chat", async (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: "message is required" });
  }
  try {
    const result = await analyticsChat(message);
    res.json(result);
  } catch (e) {
    console.error("analytics/chat error", e);
    res.status(500).json({ error: "analytics_chat_failed" });
  }
});

// ═══════════════════════════════════════════════════════════════════
// 🧪 LLM OPTIMIZATION API
// ═══════════════════════════════════════════════════════════════════

// Получить доступные модели и конфигурации
app.get('/api/llm/models', (req, res) => {
  res.json({
    success: true,
    current_model: localLlmClient.model,
    available_models: OLLAMA_MODELS,
    task_presets: Object.keys(TASK_PRESETS),
    system_prompts: Object.keys(SYSTEM_PROMPTS)
  });
});

// Протестировать разные конфигурации
app.post('/api/llm/test-config', async (req, res) => {
  try {
    const { prompt, configs } = req.body;
    
    if (!prompt || !Array.isArray(configs)) {
      return res.status(400).json({ error: 'prompt and configs array required' });
    }

    const results = await localLlmClient.compareConfigs(prompt, configs);
    
    res.json({
      success: true,
      prompt,
      results,
      analysis: {
        fastest: results.reduce((min, r) => 
          r.success && r.duration < (min?.duration || Infinity) ? r : min, null
        ),
        slowest: results.reduce((max, r) => 
          r.success && r.duration > (max?.duration || 0) ? r : max, null
        )
      }
    });
  } catch (error) {
    console.error('Test config error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Использовать шаблон промпта
app.post('/api/llm/template', async (req, res) => {
  try {
    const { template_name, data, preset } = req.body;
    
    if (!template_name || !PROMPT_TEMPLATES[template_name]) {
      return res.status(400).json({ error: 'Invalid template name' });
    }

    const prompt = PROMPT_TEMPLATES[template_name](data);
    const answer = await localLlmClient.chat(prompt, { preset });

    res.json({
      success: true,
      template: template_name,
      prompt,
      answer,
      preset: preset || 'default'
    });
  } catch (error) {
    console.error('Template error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Оптимизированный запрос с кастомными параметрами
app.post('/api/llm/optimized', async (req, res) => {
  try {
    const {
      prompt,
      temperature,
      top_p,
      top_k,
      num_predict,
      repeat_penalty,
      system,
      preset
    } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'prompt is required' });
    }

    const startTime = Date.now();
    const answer = await localLlmClient.chat(prompt, {
      temperature,
      top_p,
      top_k,
      num_predict,
      repeat_penalty,
      system,
      preset
    });
    const duration = Date.now() - startTime;

    res.json({
      success: true,
      answer,
      duration,
      config: {
        temperature,
        top_p,
        top_k,
        num_predict,
        repeat_penalty,
        preset
      }
    });
  } catch (error) {
    console.error('Optimized LLM error:', error);
    res.status(500).json({ error: error.message });
  }
});
// ═══════════════════════════════════════════════════════════════════
// 🤖 TEAM ASSISTANT API
// ═══════════════════════════════════════════════════════════════════
app.post('/api/team/ask', async (req, res) => {
  const { query, user_id } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'query обязателен' });
  }

  try {
    const result = await processTeamQuery(query, user_id || 'team_user');
    res.json(result);
  } catch (error) {
    console.error('[API /team/ask] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== PR REVIEW ENDPOINTS ==========

// GET /api/github/pulls - список PR
app.get('/api/github/pulls', async (req, res) => {
  try {
    const { state = 'open' } = req.query;
    const result = await listPullRequests(state);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/github/pulls/:number - детали конкретного PR
app.get('/api/github/pulls/:number', async (req, res) => {
  try {
    const { number } = req.params;
    const result = await getPullRequest(parseInt(number));
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/pr/review/:prNumber - AI review PR
app.post('/api/pr/review/:prNumber', async (req, res) => {
  try {
    const { prNumber } = req.params;
    console.log(`🔍 [API] Reviewing PR #${prNumber}...`);

    // 1. Получаем PR info
    const prInfo = await getPullRequest(parseInt(prNumber));
    if (!prInfo.success) {
      console.error(`❌ PR not found:`, prInfo.error);
      return res.status(404).json({
        success: false,
        error: `PR #${prNumber} not found`
      });
    }

    const pr = prInfo.pr;
    console.log(`✅ Found PR: ${pr.title} (${pr.base} ← ${pr.head})`);

    // 2. Запускаем review
    const reviewResult = await reviewPullRequest(pr.base, pr.head);
    if (!reviewResult.success) {
      console.error(`❌ Review failed:`, reviewResult.error);
      return res.status(500).json({
        success: false,
        error: reviewResult.error
      });
    }

    console.log(`✅ Review completed for PR #${prNumber}`);

    // 3. Возвращаем результат
    res.json({
      success: true,
      pr: {
        number: pr.number,
        title: pr.title,
        author: pr.author,
        url: pr.url,
        base: pr.base,
        head: pr.head
      },
      review: reviewResult
    });
  } catch (error) {
    console.error('❌ [API] PR review error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ========== ASSISTANT ENDPOINT ==========

app.post('/api/assistant/command', async (req, res) => {
  try {
    const { command } = req.body;
    if (!command || typeof command !== 'string') {
      return res.status(400).json({ error: 'command is required' });
    }

    const result = await processAssistantCommand(command);
    res.json(result);
  } catch (err) {
    console.error('Assistant command error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// ========== DOCUMENTS PIPELINE ==========

app.post('/api/documents/reindex', async (req, res) => {
  try {
    const result = await callDocumentTool('index_documents', {
      directory: './documents',
      file_patterns: ['**/*.md'],
      index_name: 'docs_index',
      backend: 'simple'
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/documents/index', async (req, res) => {
  try {
    const { directory, index_name, file_patterns, backend } = req.body;
    if (!directory || !index_name) {
      return res.status(400).json({
        error: 'directory and index_name are required'
      });
    }

    console.log(`📂 Indexing documents from ${directory}`);
    const result = await callDocumentTool('index_documents', {
      directory,
      file_patterns: file_patterns || ['*.md', '*.txt'],
      index_name,
      backend: backend || 'json'
    });

    if (result.success) {
      res.json({
        success: true,
        summary: {
          files_processed: result.files_processed,
          chunks_created: result.chunks_created,
          embeddings_generated: result.chunks_created,
          index_name,
          backend: backend || 'json',
          path: result.index_path,
          timestamp: new Date().toISOString()
        },
        message: 'Documents indexed successfully'
      });
    } else {
      throw new Error(result.error || 'Indexing failed');
    }
  } catch (error) {
    console.error('❌ Indexing error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/documents/indexes', async (req, res) => {
  try {
    const indexesDir = path.join(__dirname, 'indexes');
    try {
      await fs.access(indexesDir);
    } catch {
      return res.json({ success: true, indexes: [] });
    }

    const files = await fs.readdir(indexesDir);
    const indexes = [];

    for (const file of files.filter(f => f.endsWith('.json'))) {
      try {
        const indexPath = path.join(indexesDir, file);
        const data = JSON.parse(await fs.readFile(indexPath, 'utf-8'));
        indexes.push({
          name: data.name,
          file: file,
          count: data.embeddings?.length || 0,
          created_at: data.created_at
        });
      } catch (e) {
        console.error(`Error reading index ${file}:`, e.message);
      }
    }

    res.json({ success: true, indexes });
  } catch (error) {
    console.error('❌ Error loading indexes:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/documents/search', async (req, res) => {
  try {
    const { query, index_name, top_k } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'query is required' });
    }

    console.log(`🔍 Searching "${query}" in index: ${index_name || 'docs_index'}`);
    const result = await callDocumentTool('search_in_index', {
      index_name: index_name || 'docs_index',
      query,
      top_k: top_k || 5
    });

    if (result.success && result.results) {
      res.json({
        success: true,
        search_results: {
          query,
          sources: result.results.map(r => ({
            file: r.file_path,
            chunk: r.chunk_index,
            score: r.score,
            text: r.text.substring(0, 200)
          })),
          context: result.results.map(r => r.text).join('\n\n')
        }
      });
    } else {
      throw new Error(result.error || 'Search failed');
    }
  } catch (error) {
    console.error('❌ Search error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ========== CHAT ==========

app.post('/api/chat', async (req, res) => {
  try {
    const { message, messages, index_name, top_k, context, temperature = 0.7 } = req.body;
    const chatMessages = messages || (message ? [{ role: 'user', content: message }] : []);
    
    if (!chatMessages || chatMessages.length === 0) {
      return res.status(400).json({ error: 'Messages or message is required' });
    }

    let systemContext = '';
    if (context) {
      systemContext = `You are a helpful assistant. Answer based on the following context:\n\n${context}\n\n`;
    }

    const finalMessages = [
      {
        role: 'system',
        content: systemContext || 'You are a helpful assistant.'
      },
      ...chatMessages
    ];

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: finalMessages,
        temperature
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const usage = data.usage || {};

    tokenStats.totalPromptTokens += usage.prompt_tokens || 0;
    tokenStats.totalCompletionTokens += usage.completion_tokens || 0;
    tokenStats.totalTokens += usage.total_tokens || 0;
    tokenStats.requests += 1;

    const content = data.choices?.[0]?.message?.content || '';

    res.json({
      success: true,
      message: content,
      content,
      usage,
      stats: tokenStats
    });
  } catch (error) {
    console.error('❌ Chat error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ========== RAG ==========

app.post('/api/rag/ask', async (req, res) => {
  try {
    const {
      question,
      mode = 'with_rag',
      indexName = 'docs_index',
      topK = 5,
      rerankThreshold,
      rerankTopK
    } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'question is required' });
    }

    let result;

    if (mode === 'no_rag') {
      result = await answerWithoutRag(question);
    } else if (mode === 'with_rag' || mode === 'basic_rag') {
      result = await answerWithRagViaMcp(question, { indexName, topK });
      if (mode === 'basic_rag') result.mode = 'basic_rag';
    } else if (mode === 'compare') {
      result = await compareRagVsNoRagViaMcp(question, { indexName, topK });
    } else if (mode === 'reranked_rag') {
      result = await answerWithRerankedRag(question, {
        indexName,
        topK,
        rerankThreshold,
        rerankTopK
      });
    } else if (mode === 'compare_rerank') {
      result = await compareRerank(question, {
        indexName,
        topK,
        rerankThreshold,
        rerankTopK
      });
    } else {
      return res.status(400).json({ error: `Unknown mode: ${mode}` });
    }

    res.json(result);
  } catch (err) {
    console.error('Error in /api/rag/ask:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// ========== SERVER STARTUP ==========

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`\n📚 GitHub PR Review:`);
  console.log(`  GET  http://localhost:${PORT}/api/github/pulls`);
  console.log(`  GET  http://localhost:${PORT}/api/github/pulls/:number`);
  console.log(`  POST http://localhost:${PORT}/api/pr/review/:prNumber`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`);
    process.exit(1);
  } else {
    console.error('Server error:', err);
    process.exit(1);
  }
});

const shutdown = async (signal) => {
  console.log(`\n⚠️ ${signal} received, shutting down gracefully...`);
  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });

  setTimeout(() => {
    console.log('⏱️ Forcing shutdown after timeout');
    process.exit(0);
  }, 5000);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
