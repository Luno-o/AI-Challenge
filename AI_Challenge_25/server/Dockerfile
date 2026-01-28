FROM node:18-alpine

WORKDIR /app

# Установка Git (для Git MCP)
RUN apk add --no-cache git

# Копируем package.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci --legacy-peer-deps

# Копируем server код
COPY server/ ./server/

# Копируем documents для RAG
COPY documents/ ./documents/

# Создаём директории для данных
RUN mkdir -p /app/server/indexes /app/server/logs /repo

# Expose порт 5000
EXPOSE 5000

# Устанавливаем рабочую директорию
WORKDIR /app/server

# Запускаем сервер
CMD ["npm", "start"]
