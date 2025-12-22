import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import * as crypto from "crypto";

// Setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure indexes directory exists
const INDEXES_DIR = path.join(__dirname, "indexes");
if (!fs.existsSync(INDEXES_DIR)) {
  fs.mkdirSync(INDEXES_DIR, { recursive: true });
}

// Helper: Vector similarity (cosine)
function cosineSimilarity(vec1, vec2) {
  if (!vec1 || !vec2 || vec1.length === 0 || vec2.length === 0) return 0;
  const dotProduct = vec1.reduce((sum, a, i) => sum + a * vec2[i], 0);
  const norm1 = Math.sqrt(vec1.reduce((sum, a) => sum + a * a, 0));
  const norm2 = Math.sqrt(vec2.reduce((sum, a) => sum + a * a, 0));
  return norm1 && norm2 ? dotProduct / (norm1 * norm2) : 0;
}

// Helper: Get embeddings from API
async function getEmbedding(text) {
  const apiUrl = process.env.EMBEDDING_API_URL || "https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2";
  const apiKey = process.env.EMBEDDING_API_KEY || "";
  const model = process.env.EMBEDDING_MODEL || "sentence-transformers/all-MiniLM-L6-v2";

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: text,
        parameters: { pooling: "mean" },
      }),
    });

    if (!response.ok) {
      throw new Error(`Embedding API error: ${response.statusText}`);
    }

    const result = await response.json();
    
    // Handle both single embedding and array responses
    if (Array.isArray(result) && Array.isArray(result[0])) {
      return result[0];
    }
    
    return result;
  } catch (error) {
    console.error("Embedding error:", error);
    throw error;
  }
}

// Helper: Recursive file discovery
function findFiles(dir, patterns, maxFiles = 1000) {
  const results = [];
  
  function traverse(currentPath) {
    if (results.length >= maxFiles) return;
    
    try {
      const entries = fs.readdirSync(currentPath);
      
      for (const entry of entries) {
        if (results.length >= maxFiles) break;
        
        const fullPath = path.join(currentPath, entry);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          traverse(fullPath);
        } else {
          const fileName = path.basename(fullPath);
          const matches = patterns.some(pattern => {
            const regex = new RegExp(`^${pattern.replace(/\*/g, ".*")}$`);
            return regex.test(fileName);
          });
          
          if (matches) {
            results.push({
              path: fullPath,
              size: stat.size,
              type: path.extname(fullPath).toLowerCase(),
            });
          }
        }
      }
    } catch (error) {
      console.error(`Error traversing ${currentPath}:`, error);
    }
  }
  
  traverse(dir);
  return results;
}

// Helper: Read and normalize text
function readTextFile(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  return content
    .replace(/\r\n/g, "\n")
    .replace(/\0/g, "")
    .trim();
}

// Helper: Chunk text with overlap
function chunkText(text, chunkSize = 1000, overlap = 200) {
  const chunks = [];
  let start = 0;
  let index = 0;
  
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const chunk = text.substring(start, end);
    chunks.push({
      index,
      text: chunk.trim(),
    });
    
    start = end - overlap;
    if (start < 0) start = 0;
    index++;
  }
  
  return chunks;
}

// Initialize MCP Server
const server = new Server({
  name: "documents-mcp-server",
  version: "1.0.0",
});

// Tool: ingest_documents
server.setRequestHandler("tools/call", async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "ingest_documents") {
    try {
      const directory = args.directory || "./documents";
      const filePatterns = args.file_patterns || ["*.md", "*.txt"];
      const maxFiles = args.max_files || 1000;

      if (!fs.existsSync(directory)) {
        return {
          content: [
            {
              type: "text",
              text: `Error: Directory ${directory} does not exist`,
            },
          ],
          isError: true,
        };
      }

      const files = findFiles(directory, filePatterns, maxFiles);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              count: files.length,
              files: files,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true,
      };
    }
  }

  // Tool: chunk_document
  else if (name === "chunk_document") {
    try {
      const filePath = args.file_path;
      const chunkSize = args.chunk_size || 1000;
      const chunkOverlap = args.chunk_overlap || 200;

      if (!fs.existsSync(filePath)) {
        return {
          content: [
            {
              type: "text",
              text: `Error: File ${filePath} does not exist`,
            },
          ],
          isError: true,
        };
      }

      const text = readTextFile(filePath);
      const chunks = chunkText(text, chunkSize, chunkOverlap);

      const result = chunks.map((chunk, idx) => ({
        id: crypto.randomUUID(),
        file_path: filePath,
        chunk_index: idx,
        text: chunk.text,
      }));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              file_path: filePath,
              chunk_count: result.length,
              chunks: result,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true,
      };
    }
  }

  // Tool: generate_embeddings
  else if (name === "generate_embeddings") {
    try {
      const chunks = args.chunks || [];
      const results = [];

      for (const chunk of chunks) {
        try {
          const vector = await getEmbedding(chunk.text);
          results.push({
            id: chunk.id,
            text: chunk.text,
            file_path: chunk.file_path,
            chunk_index: chunk.chunk_index,
            vector: vector,
          });
        } catch (error) {
          console.error(`Failed to embed chunk ${chunk.id}:`, error);
        }
      }

      if (results.length === 0) {
        throw new Error("Failed to generate any embeddings");
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              count: results.length,
              embeddings: results,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true,
      };
    }
  }

  // Tool: save_index
  else if (name === "save_index") {
    try {
      const indexName = args.index_name;
      const embeddings = args.embeddings || [];
      const backend = args.backend || "json";

      if (!indexName) {
        throw new Error("index_name is required");
      }

      if (backend === "json") {
        const indexPath = path.join(INDEXES_DIR, `${indexName}.json`);
        const indexData = {
          name: indexName,
          backend: "json",
          created_at: new Date().toISOString(),
          count: embeddings.length,
          embeddings: embeddings,
        };
        fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                index_name: indexName,
                backend: "json",
                count: embeddings.length,
                path: indexPath,
              }, null, 2),
            },
          ],
        };
      } else if (backend === "sqlite") {
        // Simple SQLite implementation (using JSON for now, sqlite3 would need installation)
        const indexPath = path.join(INDEXES_DIR, `${indexName}.json`);
        const indexData = {
          name: indexName,
          backend: "sqlite",
          created_at: new Date().toISOString(),
          count: embeddings.length,
          embeddings: embeddings,
        };
        fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                index_name: indexName,
                backend: "sqlite",
                count: embeddings.length,
                path: indexPath,
              }, null, 2),
            },
          ],
        };
      } else if (backend === "faiss") {
        // FAISS would require additional setup; using JSON for now
        const indexPath = path.join(INDEXES_DIR, `${indexName}.json`);
        const indexData = {
          name: indexName,
          backend: "faiss",
          created_at: new Date().toISOString(),
          count: embeddings.length,
          embeddings: embeddings,
        };
        fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                index_name: indexName,
                backend: "faiss",
                count: embeddings.length,
                path: indexPath,
              }, null, 2),
            },
          ],
        };
      }

      throw new Error(`Unknown backend: ${backend}`);
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true,
      };
    }
  }

  // Tool: search_in_index
  else if (name === "search_in_index") {
    try {
      const indexName = args.index_name;
      const query = args.query;
      const topK = args.top_k || 5;

      if (!indexName || !query) {
        throw new Error("index_name and query are required");
      }

      const indexPath = path.join(INDEXES_DIR, `${indexName}.json`);
      if (!fs.existsSync(indexPath)) {
        return {
          content: [
            {
              type: "text",
              text: `Error: Index ${indexName} not found`,
            },
          ],
          isError: true,
        };
      }

      const indexData = JSON.parse(fs.readFileSync(indexPath, "utf-8"));
      const queryVector = await getEmbedding(query);

      const scored = indexData.embeddings.map((item) => ({
        ...item,
        score: cosineSimilarity(queryVector, item.vector),
      }));

      const results = scored
        .sort((a, b) => b.score - a.score)
        .slice(0, topK)
        .map((item) => ({
          id: item.id,
          file_path: item.file_path,
          chunk_index: item.chunk_index,
          text: item.text,
          score: item.score,
        }));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              query: query,
              count: results.length,
              results: results,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true,
      };
    }
  }

  return {
    content: [{ type: "text", text: `Unknown tool: ${name}` }],
    isError: true,
  };
});

// List available tools
server.setRequestHandler("tools/list", async () => {
  return {
    tools: [
      {
        name: "ingest_documents",
        description: "Recursively ingest documents from a directory",
        inputSchema: {
          type: "object",
          properties: {
            directory: {
              type: "string",
              description: "Path to document directory",
            },
            file_patterns: {
              type: "array",
              items: { type: "string" },
              description: "File patterns to match (e.g., ['*.md', '*.txt'])",
            },
            max_files: {
              type: "number",
              description: "Maximum number of files to ingest",
            },
          },
        },
      },
      {
        name: "chunk_document",
        description: "Split a document into chunks with overlap",
        inputSchema: {
          type: "object",
          properties: {
            file_path: {
              type: "string",
              description: "Path to the file to chunk",
            },
            chunk_size: {
              type: "number",
              description: "Size of each chunk in characters",
            },
            chunk_overlap: {
              type: "number",
              description: "Overlap between chunks",
            },
          },
          required: ["file_path"],
        },
      },
      {
        name: "generate_embeddings",
        description: "Generate embeddings for text chunks",
        inputSchema: {
          type: "object",
          properties: {
            chunks: {
              type: "array",
              description: "Array of chunks with id and text",
            },
          },
          required: ["chunks"],
        },
      },
      {
        name: "save_index",
        description: "Save embeddings to an index",
        inputSchema: {
          type: "object",
          properties: {
            index_name: {
              type: "string",
              description: "Name of the index",
            },
            embeddings: {
              type: "array",
              description: "Array of embeddings to save",
            },
            backend: {
              type: "string",
              enum: ["json", "sqlite", "faiss"],
              description: "Storage backend",
            },
          },
          required: ["index_name", "embeddings", "backend"],
        },
      },
      {
        name: "search_in_index",
        description: "Search in a vector index",
        inputSchema: {
          type: "object",
          properties: {
            index_name: {
              type: "string",
              description: "Name of the index to search",
            },
            query: {
              type: "string",
              description: "Search query",
            },
            top_k: {
              type: "number",
              description: "Number of top results to return",
            },
          },
          required: ["index_name", "query"],
        },
      },
    ],
  };
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Documents MCP Server started");
}

main().catch(console.error);
