import os
import time
from openai import OpenAI

client = OpenAI(
    base_url="https://router.huggingface.co/v1",
    api_key="",
)

start_time = time.time()
completion = client.chat.completions.create(
    model="meta-llama/Llama-3.1-8B-Instruct:novita",
    messages=[
        {
            "role": "user",
            "content": "What is the capital of France?"
        }
    ],
)
end_time = time.time()

# Выводим ответ
print("Response:", completion.choices[0].message)

# Выводим статистику токенов
if hasattr(completion, "usage"):
    print("Prompt tokens:", completion.usage.prompt_tokens)
    print("Completion tokens:", completion.usage.completion_tokens)
    print("Total tokens:", completion.usage.total_tokens)
else:
    print("Usage info not available")

# Выводим время ответа
print("Latency (seconds):", end_time - start_time)
