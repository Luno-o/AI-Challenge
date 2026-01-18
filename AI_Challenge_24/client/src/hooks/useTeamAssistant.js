// client/src/hooks/useTeamAssistant.js
import { useState } from 'react';

export const useTeamAssistant = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const ask = async (query, userId = 'team_user') => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/team/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, user_id: userId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setLoading(false);
      return data;
    } catch (err) {
      console.error('Team Assistant error:', err);
      setError(err.message);
      setLoading(false);
      return {
        success: false,
        error: err.message,
        answer: '⚠️ Ошибка соединения с сервером',
      };
    }
  };

  return { ask, loading, error };
};
