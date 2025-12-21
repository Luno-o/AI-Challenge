import express from 'express';
import { getGithubMcpClient } from '../mcp/githubClient';
import { getOpenIssuesCount, createIssue } from '../tools/githubTools';
// импорт твоего клиента Perplexity
import { callPerplexity } from '../llm/perplexityClient';

export const router = express.Router();

router.post('/chat', async (req, res) => {
  const { message } = req.body as { message: string };

  try {
    // простейший роутинг: если явно про GitHub + issues
    if (/github/i.test(message) && /issues?/i.test(message)) {
      const githubClient = await getGithubMcpClient();

      // создание issue
      if (/(создай|create).+issue/i.test(message)) {
        const created = await createIssue(githubClient, {
          title: 'Issue from perplexity-chat',
          body: `Пользователь написал: ${message}`,
        });

        return res.json({
          answer: `Создал issue в GitHub:\n${created.text}`,
        });
      }

      // просто получить открытые issues
      const list = await getOpenIssuesCount(githubClient);
      return res.json({
        answer: `Открытые issues (по умолчанию):\n${list.text}`,
      });
    }

    // остальные запросы — обычный поток через Perplexity
    const llmAnswer = await callPerplexity(message);
    return res.json({ answer: llmAnswer });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: e.message || 'Internal error' });
  }
});
