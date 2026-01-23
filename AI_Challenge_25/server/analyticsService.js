// analyticsService.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parse } from "csv-parse/sync";
import { ANALYTICS_SOURCES } from "./analyticsConfig.js";
import localLlmClient from "./localLlmClient.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Пути к источникам (env имеет приоритет над config)
const CSV_PATH = process.env.ANALYTICS_CSV || ANALYTICS_SOURCES.csv.path;
const LOG_PATH = process.env.ANALYTICS_LOG || ANALYTICS_SOURCES.logs.path;
const JSON_PATH = process.env.ANALYTICS_JSON || ANALYTICS_SOURCES.json.path;

export async function analyzeData(query, filters = {}, limit = 1000) {
  const data = loadAndParse() || [];
  const aggregations = aggregate(data, filters, limit) || {};

  const contextJson = JSON.stringify(aggregations);

  const system = `
Ты — senior аналитик логов и продуктовый инженер.
Тебе переданы уже посчитанные агрегаты в JSON с полями, например:
- funnel: массив шагов воронки с полями step, users, dropoff_from_prev;
- maxDropoffStep: объект с шагом воронки, где отвалилось больше всего пользователей;
- errorsByRoute: массив route с количеством ошибок;
- topErrorRoute: маршрут с максимальным количеством ошибок.

Твоя задача:
- ВСЕГДА, если в aggregations.maxDropoffStep не null, называть этот шаг как ответ на вопрос
  «На каком шаге воронки больше всего потеря пользователей?»;
- при вопросах про ошибки по маршрутам — использовать aggregations.topErrorRoute и errorsByRoute;
- не придумывать данные, а строго опираться на JSON;
- давать конкретные рекомендации (что чинить и в каком порядке) на основе этих полей.

Формат ответа:
1) Краткий вывод (1–2 предложения), где явно упомянуты step и dropoff_from_prev из maxDropoffStep.
2) Детали: структурированный список по шагам/route с конкретными числами из JSON.
3) Рекомендации по приоритету: начиная с шага/route с максимальными потерями/ошибками.
`.trim();

  const user = `
Вопрос пользователя: "${query}".

Доступные агрегаты данных (JSON):
${contextJson}
`.trim();

  const llmResponse = await localLlmClient.chat(user, {
    system,
    preset: "factual",
  });

  return {
    answer: llmResponse,
    stats: aggregations,
    rawData: data.slice(0, 10),
  };
}

function loadAndParse() {
  const result = [];

  // 1) CSV: события (timestamp, level, message, user_id, route, status_code)
  try {
    const csvFullPath = path.isAbsolute(CSV_PATH)
      ? CSV_PATH
      : path.join(__dirname, CSV_PATH);
    const csvContent = fs.readFileSync(csvFullPath, "utf-8");
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
    });

    // нормализуем
    for (const r of records.slice(0, 10_000)) {
      result.push({
        type: "event",
        timestamp: r.timestamp,
        level: r.level,
        message: r.message,
        user_id: r.user_id,
        route: r.route,
        status_code: r.status_code ? Number(r.status_code) : undefined,
      });
    }
  } catch (e) {
    console.error("Analytics: error reading CSV:", e.message);
  }

  // 2) JSON: воронка [{ step, users }, ...]
  try {
    const jsonFullPath = path.isAbsolute(JSON_PATH)
      ? JSON_PATH
      : path.join(__dirname, JSON_PATH);
    const jsonContent = fs.readFileSync(jsonFullPath, "utf-8");
    const jsonData = JSON.parse(jsonContent);

    for (const item of jsonData) {
      result.push({
        type: "funnel_step",
        step: item.step,
        users: typeof item.users === "number" ? item.users : Number(item.users),
      });
    }
  } catch (e) {
    console.error("Analytics: error reading JSON:", e.message);
  }

  // 3) LOG: ошибки по маршрутам
  try {
    const logFullPath = path.isAbsolute(LOG_PATH)
      ? LOG_PATH
      : path.join(__dirname, LOG_PATH);
    const logContent = fs.readFileSync(logFullPath, "utf-8");
    const lines = logContent.split("\n");
    const routeRegex = /^\d{4}-\d{2}-\d{2}.*ERROR \[route=(.*?)\]/;

    for (const line of lines) {
      const match = line.match(routeRegex);
      if (match) {
        result.push({
          type: "log_error",
          route: match[1],
          line,
        });
      }
    }
  } catch (e) {
    console.error("Analytics: error reading LOG:", e.message);
  }

  return result;
}

function aggregate(data, filters = {}, limit = 1000) {
  const funnelSteps = [];
  const errorsByRoute = {};
  const eventsByRoute = {};

  for (const row of data) {
    if (row.type === "funnel_step" && row.step) {
      funnelSteps.push({ step: row.step, users: row.users || 0 });
    }

    if (row.type === "log_error" && row.route) {
      errorsByRoute[row.route] = (errorsByRoute[row.route] || 0) + 1;
    }

    if (row.type === "event" && row.route) {
      eventsByRoute[row.route] = (eventsByRoute[row.route] || 0) + 1;
    }
  }

  // сортируем воронку в исходном порядке
  // (если в JSON уже упорядочена — можно оставить как есть)
  // здесь просто оставляем как прочли

  // считаем dropoff между шагами
  const funnelWithDropoff = [];
  let maxDropoff = null;

  for (let i = 0; i < funnelSteps.length; i++) {
    const step = funnelSteps[i];
    const prev = i === 0 ? null : funnelSteps[i - 1];
    const dropoff_from_prev =
      prev && typeof prev.users === "number"
        ? prev.users - step.users
        : null;

    const entry = {
      step: step.step,
      users: step.users,
      dropoff_from_prev,
    };
    funnelWithDropoff.push(entry);

    if (
      dropoff_from_prev !== null &&
      (maxDropoff === null || dropoff_from_prev > maxDropoff.dropoff_from_prev)
    ) {
      maxDropoff = entry;
    }
  }

  // топ ошибок по маршрутам
  const errorsSorted = Object.entries(errorsByRoute)
    .map(([route, count]) => ({ route, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const totalErrors = errorsSorted.reduce((sum, r) => sum + r.count, 0);
  const topErrorRoute = errorsSorted[0] || null;

  return {
    funnel: funnelWithDropoff,
    maxDropoffStep: maxDropoff,
    errorsByRoute: errorsSorted,
    topErrorRoute,
    totalErrors,
    eventsByRoute,
    meta: {
      totalFunnelSteps: funnelSteps.length,
      totalRoutesWithErrors: Object.keys(errorsByRoute).length,
      limitedBy: limit,
    },
  };
}
