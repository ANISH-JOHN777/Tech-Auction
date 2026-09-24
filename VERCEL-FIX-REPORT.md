# TECH AUCTION 2026 — VERCEL CONFIGURATION FIX REPORT

**Date**: September 24, 2026  
**Status**: FIX APPLIED LOCALLY (Pending Review & Commit)

---

## 1. Original Error
- **HTTP Error**: `500 FUNCTION_INVOCATION_FAILED`
- **Impact**: Vercel edge router attempted to execute a non-existent serverless function for static SPA paths (`/admin`, `/`, etc.), resulting in a 500 error page.

---

## 2. Root Cause
- The legacy `"version": 2` key in `vercel.json` instructed Vercel to use legacy serverless function builders (`Build Output API v2`) rather than standard static Vite asset output serving.

---

## 3. Files Modified
- [`vercel.json`](file:///c:/Users/manue/OneDrive/Desktop/Tech%20Auction/vercel.json) (Removed `"version": 2` line).

---

## 4. Files Removed
- `apps/web/vercel.json` (Deleted redundant subfolder config to eliminate deployment ambiguity).

---

## 5. Exact Configuration Change

```diff
  {
-   "version": 2,
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

## 6. Environment Variables Required in Vercel Dashboard

The following non-sensitive frontend public API variables must be set in **Vercel Project Settings → Environment Variables**:

| Key | Target Value | Description |
| :--- | :--- | :--- |
| `VITE_API_URL` | `https://tech-auction-server.onrender.com` | Production Render backend API URL |
| `VITE_SOCKET_URL` | `https://tech-auction-server.onrender.com` | Production Render Socket.IO server URL |

*Note: Server secrets (`GEMINI_API_KEY`, `DATABASE_URL`, `SESSION_SECRET`, `ADMIN_PASSWORD`) remain strictly on Render and are NOT added to Vercel.*

---

## 7. Local Build Verification
- **Command**: `npm run build`
- **Status**: `PASS` (Built `apps/web/dist` in 1.33s).

---

## 8. Automated Test Suite Verification
- **Command**: `npm test`
- **Status**: **`88 / 88 PASSED`** (100% pass across 5 test suites).

---

## 9. Git Diff Summary
- `deleted: apps/web/vercel.json` (9 lines removed)
- `modified: vercel.json` (1 line removed: `"version": 2`)
- Zero application code, backend, database, or test files modified.

---

## 10. Deployment Instructions
1. Review git status: `git status`
2. Commit Vercel configuration fix:
   ```bash
   git add vercel.json VERCEL-DEPLOYMENT-AUDIT.md VERCEL-FIX-REPORT.md
   git rm apps/web/vercel.json
   git commit -m "fix(vercel): remove legacy version 2 directive to fix SPA static serving"
   ```
3. Push to GitHub `main` branch:
   ```bash
   git push origin main
   ```
4. Vercel will trigger a clean static deployment.
