# ==========================================
# Backend Dockerfile
# ==========================================
FROM node:20-alpine

WORKDIR /app

# Установить git, curl, bash
RUN apk add --no-cache \
    git \
    curl \
    bash

# Копировать package.json
COPY package*.json ./

# Установить зависимости
RUN npm ci

# Копировать server код
COPY server/ ./server/

# Копировать documents
COPY documents/ ./documents/

# Создать директории
RUN mkdir -p \
    /app/server/userProfiles \
    /app/server/indexes \
    /app/server/data \
    /app/server/temp \
    /app/server/logs \
    /repo

# Настроить git
RUN git config --global user.name "Docker Bot" && \
    git config --global user.email "bot@docker.local" && \
    git config --global init.defaultBranch main && \
    git config --global --add safe.directory '*'

# Expose порт
EXPOSE 5000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

# Запустить сервер
WORKDIR /app/server
CMD ["node", "index.js"]
