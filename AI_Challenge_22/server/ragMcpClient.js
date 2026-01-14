// ragMcpClient.js
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let documentMcpClient = null;

/**
 * Запускает Documents MCP сервер и подключается к нему
 */
export async function getDocumentMcpClient() {
  if (documentMcpClient) {
    return documentMcpClient;
  }

  console.log('🔌 Starting Documents MCP server...');

  const serverPath = path.join(__dirname, 'documents-mcp.js');
  
  console.log(`📂 Server path: ${serverPath}`);

  // ✅ ИСПРАВЛЕНИЕ: НЕ запускаем процесс вручную, передаём команду в транспорт
  const transport = new StdioClientTransport({
    command: 'node',
    args: [serverPath],
    env: process.env
  });

  documentMcpClient = new Client(
    {
      name: 'rag-client',
      version: '1.0.0'
    },
    {
      capabilities: {}
    }
  );

  try {
    await documentMcpClient.connect(transport);
    console.log('✅ RAG MCP Client connected to Documents MCP');
    return documentMcpClient;
  } catch (error) {
    console.error('❌ Failed to connect to Documents MCP:', error);
    documentMcpClient = null;
    throw error;
  }
}

/**
 * Вызов tool через MCP
 */
export async function callDocumentTool(toolName, args) {
  try {
    const client = await getDocumentMcpClient();
    
    console.log(`🔧 Calling tool: ${toolName}`);
    console.log(`📋 Arguments:`, JSON.stringify(args, null, 2));
    
    const response = await client.callTool({
      name: toolName,
      arguments: args
    });

    console.log(`📦 Raw response:`, JSON.stringify(response, null, 2));

    // Парсинг ответа
    if (response.content && response.content[0]) {
      const content = response.content[0];
      
      if (content.type === 'text') {
        try {
          const parsed = JSON.parse(content.text);
          console.log(`✅ Tool ${toolName} success:`, parsed);
          return parsed;
        } catch (e) {
          console.error('❌ Failed to parse JSON:', content.text);
          return { success: false, error: content.text };
        }
      }
      
      return content;
    }

    return response;
  } catch (error) {
    console.error(`❌ Error calling tool ${toolName}:`, error.message);
    throw new Error(`MCP tool call failed: ${error.message}`);
  }
}

/**
 * Поиск в индексе
 */
export async function searchInIndex(indexName, query, topK = 5) {
  console.log(`🔍 Searching in index: ${indexName}, query: "${query}", topK: ${topK}`);
  
  const result = await callDocumentTool('search_in_index', {
    index_name: indexName,
    query: query,
    top_k: topK
  });

  if (result.success && result.results) {
    console.log(`✅ Found ${result.results.length} results`);
    return result.results;
  }

  if (result.error) {
    console.error(`❌ Search error: ${result.error}`);
    throw new Error(result.error);
  }

  console.warn('⚠️ No results found');
  return [];
}

/**
 * Получить информацию об индексе
 */
export async function getIndexInfo(indexName) {
  return await callDocumentTool('get_index_info', {
    index_name: indexName
  });
}

/**
 * Закрыть клиент
 */
export async function closeDocumentMcpClient() {
  if (documentMcpClient) {
    console.log('🔌 Closing Documents MCP client...');
    try {
      await documentMcpClient.close();
    } catch (e) {
      console.error('Error closing client:', e);
    }
    documentMcpClient = null;
  }
}

process.on('exit', closeDocumentMcpClient);
process.on('SIGINT', closeDocumentMcpClient);
process.on('SIGTERM', closeDocumentMcpClient);
