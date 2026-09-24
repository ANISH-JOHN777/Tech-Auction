# TECH AUCTION 2026 — VERCEL MONOREPO CONFIGURATION REPORT

**Project**: TECH AUCTION 2026 — Hackathon Platform  
**Date**: September 24, 2026  
**Status**: COMPLETE (Verified & Validated for Vercel Monorepo Deployment)

---

## 1. Repository Structure
```text
Tech-Auction/
├── apps/
│   ├── server/       # Node.js + Express + Socket.IO Backend (Deployed to Render)
│   └── web/          # React 19 + Vite Frontend SPA (Deployed to Vercel)
├── challenges/       # Hackathon challenge packages
├── vercel.json       # Monorepo root Vercel configuration
├── package.json      # Workspace root configuration
└── package-lock.json # Root dependency lockfile
```

---

## 2. Root Workspace Configuration
In root [`package.json`](file:///c:/Users/manue/OneDrive/Desktop/Tech%20Auction/package.json):
```json
{
  "name": "tech-auction-platform",
  "private": true,
  "workspaces": [
    "apps/server",
    "apps/web"
  ],
  "scripts": {
    "build": "npm run build -w apps/web"
  }
}
```

---

## 3. Frontend Package Configuration
In [`apps/web/package.json`](file:///c:/Users/manue/OneDrive/Desktop/Tech%20Auction/apps/web/package.json):
```json
{
  "name": "tech-auction-web",
  "private": true,
  "scripts": {
    "build": "vite build"
  }
}
```

---

## 4. Current Root `vercel.json`
In [`vercel.json`](file:///c:/Users/manue/OneDrive/Desktop/Tech%20Auction/vercel.json):
```json
{
  "buildCommand": "npm run build -w apps/web",
  "outputDirectory": "apps/web/dist",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

---

## 5. `apps/web/vercel.json` Status
- **Status**: `DELETED`.
- **Reason**: Removed to eliminate deployment path ambiguity. All build commands and SPA rewrites are declared at the root workspace level.

---

## 6. Root Build Command
- **Command**: `npm run build`
- **Execution Target**: `npm run build -w apps/web` → `vite build` inside `apps/web`.

---

## 7. Local Build Verification Result
- **Execution Output**:
  ```text
  dist/index.html                   0.35 kB │ gzip:   0.25 kB
  dist/assets/index-DqC3bhSM.css   40.73 kB │ gzip:   7.44 kB
  dist/assets/index-Bub6CbQn.js   401.19 kB │ gzip: 110.51 kB
  ✓ built in 1.47s
  ```
- **Status**: `PASS` (100% clean compilation).

---

## 8. Output Directory
- **Path**: `apps/web/dist`

---

## 9. SPA Routing Configuration
- Single-page application routes (`/`, `/admin`, `/login`, `/dashboard`, `/auction`, `/submission`, `/leaderboard`) rewrite to `/index.html` via `vercel.json` rewrite rule:
  ```json
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
  ```

---

## 10. Required Vercel Environment Variables
Set in **Vercel Project Settings → Environment Variables**:
- `VITE_API_URL` = `https://tech-auction-server.onrender.com`
- `VITE_SOCKET_URL` = `https://tech-auction-server.onrender.com`

*(Do NOT add `DATABASE_URL`, `GEMINI_API_KEY`, `SESSION_SECRET`, or `ADMIN_PASSWORD` to Vercel).*

---

## 11. Localhost Fallback Analysis
In [`apps/web/src/config/api.js`](file:///c:/Users/manue/OneDrive/Desktop/Tech%20Auction/apps/web/src/config/api.js):
```javascript
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';
```
`localhost` is strictly a fallback default when `VITE_API_URL` / `VITE_SOCKET_URL` environment variables are omitted during build.

---

## 12. Vercel Root Directory Requirement
- **Requirement**: **`.` (Repository Root)**.
- **Why**: Setting Root Directory to `apps/server` or `apps/web` breaks workspace resolution (`npm error No workspaces found: --workspace=apps/web`) because `package-lock.json` and `package.json` with `workspaces` exist strictly at `.`.

---

## 13. Vercel Framework Requirement
- **Framework Preset**: `Vite`

---

## 14. Exact Vercel Dashboard Settings

| Vercel Setting | Required Value |
| :--- | :--- |
| **Project Name** | `tech-auction-2026` |
| **Framework Preset** | `Vite` |
| **Root Directory** | `.` *(Repository Root)* |
| **Build Command** | `npm run build` |
| **Output Directory** | `apps/web/dist` |

---

## 15. Git Changes
- All fixes staged, committed, and pushed to `origin/main` (Commit `c5c7dda`).
- Working tree status: `nothing to commit, working tree clean`.

---

## 16. Remaining Manual Dashboard Steps
1. Open [Vercel Dashboard](https://vercel.com/dashboard).
2. If `tech-auction-2026` project is currently set to Root Directory `apps/server` or `apps/web`:
   - Go to **Project Settings** → **General** → **Root Directory**.
   - Change Root Directory to `.` *(Repository Root)*.
3. In **Settings** → **Environment Variables**, ensure `VITE_API_URL` and `VITE_SOCKET_URL` point to `https://tech-auction-server.onrender.com`.
4. Go to **Deployments** → Click **Redeploy** on the `main` branch.
