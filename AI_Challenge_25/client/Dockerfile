# ==========================================
# Stage 1: Build
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Установить wget
RUN apk add --no-cache wget

# Копировать package files
COPY package*.json ./

# Установить зависимости
RUN npm ci

# Копировать исходники
COPY . .

# Собрать production build
RUN npm run build

# ==========================================
# Stage 2: Production с Nginx
# ==========================================
FROM nginx:alpine

# Удалить стандартный конфиг
RUN rm -f /etc/nginx/conf.d/default.conf

# Скопировать наш конфиг
COPY nginx.conf /etc/nginx/conf.d/

# Скопировать build из stage 1
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose порт 80
EXPOSE 80

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Запустить nginx
CMD ["nginx", "-g", "daemon off;"]
