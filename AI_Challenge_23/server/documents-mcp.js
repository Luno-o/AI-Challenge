#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock embedding function (returns random vector)
function generateMockEmbedding(text) {
  return Array.from({ length: 384 }, () => Math.random());
}

// Index documents
// Index documents
async function indexDocuments(directory, filePatterns, indexName, backend) {
  console.error(`📂 Indexing: ${directory}`);
  console.error(`🔍 File patterns:`, filePatterns);
  
  // Абсолютный путь
  const indexDir = path.join(__dirname, 'indexes');
  const indexPath = path.join(indexDir, `${indexName}.json`);
  
  console.error(`💾 Index will be saved to: ${indexPath}`);
  
  // Создаём папку если её нет
  await fs.mkdir(indexDir, { recursive: true });

  // Проверяем, что папка создалась
  try {
    await fs.access(indexDir);
    console.error(`✅ Directory exists: ${indexDir}`);
  } catch (err) {
    console.error(`❌ Directory not accessible: ${indexDir}`, err);
    throw new Error(`Cannot create indexes directory: ${err.message}`);
  }

  const files = await fs.readdir(directory);
  
  // ✅ ИСПРАВЛЕНИЕ: Используем filePatterns для фильтрации
  const matchesPattern = (filename, patterns) => {
    if (!patterns || patterns.length === 0) {
      return filename.endsWith('.md') || filename.endsWith('.txt');
    }
    
    return patterns.some(pattern => {
      // Простая поддержка wildcards: *.md → .md
      const ext = pattern.replace('*', '');
      return filename.endsWith(ext);
    });
  };

  const matchedFiles = files.filter(f => matchesPattern(f, filePatterns));
  
  console.error(`📄 Found ${matchedFiles.length} files to index (from ${files.length} total)`);
  console.error(`📄 Matched files:`, matchedFiles);

  const embeddings = [];
  let id = 0;

  for (const file of matchedFiles) {
    const filePath = path.join(directory, file);
    console.error(`📖 Reading file: ${filePath}`);
    
    const content = await fs.readFile(filePath, 'utf-8');
    const chunks = content.split('\n\n').filter(c => c.trim().length > 10);

    console.error(`✂️ Split into ${chunks.length} chunks`);

    for (let i = 0; i < chunks.length; i++) {
      embeddings.push({
        id: String(id++),
        file_path: file,
        chunk_index: i,
        text: chunks[i].trim(),
        embedding: generateMockEmbedding(chunks[i])
      });
    }
  }

  const indexData = {
    name: indexName,
    created_at: new Date().toISOString(),
    backend,
    embeddings
  };

  console.error(`💾 Writing index to: ${indexPath}`);
  console.error(`📊 Total embeddings: ${embeddings.length}`);
  
  await fs.writeFile(indexPath, JSON.stringify(indexData, null, 2), 'utf-8');
  
  // Проверяем, что файл создался
  try {
    const stats = await fs.stat(indexPath);
    console.error(`✅ Index file created: ${indexPath} (${stats.size} bytes)`);
  } catch (err) {
    console.error(`❌ Index file NOT created: ${indexPath}`, err);
    throw new Error(`Failed to create index file: ${err.message}`);
  }

  return {
    success: true,
    files_processed: matchedFiles.length,
    chunks_created: embeddings.length,
    index_path: indexPath
  };
}


// Search in index

// Search in index
async function searchInIndex(indexName, query, topK) {
  console.error(`🔍 Searching: ${indexName} for "${query}"`);
  
  const indexPath = path.join(__dirname, 'indexes', `${indexName}.json`);
  const indexData = JSON.parse(await fs.readFile(indexPath, 'utf-8'));

  console.error(`📊 Total embeddings in index: ${indexData.embeddings.length}`);

  // Нормализация запроса
  const queryLower = query.toLowerCase()
    .replace(/[^\w\sа-яё]/gi, ' ')
    .trim();
  
  const queryWords = queryLower
    .split(/\s+/)
    .filter(w => w.length > 2)
    .filter(w => !['это', 'для', 'как', 'что', 'где', 'или', 'the', 'and', 'каком'].includes(w));
  
  console.error(`🔍 Query words:`, queryWords);

  // ✅ РАСШИРЕННЫЕ ключевые термины (со словоформами)
  const keyTermsMap = {
    'порт': ['порт', 'порта', 'порту', 'портом', 'порте', 'порты', 'портов', 'port', 'ports'],
    'сервер': ['сервер', 'сервера', 'серверу', 'сервером', 'сервере', 'серверы', 'серверов', 'server', 'servers'],
    '4000': ['4000'],
    '3000': ['3000'],
    '5432': ['5432'],
    '6379': ['6379']
  };
  
  // Проверяем наличие ключевых терминов в запросе
  let hasKeyTerms = false;
  const matchedKeyTerms = new Set();
  
  queryWords.forEach(word => {
    for (const [key, variants] of Object.entries(keyTermsMap)) {
      if (variants.includes(word.toLowerCase())) {
        hasKeyTerms = true;
        matchedKeyTerms.add(key);
      }
    }
  });
  
  const scored = indexData.embeddings.map((item) => {
    const textLower = item.text.toLowerCase()
      .replace(/[^\w\sа-яё]/gi, ' ');
    const filePathLower = item.file_path.toLowerCase();
    
    let contentScore = 0;
    let fileNameScore = 0;
    let matchedWords = 0;
    let keyTermMatches = 0;
    
    queryWords.forEach(word => {
      const wordRegex = new RegExp(`\\b${word}`, 'gi');  // Префиксное совпадение
      const textMatches = (textLower.match(wordRegex) || []).length;
      
      if (textMatches > 0) {
        matchedWords++;
        
        // ✅ Проверяем, является ли слово формой ключевого термина
        let isKeyTerm = false;
        for (const [key, variants] of Object.entries(keyTermsMap)) {
          if (variants.some(v => word.startsWith(v.slice(0, 4)))) {  // Префикс из 4 букв
            isKeyTerm = true;
            keyTermMatches++;
            break;
          }
        }
        
        if (isKeyTerm) {
          contentScore += textMatches * 0.6; // БОЛЬШОЙ вес для ключевых терминов
        } else {
          contentScore += textMatches * 0.15;
        }
      }
      
      // Совпадение в имени файла
      if (filePathLower.includes(word) && word.length > 3) {
        fileNameScore += 0.1; // Минимальный вес
      }
    });
    
    let score = contentScore + fileNameScore;
    
    // Бонус за полное совпадение фразы
    if (textLower.includes(queryLower)) {
      score += 1.0;
    }
    
    // Бонус за процент совпавших слов
    const matchRatio = matchedWords / queryWords.length;
    score += matchRatio * 0.2;
    
    // ✅ ОГРОМНЫЙ БОНУС если найдены ключевые термины
    if (hasKeyTerms && keyTermMatches > 0) {
      score += keyTermMatches * 0.5;
    }
    
    return {
      ...item,
      score: Math.min(0.95, score),
      matchedWords,
      keyTermMatches
    };
  });

  // Сортировка
  const results = scored
    .filter(item => item.matchedWords > 0)
    .sort((a, b) => {
      // Приоритет ключевым терминам
      if (hasKeyTerms && b.keyTermMatches !== a.keyTermMatches) {
        return b.keyTermMatches - a.keyTermMatches;
      }
      return b.score - a.score;
    })
    .slice(0, topK)
    .map((item) => ({
      id: item.id,
      file_path: item.file_path,
      chunk_index: item.chunk_index,
      text: item.text,
      score: item.score
    }));

  console.error(`✅ Found ${results.length} relevant chunks`);
  
  results.slice(0, 3).forEach(r => {
    console.error(`  - [${r.score.toFixed(3)}] ${r.file_path}: ${r.text.substring(0, 60)}...`);
  });

  return {
    success: true,
    results
  };
}





// Get index info
async function getIndexInfo(indexName) {
  const indexPath = path.join(__dirname, 'indexes', `${indexName}.json`);
  const indexData = JSON.parse(await fs.readFile(indexPath, 'utf-8'));

  return {
    success: true,
    name: indexData.name,
    created_at: indexData.created_at,
    backend: indexData.backend,
    chunks_count: indexData.embeddings.length
  };
}

// Main server
async function main() {
  console.error('📄 Documents MCP Server starting...');

  const server = new Server(
    {
      name: 'documents-mcp-server',
      version: '1.0.0'
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'index_documents',
        description: 'Index documents from a directory',
        inputSchema: {
          type: 'object',
          properties: {
            directory: { type: 'string' },
            file_patterns: { type: 'array', items: { type: 'string' } },
            index_name: { type: 'string' },
            backend: { type: 'string', enum: ['json', 'faiss', 'sqlite'] }
          },
          required: ['directory', 'index_name']
        }
      },
      {
        name: 'search_in_index',
        description: 'Search in an index',
        inputSchema: {
          type: 'object',
          properties: {
            index_name: { type: 'string' },
            query: { type: 'string' },
            top_k: { type: 'number' }
          },
          required: ['index_name', 'query']
        }
      },
      {
        name: 'get_index_info',
        description: 'Get index info',
        inputSchema: {
          type: 'object',
          properties: {
            index_name: { type: 'string' }
          },
          required: ['index_name']
        }
      }
    ]
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      let result;

      switch (name) {
        case 'index_documents':
          result = await indexDocuments(
            args.directory,
            args.file_patterns || ['*.md', '*.txt'],
            args.index_name,
            args.backend || 'json'
          );
          break;
        case 'search_in_index':
          result = await searchInIndex(args.index_name, args.query, args.top_k || 5);
          break;
        case 'get_index_info':
          result = await getIndexInfo(args.index_name);
          break;
        default:
          throw new Error(`Unknown tool: ${name}`);
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(result) }]
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ success: false, error: error.message }) }],
        isError: true
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('✅ Documents MCP Server ready');
}

main().catch((error) => {
  console.error('❌ Server error:', error);
  process.exit(1);
});
