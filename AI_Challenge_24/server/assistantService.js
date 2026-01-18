import axios from 'axios';
import dotenv from 'dotenv';
import { callDocumentTool } from './ragMcpClient.js';
import { callGitTool } from './gitMcpClient.js';

dotenv.config();

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
const PERPLEXITY_MODEL = process.env.PERPLEXITY_MODEL || 'sonar';

// Парсинг команд ассистента
export function parseCommand(input) {
  const match = input.match(/^\/(\w+)(?:\s+(.*))?$/);
  if (!match) return { command: null, query: input };
  
  const [, command, query = ''] = match;
  return { command: command.toLowerCase(), query: query.trim() };
}

import { execSync } from 'child_process';

// ✅ Fallback функции для Git
function getGitBranchFallback() {
  try {
    const branch = execSync('git branch --show-current', { 
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore']
    }).trim();
    return branch || 'detached HEAD';
  } catch {
    return 'not a git repo';
  }
}

function getGitStatusFallback() {
  try {
    const status = execSync('git status --short', { 
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore']
    }).trim();
    return status || 'clean';
  } catch {
    return '';
  }
}

// Обработка команды /help
export async function handleHelpCommand(query) {
  try {
    // 1. RAG: поиск по документации
    const searchResult = await callDocumentTool('search_in_index', {
      index_name: 'docs_index',
      query,
      top_k: 5
    });

    const chunks = searchResult.success ? searchResult.results : [];

    // 2. Git context с fallback
    let branchOutput = 'unknown';
    let statusOutput = 'clean';

    try {
      const [branchRes, statusRes] = await Promise.all([
        callGitTool('get_current_branch'),
        callGitTool('get_git_status')
      ]);

      if (branchRes.success && branchRes.output) {
        branchOutput = branchRes.output;
      } else {
        throw new Error('Git MCP not ready');
      }

      if (statusRes.success) {
        statusOutput = statusRes.output || 'clean';
      }
    } catch (gitError) {
      // ✅ Fallback на прямой execSync
      console.warn('⚠️ Git MCP error, using fallback:', gitError.message);
      branchOutput = getGitBranchFallback();
      statusOutput = getGitStatusFallback();
    }

    const gitContext = `
**Git Context:**
- Branch: ${branchOutput}
- Status: ${statusOutput.substring(0, 200)}
`;

    // 3. Формируем prompt для LLM
    const docsContext = chunks.length > 0
      ? chunks.map((c, i) => `[${i+1}] ${c.file_path}:\n${c.text}`).join('\n\n')
      : 'No relevant documentation found.';

    const systemPrompt = `Ты — AI Code Assistant для проекта AI Challenge 19 (RAG система с MCP + Git интеграция).

ИНСТРУКЦИЯ:
- Отвечай на вопросы о проекте, используя ДОКУМЕНТАЦИЮ и GIT CONTEXT
- Приводи примеры кода из документации
- Упоминай файлы и функции по именам
- Будь кратким и конкретным (до 300 слов)
- Используй markdown для форматирования кода`;

    const userPrompt = `${gitContext}

ДОКУМЕНТАЦИЯ:
${docsContext}

ВОПРОС:
${query || 'Как работает проект?'}

Ответь как AI Assistant, ссылаясь на документацию и git context.`;

    // 4. LLM
    const llmAnswer = await callLLM(systemPrompt, userPrompt);

    return {
      success: true,
      command: 'help',
      query,
      answer: llmAnswer,
      sources: chunks.slice(0, 3).map(c => ({
        file: c.file_path,
        score: c.score,
        preview: c.text.substring(0, 100) + '...'
      })),
      gitContext: {
        branch: branchOutput,
        status: statusOutput
      }
    };
  } catch (error) {
    console.error('handleHelpCommand error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}


// Обработка команды /code <filepath>
export async function handleCodeCommand(query) {
  try {
    const filePathMatch = query.match(/^([\w\/.-]+)/);
    if (!filePathMatch) {
      return {
        success: false,
        error: 'Укажи путь к файлу: /code server/ragService.js'
      };
    }

    const filePath = filePathMatch[1];
    const result = await callGitTool('get_file_content', { file_path: filePath });

    if (!result.success) {
      return {
        success: false,
        error: `Файл не найден: ${filePath}`
      };
    }

    // LLM анализирует код
    const systemPrompt = 'Ты — AI Code Reviewer. Анализируй код, объясняй его назначение и логику.';
    const userPrompt = `Файл: ${filePath}\n\n\`\`\`\n${result.content}\n\`\`\`\n\nОпиши, что делает этот код (кратко, до 200 слов).`;

    const llmAnswer = await callLLM(systemPrompt, userPrompt);

    return {
      success: true,
      command: 'code',
      filePath,
      code: result.content,
      analysis: llmAnswer
    };
  } catch (error) {
    console.error('handleCodeCommand error:', error);
    return { success: false, error: error.message };
  }
}

// Обработка команды /review
export async function handleReviewCommand(query) {
  try {
    const statusRes = await callGitTool('get_git_status');
    if (!statusRes.success || !statusRes.output) {
      return {
        success: false,
        error: 'Нет изменённых файлов для review'
      };
    }

    const files = statusRes.output.split('\n').slice(0, 5); // топ-5 файлов
    const fileList = files.join('\n');

    const systemPrompt = 'Ты — AI Code Reviewer. Даёшь краткие рекомендации по изменённым файлам.';
    const userPrompt = `Git status:\n${fileList}\n\nДай краткий review (что изменено, есть ли риски, что проверить).`;

    const llmAnswer = await callLLM(systemPrompt, userPrompt);

    return {
      success: true,
      command: 'review',
      files: fileList,
      review: llmAnswer
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Роутер команд
export async function processAssistantCommand(input) {
  const { command, query } = parseCommand(input);

  switch (command) {
    case 'help':
      return handleHelpCommand(query);
    case 'code':
      return handleCodeCommand(query);
    case 'review':
      return handleReviewCommand(query);
    default:
      // Если нет команды — просто /help
      return handleHelpCommand(input);
  }
}

// Вызов LLM
async function callLLM(systemPrompt, userPrompt) {
  if (!PERPLEXITY_API_KEY) {
    throw new Error('PERPLEXITY_API_KEY not configured');
  }

  try {
    const response = await axios.post(
      'https://api.perplexity.ai/chat/completions',
      {
        model: PERPLEXITY_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2,
        max_tokens: 800
      },
      {
        headers: {
          'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('LLM call error:', error.response?.data || error.message);
    throw error;
  }
}
