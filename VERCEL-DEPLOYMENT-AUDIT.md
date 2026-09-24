# Vercel Deployment Audit — Tech Auction 2026

**Date**: September 24, 2026  
**Audit Purpose**: Forensic examination of Vercel deployment failure (`500 FUNCTION_INVOCATION_FAILED`).  
**Audit Mode**: READ-ONLY / AUDIT ONLY (No code, environment, or repository changes made).

---

## 1. Current Deployment Status
- **Status**: Deployment failing at edge routing / request execution stage with HTTP Status `500`.
- **Frontend SPA**: Built cleanly locally (`apps/web/dist` compiled in 1.24s with 0 errors).
- **Backend API**: Healthy on Render (`https://tech-auction-server.onrender.com/api/health` returning `200 OK`).

---

## 2. Exact Error
- **HTTP Status Code**: `500 Internal Server Error`
- **Error Code**: `500 FUNCTION_INVOCATION_FAILED`
- **Vercel Edge Trace ID**: `bom1::wzr72-1790223687350-2b2fa77269d8`
- **Error Description**: *"This page is unavailable. A function needed by this page temporarily failed. FUNCTION_INVOCATION_FAILED"*

---

## 3. Repository Structure
The repository is an npm monorepo configured as follows:
- **Repository Root**: `c:\Users\manue\OneDrive\Desktop\Tech Auction`
- **Frontend Root**: `c:\Users\manue\OneDrive\Desktop\Tech Auction\apps\web`
- **Backend Root**: `c:\Users\manue\OneDrive\Desktop\Tech Auction\apps\server`
- **Workspace Configuration**: `package.json` (`"workspaces": ["apps/server", "apps/web"]`)
- **Package Manager & Lockfile**: `npm` with root `package-lock.json`
- **Frontend Configuration**: `apps/web/package.json`, `apps/web/vite.config.js`, `apps/web/index.html`
- **Infrastructure Specs**: `vercel.json` (root), `apps/web/vercel.json`, `render.yaml`

---

## 4. Vercel Configuration
Currently committed Vercel configuration files:
- **Root `vercel.json`**:
  ```json
  {
    "version": 2,
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
- **`apps/web/vercel.json`**:
  ```json
  {
    "version": 2,
    "rewrites": [
      {
        "source": "/(.*)",
        "destination": "/index.html"
      }
    ]
  }
  ```

---

## 5. Root Directory Analysis
- **If Root Directory = `.` (Repository Root)**: Vercel executes root `npm run build` (`npm run build -w apps/web`), outputs static assets to `apps/web/dist`, and checks root `vercel.json`.
- **If Root Directory = `apps/web` (Subfolder)**: Vercel executes `apps/web` build script, outputs to `dist`, and reads `apps/web/vercel.json`.
- **Analysis**: The repository is designed for Root Directory = `.` (repository root) because `package-lock.json` and workspaces definition are located exclusively at the root.

---

## 6. Build Command Analysis
- **Root Build Command**: `npm run build` (invokes `npm run build -w apps/web`).
- **Frontend Build Script**: `vite build` inside `apps/web`.
- **Local Test Output**:
  ```text
  dist/index.html                   0.35 kB │ gzip:   0.25 kB
  dist/assets/index-DqC3bhSM.css   40.73 kB │ gzip:   7.44 kB
  dist/assets/index-Bub6CbQn.js   401.19 kB │ gzip: 110.51 kB
  ✓ built in 1.24s
  ```
- **Conclusion**: The build command itself executes with 0 errors and generates static production artifacts.

---

## 7. Frontend Build Result
- **Build Outcome**: Success.
- **Generated Assets**: Static HTML, CSS, and JS bundles inside `apps/web/dist/`.
- **Compilation Health**: Zero syntax errors, zero missing module errors, zero bundle resolution failures.

---

## 8. Environment Variable Analysis

| Variable | Required? | Used By | Type | Expected Value Format | Public Exposure Safe? |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `VITE_API_URL` | Optional (Fallback: `http://localhost:4000`) | `apps/web/src/config/api.js` | Build-time | `https://tech-auction-server.onrender.com` | YES (Public API Base) |
| `VITE_SOCKET_URL` | Optional (Fallback: `http://localhost:4000`) | `apps/web/src/config/api.js` | Build-time | `https://tech-auction-server.onrender.com` | YES (Public Socket Endpoint) |

- **Security Verification**: No private server secrets (`GEMINI_API_KEY`, `SESSION_SECRET`, `ADMIN_PASSWORD`) are prefixed with `VITE_` or referenced in frontend code.

---

## 9. Localhost Reference Analysis
- **Location**: `apps/web/src/config/api.js` lines 4–5.
- **Code**:
  ```javascript
  export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
  export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';
  ```
- **Impact**: `localhost` is strictly a fallback default when `VITE_API_URL` / `VITE_SOCKET_URL` are omitted during Vercel build. It does not cause Vercel 500 serverless function errors.

---

## 10. API Configuration
- Centralized in `apps/web/src/services/api.js`.
- Constructs endpoints using `API_BASE_URL + '/api/...'`.
- Uses native `fetch()` API with JSON headers and Authorization Bearer headers.

---

## 11. Socket.IO Configuration
- Centralized in `apps/web/src/services/socket.js`.
- Connects to `SOCKET_URL` using `transports: ['websocket', 'polling']`.
- Configured with automatic reconnection (`reconnectionAttempts: Infinity`).

---

## 12. CORS Analysis
- Backend `app.js` sets `cors({ origin: config.clientOrigin, credentials: true })`.
- On Render, `CLIENT_ORIGIN` is configured to `https://tech-auction-2026.vercel.app`.
- Mismatch check: CORS settings are valid and do not cause Vercel 500 edge errors.

---

## 13. Render Connectivity
- **Render Web Service**: `https://tech-auction-server.onrender.com`
- **Health Check Status**: `200 OK` (`{ success: true, data: { status: 'ok', database: 'connected' } }`).
- **Backend Status**: Reachable and active.

---

## 14. SPA Routing
- The frontend uses state-based view switching in `App.jsx` (`/` vs `/admin`).
- Requests to `/admin` or nested routes need Vercel rewrites to target `/index.html` instead of looking for dynamic endpoints.

---

## 15. Dependency Analysis
- All dependencies (`react`, `react-dom`, `@vitejs/plugin-react`, `@tailwindcss/vite`, `socket.io-client`) are declared in `apps/web/package.json`.
- Lockfile `package-lock.json` is present at repository root.
- `npm audit` returned `0 vulnerabilities`.

---

## 16. Node Version Analysis
- Project is compatible with Node.js 18.x and 20.x.
- Vercel default runtime environment: Node.js 20.x.
- No Node version mismatch found.

---

## 17. Root Cause
**PRIMARY ROOT CAUSE**: Legacy `"version": 2` directive in `vercel.json` and `apps/web/vercel.json`.

- **Explanation**: Setting `"version": 2` in `vercel.json` signals to Vercel that the repository uses legacy Vercel Serverless Function builders (`Build Output API v2`). Because the project is a pure static Vite SPA (without `api/*.js` serverless function handlers), Vercel's edge router attempts to invoke a non-existent serverless function execution handler for incoming requests, resulting in `500 FUNCTION_INVOCATION_FAILED`.
- For static Vite applications, `"version": 2` must be omitted so Vercel uses its standard static file serving engine.

---

## 18. Secondary Issues
1. **Redundant Config File**: `apps/web/vercel.json` mirrors root `vercel.json` and creates ambiguity if Vercel Root Directory setting is changed in the UI dashboard.
2. **Missing Environment Variables on Vercel**: If `VITE_API_URL` and `VITE_SOCKET_URL` are not added to Vercel Project Settings, client API calls fall back to `http://localhost:4000`.

---

## 19. Recommended Fix
1. Remove `"version": 2` from `vercel.json` (and `apps/web/vercel.json`).
2. Keep clean `rewrites` configuration in `vercel.json`:
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
3. Set environment variables `VITE_API_URL` and `VITE_SOCKET_URL` in Vercel Dashboard to `https://tech-auction-server.onrender.com`.

---

## 20. Risk of Fix
- **Risk Level**: `ZERO RISK`.
- Removing `"version": 2` allows Vercel to serve static Vite HTML/JS assets natively without function invocation layers.

---

## 21. Verification Plan
1. Update `vercel.json` as specified in Recommended Fix.
2. Commit and push to GitHub `main` branch.
3. Observe Vercel deployment logs to ensure static deployment succeeds.
4. Open `https://tech-auction-2026.vercel.app` and test direct navigation to `/admin`.

---

## 22. Files That Would Need Modification
1. `vercel.json` (Remove `"version": 2`)
2. `apps/web/vercel.json` (Remove `"version": 2` or delete redundant file)
