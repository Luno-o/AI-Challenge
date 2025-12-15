import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import cors from 'cors';
import { callGithubTool } from './mcpClient.js';
import { serializeGithubMcpResult } from './mcpSerialize.js';
import { getMcpClient } from './mcpClient.js';
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Статистика по токенам
let tokenStats = {
  totalPromptTokens: 0,
  totalCompletionTokens: 0,
  totalTokens: 0,
  requests: 0,
  compressRequests: 0
};

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.get('/api/mcp/tools', async (req, res) => {
  try {
    const client = await getMcpClient();
    const listResult = await client.listTools(); // [{ name, description, inputSchema, ... }]
    res.json({ tools: listResult });
  } catch (e) {
    console.error('MCP listTools error:', e);
    res.status(500).json({ error: e.message });
  }
});
app.post('/api/chat', async (req, res) => {
  try {
const { message, history, role, temperature = 0.7 } = req.body;

const systemMessage =
  role || 'Ты — универсальный ИИ-ассистент. Отвечай кратко и по-русски.';

const filteredHistory = (history || [])
  .filter(msg => !msg.isSummary)
  .slice(-10);

let mcpAssistantBlock = null;

const needGithub = /github|repo|pull request|issue|коммит/i.test(message);
if (needGithub) {
  const toolName = 'get_file_contents';
  const mcpResult = await callGithubTool(toolName, {
    owner: 'github',
    repo: 'github-mcp-server',
    path: 'README.md',
    ref: 'main',
  });

  const jsonPayload = serializeGithubMcpResult(toolName, mcpResult);

  mcpAssistantBlock = {
    role: 'assistant',
    content:
      'ВНИМАНИЕ: ниже находятся сырые JSON‑данные от GitHub MCP‑сервера. ' +
      'Не изменяй ключи и структуру, используй только для анализа при ответе пользователю.\n' +
      JSON.stringify(jsonPayload, null, 2),
  };
}

const messages = [
  { role: 'system', content: systemMessage },
  ...filteredHistory,
  ...(mcpAssistantBlock ? [mcpAssistantBlock] : []),
  { role: 'user', content: message },
];

// дальше — твой существующий fetch к Perplexity с этими messages


    console.log('📤 Отправляю в Perplexity API...');
    console.log('Структура:', messages.map(m => m.role).join(' → '));

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: messages,
        temperature: 0.7,
        max_tokens: 1024
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', response.status, errorText);
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Обновляем статистику
    if (data.usage) {
      tokenStats.totalPromptTokens += data.usage.prompt_tokens;
      tokenStats.totalCompletionTokens += data.usage.completion_tokens;
      tokenStats.totalTokens += data.usage.total_tokens;
      tokenStats.requests++;
      
      console.log('✅ Ответ получен');
      console.log(`📊 Запрос: prompt=${data.usage.prompt_tokens} + completion=${data.usage.completion_tokens} = ${data.usage.total_tokens}`);
      console.log(`📈 ИТОГО: ${tokenStats.totalTokens} токенов за ${tokenStats.requests} запросов`);
    }
    
    res.json({ 
      content: content, 
      usage: data.usage,
      stats: tokenStats
    });
    
  } catch (error) {
    console.error('❌ Server Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Эндпоинт для сжатия истории
app.post('/api/compress', async (req, res) => {
  try {
    const { messages } = req.body;
    
    if (!messages || messages.length < 4) {
      return res.json({ summary: null });
    }

    console.log('🔄 Начинаю сжатие...');

    // Форматируем сообщения в текст
    const conversationText = messages
      .map(m => {
        if (m.isSummary) return null;
        const role = m.role === 'user' ? 'User' : 'Assistant';
        const text = m.content.substring(0, 150);
        return `${role}: ${text}`;
      })
      .filter(Boolean)
      .join('\n\n');

    const compressResponse = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: 'Создай очень краткое резюме (1-2 предложения) диалога. Резюме должно быть коротким.'
          },
          {
            role: 'user',
            content: conversationText
          }
        ],
        temperature: 0.1,
        max_tokens: 100
      })
    });

    if (!compressResponse.ok) {
      console.error('❌ Compress API error:', compressResponse.status);
      return res.json({ summary: null });
    }

    const compressData = await compressResponse.json();
    const summary = compressData.choices[0].message.content;
    
    // Обновляем статистику сжатия
    if (compressData.usage) {
      tokenStats.totalPromptTokens += compressData.usage.prompt_tokens;
      tokenStats.totalCompletionTokens += compressData.usage.completion_tokens;
      tokenStats.totalTokens += compressData.usage.total_tokens;
      tokenStats.compressRequests++;
      
      console.log('✅ Резюме создано');
      console.log(`📊 Сжатие: prompt=${compressData.usage.prompt_tokens} + completion=${compressData.usage.completion_tokens} = ${compressData.usage.total_tokens}`);
      console.log(`📈 ИТОГО: ${tokenStats.totalTokens} токенов (сжатий: ${tokenStats.compressRequests})`);
    }
    
    res.json({ summary: summary });
    
  } catch (error) {
    console.error('❌ Compress error:', error.message);
    res.json({ summary: null });
  }
});

// Эндпоинт для получения статистики
app.get('/api/stats', (req, res) => {
  res.json(tokenStats);
});

// Эндпоинт для сброса статистики
app.post('/api/stats/reset', (req, res) => {
  tokenStats = {
    totalPromptTokens: 0,
    totalCompletionTokens: 0,
    totalTokens: 0,
    requests: 0,
    compressRequests: 0
  };
  console.log('🔄 Статистика сброшена');
  res.json({ message: 'Stats reset', stats: tokenStats });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📊 Статистика доступна по GET http://localhost:${PORT}/api/stats`);
});
