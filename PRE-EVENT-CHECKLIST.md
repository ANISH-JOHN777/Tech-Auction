# TECH AUCTION 2026 — PRE-EVENT OPERATIONAL CHECKLIST

**Department of Information Technology — SNS College of Technology**  
*Must be completed 60 minutes before student arrival.*

---

## Pre-Event Readiness Verification Matrix

- [ ] **1. Infrastructure Readiness**
  - Vercel production frontend accessible at `https://tech-auction-2026.vercel.app`.
  - Render backend web service running at `https://tech-auction-server.onrender.com`.
  - Render pre-warmed via GET request to `/api/health` (Returns HTTP `200 OK`).

- [ ] **2. Database & Schema Verification**
  - Supabase PostgreSQL pool active with SSL (`sslmode=require`).
  - Executed `npm run db:migrate` (19 tables + 001/002 migrations verified).
  - Executed `npm run db:health` (Database connectivity & health check passed).

- [ ] **3. Environment Variables Audit**
  - Backend `DATABASE_URL`, `CLIENT_ORIGIN`, `SESSION_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `GEMINI_API_KEY`, `GEMINI_MODEL` configured on Render.
  - Frontend `VITE_API_URL` and `VITE_SOCKET_URL` configured on Vercel.
  - Zero `localhost` URLs in production environment variables.

- [ ] **4. Account & Credential Preparation**
  - Admin login verified (`admin` / `admin123`).
  - Demo teams initialized (`FS01`-`FS03`, `CY01`-`CY03`).
  - Team PINs verified (Default: `1234`).
  - Physical team credential cards printed for team leads.

- [ ] **5. Event State & Catalog Initialization**
  - Initial event status set to `SETUP` (transition to `READY` at T-10 min).
  - Auction catalog seeded with items `FS-01` to `FS-05` and `CY-01` to `CY-06`.
  - Initial team wallets populated with 1,000 credits each.

- [ ] **6. Gemini AI Gateway Verification**
  - `GEMINI_API_KEY` validated in Google AI Studio console.
  - AI assist duration set to 900 seconds (15 minutes).
  - AI max requests quota set to 30 requests per entitlement.

- [ ] **7. Network & Physical Setup**
  - Lab Wi-Fi network tested with 30+ simultaneous client connections.
  - Projector / stage display connected for live auction monitoring.
  - Faculty laptops and evaluation tablets connected to power and internet.

- [ ] **8. Emergency & Backup Plan**
  - Emergency Recovery Guide (`EMERGENCY-RECOVERY.md`) printed at organizer desk.
  - Off-line backup team PIN list available.
  - Technical Lead on site for manual database CLI interventions if needed.
