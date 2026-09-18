# ==========================================
# Phase 1: Builder
# ==========================================
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies (including devDependencies for ts compilation)
COPY package*.json ./
RUN npm ci

# Copy source code and Prisma schema
COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src

# Generate Prisma client and compile TypeScript
RUN npx prisma generate
RUN npm run build

# ==========================================
# Phase 2: Production Runner
# ==========================================
FROM node:22-alpine AS runner

WORKDIR /app

# Install native dependencies required by Prisma (openssl) and dumb-init for signals
RUN apk add --no-cache openssl dumb-init

# Copy package.json and install ONLY production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy generated Prisma Client
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma

# Copy compiled application code
COPY --from=builder /app/dist ./dist

# Create persistent data directory and set proper permissions
RUN mkdir -p /app/data && chown -R node:node /app

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=5000
ENV DATABASE_URL="file:/app/data/production.db"

EXPOSE 5000

# Run as unprivileged non-root user
USER node

# Start with dumb-init to pass POSIX signals safely
CMD ["dumb-init", "node", "dist/index.js"]
