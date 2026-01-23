import { useState } from "react";

export default function AnalyticsPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]); // { role: 'user'|'assistant', content: string }
  const [lastStats, setLastStats] = useState(null);
  const [loading, setLoading] = useState(false);

const send = async () => {
  const text = input.trim();
  if (!text) return;
  setInput("");

  // локально сразу добавляем вопрос
  setMessages((prev) => [...prev, { role: "user", content: text }]);
  setLoading(true);
  try {
    const res = await fetch("/api/analytics/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });
    const data = await res.json();

    if (data.error) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Ошибка аналитики: " + data.error },
      ]);
    } else {
      // если сервер вернул history — доверяем ему (там связка вопросов/ответов)
      if (Array.isArray(data.history)) {
        setMessages(data.history);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.answer || "(пустой ответ)" },
        ]);
      }
      setLastStats(data.stats || null);
    }
  } catch (e) {
    console.error(e);
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "Сетевая ошибка при запросе аналитики" },
    ]);
  } finally {
    setLoading(false);
  }
};

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div style={{ padding: "20px", display: "flex", gap: "20px" }}>
      {/* Левая колонка — чат */}
      <div style={{ flex: 2, display: "flex", flexDirection: "column", height: "80vh" }}>
        <h2>Analytics Chat (локальная LLM)</h2>
        <div
          style={{
            flex: 1,
            border: "1px solid #ddd",
            borderRadius: 8,
            padding: 12,
            overflowY: "auto",
            marginBottom: 10,
            background: "#fafafa",
          }}
        >
          {messages.map((m, i) => (
            <div
              key={i}
              style={{
                marginBottom: 8,
                textAlign: m.role === "user" ? "right" : "left",
              }}
            >
              <div
                style={{
                  display: "inline-block",
                  padding: "6px 10px",
                  borderRadius: 8,
                  background: m.role === "user" ? "#667eea" : "#e2e8f0",
                  color: m.role === "user" ? "#fff" : "#1a202c",
                  maxWidth: "70%",
                  whiteSpace: "pre-wrap",
                }}
              >
                {m.content}
              </div>
            </div>
          ))}
          {messages.length === 0 && (
            <div style={{ color: "#777" }}>
              Напиши: «Какая ошибка происходит чаще всего?» или «На каком шаге воронки больше всего потеря пользователей?».
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Задай вопрос по логам и воронке..."
            style={{ flex: 1, minHeight: 50, resize: "none", padding: 8 }}
          />
          <button
            onClick={send}
            disabled={loading}
            style={{ padding: "0 16px" }}
          >
            {loading ? "Думаю..." : "Отправить"}
          </button>
        </div>
      </div>

      {/* Правая колонка — статистика */}
      <div style={{ flex: 1 }}>
        <h3>Последняя статистика</h3>
        {!lastStats && <p>Статистика появится после первого запроса.</p>}

        {lastStats?.topErrors && (
          <>
            <h4>Топ ошибок</h4>
            <table border="1" cellPadding="4">
              <thead>
                <tr>
                  <th>Тип</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                {lastStats.topErrors.map((e) => (
                  <tr key={e.type}>
                    <td>{e.type}</td>
                    <td>{e.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {lastStats?.funnel && (
          <>
            <h4>Воронка</h4>
            <table border="1" cellPadding="4">
              <thead>
                <tr>
                  <th>Шаг</th>
                  <th>Users</th>
                  <th>Dropoff</th>
                </tr>
              </thead>
              <tbody>
                {lastStats.funnel.map((s) => (
                  <tr key={s.step}>
                    <td>{s.step}</td>
                    <td>{s.users}</td>
                    <td>{s.dropoff}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
