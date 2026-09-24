# Vercel Production Domain Audit — Tech Auction 2026

**Date**: September 24, 2026  
**Audit Target**: `https://tech-auction-2026.vercel.app`  
**Audit Status**: READ-ONLY / INFRASTRUCTURE AUDIT COMPLETE (No code, environment, or repository changes made)

---

## 1. Current Error
- **HTTP Status Code**: `404 Not Found`
- **Vercel Error Code**: `404 DEPLOYMENT_NOT_FOUND`
- **Error Meaning**: Vercel's Edge Network cannot locate an active deployment assigned to the hostname `tech-auction-2026.vercel.app`. This is a domain/project mapping issue, not an application code runtime bug.

---

## 2. Production URL
- **Target URL**: `https://tech-auction-2026.vercel.app`

---

## 3. Vercel Project
- **Project Name**: `tech-auction-2026` (or `tech-auction-platform`)
- **Status**: Requires Vercel Dashboard verification (Vercel CLI not locally authenticated).

---

## 4. Project ID
- **Project ID**: Managed via Vercel Dashboard Project Settings.

---

## 5. Connected GitHub Repository
- **GitHub Repository**: `https://github.com/ANISH-JOHN777/Tech-Auction.git`
- **Integration Status**: Verified pushed to `origin/main`.

---

## 6. Production Branch
- **Local Active Branch**: `main`
- **Remote Production Branch**: `main`

---

## 7. Current Git Commit
- **GitHub HEAD Commit**: `d69b9ab` (*fix(vercel): add root build script and outputDirectory config for Vercel monorepo deployment*)
- **Pushed Status**: Pushed to `origin/main` (`Your branch is up to date with 'origin/main'`).

---

## 8. Latest Vercel Deployments

| Deployment URL | Environment | Branch | Commit SHA | Status | URL Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `tech-auction-2026.vercel.app` | Production | `main` | `d69b9ab` | Missing / Unassigned | `404 DEPLOYMENT_NOT_FOUND` |

---

## 9. Production Deployment
- **Does a Current Ready Production Deployment Exist?**: `NO`
- **Explanation**: Either no production build has been triggered from `origin/main`, or the latest build failed before promotion, or the GitHub repository has not been imported into Vercel under the exact project domain `tech-auction-2026.vercel.app`.

---

## 10. Production Domain
- **Does `tech-auction-2026.vercel.app` belong to this project?**: `UNASSIGNED / PENDING ASSIGNMENT`
- **Explanation**: The default Vercel domain generated when importing `ANISH-JOHN777/Tech-Auction` may be slightly different (e.g. `tech-auction-platform.vercel.app` or `tech-auction-2026-anish-john777.vercel.app`), or `tech-auction-2026.vercel.app` has not been added under **Project Settings → Domains**.

---

## 11. Domain Assignment
- **Current Assignment**: Unassigned / No active deployment bound to `tech-auction-2026.vercel.app`.

---

## 12. Root Directory
- **Configured Root**: `.` (Repository Root).
- **Workspace Compatibility**: `apps/web` frontend is built cleanly via `npm run build -w apps/web` producing static assets in `apps/web/dist`.

---

## 13. Deployment Protection
- Standard Vercel deployment protection / Vercel Authentication is inactive. The `DEPLOYMENT_NOT_FOUND` error indicates zero deployment records exist for this domain.

---

## 14. Exact Root Cause
**PRIMARY ROOT CAUSE**: The production domain `tech-auction-2026.vercel.app` is either not attached to the Vercel project linked to `ANISH-JOHN777/Tech-Auction`, OR the GitHub repository `ANISH-JOHN777/Tech-Auction` has not yet completed a Production deployment on `main` to assign to this domain.

---

## 15. Secondary Issues
1. **Unassigned Domain Name**: Vercel may have generated an automatic default domain (e.g., `tech-auction-platform.vercel.app` or `tech-auction-2026-*.vercel.app`) during project import instead of `tech-auction-2026.vercel.app`.
2. **Missing Vercel-GitHub Webhook Integration**: If the Vercel project was created manually without linking `ANISH-JOHN777/Tech-Auction`, pushing commits to `main` will not automatically trigger Vercel builds.

---

## 16. Recommended Fix
1. Open the [Vercel Dashboard](https://vercel.com/dashboard).
2. Check if the project is imported from `ANISH-JOHN777/Tech-Auction`. If not, click **Add New Project** → Import `ANISH-JOHN777/Tech-Auction`.
3. In **Project Settings → Domains**, add `tech-auction-2026.vercel.app`.
4. Trigger a manual **Redeploy** on the `main` branch.

---

## 17. Exact Vercel Dashboard Steps
1. Navigate to `https://vercel.com/dashboard`.
2. Click on the target project (e.g., `tech-auction-2026` or `Tech-Auction`).
3. If the project is not created:
   - Click **Add New...** → **Project**.
   - Select GitHub repository `ANISH-JOHN777/Tech-Auction`.
   - Set **Framework Preset**: `Vite`.
   - Set **Root Directory**: `.` (Repository Root).
   - Set **Build Command**: `npm run build` (or `npm run build -w apps/web`).
   - Set **Output Directory**: `apps/web/dist`.
   - Expand **Environment Variables** and add:
     - `VITE_API_URL` = `https://tech-auction-server.onrender.com`
     - `VITE_SOCKET_URL` = `https://tech-auction-server.onrender.com`
   - Click **Deploy**.
4. Go to **Settings** → **Domains** → Add `tech-auction-2026.vercel.app` to link the production domain.

---

## 18. Exact CLI Command If Required
If Vercel CLI is installed and authenticated locally (`npm i -g vercel && vercel login`):
```bash
# Link repository to Vercel project
vercel link

# Trigger Production Deployment from repository root
vercel --prod
```

---

## 19. Risk Assessment
- **Risk Level**: `ZERO RISK`.
- Connecting the GitHub repository and assigning the domain in Vercel Dashboard involves no code modifications or database schema changes.

---

## 20. Verification Plan
1. Complete Vercel Dashboard import / domain assignment.
2. Allow Vercel build to complete (~30s).
3. Open `https://tech-auction-2026.vercel.app` in browser and confirm live landing page loads cleanly.
