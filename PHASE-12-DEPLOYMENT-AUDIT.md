# TECH AUCTION 2026 — PHASE 12 DEPLOYMENT AUDIT REPORT

**Project**: TECH AUCTION 2026 — FREE CLOUD DEPLOYMENT & PRODUCTION VERIFICATION  
**Date**: September 23, 2026  
**Target Infrastructure**: Vercel Free (Frontend) + Render Free (Backend) + Supabase Free PostgreSQL (Database) + Gemini API  

---

## 1. Cloud Provider Infrastructure Requirements

### A. Vercel (Frontend Hosting — `apps/web`)
- **Framework**: Vite SPA (React 19, Tailwind v4)
- **Root Directory**: `apps/web`
- **Build Command**: `npm run build -w apps/web` or `vite build`
- **Output Directory**: `dist`
- **Environment Variables**:
  - `VITE_API_URL`: Production Render HTTP backend URL (e.g. `https://tech-auction-server.onrender.com`)
  - `VITE_SOCKET_URL`: Production Render Socket.IO URL (e.g. `https://tech-auction-server.onrender.com`)

### B. Render (Backend Hosting — `apps/server`)
- **Environment**: Node.js Web Service
- **Build Command**: `npm install`
- **Start Command**: `npm run start -w apps/server`
- **Host Binding**: Listens on `0.0.0.0:${process.env.PORT}`
- **Proxy Configuration**: `app.set('trust proxy', 1)` enabled for HTTPS header forwarding.
- **WebSocket Upgrade**: Socket.IO configured with polling + websocket transport upgrade.

### C. Supabase (Managed PostgreSQL Database)
- **Database Engine**: PostgreSQL (v15+)
- **Connection String (`DATABASE_URL`)**: Transaction pooler or direct URI with SSL mode enabled (`?sslmode=require`).
- **Migration Script**: `npm run db:migrate` (`apps/server/src/db/migrate.js`) applying `001_initial_schema.sql` and `002_indexes.sql`.
- **Seed Script**: `npm run db:seed` (`apps/server/src/db/seed.js`) populating demo teams (`FS01`-`FS03`, `CY01`-`CY03`) & catalog items.
- **Health Verification**: `npm run db:health` pinging live `checkHealth()` function.

### D. Google Gemini API (AI Proxy Integration)
- **Server Integration**: Only `apps/server/src/services/ai.service.js` interacts with Gemini API using `GEMINI_API_KEY`.
- **Zero Client Leakage**: Gemini API keys are never passed to the client browser or included in frontend assets.

---

## 2. Environment Variables Specification

| Service | Environment Variable | Usage & Description | Secret |
| :--- | :--- | :--- | :--- |
| Render | `PORT` | Web service listening port (provided dynamically by Render) | No |
| Render | `DATABASE_URL` | Supabase PostgreSQL connection string with SSL | **YES** |
| Render | `CLIENT_ORIGIN` | Allowed CORS origin (Vercel production URL) | No |
| Render | `SESSION_SECRET` | Secret key for session token signing | **YES** |
| Render | `ADMIN_USERNAME` | Organizer admin login username | No |
| Render | `ADMIN_PASSWORD` | Organizer admin login password | **YES** |
| Render | `GEMINI_API_KEY` | Google Gemini server-side API key | **YES** |
| Render | `GEMINI_MODEL` | Gemini AI model identifier (default: `gemini-2.5-flash`) | No |
| Render | `AI_ASSIST_DURATION_SECONDS` | AI session duration (default: 900 seconds) | No |
| Render | `AI_MAX_REQUESTS` | AI entitlement maximum questions limit (default: 30) | No |
| Vercel | `VITE_API_URL` | Production Render backend API endpoint | No |
| Vercel | `VITE_SOCKET_URL` | Production Render Socket.IO server endpoint | No |

---

## 3. Production Health Check & Security Policies

1. **Health Endpoint**: `GET /api/health`
   - Returns `{ success: true, data: { status: 'ok', database: 'connected' } }` on live database connection.
   - Returns HTTP 503 Service Unavailable if PostgreSQL is unreachable.
2. **CORS Restrictions**:
   - `cors({ origin: config.clientOrigin, credentials: true })` restricts cross-origin API calls exclusively to the configured Vercel domain.
3. **No File System Reliance**:
   - Application data persistence relies exclusively on PostgreSQL (`pg.Pool`). No file system storage is used for sessions, wallets, submissions, or logs.
