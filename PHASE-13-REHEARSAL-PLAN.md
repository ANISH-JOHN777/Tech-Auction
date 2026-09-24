# TECH AUCTION 2026 — PHASE 13 PRODUCTION DRESS REHEARSAL PLAN

**Project**: TECH AUCTION 2026 — Hackathon Platform MVP  
**Phase**: Phase 13 — Full Production Dress Rehearsal  
**Date**: September 24, 2026  
**Status**: IN-PROGRESS (Pre-Rehearsal Audit Complete & Test Strategy Active)

---

## 1. System Deployment & Environment Audit

The platform dress rehearsal operates on the multi-tenant free-cloud production topology:

```text
┌─────────────────────────────────────────────────────────────┐
│                 Vercel Production (SPA Web)                 │
│             https://tech-auction-2026.vercel.app            │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS / WSS
                               ▼
┌─────────────────────────────────────────────────────────────┐
│              Render Production (Express + Socket)           │
│          https://tech-auction-server.onrender.com           │
└──────────────┬──────────────────────────────┬───────────────┘
               │ PostgreSQL (SSL)             │ Gemini REST
               ▼                              ▼
┌──────────────────────────────┐┌─────────────────────────────┐
│   Supabase Free PostgreSQL   ││  Google Gemini API Gateway  │
│      (19 Tables Schema)      ││   (Server-Side API Proxy)   │
└──────────────────────────────┘└─────────────────────────────┘
```

### Production Readiness Verification Checklist

| Audit Check | Target / Status | Verification Details |
| :--- | :--- | :--- |
| **Frontend Production SPA** | `https://tech-auction-2026.vercel.app` | Vite React 19 production build (`dist`) compiled clean. Zero localhost references in production bundle. |
| **Backend API Web Service** | `https://tech-auction-server.onrender.com` | Express node server configured with `trust proxy: 1` for HTTPS header forwarding. |
| **Database Tier** | Supabase PostgreSQL (`sslmode=require`) | All 19 relational tables verified with indexes and transactional foreign keys (`ON DELETE CASCADE`). |
| **AI Gateway** | Google Gemini `gemini-2.5-flash` | Server-proxied REST requests with timed entitlement limits. Zero browser key exposure. |
| **CORS & Transport** | Restricted to `CLIENT_ORIGIN` | Strict domain matching. Socket.IO WebSockets + polling fallback enabled. |
| **Health Check** | `GET /api/health` | Returns `{ success: true, data: { status: 'ok', database: 'connected' } }`. |

---

## 2. Rehearsal Demo Teams & Roles Setup

| Track | Team Code | Team Name | Role | Initial Wallet | Eligibility | PIN |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Full-Stack** | `FS01` | Code Warriors | Primary Bidding Team | 1000 pts | Eligible (1) | `1234` |
| **Full-Stack** | `FS02` | Bug Hunters | Competing Bidding Team | 1000 pts | Eligible (1) | `1234` |
| **Full-Stack** | `FS03` | Byte Masters | Competing Bidding Team | 1000 pts | Eligible (1) | `1234` |
| **Cybersecurity**| `CY01` | Cyber Hawks | Primary Bidding Team | 1000 pts | Eligible (1) | `1234` |
| **Cybersecurity**| `CY02` | Net Defenders | Competing Bidding Team | 1000 pts | Eligible (1) | `1234` |
| **Cybersecurity**| `CY03` | Shield Force | Competing Bidding Team | 1000 pts | Eligible (1) | `1234` |
| **Organizer** | `admin` | Department Admin | Event Controller & Judge | N/A | Admin | `admin123` |

---

## 3. Multi-Device Rehearsal Matrix & Execution Flow

```text
  [Device A]          [Device B]          [Device C]          [Device D]
Organizer Admin       Team FS01           Team FS02           Team CY01
───────┬───────       ────┬─────          ────┬─────          ────┬─────
       │                  │                   │                   │
  1. Event READY          │                   │                   │
       ├─────────────────►│ (Login Locked)    │                   │
  2. Event LIVE           │                   │                   │
       ├─────────────────►│ (Track Select)───►│ (Track Select)   │
  3. Start FS Auction     │                   │                   │
       ├─────────────────►│ Bidding Room ────►│ Bidding Room      │
       │                  │ Bid 100 ─────────►│ (Outbid Notify)   │
       │                  │                   │ Bid 150 ─────────►│
       │                  │ Win Item (Settled)│                   │
  4. Start CY Auction     │                   │                   │
       ├─────────────────────────────────────────────────────────►│ Bidding Room (Isolated)
  5. Monitor AI Assist    │ AI Entitlement    │                   │
       ├─────────────────►│ Prompt Gemini     │                   │
  6. Pause Event          │                   │                   │
       ├─────────────────►│ (Paused Banner)──►│ (Paused Banner)──►│ (Paused Banner)
  7. Resume LIVE          │                   │                   │
       │                  │ Submit Solution   │ Submit Solution   │ Submit Solution
  8. Grade Submissions    │                   │                   │
       ├─────────────────►│ Rubric Scored     │ Rubric Scored     │ Rubric Scored
  9. Publish Leaderboard │                   │                   │
       └─────────────────►│ Live Ranking      │ Live Ranking      │ Live Ranking
```

---

## 4. Operational Risk & Recovery Verification Plan

1. **Network Interruption**: Disconnect device Wi-Fi during auction → reconnect → verify Socket.IO auto-reconnect and state restoration.
2. **Page Refresh**: Refresh browser during live auction and submission editing → verify zero duplicate bids or lost draft data.
3. **Event Pause Lockdown**: Trigger Admin `PAUSE` → verify instant blocking of student bids, AI requests, and submissions.
4. **Authoritative State Verification**: Confirm all wallet balances, auction winner records, and judge scores match database ledger exactly.
