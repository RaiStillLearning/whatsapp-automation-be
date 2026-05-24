# ⚙️ WhatsApp Automation SaaS — Backend Server

A high-performance, robust, and reliable backend service built on top of Fastify, TypeScript, Prisma (PostgreSQL), Redis (BullMQ), and WhatsApp Web. It handles multi-user isolated WhatsApp sessions, stores real-time messaging logs, and asynchronously processes automated keyword replies using background worker queues to prevent runtime bottlenecks.

---

## 🚀 Tech Stack & Libraries

* **Core Framework:** Node.js & Fastify (highly optimized web framework)
* **Language:** TypeScript
* **Database & ORM:** PostgreSQL & Prisma ORM
* **Queuing & Background Jobs:** Redis & BullMQ
* **WhatsApp Automation Engine:** `whatsapp-web.js` (with local auth persistence)
* **Security:** Fastify JWT, Cookie handlers, CORS integration, and BcryptJS hashing

---

## ✨ Features

- 👤 **Multi-User Isolation:** Each user has completely isolated WhatsApp sessions, automation rules, message logs, and queue processing.
- 🚀 **Queue-First Architecture:** Incoming WhatsApp web events are immediately stored and pushed into a Redis queue processed by asynchronous background workers, keeping the main thread light and responsive.
- 🔄 **Auto-Reconnect & State Recovery:** Sessions automatically recover or reconnect upon server restarts, with comprehensive tracking of connection states (disconnected, qr_pending, authenticated, failed).
- 🏷️ **CORS & PATCH Configured:** Complete integration for CORS handling allowing secure PUT/PATCH/GET/POST API requests from local or production frontends.
- 📜 **Activity & Message Logging:** Auto-creates searchable activity streams and message transaction logs for complete transparency.

---

## ⚙️ Configuration & Environment

The backend server is configured via a local `.env` file:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/whatsapp_automation?schema=public"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="super-secret-key-change-in-production"
NODE_ENV="development"
PORT=3001
LOG_LEVEL="info"
```

---

## 🛠️ Setup & Running Locally

### Prerequisites
* Ensure you have **Docker** and **Docker Compose** installed to boot up PostgreSQL and Redis.
* Ensure you have **Node.js** (v18+) installed.

### Step-by-Step Guide

1. **Navigate to the backend directory:**
   ```bash
   cd whatsapp-automation-be
   ```

2. **Boot up Postgres and Redis Containers:**
   ```bash
   docker compose up -d
   ```
   *This spins up PostgreSQL on port `5432` and Redis on port `6379`.*

3. **Install Node.js Dependencies:**
   ```bash
   npm install
   ```

4. **Initialize Database Tables (Prisma Sync):**
   Use Prisma to automatically sync models into the PostgreSQL container:
   ```bash
   npx prisma db push
   ```

5. **Start Dev Server (Hot-Reloading):**
   ```bash
   npm run dev
   ```
   *The server will run on **`http://localhost:3001`**.*

---

## 📂 Project Structure

```
whatsapp-automation-be/
├── prisma/                 # Database Schema & config files
│   ├── schema.prisma       # Prisma DB models
│   └── migrations/         # Auto-generated migrations
├── src/
│   ├── modules/            # Layered feature-based modules (Controller, Service, Repository)
│   │   ├── auth/           # Hashing, token generation, user validation
│   │   ├── automation/     # Create, edit, and toggle automation matching logic
│   │   ├── dashboard/      # Aggregate stats & activity logs
│   │   └── whatsapp/       # WhatsApp Client lifecycle hooks & session controls
│   ├── queues/             # BullMQ queue creators
│   ├── workers/            # BullMQ worker handlers (handles automated replies safely)
│   ├── middleware/         # Fastify authentication hooks & middlewares
│   ├── server.ts           # Fastify application entrypoint & CORS config
│   └── tsconfig.json       # TypeScript configuration
├── docker-compose.yml      # Infrastructure orchestration (Postgres & Redis)
└── package.json            # Scripts & project dependencies
```
