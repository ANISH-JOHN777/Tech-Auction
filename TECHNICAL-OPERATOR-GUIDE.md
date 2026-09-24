# TECH AUCTION 2026 — TECHNICAL OPERATOR GUIDE

**Department of Information Technology — SNS College of Technology**  
*System Architecture, CLI Tooling & Infrastructure Maintenance Guide.*

---

## 1. Cloud Architecture & Data Flow

```text
Vercel Free SPA (Vite + React 19)
    │
    ├─► REST API Endpoint Requests (HTTPS)
    └─► Socket.IO WebSockets Engine (WSS)
            │
            ▼
Render Free Web Service (Node.js Express Server)
    │
    ├──► Supabase Cloud PostgreSQL Pool (SSL / Transaction Port 6543)
    └──► Google Gemini REST API Gateway (Server-Side Proxy)
```

---

## 2. Environment Variables Configuration

| Variable Key | Target Environment | Sensitivity | Operational Purpose |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | Render Server | Secret | Supabase PostgreSQL Connection String (`?sslmode=require`) |
| `CLIENT_ORIGIN` | Render Server | Private | Allowed CORS origin domain (`https://tech-auction-2026.vercel.app`) |
| `SESSION_SECRET` | Render Server | Secret | Cryptographic signature secret for session token hash |
| `ADMIN_USERNAME` | Render Server | Private | Organizer login username |
| `ADMIN_PASSWORD` | Render Server | Secret | Organizer login password |
| `GEMINI_API_KEY` | Render Server | Secret | Server-side Gemini API key for proxy requests |
| `GEMINI_MODEL` | Render Server | Private | Target AI model name (`gemini-2.5-flash`) |
| `VITE_API_URL` | Vercel Client | Public | Production backend HTTP API base URL |
| `VITE_SOCKET_URL` | Vercel Client | Public | Production backend Socket.IO base URL |

---

## 3. Database Management & CLI Commands

All database scripts are executed from `apps/server` using `npm`:

```bash
# 1. Run PostgreSQL Schema Migrations (Idempotent DDL execution)
npm run db:migrate

# 2. Seed Initial Auction Catalog & Demo Teams
npm run db:seed

# 3. Verify Database Health & Table Integrity
npm run db:health

# 4. Run Full Automated Test Suite (88/88 Core Unit & Integration Tests)
npm test
```

---

## 4. Socket.IO & Timer Engine Operations

- **Socket Rooms**: `room_full-stack` and `room_cybersecurity`.
- **Timer Reconstruction**: The server-authoritative timer scheduler (`timerScheduler.service.js`) automatically recalculates remaining duration based on `timer_ends_at` database timestamps upon process start/restart.
- **Render Cold Start Policy**: Render Free services sleep after 15 minutes of inactivity. First request triggers server boot (~30-50s latency). Health endpoint (`/api/health`) can be pinged to pre-warm the instance prior to event start.
