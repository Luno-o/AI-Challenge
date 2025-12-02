import { useState } from 'react';

export function useChatWithPerplexity(initialRole) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Привет, я твой ИИ-агент Perplexity!' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentRole, setCurrentRole] = useState(initialRole);

  const sendMessage = async (input) => {
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
          role: currentRole
        })
      });

      if (!response.ok) throw new Error('Network error');

      const data = await response.json();
      const assistantMessage = { role: 'assistant', content: data.content };
      
      setMessages(prev => [...prev, assistantMessage]);
      localStorage.setItem('chatHistory', JSON.stringify([...messages, userMessage, assistantMessage]));
      
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Извините, произошла ошибка.' 
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
      setMessages(JSON.parse(saved));
    }
  };

  return { messages, isLoading, sendMessage, changeRole, loadHistory };
}
