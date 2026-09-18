# Multi-stage Dockerfile for Vite Frontend

FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig*.json vite.config.ts tailwind.config.js postcss.config.js index.html ./
COPY src ./src
COPY public ./public

RUN npm run build

FROM nginx:alpine AS runner

# Copy shared security configuration
COPY ../nginx-security.conf /etc/nginx/nginx-security.conf

# Copy compiled SPA assets
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
EXPOSE 443

CMD ["nginx", "-g", "daemon off;"]
