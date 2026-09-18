# 🚀 Intelligent Daily Standup

An asynchronous daily standup & team alignment platform built with **Node.js, Express, Prisma, SQLite, React, Vite, TypeScript, & Tailwind CSS**.

The system replaces time-consuming daily status meetings by letting team members submit short bulleted daily standup updates. Managers get a centralized dashboard highlighting progress, active blockers, pending submissions, and AI-driven summary insights.

---

## 🌟 Key Features

### 👨‍💻 Team Member
- **Daily Standup Form:** Interactive bullet-point submission for:
  - *Yesterday's accomplishments*
  - *Today's planned focus*
  - *Blockers & impediment severity*
- **Blocker Severity Selector:** 🟢 No Blocker, 🟡 Minor Blocker, 🔴 Critical Blocker.
- **Single Submission Constraint:** Enforces 1 submission per calendar day with edit/update controls.
- **Standup History Timeline:** View historical submissions filterable by date.

### 👩‍💼 Manager / Team Lead
- **Dashboard Stat Cards:** Real-time count of total team members, submitted today, pending updates, active blockers, and critical blockers.
- **🚨 Blocker Priority Attention Panel:** Sorts Critical Blockers at the top, allowing managers to unblock team members immediately.
- **Filterable & Searchable Team Feed:** Filter updates by All, Submitted, Pending, Critical Blockers, or Minor Blockers.
- **🤖 AI Executive Summary & Risk Intelligence:**
  - Automated team synthesis
  - Hidden implicit blocker detection (identifying phrases like *"waiting for..."*, *"unable to..."*)
  - Identified project risks
  - Actionable manager recommendations

### ⚡ Quick Demo Switcher
Floating header toolbar allowing 1-click instant login as:
- **Sarah Jenkins (Manager)** -> `manager@standup.com`
- **Rahul Sharma (Member - 🔴 Critical Blocker)** -> `rahul@standup.com`
- **Priya Singh (Member - 🟡 Minor Blocker)** -> `priya@standup.com`
- **Amit Kumar (Member - 🟢 Submitted)** -> `amit@standup.com`
- **Ananya Verma (Member - ⏳ Pending Update)** -> `ananya@standup.com`
- **Admin** -> `admin@standup.com`
*(Password for all demo accounts: `password123`)*

---

## 🚀 Getting Started

### 1. Backend Setup (`/server`)

#### Local Development:
```bash
cd server
npm install
npx prisma db push
npm run prisma:seed
npm run dev
```
*API server runs on `http://localhost:5000`*

#### Production Deployment:
```bash
cd server
npm ci --omit=dev
npm run build
npx prisma migrate deploy
npm start
```
*(See [DEPLOY.md](DEPLOY.md) for full Docker and Nginx deployment instructions)*

### 2. Frontend Setup (`/client`)
```bash
cd client
npm install
npm run dev
```
*Frontend dev server runs on `http://localhost:3000`*

---

## 🛠 Tech Stack
- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons, Framer Motion
- **Backend:** Node.js, Express, TypeScript, Prisma ORM, SQLite Database
- **Authentication:** JWT & bcryptjs password hashing
