# server/Dockerfile
FROM node:20-alpine

# Установка git и bash для Git MCP
RUN apk add --no-cache git bash
# 1. Установить python3, make, g++
RUN apk add --no-cache python3 make g++ git bash

WORKDIR /app

# Копируем package files
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci --only=production

# Копируем исходники
COPY . .

# Создаем папки для данных
RUN mkdir -p documents indexes logs

EXPOSE 4000

CMD ["node", "index.js"]
