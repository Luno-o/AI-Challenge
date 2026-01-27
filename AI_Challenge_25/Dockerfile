# Dockerfile

# ========================================
# STAGE 1: BACKEND BUILD
# ========================================

FROM node:20-alpine AS backend-builder

WORKDIR /app/server

# Установить wget для healthcheck
RUN apk add --no-cache wget

# Скопировать package files
COPY server/package*.json ./

# Установить зависимости
RUN npm ci --only=production

# ========================================
# STAGE 2: BACKEND RUNTIME
# ========================================

FROM node:20-alpine AS backend

# Установить wget для healthcheck
RUN apk add --no-cache wget

WORKDIR /app/server

# Скопировать зависимости из builder
COPY --from=backend-builder /app/server/node_modules ./node_modules

# Скопировать backend код
COPY server ./

# Создать необходимые директории
RUN mkdir -p \
    /app/server/userProfiles \
    /app/server/documents \
    /app/server/indexes \
    /app/server/data \
    /app/server/temp

# Expose порт
EXPOSE 5000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

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
COPY client ./

# Build (для production)
RUN npm run build

# ========================================
# STAGE 4: FRONTEND RUNTIME (Development)
# ========================================

FROM node:20-alpine AS frontend

# Установить wget для healthcheck
RUN apk add --no-cache wget

WORKDIR /app/client

# Скопировать package files
COPY client/package*.json ./

# Установить зависимости (включая dev для Vite)
RUN npm ci

# Скопировать src код (для development hot-reload)
COPY client ./

# Expose порт Vite
EXPOSE 5173

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5173 || exit 1

# Start Vite dev server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
