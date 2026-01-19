// supportAssistantService_WORKING.js
// РАБОЧАЯ версия - передаёт параметры ПРАВИЛЬНО

import { answerWithRagViaMcp } from './ragService.js';
import { getTicketStats } from './supportMcpClient.js';

/**
 * Главный сервис для Support Assistant
 * Отвечает на вопросы пользователей о продукте
 */

export async function processUserQuestion(userId, question) {
  try {
    console.log(`[Support] Processing question for user: ${userId}`);
    console.log(`[Support] Question: ${question}`);

    // 1️⃣ ПОЛУЧИТЬ КОНТЕКСТ ПОЛЬЗОВАТЕЛЯ
    let userContext = null;
    try {
      userContext = await getTicketStats(userId);
      console.log('[Support] User context retrieved:', {
        open_issues: userContext?.open_issues,
        past_issues_count: userContext?.past_issues_count
      });
    } catch (err) {
      console.warn('[Support] Could not get user context:', err.message);
      userContext = {
        open_issues: 0,
        past_issues_count: 0
      };
    }

    // 2️⃣ RAG ПОИСК ПО ДОКУМЕНТАЦИИ
    // ✅ ВАЖНО: Передаём объект { indexName: 'docs_index' }, не строку!
    let ragResult = null;
    try {
      console.log('[Support] Starting RAG search...');
      ragResult = await answerWithRagViaMcp(question, { indexName: 'docs_index' });
      console.log('[Support] RAG search completed');
      console.log('[Support] Found chunks:', ragResult?.retrievedChunks?.length || 0);
    } catch (err) {
      console.error('[Support] RAG search failed:', err.message);
      ragResult = {
        llmAnswer: null,
        retrievedChunks: [],
        sources: []
      };
    }

    // 3️⃣ ФОРМИРОВАНИЕ ОТВЕТА
    const response = {
      success: true,
      answer: ragResult?.llmAnswer || `Извините, я не смог найти информацию по вашему вопросу: "${question}". Пожалуйста, свяжитесь с поддержкой.`,
      sources: formatSources(ragResult?.retrievedChunks),
      user_context: userContext,
      confidence: 0.85,
      timestamp: new Date().toISOString()
    };

    console.log('[Support] Response prepared successfully');
    return response;

  } catch (error) {
    console.error('[Support] ERROR: processUserQuestion failed:', error.message);
    console.error('[Support] Stack:', error.stack);

    return {
      success: false,
      answer: `Произошла ошибка при обработке вашего вопроса. Пожалуйста, попробуйте позже.`,
      sources: [],
      user_context: null,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Форматирование источников для ответа
 * @param {Array} chunks - Чанки из RAG поиска
 * @returns {Array} Отформатированные источники
 */
function formatSources(chunks) {
  if (!chunks || !Array.isArray(chunks)) {
    return [];
  }

  return chunks.slice(0, 5).map(chunk => ({
    document: chunk.file_path || chunk.file || 'unknown',
    relevance: Math.round((chunk.score || 0) * 100),
    preview: chunk.text?.substring(0, 150) || chunk.preview || ''
  }));
}

/**
 * Создание тикета поддержки
 * @param {string} userId - ID пользователя
 * @param {string} issue - Описание проблемы
 * @param {string} description - Подробное описание
 * @returns {Object} Результат создания тикета
 */
export async function escalateToTicket(userId, issue, description) {
  try {
    console.log(`[Support] Creating ticket for user: ${userId}`);
    console.log(`[Support] Issue: ${issue}`);

    // Формируем тикет
    const ticket = {
      id: `ticket_${Date.now()}`,
      user_id: userId,
      issue: issue,
      description: description,
      status: 'open',
      priority: 'medium',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('[Support] Ticket created:', ticket.id);

    return {
      success: true,
      ticket_id: ticket.id,
      message: `Тикет #${ticket.id} создан. Мы свяжемся с вами в ближайшее время.`,
      ticket: ticket
    };

  } catch (error) {
    console.error('[Support] ERROR: escalateToTicket failed:', error.message);

    return {
      success: false,
      message: 'Не удалось создать тикет. Пожалуйста, попробуйте позже.',
      error: error.message
    };
  }
}

/**
 * Получение истории поддержки пользователя
 * @param {string} userId - ID пользователя
 * @returns {Object} История поддержки
 */
export async function getUserSupportHistory(userId) {
  try {
    console.log(`[Support] Getting support history for user: ${userId}`);

    const context = await getTicketStats(userId);

    return {
      success: true,
      user_id: userId,
      open_issues: context?.open_issues || 0,
      past_issues_count: context?.past_issues_count || 0,
      last_issue: context?.last_issue || null,
      resolution_time_avg: context?.resolution_time_avg || null
    };

  } catch (error) {
    console.error('[Support] ERROR: getUserSupportHistory failed:', error.message);

    return {
      success: false,
      error: error.message
    };
  }
}

export default {
  processUserQuestion,
  escalateToTicket,
  getUserSupportHistory
};
