import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: 'http://localhost:5174' }));
app.use(express.json());

app.post('/api/chat', async (req, res) => {
  try {
    const { message, history, role, returnJson,temperature = 0.7 } = req.body;
    
    const systemMessage = returnJson 
      ? `You are a data extraction agent that returns responses ONLY in raw JSON format.
Rules:
- Return ONLY valid JSON string with no additional text
- Do not wrap JSON in code blocks
- Ensure all JSON keys use double quotes`
      : (role || 'Ты — технический ИИ-ассистент. Отвечай кратко и по-русски.');
    
    const filteredHistory = (history || []).filter((msg, index) => {
      if (index === 0 && msg.role === 'assistant') return false;
      return true;
    }).slice(-10);
    
    const messages = [
      { role: 'system', content: systemMessage },
      ...filteredHistory,
      { role: 'user', content: message }
    ];

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: messages,
        temperature: temperature,
        max_tokens: 1024
      })
    });

    const responseText = await response.text();
    
    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.status}`);
    }
    
    const data = JSON.parse(responseText);
    let content = data.choices[0].message.content;
    
    if (returnJson) {
      try {
        const jsonMatch = content.match(/``````/s);
        if (jsonMatch) content = jsonMatch[1];
        const jsonData = JSON.parse(content);
        res.json({ content: jsonData, usage: data.usage });
      } catch (e) {
        res.json({ content: content, usage: data.usage, parseError: true });
      }
    } else {
      res.json({ content: content, usage: data.usage });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
