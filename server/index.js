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
    const { message, history, role } = req.body;
    
    const systemMessage = role || 'Ты — технический ИИ-ассистент. Отвечай кратко и по-русски.';
    
    // Фильтруем историю: убираем первое приветственное сообщение assistant
    const filteredHistory = (history || []).filter((msg, index) => {
      // Пропускаем первое сообщение, если это assistant
      if (index === 0 && msg.role === 'assistant') return false;
      return true;
    }).slice(-10); // Ограничиваем последними 10 сообщениями
    
    const messages = [
      { role: 'system', content: systemMessage },
      ...filteredHistory,
      { role: 'user', content: message }
    ];

    console.log('Sending request to Perplexity API...');
    console.log('Messages:', JSON.stringify(messages, null, 2));

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: messages,
        temperature: 0.2,
        max_tokens: 1024
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('API Error:', data);
      throw new Error(`Perplexity API error: ${response.status} - ${JSON.stringify(data)}`);
    }
    
    console.log('Response received:', data);
    
    res.json({
      content: data.choices[0].message.content,
      usage: data.usage
    });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});


app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
