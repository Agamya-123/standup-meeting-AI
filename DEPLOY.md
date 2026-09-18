# 🚀 Production Deployment Guide

This guide documents the production deployment architecture, security hardening, database migration workflow, and container deployment procedures for the **Intelligent Daily Standup** platform.

---

## 🏗 Architecture Overview

```
Internet (HTTPS)
   │
   ▼
[ Nginx Reverse Proxy / TLS Termination (Port 443/80) ]
   ├── Static SPA Frontend (/client/dist) with Production CSP & Security Headers
   └── Proxy Pass (/api/*) ──► [ Express Backend API (Node.js 22, Port 5000) ]
                                    │
                                    ▼
                             [ SQLite Database (WAL Mode) ]
                             (/app/data/production.db volume)
```

---

## 🗄 1. Database & Migration Workflow

### Production Migration Command
In production, database schema changes **MUST ALWAYS** be applied using `prisma migrate deploy`:
```bash
npx prisma migrate deploy
```
*(or via package script `npm run prisma:migrate:deploy` in `/server`)*

> ⚠️ **CRITICAL:** Never use `prisma db push` in production. `db push` is for rapid local prototyping only and does not track migration history in the `_prisma_migrations` table.

### SQLite Production PRAGMAs
The backend automatically configures the following PRAGMAs on database connection:
* `PRAGMA journal_mode = WAL;` (Enables Write-Ahead Logging for concurrent non-blocking reads and writes).
* `PRAGMA busy_timeout = 5000;` (Waits up to 5 seconds when locks occur instead of failing immediately).
* `PRAGMA synchronous = NORMAL;` (ACID-safe and high-performance in WAL mode).
* `PRAGMA foreign_keys = ON;` (Enforces relational integrity).

---

## 🐳 2. Containerized Deployment (Docker & Compose)

### Building and Starting with Docker Compose
```bash
# 1. Build and start services in background
docker compose up --build -d

# 2. Run Prisma migrations on the persistent volume
docker compose exec backend npx prisma migrate deploy

# 3. Check health status
docker compose ps
curl http://localhost/api/health
```

### Environment Variables
Configure the following in your deployment environment / `.env`:
* `NODE_ENV="production"`
* `PORT=5000`
* `DATABASE_URL="file:/app/data/production.db"`
* `JWT_SECRET="<generate-at-least-32-random-characters>"`
* `ALLOWED_ORIGINS="https://standup.yourdomain.com"`

---

## 🛡 3. Security Headers & CSP

The included `nginx.conf` applies:
* **Content-Security-Policy (CSP)**: Strictly limits scripts to `'self'`, fonts to `'self'` and Google Fonts, styles to `'self'` and inline styles (required for dynamic animations), and forbids iframing via `frame-ancestors 'none'`.
* **HSTS**: `max-age=31536000; includeSubDomains` (enabled in HTTPS block).
* **X-Content-Type-Options**: `nosniff`.
* **X-Frame-Options**: `DENY`.
* **Referrer-Policy**: `strict-origin-when-cross-origin`.
* **Permissions-Policy**: Restricts camera, microphone, geolocation, and payment APIs.
* **COOP & CORP**: `same-origin`.

---

## 🩺 4. Health & Observability Endpoints

* **Liveness Check**: `GET /api/health/live` (HTTP 200 - verifies Node.js process is active).
* **Readiness Check**: `GET /api/health` (HTTP 200 / 503 - verifies database read/write readiness).
* **Request Correlation**: All requests receive a unique `X-Request-Id` response header for tracing.
