// server/teamAssistantService.js
import fetch from 'node-fetch';
import { callTaskTool } from './mcpClient.js';
import { callGitTool } from './gitMcpClient.js';
import { answerWithRagViaMcp } from './ragService.js';

// ═══════════════════════════════════════════════════════════════════
// 🛡️ SAFE MCP RESPONSE PARSER
// ═══════════════════════════════════════════════════════════════════
function parseMcpResponse(mcpResult, toolName = 'MCP') {
      console.log(`[${toolName}] Raw input:`, JSON.stringify(mcpResult).substring(0, 200)); // 🔍 Debug
  try {
    if (!mcpResult) {
      throw new Error(`${toolName}: No response received`);
    }

    // Формат 1: {content: [{text: "..."}]}
    if (mcpResult.content && Array.isArray(mcpResult.content) && mcpResult.content[0]?.text) {
      return JSON.parse(mcpResult.content[0].text);
    }

    // Формат 2: {text: "..."}
    if (mcpResult.text) {
      return JSON.parse(mcpResult.text);
    }

    // Формат 3: уже распарсенный объект
    if (typeof mcpResult === 'object' && !mcpResult.content) {
      return mcpResult;
    }

    // Формат 4: строка JSON
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
  // 🚨 ПРИОРИТЕТ 5: RAG запросы
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
export async function processTeamQuery(query, userId = 'team_user') {
  try {
    console.log('[Team Assistant] 📥 Query:', query);

    const intent = await parseIntent(query);
    console.log('[Team Assistant] 🧠 Intent:', JSON.stringify(intent, null, 2));

    let result = { success: true, intent };

    switch (intent.action) {
      // ────────────────────────────────────────────────────────────
case 'list_tasks': {
  const tasksResult = await callTaskTool('list_tasks', {});
  
  // ✅ Безопасный парсинг
  let tasks = [];
  try {
    const parsed = parseMcpResponse(tasksResult, 'Task MCP');
    tasks = Array.isArray(parsed) ? parsed : (parsed.tasks || []);
  } catch (e) {
    console.error('[list_tasks] Parse error:', e.message);
    tasks = [];
  }

  // Apply filters
  if (intent.params.priority) {
    tasks = tasks.filter(t => t.priority === intent.params.priority);
  }
  if (intent.params.status) {
    tasks = tasks.filter(t => t.status === intent.params.status);
  }

  result.tasks = tasks;
  result.answer = `Найдено **${tasks.length}** ${tasks.length === 1 ? 'задача' : 'задач'}${intent.params.priority ? ` с приоритетом **${intent.params.priority}**` : ''}${intent.params.status ? ` со статусом **${intent.params.status}**` : ''}.`;
  break;
}

      // ────────────────────────────────────────────────────────────
case 'recommend_next': {
  const tasksResult = await callTaskTool('list_tasks', {});
  
  // ✅ Улучшенный парсинг
  let tasks = [];
  try {
    const parsed = parseMcpResponse(tasksResult, 'Task MCP');
    tasks = Array.isArray(parsed) ? parsed : (parsed.tasks || []);
  } catch (e) {
    console.error('[recommend_next] Parse error:', e.message);
  }
  
  console.log(`[recommend_next] Found ${tasks.length} tasks`); // 🔍 Debug
  
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
case 'project_status': {
  const tasksResult = await callTaskTool('list_tasks', {});
  
  // ✅ Улучшенный парсинг
  let tasks = [];
  try {
    const parsed = parseMcpResponse(tasksResult, 'Task MCP');
    tasks = Array.isArray(parsed) ? parsed : (parsed.tasks || []);
  } catch (e) {
    console.error('[project_status] Parse error:', e.message);
  }
  
  console.log(`[project_status] Found ${tasks.length} tasks`); // 🔍 Debug

  const gitStatusResult = await callGitTool('get_git_status', {});
  const gitStatus = parseMcpResponse(gitStatusResult, 'Git MCP');

  const taskStats = {
    total: tasks.length,
    done: tasks.filter(t => t.status === 'done').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    todo: tasks.filter(t => t.status === 'todo').length,
    high_priority: tasks.filter(t => t.priority === 'high' && t.status !== 'done').length,
  };

  result.task_stats = taskStats;
  result.git_context = {
    branch: gitStatus.branch || 'unknown',
    modified_files: gitStatus.modified?.length || 0,
    staged_files: gitStatus.staged?.length || 0,
  };
  result.answer = `## 📊 Статус проекта

**Задачи:** ${taskStats.done}/${taskStats.total} выполнено, ${taskStats.in_progress} в работе, ${taskStats.high_priority} high-приоритетных

**Git:** ветка \`${gitStatus.branch}\`, ${gitStatus.modified?.length || 0} измененных файлов, ${gitStatus.staged?.length || 0} подготовленных`;
  break;
}

      // ────────────────────────────────────────────────────────────

case 'create_task': {
  const params = {
    title: intent.params.title || 'Новая задача',
    priority: intent.params.priority || 'medium',
    status: intent.params.status || 'todo',
  };

  console.log('[create_task] Creating:', params);

  const taskResult = await callTaskTool('create_task', params);
  
  // ✅ Безопасный парсинг
  let newTask = {};
  try {
    const parsed = parseMcpResponse(taskResult, 'Task MCP');
    newTask = parsed.task || parsed;
  } catch (e) {
    console.error('[create_task] Parse error:', e.message);
    newTask = { title: params.title, priority: params.priority };
  }

  result.task = newTask;
  result.answer = `✅ Создана задача: **${newTask.title}** (приоритет: **${newTask.priority}**${newTask.id ? `, ID: #${newTask.id}` : ''})`;
  break;
}


      // ────────────────────────────────────────────────────────────
      case 'update_task': {
        const taskResult = await callTaskTool('updateTask', {
          id: intent.params.id,
          ...intent.params.updates,
        });
        const updated = parseMcpResponse(taskResult, 'Task MCP');

        result.task = updated;
        result.answer = `✅ Задача #${updated.id} обновлена`;
        break;
      }

      // ────────────────────────────────────────────────────────────
      case 'delete_task': {
        await callTaskTool('deleteTask', { id: intent.params.id });
        result.answer = `🗑️ Задача #${intent.params.id} удалена`;
        break;
      }

      // ────────────────────────────────────────────────────────────
      case 'knowledge_query': {
        // ✅ ИСПРАВЛЕНО: правильная передача вопроса
        const question = intent.params.question || intent.params.query || query;
        
        console.log('[Team Assistant] 📚 RAG query:', question);
        
        const ragResult = await answerWithRagViaMcp(question, {
          indexName: 'docs_index',
        });

        result.answer = ragResult.llmAnswer || 'Не удалось найти информацию в документации';
        result.sources = ragResult.retrievedChunks?.map(chunk => ({
          document: chunk.source,
          preview: chunk.text?.substring(0, 150) + '...',
          relevance: chunk.similarity ? Math.round(chunk.similarity * 100) : null,
        }));
        break;
      }

      // ────────────────────────────────────────────────────────────
      case 'git_status': {
        const gitStatusResult = await callGitTool('get_git_status', {});
        const gitStatus = parseMcpResponse(gitStatusResult, 'Git MCP');

        result.git_context = gitStatus;
        result.answer = `## 🔀 Git Status

**Ветка:** \`${gitStatus.branch}\`  
**Измененных файлов:** ${gitStatus.modified?.length || 0}  
**Подготовленных файлов:** ${gitStatus.staged?.length || 0}

${gitStatus.modified?.length > 0 ? `\n**Измененные:**\n${gitStatus.modified.map(f => `- ${f}`).join('\n')}` : ''}`;
        break;
      }

      // ────────────────────────────────────────────────────────────
case 'git_commits': {
  const count = intent.params.count || 5;
  
  try {
    const commitsResult = await callGitTool('get_recent_commits', { count });
    const commits = parseMcpResponse(commitsResult, 'Git MCP');

    result.commits = Array.isArray(commits) ? commits : [];
    
    if (result.commits.length === 0) {
      result.answer = `📝 Коммитов не найдено (возможно, пустой репозиторий)`;
    } else {
      result.answer = `## 📝 Последние ${result.commits.length} коммитов:\n\n${result.commits
        .map(c => `- \`${c.hash.substring(0, 7)}\` ${c.message} *(${c.author})*`)
        .join('\n')}`;
    }
  } catch (e) {
    console.error('[git_commits] Error:', e.message);
    result.answer = `⚠️ Ошибка получения коммитов: ${e.message}`;
  }
  break;
}


      // ────────────────────────────────────────────────────────────
      default:
        result.answer = `❓ Не удалось распознать команду. 

**Попробуй:**
- "Покажи все задачи"
- "Что делать первым?"
- "Статус проекта"
- "Создай задачу: исправить баг, приоритет high"
- "Как работает RAG в этом проекте?"
- "Покажи задачи с приоритетом high"`;
    }

    console.log('[Team Assistant] ✅ Success');
    return result;
  } catch (error) {
    console.error('[Team Assistant] ❌ Error:', error);
    return {
      success: false,
      error: error.message,
      answer: `⚠️ Произошла ошибка: ${error.message}`,
    };
  }
}
