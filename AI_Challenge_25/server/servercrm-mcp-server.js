\#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import fs from 'fs';
import path from 'path';

const server = new Server({
name: 'crm-mcp-server',
version: '1.0.0',
});

// Вспомогательная функция для загрузки tickets.json
const loadTickets = () => {
const ticketsPath = new URL('./data/tickets.json', import.meta.url).pathname;
if (!fs.existsSync(ticketsPath)) {
fs.writeFileSync(ticketsPath, JSON.stringify([], null, 2));
}
return JSON.parse(fs.readFileSync(ticketsPath, 'utf-8'));
};

const saveTickets = (tickets) => {
const ticketsPath = new URL('./data/tickets.json', import.meta.url).pathname;
fs.writeFileSync(ticketsPath, JSON.stringify(tickets, null, 2));
};

// Tool: getTicketByUserId
server.setRequestHandler('tools/call', async (request) => {
const { name, arguments: args } = request.params;

if (name === 'getTicketByUserId') {
const tickets = loadTickets();
const userTickets = tickets.filter((t) => t.user_id === args.user_id);
return {
content: [
{
type: 'text',
text: JSON.stringify(userTickets, null, 2),
},
],
};
}

if (name === 'getUserHistory') {
const tickets = loadTickets();
const history = tickets.filter((t) => t.user_id === args.user_id).slice(-5); // последние 5
return {
content: [
{
type: 'text',
text: JSON.stringify(history, null, 2),
},
],
};
}

if (name === 'createTicket') {
const tickets = loadTickets();
const newTicket = {
id: 'ticket_' + Date.now(),
user_id: args.user_id,
issue: args.issue,
description: args.description,
status: 'open',
created_at: new Date().toISOString(),
};
tickets.push(newTicket);
saveTickets(tickets);
return {
content: [
{
type: 'text',
text: JSON.stringify(newTicket, null, 2),
},
],
};
}

throw new Error(\`Unknown tool: \${name}\`);
});

server.setRequestHandler('tools/list', async () => {
return {
tools: [
{
name: 'getTicketByUserId',
description: 'Получить все тикеты пользователя',
inputSchema: {
type: 'object',
properties: {
user_id: { type: 'string' },
},
required: ['user_id'],
},
},
{
name: 'getUserHistory',
description: 'Получить историю взаимодействий пользователя',
inputSchema: {
type: 'object',
properties: {
user_id: { type: 'string' },
},
required: ['user_id'],
},
},
{
name: 'createTicket',
description: 'Создать новый тикет',
inputSchema: {
type: 'object',
properties: {
user_id: { type: 'string' },
issue: { type: 'string' },
description: { type: 'string' },
},
required: ['user_id', 'issue', 'description'],
},
},
],
};
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error('[CRM MCP Server] Запущен на stdio');