#!/bin/bash
# Тестирование RAG API

API="http://localhost:4000"

echo "======================================"
echo "🧪 TEST 1: Вопрос БЕЗ RAG"
echo "======================================"
curl -X POST "$API/api/rag/ask" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Как настроить Docker в проекте?",
    "mode": "no_rag"
  }' | jq '.'

echo -e "\n\n"

echo "======================================"
echo "🧪 TEST 2: Вопрос С RAG"
echo "======================================"
curl -X POST "$API/api/rag/ask" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Как настроить Docker в проекте?",
    "mode": "with_rag",
    "indexName": "docs_index",
    "topK": 5
  }' | jq '.'

echo -e "\n\n"

echo "======================================"
echo "🧪 TEST 3: СРАВНЕНИЕ (RAG vs NO RAG)"
echo "======================================"
curl -X POST "$API/api/rag/ask" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Какие MCP серверы используются в проекте?",
    "mode": "compare",
    "indexName": "docs_index",
    "topK": 5
  }' | jq '.formatted' -r

echo -e "\n\n"

echo "======================================"
echo "🧪 TEST 4: Общий вопрос (где RAG не нужен)"
echo "======================================"
curl -X POST "$API/api/rag/ask" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Что такое искусственный интеллект?",
    "mode": "compare",
    "indexName": "docs_index",
    "topK": 3
  }' | jq '.formatted' -r
