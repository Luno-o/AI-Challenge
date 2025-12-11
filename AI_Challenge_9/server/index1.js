import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.post('/api/chat', async (req, res) => {
  try {
    const { message, history } = req.body;
    
    // Берём только последние 10 сообщений и фильтруем резюме
    let filteredHistory = (history || [])
      .filter(msg => !msg.isSummary) // Убираем резюме из истории
      .slice(-10);
    
    // Убираем первое сообщение assistant (приветствие) если оно в начале
    if (filteredHistory.length > 0 && filteredHistory[0].role === 'assistant') {
      filteredHistory = filteredHistory.slice(1);
    }
    
    // Теперь проверяем чередование
    if (filteredHistory.length > 0) {
      const lastMsg = filteredHistory[filteredHistory.length - 1];
      if (lastMsg.role === 'user') {
        // Последнее сообщение - user, убираем его (нарушает чередование)
        filteredHistory = filteredHistory.slice(0, -1);
      }
    }
    
    const messages = [
      { role: 'system', content: 'Ты — технический ИИ-ассистент. Отвечай кратко и по-русски.' },
      ...filteredHistory,
      { role: 'user', content: message }
    ];

    console.log('📤 Отправляю в Perplexity API...');
    console.log('Структура:', messages.map(m => m.role).join(' → '));

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: messages,
        temperature: 0.7,
        max_tokens: 1024
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', response.status, errorText);
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    const content = data.choices[0].message.content;
    
    console.log('✅ Ответ получен');
    
    res.json({ 
      content: content, 
      usage: data.usage 
    });
    
  } catch (error) {
    console.error('❌ Server Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Эндпоинт для сжатия истории
app.post('/api/compress', async (req, res) => {
  try {
    const { messages } = req.body;
    
    if (!messages || messages.length < 4) {
      return res.json({ summary: null });
    }

    console.log('🔄 Начинаю сжатие...');

    // Форматируем сообщения в текст
    const conversationText = messages
      .map(m => {
        if (m.isSummary) return null;
        const role = m.role === 'user' ? 'User' : 'Assistant';
        const text = m.content.substring(0, 150);
        return `${role}: ${text}`;
      })
      .filter(Boolean)
      .join('\n\n');

    const compressResponse = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: 'Создай очень краткое резюме (1-2 предложения) диалога. Резюме должно быть коротким.'
          },
          {
            role: 'user',
            content: conversationText
          }
        ],
        temperature: 0.1,
        max_tokens: 100
      })
    });

    if (!compressResponse.ok) {
      console.error('❌ Compress API error:', compressResponse.status);
      return res.json({ summary: null });
    }

    const compressData = await compressResponse.json();
    const summary = compressData.choices[0].message.content;
    
    console.log('✅ Резюме создано');
    res.json({ summary: summary });
    
  } catch (error) {
    console.error('❌ Compress error:', error.message);
    res.json({ summary: null });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
