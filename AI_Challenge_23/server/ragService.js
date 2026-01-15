// ragService.js
import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_RERANK_THRESHOLD = Number(process.env.RERANK_THRESHOLD ?? 0.7);
const DEFAULT_RERANK_TOPK = Number(process.env.RERANK_TOPK ?? 3);

dotenv.config();

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
const PERPLEXITY_MODEL = process.env.PERPLEXITY_MODEL || 'llama-3.1-sonar-small-128k-online';

if (!PERPLEXITY_API_KEY) {
  console.error('❌ PERPLEXITY_API_KEY not found in .env file!');
}

console.log('🔑 PERPLEXITY_API_KEY loaded:', PERPLEXITY_API_KEY ? `${PERPLEXITY_API_KEY.substring(0, 10)}...` : '❌ MISSING');
console.log('🤖 PERPLEXITY_MODEL:', PERPLEXITY_MODEL);

/**
 * ВРЕМЕННАЯ ФУНКЦИЯ: Поиск в индексе БЕЗ MCP (прямой доступ к файлу)
 */
async function searchInIndexDirect(indexName, query, topK = 5) {
  try {
    const indexPath = path.join(__dirname, 'indexes', `${indexName}.json`);
    
    console.log(`📂 Reading index file: ${indexPath}`);
    
    if (!fs.existsSync(indexPath)) {
      console.error(`❌ Index file not found: ${indexPath}`);
      return [];
    }

    const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
    
    if (!indexData.embeddings || indexData.embeddings.length === 0) {
      console.warn('⚠️ Index is empty');
      return [];
    }

    console.log(`✅ Index loaded: ${indexData.embeddings.length} embeddings`);

    // ✅ УЛУЧШЕНИЕ: Текстовый поиск по ключевым словам
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
    
    console.log(`🔍 Query words:`, queryWords);

    // Считаем релевантность каждого чанка
    const scored = indexData.embeddings.map((item, idx) => {
      const textLower = item.text.toLowerCase();
      const filePathLower = item.file_path.toLowerCase();
      
      // Считаем совпадения слов запроса в тексте
      let score = 0;
      
      queryWords.forEach(word => {
        // Совпадение в тексте
        const textMatches = (textLower.match(new RegExp(word, 'g')) || []).length;
        score += textMatches * 0.1;
        
        // Совпадение в имени файла (больший вес)
        if (filePathLower.includes(word)) {
          score += 0.5;
        }
      });
      
      // Бонус за частичное совпадение всей фразы
      if (textLower.includes(queryLower)) {
        score += 1.0;
      }
      
      return {
        ...item,
        score: Math.min(0.95, score) // Нормализуем до 0.95 макс
      };
    });

    // Сортируем по score и берём топ-K
    const results = scored
      .sort((a, b) => b.score - a.score)
      .filter(item => item.score > 0) // Только релевантные
      .slice(0, topK)
      .map((item, idx) => ({
        id: item.id,
        file_path: item.file_path,
        chunk_index: item.chunk_index,
        text: item.text,
        score: item.score || (0.9 - idx * 0.05) // Fallback score
      }));

    console.log(`✅ Found ${results.length} relevant chunks`);
    console.log(`📊 Top results:`, results.slice(0, 3).map(r => ({ 
      file: r.file_path, 
      score: r.score.toFixed(3),
      preview: r.text.substring(0, 80) + '...'
    })));

    return results;

  } catch (error) {
    console.error('❌ Error reading index:', error);
    return [];
  }
}

/**
 * Универсальный reranker чанков через cross-encoder Perplexity Sonar
 * @param {string} question
 * @param {Array<{ text: string, score: number, file_path: string }>} chunks
 * @param {{ threshold?: number, topK?: number }} options
 */
export async function rerankChunks(
  question,
  chunks,
  options = { threshold: DEFAULT_RERANK_THRESHOLD, topK: DEFAULT_RERANK_TOPK }
) {
  const threshold = options.threshold ?? DEFAULT_RERANK_THRESHOLD;
  const topK = options.topK ?? DEFAULT_RERANK_TOPK;

  if (!chunks?.length) return [];

  const pairsText = chunks
    .map(
      (chunk, i) =>
        `[PAIR ${i + 1}]\nQuery: "${question}"\nDocument: "${chunk.text.substring(
          0,
          400
        )}"\nRelevance (0-1):`
    )
    .join('\n---\n');

  const systemPrompt = 'Ты оцениваешь релевантность документа к запросу. Отвечай только числами.';
  const userPrompt = `Score relevance для пар:\n\n${pairsText}\n\nВерни ТОЛЬКО числа через запятую.`;

  const scores = await getRerankScores(systemPrompt, userPrompt, chunks.length);

  return chunks
    .map((chunk, i) => ({
      ...chunk,
      rerankScore: scores[i] ?? 0}
    ))
    .filter((c) => c.rerankScore >= threshold)
    .sort((a, b) => b.rerankScore - a.rerankScore)
    .slice(0, topK);
}

/**
 * Вспомогательная функция: получить численные score из Perplexity
 */
async function getRerankScores(systemPrompt, userPrompt, expectedLength) {
  const raw = await callLLM(systemPrompt, userPrompt);
  const numbers = raw.match(/[\d.]+/g)?.map(Number) || [];
  if (!numbers.length) {
    return Array(expectedLength).fill(0.5);
  }
  if (numbers.length < expectedLength) {
    while (numbers.length < expectedLength) numbers.push(numbers[numbers.length - 1] ?? 0.5);
  }
  return numbers.slice(0, expectedLength).map((n) => Math.max(0, Math.min(1, n)));
}


/**
 * Вызов Perplexity LLM
 */
async function callLLM(systemPrompt, userPrompt) {
  if (!PERPLEXITY_API_KEY) {
    throw new Error('PERPLEXITY_API_KEY is not configured');
  }

  try {
    const response = await axios.post(
      'https://api.perplexity.ai/chat/completions',
      {
        model: PERPLEXITY_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2,
        max_tokens: 1000
      },
      {
        headers: {
          'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    if (error.response) {
      console.error('❌ Perplexity API error:', error.response.status, error.response.data);
      throw new Error(`Perplexity API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
}

/**
 * Ответ БЕЗ RAG (прямой вызов LLM)
 */
export async function answerWithoutRag(question) {
  const systemPrompt = 'Ты — полезный AI-ассистент. Отвечай честно и ясно. Если не знаешь ответ, так и скажи.';
  const llmInput = `${question}`;

  const llmAnswer = await callLLM(systemPrompt, llmInput);

  return {
    mode: 'no_rag',
    question,
    llmInput: `${systemPrompt}\n\n${llmInput}`,
    llmAnswer
  };
}

/**
 * Ответ С RAG через прямой доступ к файлу индекса
 */
export async function answerWithRagViaMcp(question, options = {}) {
  const { indexName = 'docs_index', topK = 5 } = options;

  console.log(`🔍 RAG search: indexName=${indexName}, question="${question}"`);

  // Используем прямой доступ вместо MCP
  const retrievedChunks = await searchInIndexDirect(indexName, question, topK);

  if (!retrievedChunks || retrievedChunks.length === 0) {
    console.warn('⚠️ No chunks found');
    return {
      mode: 'with_rag',
      question,
      retrievedChunks: [],
      llmInput: '',
      llmAnswer: '❌ Не найдено релевантных документов в индексе.'
    };
  }

  console.log(`✅ Retrieved ${retrievedChunks.length} chunks`);

  const contextBlock = retrievedChunks
    .map((chunk, i) => 
      `[${i + 1}] [score=${chunk.score.toFixed(3)}] ${chunk.file_path}:\n${chunk.text}\n`
    )
    .join('\n');

  const systemPrompt = `Ты — AI-ассистент с доступом к базе знаний.

ИНСТРУКЦИЯ:
- Отвечай СТРОГО на основе предоставленного КОНТЕКСТА
- Если информации недостаточно, честно скажи: "В предоставленном контексте нет информации об этом"
- Указывай источники в ответе
- Не добавляй информацию, которой нет в контексте`;

  const userPrompt = `КОНТЕКСТ:
${contextBlock}

ВОПРОС:
${question}

Ответь на вопрос, опираясь на контекст выше.`;

  const llmAnswer = await callLLM(systemPrompt, userPrompt);

  return {
    mode: 'with_rag',
    question,
    retrievedChunks,
    llmInput: `${systemPrompt}\n\n${userPrompt}`,
    llmAnswer
  };
}
/**
 * Ответ с RAG + rerank (cross-encoder)
 */
export async function answerWithRerankedRag(
  question,
  options = {
    indexName: 'docs_index',
    topK: 10,
    rerankThreshold: DEFAULT_RERANK_THRESHOLD,
    rerankTopK: DEFAULT_RERANK_TOPK
  }
) {
  const {
    indexName = 'docs_index',
    topK = 10,
    rerankThreshold = DEFAULT_RERANK_THRESHOLD,
    rerankTopK = DEFAULT_RERANK_TOPK
  } = options;

  console.log(
    `🔍 RAG+RERANK: indexName=${indexName}, question="${question}", topK=${topK}, threshold=${rerankThreshold}, rerankTopK=${rerankTopK}`
  );

  // 1) Прямой поиск по индексу (как в answerWithRagViaMcp)
  const rawChunks = await searchInIndexDirect(indexName, question, topK);

  // 2) rerankChunks → filtered chunks
  const filteredChunks = await rerankChunks(question, rawChunks, {
    threshold: rerankThreshold,
    topK: rerankTopK
  });

  // 3) Формируем prompt только из отфильтрованных чанков
  const contextBlocks = filteredChunks.map(
    (chunk, i) =>
      `[${i + 1}] [score=${chunk.score.toFixed(3)} | rerank=${chunk.rerankScore.toFixed(
        3
      )}] ${chunk.file_path}:\n${chunk.text}\n`
  );

  const contextText =
    contextBlocks.length > 0
      ? contextBlocks.join('\n')
      : 'Контекст пуст: ни один документ не прошёл порог релевантности.';

  const systemPrompt = `Ты — AI-ассистент с доступом к базе знаний.

ИНСТРУКЦИЯ:
- Отвечай строго на основе КОНТЕКСТА
- Если контекст пуст или слабый, честно скажи об этом
- Указывай важные источники (файлы) в ответе
- Не добавляй факты, которых нет в контексте`;

  const userPrompt = `КОНТЕКСТ (после rerank):
${contextText}

ВОПРОС:
${question}

Ответь на вопрос, опираясь на контекст выше.`;

  const llmAnswer = await callLLM(systemPrompt, userPrompt);

  return {
    mode: 'reranked_rag',
    question,
    rawChunksCount: rawChunks.length,
    filteredChunksCount: filteredChunks.length,
    filteredChunks,
    llmInput: `${systemPrompt}\n\n${userPrompt}`,
    llmAnswer
  };
}

/**
 * Сравнение ответов с RAG и без RAG через LLM-анализатор
 */
export async function compareRagVsNoRagViaMcp(question, options = {}) {
  console.log(`⚖️ Comparing RAG vs No RAG for: "${question}"`);

  // 1. Получить оба ответа
  const noRagResult = await answerWithoutRag(question);
  const withRagResult = await answerWithRagViaMcp(question, options);

  // 2. Сформировать аналитический prompt
  const topChunks = withRagResult.retrievedChunks.slice(0, 3)
    .map((c, i) => `${i + 1}. [score=${c.score.toFixed(3)}] ${c.file_path}: "${c.text.substring(0, 150)}..."`)
    .join('\n');

  const analysisPrompt = `Ты — эксперт по оценке качества ответов AI-систем.

ЗАДАЧА: Сравни два ответа на один и тот же вопрос.

ВОПРОС:
${question}

ОТВЕТ БЕЗ RAG (прямой вызов LLM):
${noRagResult.llmAnswer}

ОТВЕТ С RAG (на основе документов):
${withRagResult.llmAnswer}

ИСПОЛЬЗОВАННЫЕ ДОКУМЕНТЫ (топ-3):
${topChunks}

КРИТЕРИИ ОЦЕНКИ:
1. Точность (faithfulness) — соответствие фактам
2. Полнота (completeness) — насколько полон ответ
3. Конкретика — наличие специфичных деталей
4. Галлюцинации — выдумывание фактов

ФОРМАТ ОТВЕТА (строго JSON):
{
  "summary": "3-5 предложений общего вывода",
  "whereRagHelped": ["пункт 1", "пункт 2", ...],
  "whereRagNotNeeded": ["пункт 1", "пункт 2", ...]
}

Ответь только JSON, без дополнительного текста.`;

  const systemPrompt = 'Ты — аналитик качества AI-ответов. Отвечай строго в формате JSON.';
  
  const analysisRaw = await callLLM(systemPrompt, analysisPrompt);
  
  // Парсинг JSON из ответа
  let analysis;
  try {
    const jsonMatch = analysisRaw.match(/\{[\s\S]*\}/);
    analysis = JSON.parse(jsonMatch ? jsonMatch[0] : analysisRaw);
  } catch (e) {
    console.error('Failed to parse analysis JSON:', e);
    analysis = {
      summary: analysisRaw,
      whereRagHelped: ['Не удалось распарсить структурированный ответ'],
      whereRagNotNeeded: []
    };
  }

  return {
    mode: 'compare',
    question,
    noRag: {
      llmAnswer: noRagResult.llmAnswer,
      llmInput: noRagResult.llmInput
    },
    withRag: {
      llmAnswer: withRagResult.llmAnswer,
      llmInput: withRagResult.llmInput,
      retrievedChunks: withRagResult.retrievedChunks
    },
    analysis
  };
}
/**
 * Сравнение basic RAG vs reranked RAG
 */
export async function compareRerank(question, options = {}) {
  const baseOptions = {
    indexName: options.indexName || 'docs_index',
    topK: options.topK || 10,
    rerankThreshold: options.rerankThreshold ?? DEFAULT_RERANK_THRESHOLD,
    rerankTopK: options.rerankTopK ?? DEFAULT_RERANK_TOPK
  };

  console.log(
    `⚖️ Comparing basic RAG vs reranked RAG for: "${question}" (index=${baseOptions.indexName})`
  );

  const basic = await answerWithRagViaMcp(question, {
    indexName: baseOptions.indexName,
    topK: baseOptions.topK
  });

  const reranked = await answerWithRerankedRag(question, baseOptions);

  const topChunks = (basic.retrievedChunks || []).slice(0, 3)
    .map(
      (c, i) =>
        `${i + 1}. [score=${c.score.toFixed(3)}] ${c.file_path}: "${c.text.substring(0, 150)}..."`
    )
    .join('\n');

  const systemPrompt = 'Ты — аналитик качества AI-ответов. Отвечай строго в формате JSON.';
  const analysisPrompt = `Ты — эксперт по оценке качества RAG.

ВОПРОС:
${question}

A) Basic RAG (без rerank):
- retrievedChunksCount: ${(basic.retrievedChunks || []).length}
- answer:
${basic.llmAnswer}

B) Reranked RAG (cross-encoder):
- rawChunksCount: ${reranked.rawChunksCount}
- filteredChunksCount: ${reranked.filteredChunksCount}
- answer:
${reranked.llmAnswer}

ИСПОЛЬЗОВАННЫЕ ДОКУМЕНТЫ (basic, топ-3):
${topChunks}

КРИТЕРИИ:
1. Релевантность
2. Конкретика
3. Краткость
4. Полнота
5. Экономия токенов / времени

ФОРМАТ ОТВЕТА (строго JSON):
{
  "whereRerankHelped": ["..."],
  "whereRerankIsRisky": ["..."],
  "summary": "..."
}`;

  const analysisRaw = await callLLM(systemPrompt, analysisPrompt);

  let analysis;
  try {
    const jsonMatch = analysisRaw.match(/\{[\s\S]*\}/);
    analysis = JSON.parse(jsonMatch ? jsonMatch[0] : analysisRaw);
  } catch {
    analysis = {
      summary: analysisRaw,
      whereRerankHelped: ['Не удалось распарсить JSON, использован сырой текст.'],
      whereRerankIsRisky: []
    };
  }

  return {
    mode: 'compare_rerank',
    question,
    basicRag: basic,
    rerankedRag: reranked,
    analysis
  };
}
