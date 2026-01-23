// server/analyticsChatService.js
import { analyzeData } from "./analyticsService.js";

// простая in-memory история по одному "аналитическому" чату
const CHAT_HISTORY_LIMIT = 10;
let chatHistory = []; // [{ role: 'user'|'assistant', content: string }]

export function resetAnalyticsChatHistory() {
  chatHistory = [];
}

export async function analyticsChat(message) {
  // 1) посчитать агрегаты и получить базовый ответ (answer + stats + rawData)
  const { answer, stats, rawData } = await analyzeData(message, {}, 1000);

  // 2) обновить историю диалога
  chatHistory.push({ role: "user", content: message });
  chatHistory.push({ role: "assistant", content: answer });

  if (chatHistory.length > CHAT_HISTORY_LIMIT * 2) {
    chatHistory = chatHistory.slice(-CHAT_HISTORY_LIMIT * 2);
  }

  // 3) вернуть на фронт и сам ответ, и stats, и history (если нужно)
  return {
    answer,
    stats,
    rawData,
    history: chatHistory,
  };
}
