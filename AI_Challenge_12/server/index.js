import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import cors from 'cors';
import { getMcpClient } from './mcpClient.js';

import {
  listIssues,
  listPullRequests,
  listBranches,
  listCommits,
  getRepoInfo,
} from './githubTools.js';


dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

let tokenStats = {
  totalPromptTokens: 0,
  totalCompletionTokens: 0,
  totalTokens: 0,
  requests: 0,
  compressRequests: 0,
};

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());
app.get('/api/github/tools', async (req, res) => {
  try {
    const client = await getMcpClient();
    const tools = await client.listTools();
    
    const toolList = tools.tools.map(t => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema
    }));
    
    res.json({ tools: toolList });
  } catch (error) {
    console.error('❌ List tools error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Эндпоинт для GitHub-операций через MCP
app.post('/api/github', async (req, res) => {
  try {
    const { action, owner, repo, ...params } = req.body;
    const defaultOwner = process.env.GH_DEFAULT_OWNER || owner;
    const defaultRepo = process.env.GH_DEFAULT_REPO || repo;

    if (!action) {
      return res.status(400).json({ error: 'Missing action' });
    }

    let result;

    switch (action) {
    case 'list_repos':
  result = { error: 'list_repos not implemented yet' };
  break;

      case 'get_repo_info':
        result = await getRepoInfo({ owner: defaultOwner, repo: defaultRepo });
        break;
      case 'get_repo_contents':
        result = await getRepoContents({
          owner: defaultOwner,
          repo: defaultRepo,
          path: params.path || '',
        });
        break;
      case 'list_issues':
        result = await listIssues({
          owner: defaultOwner,
          repo: defaultRepo,
          state: params.state || 'open',
        });
        break;
      case 'create_issue':
        result = await createIssue({
          owner: defaultOwner,
          repo: defaultRepo,
          title: params.title,
          body: params.body,
        });
        break;
      case 'update_issue':
        result = await updateIssue({
          owner: defaultOwner,
          repo: defaultRepo,
          issue_number: params.issue_number,
          title: params.title,
          body: params.body,
          state: params.state,
        });
        break;
      case 'close_issue':
        result = await closeIssue({
          owner: defaultOwner,
          repo: defaultRepo,
          issue_number: params.issue_number,
        });
        break;
      case 'list_prs':
        result = await listPullRequests({
          owner: defaultOwner,
          repo: defaultRepo,
          state: params.state || 'open',
        });
        break;
      case 'create_pr':
        result = await createPullRequest({
          owner: defaultOwner,
          repo: defaultRepo,
          title: params.title,
          body: params.body,
          head: params.head,
          base: params.base,
        });
        break;
      case 'merge_pr':
        result = await mergePullRequest({
          owner: defaultOwner,
          repo: defaultRepo,
          pull_number: params.pull_number,
          merge_method: params.merge_method,
        });
        break;
      case 'list_branches':
        result = await listBranches({
          owner: defaultOwner,
          repo: defaultRepo,
        });
        break;
      case 'create_branch':
        result = await createBranch({
          owner: defaultOwner,
          repo: defaultRepo,
          branch: params.branch,
          from: params.from,
        });
        break;
      case 'list_commits':
        result = await listCommits({
          owner: defaultOwner,
          repo: defaultRepo,
          branch: params.branch,
        });
        break;
      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }

    res.json({ result });
  } catch (error) {
    console.error('❌ GitHub API Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, temperature = 0.7 } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    // НОВОЕ: Анализируем последнее сообщение пользователя
    const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content || '';
    const lowerMessage = lastUserMessage.toLowerCase();

    // НОВОЕ: Определяем, нужны ли данные GitHub
    const needsGithub = 
      lowerMessage.includes('issue') ||
      lowerMessage.includes('ишью') ||
      lowerMessage.includes('задач') ||
      lowerMessage.includes('commit') ||
      lowerMessage.includes('коммит') ||
      lowerMessage.includes('репозит') ||
      lowerMessage.includes('repo') ||
      lowerMessage.includes('branch') ||
      lowerMessage.includes('ветк') ||
      lowerMessage.includes('pr') ||
      lowerMessage.includes('pull request');

    let githubData = null;

    // НОВОЕ: Получаем реальные данные GitHub
    if (needsGithub) {
      console.log('🔍 Обнаружен GitHub запрос, получаю данные...');
      const owner = process.env.GH_DEFAULT_OWNER;
      const repo = process.env.GH_DEFAULT_REPO;

      githubData = {
        owner,
        repo,
        timestamp: new Date().toISOString()
      };

      try {
        // Получаем issues если упоминаются
        if (/issue|ишью|задач/i.test(lowerMessage)) {
          console.log('📋 Получаю issues...');
          githubData.issues = await listIssues({ 
            owner, 
            repo, 
            state: 'open', 
            per_page: 10 
          });
        }

        // Получаем commits если упоминаются
        if (/commit|коммит|последн/i.test(lowerMessage)) {
          console.log('📝 Получаю commits...');
          githubData.commits = await listCommits({ 
            owner, 
            repo, 
            per_page: 10 
          });
        }

        // Получаем info о репозитории
        if (/репозит|repo|инфо|мое/i.test(lowerMessage)) {
          console.log('📦 Получаю repo info...');
          githubData.repoInfo = await getRepoInfo({ owner, repo });
        }

        // Получаем ветки
        if (/branch|ветк/i.test(lowerMessage)) {
          console.log('🌿 Получаю branches...');
          githubData.branches = await listBranches({ owner, repo });
        }

        // Получаем PR
        if (/pr|pull request/i.test(lowerMessage)) {
          console.log('🔀 Получаю PRs...');
          githubData.prs = await listPullRequests({ 
            owner, 
            repo, 
            state: 'open' 
          });
        }

        console.log('✅ GitHub данные получены:', Object.keys(githubData));
      } catch (error) {
        console.error('❌ Ошибка получения GitHub данных:', error.message);
        githubData.error = error.message;
      }
    }

    // НОВОЕ: Создаём расширенный system prompt с данными
    let systemPrompt = `Ты — помощник разработчика для работы с GitHub репозиторием ${process.env.GH_DEFAULT_OWNER}/${process.env.GH_DEFAULT_REPO}.

Ты должен отвечать ТОЛЬКО на основе реальных данных, которые я тебе передаю.
Не придумывай информацию, если данных нет - так и скажи.`;

    if (githubData) {
      systemPrompt += `\n\n## АКТУАЛЬНЫЕ ДАННЫЕ РЕПОЗИТОРИЯ (${githubData.timestamp}):\n\n`;
      
      if (githubData.repoInfo) {
        systemPrompt += `### Информация о репозитории:\n${JSON.stringify(githubData.repoInfo, null, 2)}\n\n`;
      }
      
      if (githubData.issues) {
        if (githubData.issues.length === 0) {
          systemPrompt += `### Issues:\nОткрытых issues нет (пустой список).\n\n`;
        } else {
          systemPrompt += `### Открытые Issues (${githubData.issues.length}):\n${JSON.stringify(githubData.issues, null, 2)}\n\n`;
        }
      }
      
      if (githubData.commits) {
        systemPrompt += `### Последние коммиты:\n${JSON.stringify(githubData.commits, null, 2)}\n\n`;
      }
      
      if (githubData.branches) {
        systemPrompt += `### Ветки:\n${JSON.stringify(githubData.branches, null, 2)}\n\n`;
      }
      
      if (githubData.prs) {
        systemPrompt += `### Pull Requests:\n${JSON.stringify(githubData.prs, null, 2)}\n\n`;
      }

      systemPrompt += `\nИспользуй ЭТИ данные для ответа. Если список пустой - так и скажи пользователю.`;
    }

    // НОВОЕ: Добавляем system message в начало
    const finalMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.filter(m => m.role !== 'system' && m.role && m.content)
    ];

    console.log('📤 Отправляю в Perplexity API...');
    console.log('Структура:', finalMessages.map(m => `${m.role}(${m.content.substring(0, 30)}...)`).join(' → '));

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: finalMessages,
        temperature,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', response.status, errorText);
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    if (data.usage) {
      tokenStats.totalPromptTokens += data.usage.prompt_tokens;
      tokenStats.totalCompletionTokens += data.usage.completion_tokens;
      tokenStats.totalTokens += data.usage.total_tokens;
      tokenStats.requests++;

      console.log('✅ Ответ получен');
      console.log(
        `📊 Запрос: prompt=${data.usage.prompt_tokens} + completion=${data.usage.completion_tokens} = ${data.usage.total_tokens}`
      );
      console.log(
        `📈 ИТОГО: ${tokenStats.totalTokens} токенов за ${tokenStats.requests} запросов`
      );
    }

    res.json({
      content,
      message: content,
      usage: data.usage,
      stats: tokenStats,
      githubDataUsed: githubData ? Object.keys(githubData).filter(k => k !== 'timestamp' && k !== 'owner' && k !== 'repo') : []
    });

  } catch (error) {
    console.error('❌ Server Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});






app.post('/api/compress', async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || messages.length < 4) {
      return res.json({ summary: null });
    }

    console.log('🔄 Начинаю сжатие...');

    const conversationText = messages
      .map(m => {
        if (m.isSummary) return null;
        const role = m.role === 'user' ? 'User' : 'Assistant';
        const text = m.content.substring(0, 150);
        return `${role}: ${text}`;
      })
      .filter(Boolean)
      .join('\n\n');

    const compressResponse = await fetch(
      'https://api.perplexity.ai/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'sonar',
          messages: [
            {
              role: 'system',
              content:
                'Создай очень краткое резюме (1-2 предложения) диалога. Резюме должно быть коротким.',
            },
            {
              role: 'user',
              content: conversationText,
            },
          ],
          temperature: 0.1,
          max_tokens: 100,
        }),
      }
    );

    if (!compressResponse.ok) {
      console.error('❌ Compress API error:', compressResponse.status);
      return res.json({ summary: null });
    }

    const compressData = await compressResponse.json();
    const summary = compressData.choices[0].message.content;

    if (compressData.usage) {
      tokenStats.totalPromptTokens += compressData.usage.prompt_tokens;
      tokenStats.totalCompletionTokens += compressData.usage.completion_tokens;
      tokenStats.totalTokens += compressData.usage.total_tokens;
      tokenStats.compressRequests++;
      console.log('✅ Резюме создано');
      console.log(
        `📊 Сжатие: prompt=${compressData.usage.prompt_tokens} + completion=${compressData.usage.completion_tokens} = ${compressData.usage.total_tokens}`
      );
      console.log(
        `📈 ИТОГО: ${tokenStats.totalTokens} токенов (сжатий: ${tokenStats.compressRequests})`
      );
    }

    res.json({ summary });
  } catch (error) {
    console.error('❌ Compress error:', error.message);
    res.json({ summary: null });
  }
});

app.get('/api/stats', (req, res) => {
  res.json(tokenStats);
});

app.post('/api/stats/reset', (req, res) => {
  tokenStats = {
    totalPromptTokens: 0,
    totalCompletionTokens: 0,
    totalTokens: 0,
    requests: 0,
    compressRequests: 0,
  };
  console.log('🔄 Статистика сброшена');
  res.json({ message: 'Stats reset', stats: tokenStats });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(
    `📊 Статистика доступна по GET http://localhost:${PORT}/api/stats`
  );
});
