# Intelligent Daily Standup Platform

An asynchronous daily standup, blocker triage, and engineering alignment platform designed for multi-tenant engineering and product organizations. Built with Node.js, Express, TypeScript, Prisma ORM, SQLite, React, Vite, and Tailwind CSS.

---

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Key Features](#key-features)
  - [Team Members](#team-members)
  - [Team Leads & Engineering Managers](#team-leads--engineering-managers)
  - [Organization Administrators](#organization-administrators)
  - [AI-Driven Risk & Blocker Intelligence](#ai-driven-risk--blocker-intelligence)
- [Technology Stack](#technology-stack)
- [Security & Defensive Architecture](#security--defensive-architecture)
- [Database Model & Concurrency](#database-model--concurrency)
- [API Reference](#api-reference)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Configuration](#environment-configuration)
  - [Database Initialization & Seeding](#database-initialization--seeding)
  - [Running Development Servers](#running-development-servers)
- [Testing & Quality Assurance](#testing--quality-assurance)
  - [Test Suite Breakdown](#test-suite-breakdown)
  - [Executing Automated Tests](#executing-automated-tests)
- [Production Deployment & Containerization](#production-deployment--containerization)
  - [Docker Compose Deployment](#docker-compose-deployment)
  - [Nginx Reverse Proxy & Security Headers](#nginx-reverse-proxy--security-headers)
  - [Database Migration Workflow](#database-migration-workflow)
- [Health Probes & Observability](#health-probes--observability)
- [License](#license)

---

## Overview

Traditional synchronous standup meetings often disrupt deep work, consume engineering hours, and fail to systematically track blockers across distributed teams.

The Intelligent Daily Standup Platform solves this by providing:

1. **Structured Asynchronous Updates**: Standardized daily check-ins capturing yesterday's achievements, today's commitments, and active impediments.
2. **Deterministic Blocker Prioritization**: Immediate escalation and triaging of critical and minor blockers for rapid resolution.
3. **Multi-Tenant Organization Hierarchy**: Strict isolation across companies, departments, and teams with role-based permission boundaries.
4. **Automated Risk Intelligence**: Natural language synthesis to identify implicit impediments (such as dependency lag or unclear requirements) and deliver actionable managerial summaries.

---

## System Architecture

The application is structured as a decoupled full-stack architecture with a containerized production deployment model.

```
+-----------------------------------------------------------------------------+
|                             Client Layer (Browser)                          |
|  - React 18 Single Page Application (SPA)                                   |
|  - Role-Based Dynamic Dashboards & Form Submissions                         |
|  - React Router DOM v6 with Protected Route Wrappers                        |
+--------------------------------------|--------------------------------------+
                                       | HTTPS (Port 443 / 80)
                                       v
+-----------------------------------------------------------------------------+
|                        Nginx Edge & Reverse Proxy                           |
|  - Static Asset Serving (/client/dist) with Cache Control                   |
|  - Reverse Proxy Passing (/api/*)                                           |
|  - Content Security Policy (CSP), HSTS, & Defensive Security Headers        |
+--------------------------------------|--------------------------------------+
                                       | HTTP (Internal Port 5000)
                                       v
+-----------------------------------------------------------------------------+
|                      Backend Application Server (Node.js)                   |
|  - Express REST API with TypeScript                                         |
|  - Security: Helmet, CORS Allowlist, Rate Limiting, Request Correlation IDs |
|  - Validation: Zod Schema Validation Middleware                             |
|  - Authentication: Signed JSON Web Tokens (JWT) & bcrypt Password Hashing   |
|  - Business Logic: Multi-Tenant RBAC & Cross-Department Access Workflows    |
|  - AI Intelligence Service: Rule-Based & LLM Blocker Heuristics             |
+--------------------------------------|--------------------------------------+
                                       | Prisma Client (Native Queries)
                                       v
+-----------------------------------------------------------------------------+
|                          Data Layer (SQLite in WAL Mode)                    |
|  - Write-Ahead Logging (WAL) for High Concurrent Read/Write Throughput      |
|  - Busy Timeout (5000ms) & Immediate Lock Mitigation                        |
|  - Foreign Key Constraints & Cascade/SetNull Relational Integrity           |
|  - Multi-Tenant Scoping (Company -> Department -> Team -> User)             |
+-----------------------------------------------------------------------------+
```

---

## Key Features

### Team Members

- **Structured Standup Form**: Interactive bullet-point capture for yesterday's completed tasks, today's planned focus, and blockers.
- **Severity Classification**: Explicit tagging for blockers (`NONE`, `MINOR`, `CRITICAL`).
- **Calendar Constraint Enforcement**: Guaranteed single submission per calendar day (`YYYY-MM-DD`) with update capabilities.
- **Historical Timeline**: Searchable historical archive of personal updates.
- **Peer Engagement**: Lightweight reactions on team standups.

### Team Leads & Engineering Managers

- **Aggregated Department Dashboards**: Real-time operational metrics tracking submission rates, pending updates, and active blockers.
- **Priority Attention Queue**: Critical and minor blockers are hoisted to the top of the feed for immediate resolution.
- **Blocker Resolution Lifecycle**: Mark blockers as resolved with timestamped notes, automatically notifying affected engineers.
- **Cross-Department Temporary Access**: Submit and approve time-delimited (24h, 72h, 168h) read access to external department feeds.
- **Export Capabilities**: Structured data exports in CSV and JSON formats for reporting and retrospectives.

### Organization Administrators

- **Hierarchical Entity Management**: Full CRUD operations for Companies, Departments, and Teams.
- **Employee Lifecycle**: Account provisioning, role assignments, department/team reassignments, and account deactivation.
- **Comprehensive Audit Logging**: Immutable audit records capturing actor, target, timestamp, and metadata for compliance tracking.

### AI-Driven Risk & Blocker Intelligence

- **Executive Standup Synthesis**: Natural language summarization aggregating team progress into concise bullet points.
- **Implicit Blocker Detection**: Pattern matching and heuristic analysis detecting unflagged obstacles (e.g., phrases indicating pending reviews, external team dependencies, or configuration blocks).
- **Proactive Risk Scoring**: Department-level health metrics highlighting potential project delays.
- **Actionable Manager Recommendations**: Automated suggestions for engineering leaders to unblock deliverables.

---

## Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | React 18, Vite 5, TypeScript 5 |
| **UI & Styling** | Tailwind CSS 3, Lucide Icons, Framer Motion |
| **Routing & State** | React Router DOM 6, React Context API (Auth, Theme, Toast) |
| **Backend Framework** | Node.js 22 LTS, Express 4, TypeScript 5 |
| **Database & ORM** | SQLite 3 (WAL Mode), Prisma ORM 5 |
| **Authentication & Security** | JSON Web Tokens (`jsonwebtoken`), `bcryptjs`, `helmet`, `cors`, `express-rate-limit`, `zod` |
| **Testing & Verification** | Vitest 2, Supertest, React Testing Library, Playwright 1.63 |
| **Security Tooling** | Semgrep SAST, Gitleaks, npm audit |
| **Containerization & Web Server** | Docker, Docker Compose, Nginx (Alpine) |

---

## Security & Defensive Architecture

1. **Multi-Tenant Isolation**:
   - Every entity (Department, Team, User, Standup, AuditLog) is strictly bound to a `companyId`.
   - Access control middleware verifies tenant ownership on every request, preventing Insecure Direct Object References (IDOR) and cross-tenant data leakage.

2. **Hierarchical Role-Based Access Control (RBAC)**:
   - Four distinct privilege levels: `ADMIN`, `MANAGER`, `TEAM_LEAD`, and `TEAM_MEMBER`.
   - Vertical privilege escalation is blocked at the route and middleware levels.
   - Horizontal cross-department and cross-team boundaries are enforced unless an approved, non-expired `DepartmentAccess` grant exists.

3. **Input Validation & Sanitization**:
   - All inbound payloads (HTTP Body, URL Params, Query Strings) are validated against strict Zod schemas before reaching business logic handlers.
   - Malformed fields, unexpected properties, and invalid UUID formats are rejected with structured 400 Bad Request responses.

4. **Production Defensive Hardening**:
   - **Rate Limiting**: Strict windowed rate limits applied to `/api/auth/*` and standard limits across general `/api/*` endpoints.
   - **CORS Allowlist**: Configurable origin verification via `ALLOWED_ORIGINS` rejecting unauthenticated cross-origin requests.
   - **Security Headers**: Standard Helmet middleware combined with Nginx edge enforcement of Content Security Policy (CSP), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and `HSTS`.
   - **Error Sanitization**: In production environments (`NODE_ENV=production`), internal stack traces, database errors, and file paths are stripped, returning sanitized client error messages while logging full context alongside a unique `X-Request-Id`.

---

## Database Model & Concurrency

The application utilizes Prisma ORM with SQLite configured for production reliability:

```
[ Company ] 1 ──< * [ Department ] 1 ──< * [ Team ] 1 ──< * [ User ]
     │                      │                  │                 │
     ├──< [ AuditLog ]      └──< [ AuditLog ]  └──< [ AuditLog ] ├──< [ DailyStandup ] 1 ──< * [ StandupReaction ]
     │                                                           ├──< [ DepartmentAccess ]
     │                                                           └──< [ Notification ]
```

### Relational Schema Definitions

- **Company**: Root tenant entity containing name, unique slug, and optional domain.
- **Department**: Organizational division linked to a company.
- **Team**: Sub-unit within a department with designated `managerId` and `teamLeadId`.
- **User**: Multi-tenant employee profile with role, department, team, and hashed credentials.
- **DailyStandup**: Daily check-in record constrained by a unique compound index `@@unique([userId, date])`.
- **StandupReaction**: Peer feedback constrained by `@@unique([standupId, userId, emoji])`.
- **DepartmentAccess**: Delegated cross-department access tracking requester, approver, duration, and status.
- **AuditLog**: Immutable action log recording administrative and organizational mutations.

### Concurrency Optimizations

The SQLite database engine is automatically initialized with the following PRAGMAs:
- `PRAGMA journal_mode = WAL;` (Enables Write-Ahead Logging for concurrent readers alongside an active writer).
- `PRAGMA busy_timeout = 5000;` (Configures connection queues to wait up to 5000ms for locks to clear before raising errors).
- `PRAGMA synchronous = NORMAL;` (Ensures durability while reducing disk I/O latency in WAL mode).
- `PRAGMA foreign_keys = ON;` (Enforces relational integrity constraints).

---

## API Reference

### Authentication & Employee Management (`/api/auth`)

| Method | Endpoint | Access Level | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/lookup-identifier` | Public | Identify company matches for email or employee ID |
| `POST` | `/api/auth/login` | Public | Authenticate user and issue JWT |
| `POST` | `/api/auth/register-company` | Public | Provision new tenant company and root admin account |
| `GET` | `/api/auth/me` | Authenticated | Retrieve authenticated user profile and permissions |
| `POST` | `/api/auth/employees` | Admin, Manager | Provision a new employee within the tenant |
| `PATCH` | `/api/auth/employees/:id` | Admin, Manager | Update employee role, department, team, or active status |

### Daily Standups (`/api/standups`)

| Method | Endpoint | Access Level | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/standups` | Member, Lead, Mgr | Submit today's daily standup |
| `GET` | `/api/standups/today` | Authenticated | Retrieve authenticated user's standup for today |
| `GET` | `/api/standups/team/:teamId` | Authenticated | Fetch standup feed for a specific team |
| `GET` | `/api/standups/history` | Authenticated | Retrieve historical standups with date filters |
| `PUT` | `/api/standups/:id` | Owner, Lead, Mgr | Update an existing standup submission |
| `POST` | `/api/standups/:id/react` | Authenticated | Toggle an emoji reaction on a standup |
| `PATCH` | `/api/standups/:id/resolve-blocker` | Lead, Manager, Admin | Mark a blocker as resolved with notes |

### Hierarchy & Organization (`/api/departments`, `/api/teams`, `/api/hierarchy`)

| Method | Endpoint | Access Level | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/departments` | Authenticated | List all departments in the user's company |
| `POST` | `/api/departments` | Admin | Create a new department |
| `GET` | `/api/teams` | Authenticated | List teams in company/department |
| `POST` | `/api/teams` | Admin, Manager | Create a new team within a department |
| `GET` | `/api/hierarchy/overview` | Admin, Manager | Fetch complete company department and team tree |

### Manager Analytics & AI (`/api/manager`, `/api/ai`)

| Method | Endpoint | Access Level | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/manager/dashboard` | Manager, Admin | Retrieve aggregated metrics, pending updates, and blocker feed |
| `GET` | `/api/manager/export` | Manager, Admin | Export standup data in CSV or JSON format |
| `POST` | `/api/ai/summarize` | Manager, Lead, Admin | Generate AI executive summary for a team or department |
| `POST` | `/api/ai/analyze-blockers` | Manager, Lead, Admin | Run heuristic and LLM analysis for implicit blockers |

### Health & Observability (`/api/health`)

| Method | Endpoint | Access Level | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health/live` | Public | Lightweight liveness probe verifying Node.js process health |
| `GET` | `/api/health` | Public | Deep readiness probe verifying database connectivity |

---

## Getting Started

### Prerequisites

- **Node.js**: Version 22.x LTS or higher
- **npm**: Version 10.x or higher
- **Docker & Docker Compose** (Optional, for containerized execution)

### Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/Agamya-123/standup-meeting-AI.git
cd standup-meeting-AI

# Install root dependencies
npm install

# Install server dependencies
cd server && npm install && cd ..

# Install client dependencies
cd client && npm install && cd ..
```

### Environment Configuration

Create a `.env` file inside the `server/` directory:

```bash
cp server/.env.example server/.env
```

Ensure the configuration variables are defined:

```ini
PORT=5000
NODE_ENV=development
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-development-secret-key-at-least-32-chars-long"
ALLOWED_ORIGINS="http://localhost:3000,http://localhost:5173,http://localhost"
```

### Database Initialization & Seeding

Initialize the SQLite database schema and load demonstration seed data:

```bash
cd server

# Validate and generate Prisma client
npx prisma validate
npx prisma generate

# Push schema to local SQLite database
npm run prisma:db:push

# Populate database with demo companies, departments, teams, users, and standups
npm run prisma:seed

cd ..
```

### Running Development Servers

Start the backend API server and frontend client concurrently:

#### Terminal 1 (Backend API):
```bash
cd server
npm run dev
```
*API server runs on `http://localhost:5000`.*

#### Terminal 2 (Frontend Client):
```bash
cd client
npm run dev
```
*Frontend dev server runs on `http://localhost:3000`.*

---

## Testing & Quality Assurance

The platform includes a comprehensive, multi-layer automated testing suite with 100% pass rates across unit, integration, security regression, and end-to-end browser workflows.

### Test Suite Breakdown

- **Backend Unit & Integration Tests (87 tests)**:
  - Auth Middleware & Role Normalization
  - Zod Request Validation Middleware
  - Centralized Error Handling & Sanitization
  - Authentication, Standup, Hierarchy, & Health APIs
  - Horizontal & Vertical RBAC Security Escalation Checks
  - Cross-Tenant IDOR Parameter Tampering Defense
  - SQLite WAL Database Concurrency & Constraint Invariance
- **Frontend Component & Context Tests (17 tests)**:
  - AuthContext Authentication & Persistence State
  - Protected Route Privilege Verification
  - Multi-Tenant Login & Identifier Lookup Flows
  - Standup Form Client-Side Validation
  - Manager Dashboard Metrics & Attention Queue Rendering
- **End-to-End Browser Tests (17 Playwright tests)**:
  - Nginx Reverse Proxy Header & Route Handling (6 tests)
  - End-to-End User Authentication & Navigation (2 tests)
  - Standup Submission & Timeline Management (2 tests)
  - Blocker Resolution & Notification Delivery (2 tests)
  - Multi-Tenant Team Boundary Enforcement (3 tests)
  - Manager Analytics & Standup Exporting (2 tests)

### Executing Automated Tests

```bash
# Run all backend unit, integration, and security tests
npm run test:unit --prefix server

# Run backend tests with coverage report
npm run test:coverage --prefix server

# Run frontend unit and component tests
npm run test --prefix client

# Run frontend tests with coverage report
npm run test:coverage --prefix client

# Run full Playwright End-to-End regression suite
npm run test:e2e
```

---

## Production Deployment & Containerization

### Docker Compose Deployment

The repository includes a production-grade Docker configuration deploying the Express backend and Nginx reverse proxy within an isolated network.

```bash
# 1. Build and start services in detached mode
docker compose up -d --build

# 2. Apply database migrations to the persistent data volume
docker compose exec backend npx prisma migrate deploy

# 3. Verify container status and health probes
docker compose ps
curl -i http://localhost/api/health
```

### Nginx Reverse Proxy & Security Headers

The production Nginx reverse proxy configuration (`nginx.conf`):
- Serves pre-built Vite static assets with aggressive caching headers for immutable chunks.
- Proxies `/api/*` requests to the internal Express backend (`http://backend:5000`).
- Implements SPA client-side fallback via `try_files $uri $uri/ /index.html`.
- Enforces defensive security headers:
  - `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none';`
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Cross-Origin-Opener-Policy: same-origin`
  - `Cross-Origin-Resource-Policy: same-origin`

### Database Migration Workflow

In production environments, database schema changes must be applied strictly via `prisma migrate deploy`:

```bash
# Execute pending migrations
npx prisma migrate deploy
```

> **Important**: Do not use `prisma db push` in production environments. `prisma db push` is designed for local development only and does not track migration state in the `_prisma_migrations` table.

---

## Health Probes & Observability

The application exposes standard endpoints for orchestration platforms (e.g., Kubernetes, Docker Swarm, AWS ECS):

| Endpoint | Probe Type | Description | Response Codes |
| :--- | :--- | :--- | :--- |
| `GET /api/health/live` | Liveness | Verifies that the Node.js event loop is responsive. Does not execute database queries. | `200 OK` |
| `GET /api/health` | Readiness | Performs active database query (`SELECT 1`) to ensure full read/write readiness. | `200 OK`, `503 Service Unavailable` |

Every inbound request is assigned a unique UUID via `X-Request-Id` for tracing across access logs and error reports.

---

## License

This project is licensed under the ISC License. See the [LICENSE](LICENSE) file for details.
