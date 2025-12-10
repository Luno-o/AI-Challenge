import { useState } from 'react';

export function useChatWithPerplexity(initialRole) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Привет, я твой ИИ-агент Perplexity!' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentRole, setCurrentRole] = useState(initialRole);
  const [tokenStats, setTokenStats] = useState({
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0
  });

  const sendMessage = async (input, jsonMode = false,temperature = 0.7) => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try { 
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          history: messages,
          role: currentRole,
          returnJson: jsonMode,
          temperature:temperature
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Network error');
      }

      const data = await response.json();
      if (data.usage) {
         setTokenStats(prev => ({
          promptTokens: prev.promptTokens + data.usage.prompt_tokens,
          completionTokens: prev.completionTokens + data.usage.completion_tokens,
          totalTokens: prev.totalTokens + data.usage.total_tokens
        }));
      }
        let displayContent;
      if (typeof data.content === 'object') {
        displayContent = JSON.stringify(data.content, null, 2);
      } else {
        displayContent = data.content;
      }
    const assistantMessage = { 
        role: 'assistant', 
        content: displayContent
      };
      const newMessages = [...messages, { role: 'user', content: input }, assistantMessage];
      setMessages(newMessages);
      localStorage.setItem('chatHistory', JSON.stringify(newMessages));
      
      
      
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

  const changeRole = (newRole) => {
    setCurrentRole(newRole);
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

  return { messages, isLoading, sendMessage, changeRole, loadHistory, tokenStats };
}
