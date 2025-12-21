import { useState, useCallback } from 'react';

const API_URL = 'http://localhost:4000/api/chat';
const TASKS_API = 'http://localhost:4000/api/tasks';

export function useChatWithPerplexity() {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const getTaskTools = async () => {
    try {
      const res = await fetch(`${TASKS_API}/tools`);
      const data = await res.json();
      return data.tools || [];
    } catch (error) {
      console.error('❌ Failed to get task tools:', error);
      return [];
    }
  };

  const callTaskTool = async (toolName, params = {}) => {
    try {
      console.log(`🔧 Calling task tool: ${toolName}`, params);
      let url = TASKS_API;
      let method = 'POST';
      
      if (toolName === 'list_tasks') {
        method = 'GET';
        if (params.status) url += `?status=${params.status}`;
      } else if (toolName === 'update_task') {
        method = 'PATCH';
        url += `/${params.id}`;
      } else if (toolName === 'delete_task') {
        method = 'DELETE';
        url += `/${params.id}`;
      } else if (toolName === 'get_tasks_summary') {
        method = 'GET';
        url += '/summary';
      }

      const options = { method, headers: { 'Content-Type': 'application/json' } };
      if (method !== 'GET') {
        options.body = JSON.stringify(params);
      }

      const res = await fetch(url, options);
      const result = await res.json();
      console.log(`✅ Result ${toolName}:`, result);
      return result;
    } catch (error) {
      console.error(`❌ Error calling ${toolName}:`, error);
      return { error: error.message };
    }
  };

  const determineToolsToCall = (userMessage) => {
    const lower = userMessage.toLowerCase();
    const tools = [];

    if (lower.includes('создай') || lower.includes('добавь') || lower.includes('новая задача')) {
      tools.push('create_task');
    }
    if (lower.includes('список') || lower.includes('покажи задачи') || lower.includes('все задачи')) {
      tools.push('list_tasks');
    }
    if (lower.includes('обнови') || lower.includes('измени') || lower.includes('статус')) {
      tools.push('update_task');
    }
    if (lower.includes('удали') || lower.includes('сотри')) {
      tools.push('delete_task');
    }
    if (lower.includes('summary') || lower.includes('сводка') || lower.includes('отчёт')) {
      tools.push('get_tasks_summary');
    }

    return tools.length > 0 ? tools : ['list_tasks'];
  };

  const getToolResults = async (toolNames, userMessage) => {
    let results = '';
    for (const toolName of toolNames) {
      let toolResult;
      
      if (toolName === 'create_task') {
        const titleMatch = userMessage.match(/создай задачу ["«](.+?)["»]/i);
        const title = titleMatch ? titleMatch[1] : 'Новая задача';
        toolResult = await callTaskTool('create_task', { title });
        results += `\n✅ Задача создана: ${JSON.stringify(toolResult, null, 2)}`;
      } else if (toolName === 'list_tasks') {
        toolResult = await callTaskTool('list_tasks', {});
        results += `\n📋 Список задач:\n${JSON.stringify(toolResult, null, 2)}`;
      } else if (toolName === 'get_tasks_summary') {
        toolResult = await callTaskTool('get_tasks_summary', {});
        results += `\n📊 Сводка задач:\n${JSON.stringify(toolResult, null, 2)}`;
      }
    }
    return results;
  };

  const processAgentResponse = async (userMessage, systemPrompt) => {
    const taskTools = await getTaskTools();
    const toolsDescription = taskTools.map(tool =>
      `- ${tool.name}: ${tool.description}`
    ).join('\n');

    const enhancedSystemPrompt = `${systemPrompt}\n\n📚 Доступные Task tools:\n${toolsDescription}\n\nИспользуй данные из tools для ответа.`;

    try {
      const toolsToCall = determineToolsToCall(userMessage);
      console.log('🔍 Tools to call:', toolsToCall);

      const toolResults = await getToolResults(toolsToCall, userMessage);
      console.log('📊 Tool results obtained');

      const messagesToSend = [
        { role: 'system', content: enhancedSystemPrompt },
        { role: 'user', content: `Пользователь: "${userMessage}"\n\nДанные из tools:\n${toolResults}` }
      ];

      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: messagesToSend, temperature: 0.7 })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error?.message || `HTTP ${res.status}`);
      }

      const response = await res.json();
      return response.content || response.message || '';
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

      const systemPrompt = `Ты — Task Manager Agent.
Специализируешься на управлении задачами: создание, список, обновление, удаление, summary.
Всегда давай четкие, структурированные ответы с emoji.`;

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
        content: `❌ Ошибка: ${error.message}`
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
    getTaskTools,
    callTaskTool
  };
}
