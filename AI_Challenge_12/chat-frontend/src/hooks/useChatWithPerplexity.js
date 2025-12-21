// src/hooks/useChatWithPerplexity.js
import { useState, useCallback } from 'react';

const API_URL = 'http://localhost:4000/api/chat';
const GITHUB_API = 'http://localhost:4000/api/github';

export function useChatWithPerplexity() {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [compressedCount, setCompressedCount] = useState(0);
  const [stats, setStats] = useState({});

  const getGitHubTools = async () => {
    try {
      const res = await fetch('http://localhost:4000/api/github/tools');
      const data = await res.json();
      return data.tools || [];
    } catch (error) {
      console.error('❌ Failed to get GitHub tools:', error);
      return [];
    }
  };

  const callGitHubTool = async (toolName, params = {}) => {
    try {
      console.log(`🔧 Вызываю GitHub tool: ${toolName}`, params);
      
      const res = await fetch(GITHUB_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: toolName, ...params })
      });

      const result = await res.json();
      console.log(`✅ Результат ${toolName}:`, result);
      return result;
    } catch (error) {
      console.error(`❌ Ошибка при вызове ${toolName}:`, error);
      return { error: error.message };
    }
  };
  const addSummary = async () => {
    try {
      if (!messages || messages.length < 4) {
        console.log('ℹ️ Недостаточно сообщений для сжатия');
        return;
      }

      console.log('🔄 Запрашиваю summary у /api/compress...');

      const res = await fetch('http://localhost:4000/api/compress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages })
      });

      if (!res.ok) {
        console.error('❌ Compress API error:', res.status);
        return;
      }

      const data = await res.json();
      if (!data.summary) {
        console.log('ℹ️ Summary не получен (null)');
        return;
      }

      const summaryMessage = {
        role: 'assistant',
        content: data.summary,
        isSummary: true,
      };

      setMessages((prev) => {
        const updated = [...prev, summaryMessage];
        localStorage.setItem('chatHistory', JSON.stringify(updated));
        return updated;
      });

      setCompressedCount((c) => c + 1);
      console.log('✅ Summary добавлен');
    } catch (error) {
      console.error('❌ Ошибка при сжатии:', error);
    }
  };

  // Определяем какие tools нужно вызвать на основе запроса
  const determineToolsToCall = (userMessage) => {
    const lower = userMessage.toLowerCase();
    const tools = [];

    if (lower.includes('информация') || lower.includes('инфо') || lower.includes('описание') || lower.includes('подробнее')) {
      tools.push('get_repo_info');
    }
    if (lower.includes('issue') || lower.includes('проблем') || lower.includes('issues')) {
      tools.push('list_issues');
    }
    if (lower.includes('pull') || lower.includes('request') || lower.includes('pr') || lower.includes('мерж')) {
      tools.push('list_prs');
    }
    if (lower.includes('branch') || lower.includes('ветк') || lower.includes('ветки')) {
      tools.push('list_branches');
    }
    if (lower.includes('commit') || lower.includes('коммит') || lower.includes('история')) {
      tools.push('list_commits');
    }

    // Если ничего не найдено, показываем всё
    if (tools.length === 0) {
      tools.push('get_repo_info');
    }

    return tools;
  };

  // Вызываем нужные tools и получаем результаты
  const getToolResults = async (toolNames) => {
    let results = '';

    for (const toolName of toolNames) {
      let toolResult;

      if (toolName === 'get_repo_info') {
        console.log('🔧 Получаю информацию о репозитории...');
        toolResult = await callGitHubTool('get_repo_info', {});
        results += `\n📦 Информация о репозитории:\n${JSON.stringify(toolResult, null, 2)}`;
      } 
      else if (toolName === 'list_issues') {
        console.log('🔧 Получаю issues...');
        toolResult = await callGitHubTool('list_issues', { state: 'open' });
        results += `\n📋 Открытые Issues:\n${JSON.stringify(toolResult, null, 2)}`;
      } 
      else if (toolName === 'list_prs') {
        console.log('🔧 Получаю pull requests...');
        toolResult = await callGitHubTool('list_prs', { state: 'open' });
        results += `\n🔀 Открытые Pull Requests:\n${JSON.stringify(toolResult, null, 2)}`;
      } 
      else if (toolName === 'list_branches') {
        console.log('🔧 Получаю branches...');
        toolResult = await callGitHubTool('list_branches', {});
        results += `\n🌳 Branches:\n${JSON.stringify(toolResult, null, 2)}`;
      } 
      else if (toolName === 'list_commits') {
        console.log('🔧 Получаю commits...');
        toolResult = await callGitHubTool('list_commits', { sha: 'main' });
        results += `\n📝 Recent Commits:\n${JSON.stringify(toolResult, null, 2)}`;
      }
    }

    return results;
  };

  const processAgentResponse = async (userMessage, systemPrompt) => {
    const githubTools = await getGitHubTools();
    
    const toolsDescription = githubTools.map(tool => 
      `- ${tool.name}: ${tool.description}`
    ).join('\n');

    const enhancedSystemPrompt = `${systemPrompt}

📚 Доступные GitHub tools (уже вызваны и результаты ниже):
${toolsDescription}

Используй полученные данные для ответа пользователю. Будь конкретен и точен.`;

    try {
      // 1. Определяем какие tools нужны
      const toolsToCall = determineToolsToCall(userMessage);
      console.log('🔍 Определены tools для вызова:', toolsToCall);

      // 2. Вызываем tools и получаем результаты
      const toolResults = await getToolResults(toolsToCall);
      console.log('📊 Результаты tools получены');

      // 3. Отправляем в Perplexity с результатами tools
      const messagesToSend = [
        { role: 'system', content: enhancedSystemPrompt },
        { role: 'user', content: `Пользователь спрашивает: "${userMessage}"\n\nВот данные из GitHub tools:\n${toolResults}` }
      ];

      console.log('📤 Отправляю в Perplexity с данными tools...');

      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messagesToSend,
          temperature: 0.7
        })
      });

      if (!res.ok) {
        const error = await res.json();
        console.error('❌ API Error:', error);
        throw new Error(error.error?.message || `HTTP ${res.status}`);
      }

      const response = await res.json();
      const responseText = response.content || response.message || '';

      console.log('✅ Ответ получен от Perplexity');
      return responseText;

    } catch (error) {
      console.error('❌ Error in processAgentResponse:', error);
      throw error;
    }
  };

  const sendMessage = useCallback(async (userMessage) => {
    setIsLoading(true);
    
    try {
      const newUserMessage = { role: 'user', content: userMessage };
      const updatedMessages = [...messages, newUserMessage];
      setMessages(updatedMessages);

      const systemPrompt = `Ты — помощник разработчика для GitHub.
Специализируешься на анализе информации о репозитории: issues, pull requests, branches, commits.
Всегда давай точные, полезные и конкретные ответы на основе предоставленных данных.
Формат ответа: четкий, структурированный, с использованием emojis для наглядности.
Репозиторий: Luno-o/AI-Challenge`;

      const responseText = await processAgentResponse(userMessage, systemPrompt);

      const assistantMessage = { 
        role: 'assistant', 
        content: responseText 
      };
      
      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);
      localStorage.setItem('chatHistory', JSON.stringify(finalMessages));

    } catch (error) {
      console.error('❌ Error:', error);
      const errorMessage = { 
        role: 'assistant', 
        content: `❌ Ошибка: ${error.message}\n\nПроверьте:\n1. Сервер на http://localhost:4000 запущен\n2. MCP сервер для GitHub запущен\n3. PERPLEXITY_API_KEY установлен` 
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [messages]);

  const loadHistory = useCallback(() => {
    const saved = localStorage.getItem('chatHistory');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setMessages(parsed);
        }
      } catch (e) {
        console.error('Failed to load history:', e);
      }
    }
  }, []);

  const clearHistory = useCallback(() => {
    setMessages([]);
    localStorage.removeItem('chatHistory');
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    loadHistory,
    clearHistory,
    compressedCount,
    stats,
    getGitHubTools,
    callGitHubTool,
    addSummary
  };
}
