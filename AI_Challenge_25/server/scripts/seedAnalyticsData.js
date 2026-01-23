// server/scripts/seedAnalyticsData.js
import fs from 'fs';
import path from 'path';

const rootDir = path.resolve(process.cwd(), 'server');
const dataDir = path.join(rootDir, 'data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// events.csv
const eventsCsv = `timestamp,level,message,user_id,route,status_code
2026-01-23T10:00:00Z,ERROR,"User auth failed",123,/api/login,401
2026-01-23T10:01:00Z,INFO,"User logged in",123,/api/login,200
2026-01-23T10:02:00Z,ERROR,"MCP timeout",456,/api/mcp,500
2026-01-23T10:03:00Z,ERROR,"RAG index not found",789,/api/rag/ask,500
2026-01-23T10:04:00Z,WARN,"Slow response",123,/api/team/ask,504
2026-01-23T10:05:00Z,ERROR,"User auth failed",321,/api/login,401
2026-01-23T10:06:00Z,ERROR,"User auth failed",654,/api/login,401
2026-01-23T10:07:00Z,ERROR,"MCP timeout",456,/api/mcp,500
2026-01-23T10:08:00Z,INFO,"Team question handled",999,/api/team/ask,200
2026-01-23T10:09:00Z,ERROR,"Ollama connection failed",111,/api/local-llm/ask,500
`;

fs.writeFileSync(path.join(dataDir, 'events.csv'), eventsCsv.trim() + '\n', 'utf8');

// errors.log
const errorsLog = `
2026-01-23T10:00:00Z ERROR [route=/api/login] User auth failed user=123 status=401
2026-01-23T10:02:00Z ERROR [route=/api/mcp] MCP timeout user=456 status=500
2026-01-23T10:03:00Z ERROR [route=/api/rag/ask] RAG index not found user=789 status=500
2026-01-23T10:05:00Z ERROR [route=/api/login] User auth failed user=321 status=401
2026-01-23T10:06:00Z ERROR [route=/api/login] User auth failed user=654 status=401
2026-01-23T10:09:00Z ERROR [route=/api/local-llm/ask] Ollama connection failed user=111 status=500
`.trim() + '\n';

fs.writeFileSync(path.join(dataDir, 'errors.log'), errorsLog, 'utf8');

// funnel.json
const funnel = [
  { step: 'landing', users: 200, dropoff: 0 },
  { step: 'login', users: 150, dropoff: 50 },
  { step: 'mcp', users: 100, dropoff: 50 },
  { step: 'rag', users: 70, dropoff: 30 },
  { step: 'team-assistant', users: 50, dropoff: 20 }
];

fs.writeFileSync(
  path.join(dataDir, 'funnel.json'),
  JSON.stringify(funnel, null, 2),
  'utf8'
);

console.log('Mock analytics data created in server/data');
