# Multi-stage build для оптимизации размера
FROM node:18-alpine AS builder

WORKDIR /app

# Копируем package files
COPY package*.json ./

# Устанавливаем только production зависимости
RUN npm ci --only=production

# Копируем исходники
COPY . .

# ==================== Production Stage ====================
FROM node:18-alpine

WORKDIR /app

# Копируем node_modules и код из builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app .

# Создаём непривилегированного пользователя
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Настраиваем права
RUN chown -R nodejs:nodejs /app
USER nodejs

# Открываем порт
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Запускаем приложение
CMD ["node", "index.js"]
