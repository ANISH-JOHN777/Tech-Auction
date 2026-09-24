# TECH AUCTION 2026 — FREE CLOUD DEPLOYMENT GUIDE (₹0 COST)

This document provides step-by-step instructions for deploying the **TECH AUCTION 2026** platform to free-tier cloud infrastructure with **zero running costs (₹0)**.

---

## 1. System Architecture Overview

```
                               ┌─────────────────────────────┐
                               │   Vite Static Web Client    │
                               │        (Vercel Free)        │
                               └──────────────┬──────────────┘
                                              │ HTTP / WebSocket (Socket.IO)
                                              ▼
                               ┌─────────────────────────────┐
                               │  Express + Socket.IO Server │
                               │        (Render Free)        │
                               └──────┬──────────────┬───────┘
                                      │              │
                    PostgreSQL Pool   │              │ Server-Side API Call
                 (Transaction / SSL)  ▼              ▼
                   ┌──────────────────────┐   ┌──────────────────────┐
                   │ Supabase Free Cloud  │   │  Google Gemini API   │
                   │ PostgreSQL Database  │   │     (Free Quota)     │
                   └──────────────────────┘   └──────────────────────┘
```

---

## 2. Step 1: Database Provisioning (Supabase Free)

1. Create a free account at [Supabase](https://supabase.com).
2. Create a new project named `tech-auction-2026`.
3. Select a database password and choose your nearest region.
4. Navigate to **Project Settings** → **Database** → **Connection String**.
5. Copy the **URI / Connection String** (Transaction Pooler port `6543` or Direct port `5432` with `?sslmode=require`).
6. Format your `DATABASE_URL`:
   ```env
   DATABASE_URL=postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require
   ```

---

## 3. Step 2: Database Migration & Seeding

Run database schema creation and demo catalog seed against the cloud database:

```bash
# 1. Set environment variable in local terminal
export DATABASE_URL="postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require"

# 2. Execute migration runner
npm run db:migrate

# 3. Seed demo teams (FS01-FS03, CY01-CY03) & auction catalog (FS-01 to FS-05, CY-01 to CY-06)
npm run db:seed

# 4. Verify database health check
npm run db:health
```

Expected output:
```
[HEALTH] Checking database connectivity...
[HEALTH] Database ping successful. PostgreSQL operational.
[HEALTH] Connection pool status: Total=1, Idle=1, Waiting=0
```

---

## 4. Step 3: Backend Web Service (Render Free)

1. Create a free account at [Render](https://render.com).
2. Click **New +** → **Web Service**.
3. Connect your GitHub repository `https://github.com/ANISH-JOHN777/Tech-Auction`.
4. Configure service settings:
   - **Name**: `tech-auction-server`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm run start -w apps/server`
   - **Instance Type**: `Free`
5. Add Environment Variables under **Environment**:
   - `NODE_ENV`: `production`
   - `DATABASE_URL`: `postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require`
   - `CLIENT_ORIGIN`: `https://[YOUR-VERCEL-APP-NAME].vercel.app`
   - `ADMIN_USERNAME`: `admin`
   - `ADMIN_PASSWORD`: `[YOUR-SECURE-ADMIN-PASSWORD]`
   - `SESSION_SECRET`: `[YOUR-SECURE-RANDOM-SECRET]`
   - `GEMINI_API_KEY`: `[YOUR-GOOGLE-GEMINI-API-KEY]`
   - `PG_POOL_MAX`: `5`
   - `PG_IDLE_TIMEOUT_MS`: `30000`
   - `PG_CONNECTION_TIMEOUT_MS`: `10000`
6. Click **Create Web Service**. Note your Render server URL (e.g. `https://tech-auction-server.onrender.com`).

---

## 5. Step 4: Frontend Web App (Vercel Free)

1. Create a free account at [Vercel](https://vercel.com).
2. Click **Add New** → **Project**.
3. Import your GitHub repository `https://github.com/ANISH-JOHN777/Tech-Auction`.
4. Configure project settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `./`
   - **Build Command**: `npm run build -w apps/web`
   - **Output Directory**: `apps/web/dist`
5. Add Environment Variables:
   - `VITE_API_URL`: `https://tech-auction-server.onrender.com`
   - `VITE_SOCKET_URL`: `https://tech-auction-server.onrender.com`
6. Click **Deploy**.

---

## 6. Cold Start & Socket.IO Reconnection Operational Notes

### **Render Cold Starts**
Render Free Web Services spin down after 15 minutes of inactivity. The first HTTP request or page load after inactivity takes ~30 seconds to wake up the server.

### **Automatic Socket.IO Reconnection**
The web frontend is configured with automatic Socket.IO reconnection (`reconnection: true`, `reconnectionAttempts: Infinity`, `reconnectionDelay: 1000`).
- If connection drops, the app displays: `"Connecting to event server..."` overlay banner.
- When reconnected, the client sends session credentials to restore state:
  1. Authenticates session token.
  2. Restores team track and wallet balance.
  3. Rejoins correct track auction room (`auction-full-stack` or `auction-cybersecurity`).
  4. Fetches authoritative server auction state and event state (`LIVE`, `PAUSED`, `ENDED`).

---

## 7. AI Assist (Gemini API Free Tier)

1. Obtain a free API key from [Google AI Studio](https://aistudio.google.com).
2. Set `GEMINI_API_KEY` on Render web service environment.
3. API keys are kept strictly on the backend and are **never** exposed to client browsers or Vercel environment variables.
4. If rate limits (RPD/RPM) are exceeded or API key is invalid, the backend returns formatted error fallback messages without crashing.

---

## 8. Emergency Recovery & Reset

If an operational issue occurs during the live event:

1. **Admin Demo Reset**: Log into Admin Dashboard → Click **Reset Event State**. This resets all wallets, clears bids, resets submissions/violations, and sets event to `READY` while preserving database tables.
2. **Manual Database Seed**:
   ```bash
   npm run db:seed
   ```
3. **Database Health Verification**:
   ```bash
   curl https://tech-auction-server.onrender.com/api/health
   ```
   Response:
   ```json
   {
     "success": true,
     "data": {
       "status": "ok",
       "database": "connected"
     }
   }
   ```
