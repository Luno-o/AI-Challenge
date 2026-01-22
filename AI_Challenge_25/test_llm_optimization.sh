#!/bin/bash

API_URL="http://localhost:4000"

echo "=== 1. Получение доступных моделей и пресетов ==="
curl -s "$API_URL/api/llm/models" | jq '.'

echo -e "\n=== 2. Тест разных температур ==="
curl -s -X POST "$API_URL/api/llm/test-config" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Объясни что такое Docker за 50 слов",
    "configs": [
      {"name": "low_temp", "temperature": 0.3, "num_predict": 100},
      {"name": "medium_temp", "temperature": 0.7, "num_predict": 100},
      {"name": "high_temp", "temperature": 0.9, "num_predict": 100}
    ]
  }' | jq '.results[] | {config, duration, response: (.response[:100])}'

echo -e "\n=== 3. Использование шаблона для анализа задачи ==="
curl -s -X POST "$API_URL/api/llm/template" \
  -H "Content-Type: application/json" \
  -d '{
    "template_name": "task_analysis",
    "data": {
      "title": "Реализовать аутентификацию JWT",
      "description": "Добавить JWT токены для API",
      "priority": "high"
    },
    "preset": "task_analysis"
  }' | jq '.'

echo -e "\n=== 4. Оптимизированный запрос для кода ==="
curl -s -X POST "$API_URL/api/llm/optimized" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Напиши функцию для валидации email на JavaScript",
    "preset": "coding"
  }' | jq '.answer'