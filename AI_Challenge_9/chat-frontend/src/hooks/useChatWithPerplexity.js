// chat-frontend/src/hooks/useChatWithPerplexity.js
import { useState } from 'react';

export function useChatWithPerplexity() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Привет! Я помогу тебе с информацией. Что интересует?' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [compressedCount, setCompressedCount] = useState(0);
  const [stats, setStats] = useState({
    totalPromptTokens: 0,
    totalCompletionTokens: 0,
    totalTokens: 0,
    requests: 0,
    compressRequests: 0
  });

  const compressMessages = async (messagesToCompress) => {
    try {
      console.log('📦 Сжимаю историю...');
      
      const response = await fetch('http://localhost:4000/api/compress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: messagesToCompress })
      });

      const data = await response.json();
      return data.summary;
    } catch (error) {
      console.error('Compress error:', error);
      return null;
    }
  };

  const sendMessage = async (input) => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    let currentMessages = [...messages, userMessage];
    setMessages(currentMessages);
    setIsLoading(true);

    try {
      let historyForAPI = currentMessages;

      // Сжимаем историю если более 10 сообщений и нет резюме
      if (currentMessages.length > 10) {
        const hasSummary = currentMessages.some(m => m.isSummary);
        
        if (!hasSummary) {
          // Берём сообщения для сжатия (со 2-го по 9-е)
          const toCompress = currentMessages.slice(1, 9);
          const summary = await compressMessages(toCompress);
          
          if (summary) {
            // Новая история: приветствие + резюме + последние 2 сообщения
            historyForAPI = [
              currentMessages[0],
              {
                role: 'system',
                content: `[РЕЗЮМЕ ДИАЛОГА]: ${summary}`,
                isSummary: true
              },
              ...currentMessages.slice(9)
            ];
            
            // Обновляем состояние
            setMessages(historyForAPI);
            setCompressedCount(prev => prev + 1);
            console.log('✅ История сжата');
          }
        }
      }

      // Отправляем на API
      const response = await fetch('http://localhost:4000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          history: historyForAPI.slice(-10)
        })
      });

      if (!response.ok) {
        throw new Error('Network error');
      }

      const data = await response.json();
      const assistantMessage = { 
        role: 'assistant', 
        content: data.content
      };
      
      // Обновляем статистику
      if (data.stats) {
        setStats(data.stats);
      }
      
      const finalMessages = [...historyForAPI, assistantMessage];
      setMessages(finalMessages);
      localStorage.setItem('chatHistory', JSON.stringify(finalMessages));
      
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Ошибка: ${error.message}` 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadHistory = () => {
    const saved = localStorage.getItem('chatHistory');
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading history:', e);
      }
    }
  };

  const clearHistory = () => {
    setMessages([{ role: 'assistant', content: 'Привет! Я помогу тебе с информацией. Что интересует?' }]);
    setCompressedCount(0);
    setStats({
      totalPromptTokens: 0,
      totalCompletionTokens: 0,
      totalTokens: 0,
      requests: 0,
      compressRequests: 0
    });
    localStorage.removeItem('chatHistory');
  };

  return { 
    messages, 
    isLoading, 
    sendMessage, 
    loadHistory,
    clearHistory,
    compressedCount,
    stats
  };
}
