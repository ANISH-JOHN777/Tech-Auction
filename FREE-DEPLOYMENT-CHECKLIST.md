# TECH AUCTION 2026 — FREE DEPLOYMENT CHECKLIST

Use this checklist prior to running the live event on free cloud infrastructure (Supabase + Render + Vercel + Gemini).

---

## 1. Pre-Deployment Configuration Verification

- [ ] **Supabase PostgreSQL Database**
  - [ ] Project created on Supabase Free Tier.
  - [ ] Connection URL saved to `DATABASE_URL`.
  - [ ] `npm run db:migrate` executed successfully against Supabase.
  - [ ] `npm run db:seed` executed successfully (FS01-FS03, CY01-CY03 seeded with 1000 credits).
  - [ ] Connection pool max set to `PG_POOL_MAX=5`.

- [ ] **Render Free Backend Web Service**
  - [ ] Repository connected (`https://github.com/ANISH-JOHN777/Tech-Auction`).
  - [ ] Build command set: `npm install`.
  - [ ] Start command set: `npm run start -w apps/server`.
  - [ ] Environment variables configured:
    - [ ] `NODE_ENV=production`
    - [ ] `DATABASE_URL` (Supabase SSL URL)
    - [ ] `CLIENT_ORIGIN` (Vercel production URL)
    - [ ] `ADMIN_USERNAME` & `ADMIN_PASSWORD`
    - [ ] `SESSION_SECRET`
    - [ ] `GEMINI_API_KEY`
  - [ ] Health endpoint returns `{"success":true,"data":{"status":"ok","database":"connected"}}` at `GET /api/health`.

- [ ] **Vercel Free Web Frontend**
  - [ ] Build command set: `npm run build -w apps/web`.
  - [ ] Output directory set: `apps/web/dist`.
  - [ ] Environment variables configured:
    - [ ] `VITE_API_URL` (Render URL)
    - [ ] `VITE_SOCKET_URL` (Render URL)
  - [ ] Application loads without missing asset or CORS errors.

---

## 2. Pre-Event Functional Smoke Tests

- [ ] **Authentication & Track Selection**
  - [ ] Login with `FS01` / `1234` succeeds.
  - [ ] Login with `CY01` / `1234` succeeds.
  - [ ] Login with `admin` / `[ADMIN_PASSWORD]` succeeds.

- [ ] **Event Control State**
  - [ ] Event status initialized in state `READY` or `LIVE`.
  - [ ] Competition actions blocked when event is `PAUSED` or `ENDED`.

- [ ] **Auction Engine & Atomic Bidding**
  - [ ] Real-time auction room joins correct track (`auction-full-stack` or `auction-cybersecurity`).
  - [ ] Outbidding holds previous bidder's wallet balance safely.
  - [ ] Auction timer expiration finalizes item and sets winner atomically in PostgreSQL.

- [ ] **AI Assist System**
  - [ ] Winning team starts entitlement.
  - [ ] Chat query returns valid response from Gemini API.
  - [ ] Expiry (15 mins) and limit (30 requests) enforced server-side.

- [ ] **Submissions & Anti-Malpractice**
  - [ ] File/repo submission creates entry in PostgreSQL.
  - [ ] Final submission sets `is_final = 1` and locks further submission edits.
  - [ ] Tab hidden / window blur / copy-paste attempts logged to `violations` table.

- [ ] **Leaderboard & Faculty Evaluation**
  - [ ] Admin evaluation updates score in `scores` table.
  - [ ] Leaderboard displays correct ranking when unhidden.

---

## 3. Live Event Day Operations & Recovery

- [ ] Send ping request to Render URL 15 minutes before event to warm up cold start.
- [ ] Verify organizer admin has access to Admin Dashboard.
- [ ] Keep `npm run db:health` or health URL monitoring open during event.
- [ ] In case of issue, perform Admin Demo Reset or execute `npm run db:seed`.
