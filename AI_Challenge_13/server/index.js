import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import cors from 'cors';
import { callTaskTool, listTaskTools } from './mcpClient.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

let tokenStats = {
  totalPromptTokens: 0,
  totalCompletionTokens: 0,
  totalTokens: 0,
  requests: 0
};

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// === TASK MANAGEMENT ROUTES (через MCP) ===

app.get('/api/tasks/tools', async (req, res) => {
  try {
    const tools = await listTaskTools();
    res.json({ tools });
  } catch (error) {
    console.error('❌ List task tools error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tasks', async (req, res) => {
  try {
    const { title, description, priority, dueDate } = req.body;
    const result = await callTaskTool('create_task', { title, description, priority, dueDate });
    res.json(result);
  } catch (error) {
    console.error('❌ Create task error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/tasks', async (req, res) => {
  try {
    const { status } = req.query;
    const result = await callTaskTool('list_tasks', { status });
    res.json(result);
  } catch (error) {
    console.error('❌ List tasks error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const result = await callTaskTool('update_task', { id, ...updates });
    res.json(result);
  } catch (error) {
    console.error('❌ Update task error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await callTaskTool('delete_task', { id });
    res.json(result);
  } catch (error) {
    console.error('❌ Delete task error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/tasks/summary', async (req, res) => {
  try {
    const result = await callTaskTool('get_tasks_summary', {});
    res.json(result);
  } catch (error) {
    console.error('❌ Tasks summary error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// === PERPLEXITY CHAT (без GitHub) ===

app.post('/api/chat', async (req, res) => {
  try {
    const { messages, temperature = 0.7 } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'sonar',
        messages,
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
    res.json({ content, usage, stats: tokenStats });

  } catch (error) {
    console.error('❌ Chat error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/stats', (req, res) => {
  res.json(tokenStats);
});

// === SERVER STARTUP ===

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`  GET  http://localhost:${PORT}/api/tasks`);
  console.log(`  POST http://localhost:${PORT}/api/tasks`);
  console.log(`  GET  http://localhost:${PORT}/api/tasks/summary`);
  console.log(`  POST http://localhost:${PORT}/api/chat`);
});
