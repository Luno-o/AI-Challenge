// server/prReviewService.js

import { callGitTool } from './gitMcpClient.js';
import { searchInIndex } from './ragMcpClient.js';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
const PERPLEXITY_MODEL = process.env.PERPLEXITY_MODEL || 'sonar';

/**
 * Основная функция анализа PR
 */
export async function reviewPullRequest(baseBranch, compareBranch) {
  console.log(`?? Starting PR review: ${baseBranch}...${compareBranch}`);

  // 1. Получить список файлов
  const filesResult = await callGitTool('get_pr_files', {
    base_branch: baseBranch,
    compare_branch: compareBranch
  });

  const changedFiles = filesResult.files || [];
  console.log(`?? Found ${changedFiles.length} changed files`);

  // 2. Получить полный diff
  const diffResult = await callGitTool('get_pr_diff', {
    base_branch: baseBranch,
    compare_branch: compareBranch
  });

  // 3. RAG: Поиск релевантной документации
  const ragContext = await getRagContextForPR(changedFiles, diffResult.diff);

  // 4. Анализ каждого файла с LLM
  const fileReviews = [];
  for (const file of changedFiles.slice(0, 10)) { // Ограничение для токенов
    if (file.status === 'D') continue; // Skip deleted files

    const fileDiff = await callGitTool('get_file_diff', {
      file_path: file.path,
      base_branch: baseBranch,
      compare_branch: compareBranch
    });

    const review = await reviewFile(file, fileDiff.diff, ragContext);
    fileReviews.push(review);
  }

  // 5. Общий summary
  const summary = await generateReviewSummary(fileReviews, ragContext);

  return {
    success: true,
    baseBranch,
    compareBranch,
    filesCount: changedFiles.length,
    fileReviews,
    summary
  };
}

/**
 * RAG контекст из structure.md + другой документации
 */
async function getRagContextForPR(changedFiles, diff) {
  const queries = [
    'project structure architecture documentation',
    'API endpoints REST Express',
    'MCP server tools git operations',
    'React components routing pages'
  ];

  // Индексируем structure_updated.md если еще не сделано
  try {
    const results = await searchInIndex('docs_index', queries.join(' '), 10);
    console.log(`? Retrieved ${results.length} RAG chunks`);
    return results;
  } catch (error) {
    console.warn('?? RAG search failed, continuing without context');
    return [];
  }
}

/**
 * Ревью отдельного файла
 */
async function reviewFile(file, diff, ragContext) {
  const contextBlock = ragContext
    .slice(0, 3)
    .map((chunk, i) => `[${i + 1}] ${chunk.file_path}:\n${chunk.text.substring(0, 300)}`)
    .join('\n\n');

  const systemPrompt = `Ты — опытный code reviewer. Анализируй код на:
1. Соответствие архитектуре проекта (см. КОНТЕКСТ)
2. Best practices (безопасность, производительность)
3. Потенциальные баги
4. Стиль кода и читаемость

КОНТЕКСТ ПРОЕКТА:
${contextBlock || 'No documentation context available'}`;

  const userPrompt = `Файл: ${file.path} (статус: ${file.status})

DIFF:
\`\`\`diff
${diff.substring(0, 2000)}
\`\`\`

Дай краткое ревью (до 5 пунктов):
- ? Положительные моменты
- ?? Замечания и предложения
- ? Критичные проблемы (если есть)`;

  const review = await callLLM(systemPrompt, userPrompt);

  return {
    file: file.path,
    status: file.status,
    review
  };
}

/**
 * Общий summary ревью
 */
async function generateReviewSummary(fileReviews, ragContext) {
  const allReviews = fileReviews.map(r => `### ${r.file}\n${r.review}`).join('\n\n');

  const systemPrompt = 'Ты — lead reviewer. Суммируй результаты code review.';
  const userPrompt = `CODE REVIEW для ${fileReviews.length} файлов:

${allReviews}

Дай общий вывод:
1. **Overall Quality**: оценка 1-10
2. **Key Issues**: главные проблемы
3. **Recommendations**: приоритетные рекомендации
4. **Approval Status**: ? Approve / ?? Approve with comments / ? Request changes`;

  return await callLLM(systemPrompt, userPrompt);
}

/**
 * Вызов LLM (Perplexity)
 */
async function callLLM(systemPrompt, userPrompt) {
  const response = await axios.post(
    'https://api.perplexity.ai/chat/completions',
    {
      model: PERPLEXITY_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 1500
    },
    {
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return response.data.choices[0].message.content;
}
