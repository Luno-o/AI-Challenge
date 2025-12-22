#!/bin/bash

# Documents Pipeline - API Examples
# Run these commands to test the document indexing and search pipeline

echo "🚀 Documents Pipeline API Examples"
echo "==================================="
echo ""

# 1. HEALTH CHECK
echo "📊 1. Health Check"
echo "Command:"
echo "curl http://localhost:4000/api/health"
echo ""
echo "Response:"
curl -X GET http://localhost:4000/api/health | jq .
echo ""
echo ""

# 2. LIST TOOLS
echo "🔧 2. List Available Tools"
echo "Command:"
echo "curl http://localhost:4000/api/tools/list"
echo ""
echo "Response:"
curl -X GET http://localhost:4000/api/tools/list | jq .
echo ""
echo ""

# 3. INDEX DOCUMENTS
echo "📂 3. Index Documents (Creates vector index)"
echo "Command:"
echo "curl -X POST http://localhost:4000/api/documents/index \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{'"
echo "    \"directory\": \"./documents\","
echo "    \"file_patterns\": [\"*.md\", \"*.txt\"],"
echo "    \"index_name\": \"my_docs\","
echo "    \"backend\": \"json\","
echo "    \"chunk_size\": 1000,"
echo "    \"chunk_overlap\": 200"
echo "  }'"
echo ""
echo "Response:"
curl -X POST http://localhost:4000/api/documents/index \
  -H 'Content-Type: application/json' \
  -d '{
    "directory": "./documents",
    "file_patterns": ["*.md", "*.txt"],
    "index_name": "my_docs",
    "backend": "json",
    "chunk_size": 1000,
    "chunk_overlap": 200
  }' | jq .
echo ""
echo ""

# 4. SEARCH IN INDEX
echo "🔍 4. Search in Index"
echo "Command:"
echo "curl -X POST http://localhost:4000/api/documents/search \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{'"
echo "    \"query\": \"how to install dependencies\","
echo "    \"index_name\": \"my_docs\","
echo "    \"top_k\": 5"
echo "  }'"
echo ""
echo "Response:"
curl -X POST http://localhost:4000/api/documents/search \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "how to install dependencies",
    "index_name": "my_docs",
    "top_k": 5
  }' | jq .
echo ""
echo ""

# 5. LIST INDEXES
echo "📑 5. List Available Indexes"
echo "Command:"
echo "curl http://localhost:4000/api/documents/indexes"
echo ""
echo "Response:"
curl -X GET http://localhost:4000/api/documents/indexes | jq .
echo ""
echo ""

# 6. CHAT WITH CONTEXT
echo "💬 6. Chat with Document Context"
echo "Command:"
echo "curl -X POST http://localhost:4000/api/chat \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{'"
echo "    \"message\": \"How do I get started?\","
echo "    \"index_name\": \"my_docs\","
echo "    \"top_k\": 3"
echo "  }'"
echo ""
echo "Response:"
curl -X POST http://localhost:4000/api/chat \
  -H 'Content-Type: application/json' \
  -d '{
    "message": "How do I get started?",
    "index_name": "my_docs",
    "top_k": 3
  }' | jq .
echo ""
echo ""

# 7. CALL TOOL DIRECTLY
echo "🛠️  7. Call MCP Tool Directly"
echo "Command:"
echo "curl -X POST http://localhost:4000/api/tools/call \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{'"
echo "    \"tool_name\": \"ingest_documents\","
echo "    \"arguments\": {\"directory\": \"./documents\"}"
echo "  }'"
echo ""
echo "Response:"
curl -X POST http://localhost:4000/api/tools/call \
  -H 'Content-Type: application/json' \
  -d '{
    "tool_name": "ingest_documents",
    "arguments": {"directory": "./documents"}
  }' | jq .
echo ""
echo ""

# 8. DELETE INDEX
echo "🗑️  8. Delete Index"
echo "Command:"
echo "curl -X DELETE http://localhost:4000/api/documents/indexes/my_docs"
echo ""
echo "Response:"
curl -X DELETE http://localhost:4000/api/documents/indexes/my_docs | jq .
echo ""
echo ""

echo "✅ Examples completed!"
