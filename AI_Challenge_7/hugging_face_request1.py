
import time
import requests

API_URL = "https://router.huggingface.co/v1/chat/completions"
headers = {
    "Authorization": "Bearer "
}

def query(payload):
    start_time = time.time()
    response = requests.post(API_URL, headers=headers, json=payload)
    end_time = time.time()
    return response.json(), end_time - start_time

response, latency = query({
    "messages": [
        {
            "role": "user",
            "content": "What is the capital of France?"
        }
    ],
    "model": "deepseek-ai/DeepSeek-V3.2:novita"
})

# Выводим ответ и время
if "choices" in response:
    print("Response:", response["choices"][0]["message"]["content"])

if "usage" in response:
    print("Usage:", response["usage"])

print("Latency (seconds):", latency)
