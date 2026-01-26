import fetch from 'node-fetch';
import { callTaskTool } from './mcpClient.js';
import { callGitTool } from './gitMcpClient.js';
import { answerWithRagViaMcp } from './ragService.js';
import localLlmClient from './localLlmClient.js';
import userPersonalizationService from './userPersonalizationService.js';

// ═══════════════════════════════════════════════════════════════════
// 🛡️ SAFE MCP RESPONSE PARSER
// ═══════════════════════════════════════════════════════════════════

function parseMcpResponse(mcpResult, toolName = 'MCP') {
  console.log(`[${toolName}] Raw input:`, JSON.stringify(mcpResult).substring(0, 200));

  try {
    if (!mcpResult) {
      throw new Error(`${toolName}: No response received`);
    }

    if (mcpResult.content && Array.isArray(mcpResult.content) && mcpResult.content[0]?.text) {
      return JSON.parse(mcpResult.content[0].text);
    }

    if (mcpResult.text) {
      return JSON.parse(mcpResult.text);
    }

    if (typeof mcpResult === 'object' && !mcpResult.content) {
      return mcpResult;
    }

    if (typeof mcpResult === 'string') {
      return JSON.parse(mcpResult);
    }

    console.error(`[${toolName}] Unknown response format:`, mcpResult);
    throw new Error(`${toolName}: Invalid response format`);
  } catch (error) {
    console.error(`[${toolName}] Parse error:`, error.message);
    console.error(`[${toolName}] Raw response:`, mcpResult);
    throw new Error(`${toolName} parsing failed: ${error.message}`);
  }
}

async function callPerplexityWithSystemPrompt(systemPrompt, userQuestion, summaryJson) {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error('PERPLEXITY_API_KEY is missing');
  }

  const messages = [
    {
      role: 'system',
      content: systemPrompt || 'Ты — ассистент разработчика. Отвечай кратко и по делу.',
    },
    {
      role: 'user',
      content:
        `Пользователь задал вопрос: "${userQuestion}". ` +
        `Вот данные о намерении и результатах инструментов (JSON):\n\n${summaryJson}\n\n` +
        `Сформируй полезный, краткий ответ на русском.`,
    },
  ];

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar',
      messages,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Perplexity HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

// ═══════════════════════════════════════════════════════════════════
// 🧠 INTENT ROUTER (Improved with rule-based fallback)
// ═══════════════════════════════════════════════════════════════════

async function parseIntent(query) {
  const lowerQuery = query.toLowerCase().trim();
  
  // ═══════════════════════════════════════════════════════════════════
  // 🚨 ПРИОРИТЕТ 1: Команды создания (самые специфичные)
  // ═══════════════════════════════════════════════════════════════════
  if (lowerQuery.includes('создай задач') || 
      lowerQuery.includes('новая задача') || 
      lowerQuery.includes('добавь задач') ||
      (lowerQuery.startsWith('создай') && lowerQuery.includes(':'))) {
    
    // Парсинг заголовка
    let titleMatch = query.match(/(?:создай задач[уа]?|новая задача|добавь задач[уа]?|создай):\s*(.+?)(?:\s*,|\s+приоритет|$)/i);
    if (!titleMatch) {
      titleMatch = query.match(/(?:создай задач[уа]?|новая задача|добавь задач[уа]?)\s+(.+?)(?:\s*,|\s+приоритет|$)/i);
    }
    
    // Парсинг приоритета
    const priorityMatch = query.match(/приоритет\s+(high|medium|low|высок|средн|низк)/i);
    
    let priority = 'medium';
    if (priorityMatch) {
      const p = priorityMatch[1].toLowerCase();
      if (p === 'high' || p.includes('высок')) priority = 'high';
      else if (p === 'low' || p.includes('низк')) priority = 'low';
      else priority = 'medium';
    }
    
const title = titleMatch 
    ? titleMatch[1].trim().replace(/["']/g, '') // ✅ Убираем кавычки
    : query.replace(/создай задач[уа]?:?|новая задача:?|приоритет.+|,|["']/gi, '').trim() || 'Новая задача';
    
    console.log(`[Intent] Creating task: "${title}" with priority: ${priority}`);
    
    return {
      action: 'create_task',
      params: { title, priority },
      tools: ['task_mcp'],
    };
  }
  
  // ═══════════════════════════════════════════════════════════════════
  // 🚨 ПРИОРИТЕТ 2: Команды обновления/удаления
  // ═══════════════════════════════════════════════════════════════════
  if (lowerQuery.includes('удали задач') || lowerQuery.includes('удалить задач')) {
    const idMatch = query.match(/задач[уа]?\s*#?(\d+)/i);
    if (idMatch) {
      return {
        action: 'delete_task',
        params: { id: idMatch[1] },
        tools: ['task_mcp'],
      };
    }
  }
  
  if (lowerQuery.includes('обнови задач') || lowerQuery.includes('измени задач')) {
    const idMatch = query.match(/#?(\d+)/);
    if (idMatch) {
      return {
        action: 'update_task',
        params: { id: idMatch[1] },
        tools: ['task_mcp'],
      };
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════
  // 🚨 ПРИОРИТЕТ 3: Рекомендации и статус
  // ═══════════════════════════════════════════════════════════════════
  if (lowerQuery.includes('что делать первым') || 
      lowerQuery.includes('что делать сначала') || 
      lowerQuery.includes('рекоменд') ||
      lowerQuery === 'что делать?') {
    return { action: 'recommend_next', params: {}, tools: ['task_mcp', 'git_mcp'] };
  }
  
  if (lowerQuery.includes('статус проекта')) {
    return { action: 'project_status', params: {}, tools: ['task_mcp', 'git_mcp'] };
  }
  
  // ═══════════════════════════════════════════════════════════════════
  // 🚨 ПРИОРИТЕТ 4: Git команды
  // ═══════════════════════════════════════════════════════════════════
  if (lowerQuery === 'git status' || lowerQuery === 'статус git') {
    return { action: 'git_status', params: {}, tools: ['git_mcp'] };
  }
  
  if (lowerQuery.includes('коммит') || lowerQuery.includes('commit')) {
    const countMatch = query.match(/(\d+)/);
    return { 
      action: 'git_commits', 
      params: { count: countMatch ? parseInt(countMatch[1]) : 5 }, 
      tools: ['git_mcp'] 
    };
  }
  
// ═══════════════════════════════════════════════════════════════════
// 🚨 ПРИОРИТЕТ 5: Локальная LLM
// ═══════════════════════════════════════════════════════════════════
if (lowerQuery.includes('спроси локальн') || 
    lowerQuery.includes('локальная llm') ||
    lowerQuery.startsWith('ollama:')) {
  
  // ✅ ИСПРАВЛЕННАЯ ОЧИСТКА ПРЕФИКСА
  const cleanQuery = query
    .replace(/^спроси\s+локальн[уюую]?\s*:?\s*/i, '') // убирает "Спроси локальную: "
    .replace(/^локальная\s+llm\s*:?\s*/i, '')        // убирает "Локальная LLM: "
    .replace(/^ollama\s*:?\s*/i, '')                  // убирает "Ollama: "
    .trim();
  
  console.log('[Intent] Local LLM query detected:', cleanQuery);
  
  return {
    action: 'local_llm_query',
    params: { question: cleanQuery },
    tools: ['local_llm']
  };
}


  // ═══════════════════════════════════════════════════════════════════
  // 🚨 ПРИОРИТЕТ 6: RAG запросы
  // ═══════════════════════════════════════════════════════════════════
  if (lowerQuery.includes('как работает') || 
      lowerQuery.includes('что такое') || 
      lowerQuery.includes('объясни') ||
      lowerQuery.includes('как использовать') ||
      lowerQuery.includes('расскажи') ||
      lowerQuery.includes('документация')) {
    return { 
      action: 'knowledge_query', 
      params: { question: query }, 
      tools: ['rag'] 
    };
  }

  
  // ═══════════════════════════════════════════════════════════════════
  // 🚨 ПРИОРИТЕТ 6: Просмотр задач (последний, т.к. самый общий)
  // ═══════════════════════════════════════════════════════════════════
  
  // Точные совпадения
  if (lowerQuery === 'покажи все задачи' || 
      lowerQuery === 'список задач' || 
      lowerQuery === 'все задачи' ||
      lowerQuery === 'задачи') {
    return { action: 'list_tasks', params: {}, tools: ['task_mcp'] };
  }
  
  // Фильтры по приоритету (ТОЛЬКО если нет других ключевых слов)
  if ((lowerQuery.includes('покажи') || lowerQuery.includes('список')) && 
      (lowerQuery.includes('high') || lowerQuery.includes('высок'))) {
    return { action: 'list_tasks', params: { priority: 'high' }, tools: ['task_mcp'] };
  }
  
  if ((lowerQuery.includes('покажи') || lowerQuery.includes('список')) && 
      (lowerQuery.includes('medium') || lowerQuery.includes('средн'))) {
    return { action: 'list_tasks', params: { priority: 'medium' }, tools: ['task_mcp'] };
  }
  
  if ((lowerQuery.includes('покажи') || lowerQuery.includes('список')) && 
      (lowerQuery.includes('low') || lowerQuery.includes('низк'))) {
    return { action: 'list_tasks', params: { priority: 'low' }, tools: ['task_mcp'] };
  }
  
  // Фильтры по статусу
  if (lowerQuery.includes('todo') || lowerQuery.includes('запланирован')) {
    return { action: 'list_tasks', params: { status: 'todo' }, tools: ['task_mcp'] };
  }
  
  if (lowerQuery.includes('in_progress') || lowerQuery.includes('в работе')) {
    return { action: 'list_tasks', params: { status: 'in_progress' }, tools: ['task_mcp'] };
  }
  
  if (lowerQuery.includes('done') || lowerQuery.includes('выполнен')) {
    return { action: 'list_tasks', params: { status: 'done' }, tools: ['task_mcp'] };
  }
  
  // ═══════════════════════════════════════════════════════════════════
  // 🚨 FALLBACK: LLM для сложных случаев
  // ═══════════════════════════════════════════════════════════════════
  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.PERPLEXITY_MODEL || 'sonar',
        messages: [
          {
            role: 'system',
            content: `Проанализируй запрос и верни ТОЛЬКО JSON:

{"action": "...", "params": {...}, "tools": [...]}

ВАЖНО: Если запрос начинается с "Создай задачу" или "Новая задача", action ВСЕГДА должен быть "create_task".

Actions:
- create_task (params: title, priority) - создание задачи
- list_tasks (params: priority, status) - просмотр задач
- update_task (params: id, updates) - обновление
- delete_task (params: id) - удаление
- recommend_next - рекомендация
- project_status - статус проекта
- knowledge_query (params: question) - вопрос о проекте
- git_status - git статус
- git_commits (params: count) - коммиты

Примеры:
"Создай задачу: fix bug, приоритет high" → {"action":"create_task","params":{"title":"fix bug","priority":"high"},"tools":["task_mcp"]}
"Покажи high" → {"action":"list_tasks","params":{"priority":"high"},"tools":["task_mcp"]}`,
          },
          { role: 'user', content: query },
        ],
        max_tokens: 150,
        temperature: 0,
      }),
    });

    const data = await response.json();
    const intentText = data.choices?.[0]?.message?.content || '{}';
    const jsonMatch = intentText.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      console.log('[Intent Router] LLM parsed:', parsed);
      return parsed;
    }
  } catch (error) {
    console.error('[Intent Router] LLM error:', error.message);
  }

  // ═══════════════════════════════════════════════════════════════════
  // 🚨 DEFAULT: Показать все задачи
  // ═══════════════════════════════════════════════════════════════════
  console.warn('[Intent Router] Could not parse, defaulting to list_tasks');
  return {
    action: 'list_tasks',
    params: {},
    tools: ['task_mcp'],
  };
}

// ═══════════════════════════════════════════════════════════════════
// 🎯 PRIORITY ENGINE
// ═══════════════════════════════════════════════════════════════════
function recommendNextTask(tasks, gitStatus) {
  const activeTasks = tasks.filter(t => t.status !== 'done');

  if (activeTasks.length === 0) {
    return {
      recommended_task: null,
      reason: 'Нет активных задач',
      all_scored: [],
    };
  }

  const scored = activeTasks.map(task => {
    let score = 0;

    // Priority weight
    if (task.priority === 'high') score += 10;
    else if (task.priority === 'medium') score += 5;
    else if (task.priority === 'low') score += 2;

    // Blocks other tasks
    const blocksCount = tasks.filter(t =>
      Array.isArray(t.dependencies) && t.dependencies.includes(task.id)
    ).length;
    score += blocksCount * 8;

    // Related to modified files
    if (gitStatus?.modified && Array.isArray(gitStatus.modified)) {
      const relatedFiles = gitStatus.modified.some(file => {
        const fileName = file.split('/').pop().replace('.js', '').toLowerCase();
        return task.title.toLowerCase().includes(fileName);
      });
      if (relatedFiles) score += 3;
    }

    // Status bonus
    if (task.status === 'in_progress') score += 4;

    return { ...task, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const top = scored[0];
  const blocksCount = tasks.filter(t =>
    Array.isArray(t.dependencies) && t.dependencies.includes(top.id)
  ).length;

  let reason = `Приоритет ${top.priority}`;
  if (blocksCount > 0) reason += `, блокирует ${blocksCount} ${blocksCount === 1 ? 'задачу' : 'задач'}`;
  if (top.status === 'in_progress') reason += ', уже в работе';
  if (gitStatus?.modified?.length > 0) reason += ', связана с изменениями в репозитории';

  return {
    recommended_task: top,
    reason,
    all_scored: scored,
  };
}

// ═══════════════════════════════════════════════════════════════════
// 🚀 MAIN PROCESSING
// ═══════════════════════════════════════════════════════════════════
export async function processTeamQuery(
  query,
  userId = 'team_user',
  llmMode = 'ollama',
  personalizationEnabled = false
) {
  try {
    console.log('[Team Assistant] 📥 Query:', query);

    const intent = await parseIntent(query);
    console.log('[Team Assistant] 🧠 Intent:', JSON.stringify(intent, null, 2));

    let result = { success: true, intent };

    switch (intent.action) {
      // ────────────────────────────────────────────────────────────
      // СПИСОК ЗАДАЧ
      // ────────────────────────────────────────────────────────────
      case 'list_tasks': {
        const tasksResult = await callTaskTool('list_tasks', {});
        let tasks = [];

        try {
          const parsed = parseMcpResponse(tasksResult, 'Task MCP');
          tasks = Array.isArray(parsed) ? parsed : (parsed.tasks || []);
        } catch (e) {
          console.error('[list_tasks] Parse error:', e.message);
          tasks = [];
        }

        if (intent.params.priority) {
          tasks = tasks.filter(t => t.priority === intent.params.priority);
        }
        if (intent.params.status) {
          tasks = tasks.filter(t => t.status === intent.params.status);
        }

        result.tasks = tasks;
        result.answer = `Найдено **${tasks.length}** ${tasks.length === 1 ? 'задача' : 'задач'}${
          intent.params.priority ? ` с приоритетом **${intent.params.priority}**` : ''
        }${intent.params.status ? ` со статусом **${intent.params.status}**` : ''}.`;
        break;
      }

      // ────────────────────────────────────────────────────────────
      // РЕКОМЕНДАЦИЯ СЛЕДУЮЩЕЙ ЗАДАЧИ
      // ────────────────────────────────────────────────────────────
      case 'recommend_next': {
        const tasksResult = await callTaskTool('list_tasks', {});
        let tasks = [];

        try {
          const parsed = parseMcpResponse(tasksResult, 'Task MCP');
          tasks = Array.isArray(parsed) ? parsed : (parsed.tasks || []);
        } catch (e) {
          console.error('[recommend_next] Parse error:', e.message);
        }

        console.log(`[recommend_next] Found ${tasks.length} tasks`);

        const gitStatusResult = await callGitTool('get_git_status', {});
        const gitStatus = parseMcpResponse(gitStatusResult, 'Git MCP');

        const recommendation = recommendNextTask(tasks, gitStatus);

        result.tasks = recommendation.all_scored.slice(0, 5);
        result.recommendation = recommendation.recommended_task
          ? `**Начни с:** ${recommendation.recommended_task.title}\n\n**Причина:** ${recommendation.reason}`
          : 'Нет активных задач';

        result.git_context = {
          modified_files: gitStatus.modified?.length || 0,
          staged_files: gitStatus.staged?.length || 0,
          branch: gitStatus.branch || 'unknown',
        };

        result.answer = result.recommendation;
        result.next_actions = recommendation.recommended_task
          ? [
              gitStatus.modified?.length > 0 ? '📝 Закоммитить изменения' : null,
              `🚀 Начать работу над задачей #${recommendation.recommended_task.id}`,
            ].filter(Boolean)
          : [];
        break;
      }

      // ────────────────────────────────────────────────────────────
      // СТАТУС ПРОЕКТА
      // ────────────────────────────────────────────────────────────
      case 'project_status': {
        const tasksResult = await callTaskTool('list_tasks', {});
        let tasks = [];

        try {
          const parsed = parseMcpResponse(tasksResult, 'Task MCP');
          tasks = Array.isArray(parsed) ? parsed : (parsed.tasks || []);
        } catch (e) {
          console.error('[project_status] Parse error:', e.message);
        }

        console.log(`[project_status] Found ${tasks.length} tasks`);

        const gitStatusResult = await callGitTool('get_git_status', {});
        const gitStatus = parseMcpResponse(gitStatusResult, 'Git MCP');

        result.tasks = tasks;
        result.git_context = gitStatus;
        result.answer = `В проекте ${tasks.length} задач, ветка: ${gitStatus.branch || 'unknown'}.`;
        break;
      }

      // ────────────────────────────────────────────────────────────
      // ЛОКАЛЬНАЯ LLM
      // ────────────────────────────────────────────────────────────
      // case 'local_llm_query': {
      //   const question = intent.params.question || query;

      //   let baseSystemPrompt =
      //     'Ты — ассистент разработчика, помогаешь с технической помощью, анализом кода и архитектурой.';

      //   let finalSystemPrompt = baseSystemPrompt;
      //   let profileMetadata = null;

      //   if (personalizationEnabled && userId) {
      //     const systemPromptFromProfile = userPersonalizationService.getSystemPromptForQuery(userId, query);
      //     profileMetadata = userPersonalizationService.getProfileMetadata(userId);

      //     if (systemPromptFromProfile) {
      //       finalSystemPrompt = `${baseSystemPrompt}\n\n${systemPromptFromProfile}`;
      //     }
      //   }

      //   const llmAnswer = await localLlmClient.chat(question, {
      //     system: finalSystemPrompt,
      //     temperature: 0.7,
      //     top_p: 0.9,
      //   });

      //   result.answer = llmAnswer;
      //   result.personalized = Boolean(personalizationEnabled && profileMetadata);
      //   result.personalizationProfile = profileMetadata?.name || null;
      //   result.llmUsed = llmMode;
      //   return result;
      // }
      case 'local_llm_query': {
  const question = intent.params.question || query;
  result.answer = `Локальная LLM сейчас отключена. Вопрос: ${question}`;
  break;
}

      // ────────────────────────────────────────────────────────────
      // RAG / KNOWLEDGE
      // ────────────────────────────────────────────────────────────
      case 'knowledge_query': {
        const ragResult = await answerWithRagViaMcp(intent.params.question || query, {
          indexName: 'docs_index',
          topK: 5,
        });
        result.rag = ragResult;
        result.answer = ragResult.answer || ragResult.combinedAnswer || 'Ответ найден в документации.';
        break;
      }

      default: {
        result.answer = 'Я пока не знаю, как обработать этот запрос. Попробуй переформулировать.';
        break;
      }
    }

     // 🎯 ПЕРСОНАЛИЗАЦИЯ + ВЫЗОВ PERPLEXITY ДЛЯ ФИНАЛЬНОГО ТЕКСТА
    let baseSystemPrompt =
      'Ты — ассистент разработчика, помогаешь с технической помощью, анализом кода и архитектурой.';

    let finalSystemPrompt = baseSystemPrompt;
    let profileMetadata = null;

    if (personalizationEnabled && userId) {
      const systemPromptFromProfile = userPersonalizationService.getSystemPromptForQuery(userId, query);
      profileMetadata = userPersonalizationService.getProfileMetadata(userId);

      if (systemPromptFromProfile) {
        finalSystemPrompt = `${baseSystemPrompt}\n\n${systemPromptFromProfile}`;
      }
    }

    const summaryJson = JSON.stringify(result, null, 2);
    const llmAnswer = await callPerplexityWithSystemPrompt(
      finalSystemPrompt,
      query,
      summaryJson
    );

    result.answer = llmAnswer || result.answer;
    result.personalized = Boolean(personalizationEnabled && profileMetadata);
    result.personalizationProfile = profileMetadata?.name || null;
    result.llmUsed = llmMode; // покажет "perplexity" в UI, если ты его передал

    console.log('[Team Assistant] ✅ Success (Perplexity with personalization)');
    return result;
  } catch (error) {
    console.error('[Team Assistant] ❌ Error:', error);
    return {
      success: false,
      error: error.message || 'Unknown error in Team Assistant',
      answer: 'Произошла ошибка при обработке запроса команды.',
      llmUsed: llmMode,
    };
  }
}
