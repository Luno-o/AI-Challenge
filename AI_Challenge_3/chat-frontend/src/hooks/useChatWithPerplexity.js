import { useState } from 'react';

export function useChatWithPerplexity(initialRole) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Привет, я твой ИИ-агент Perplexity!' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentRole, setCurrentRole] = useState(initialRole);

  const sendMessage = async (input, jsonMode = false) => {
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
          returnJson: jsonMode
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Network error');
      }

      const data = await response.json();
      const assistantMessage = { 
        role: 'assistant', 
        content: typeof data.content === 'string' ? data.content : JSON.stringify(data.content, null, 2)
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      localStorage.setItem('chatHistory', JSON.stringify([...messages, userMessage, assistantMessage]));
      
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

  return { messages, isLoading, sendMessage, changeRole, loadHistory };
}
