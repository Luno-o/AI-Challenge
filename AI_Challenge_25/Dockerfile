# Dockerfile

# ========================================
# STAGE 1: BACKEND BUILD
# ========================================

FROM node:20-alpine AS backend-builder

WORKDIR /app/server

# Скопировать package files
COPY server/package*.json ./

# Установить зависимости
RUN npm ci --only=production

# ========================================
# STAGE 2: BACKEND RUNTIME
# ========================================

FROM node:20-alpine AS backend

WORKDIR /app/server

# Скопировать зависимости из builder
COPY --from=backend-builder /app/server/node_modules ./node_modules

# Скопировать backend код
COPY server .

# Создать директорию для профилей
RUN mkdir -p /app/server/userProfiles

# Expose порт
EXPOSE 5000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start command
CMD ["node", "index.js"]

# ========================================
# STAGE 3: FRONTEND BUILD
# ========================================

FROM node:20-alpine AS frontend-builder

WORKDIR /app/client

# Скопировать package files
COPY client/package*.json ./

# Установить зависимости
RUN npm ci

# Скопировать frontend код
COPY client .

# Build
RUN npm run build

# ========================================
# STAGE 4: FRONTEND RUNTIME
# ========================================

FROM node:20-alpine AS frontend

WORKDIR /app/client

# Установить serve для статик файлов
RUN npm install -g serve

# Скопировать package files
COPY client/package*.json ./

# Скопировать node_modules и build из builder
COPY --from=frontend-builder /app/client/node_modules ./node_modules
COPY --from=frontend-builder /app/client/dist ./dist
COPY --from=frontend-builder /app/client/src ./src

# Expose порт
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start command для development
CMD ["npm", "run", "dev"]
