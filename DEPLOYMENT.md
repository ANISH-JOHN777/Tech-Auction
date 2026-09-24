# TECH AUCTION 2026 — DEPLOYMENT READINESS & INFRASTRUCTURE GUIDE

Department of Information Technology  
SNS College of Technology  

---

## 1. Operating Modes Overview

### **A. CLOUD FREE DEPLOYMENT (Recommended Architecture — ₹0 Cost)**
- **Frontend**: Vercel Free Tier (Static Single Page Application built with Vite/React).
- **Backend Service**: Render Free Web Service (Node.js + Express + Socket.IO on 0.0.0.0:${PORT}).
- **Database**: Supabase Free PostgreSQL Pool (Server-authoritative PostgreSQL database with SSL).
- **AI Assist**: Google Gemini API (Free Tier quota).

### **B. LOCAL / HYBRID CLOUD MODE**
- **Backend Server**: Node.js running on Port `4000` (or `PORT`).
- **Database**: Local or Remote PostgreSQL (`DATABASE_URL`).
- **Frontend Web App**: Vite dev server or static build (`npm run build -w apps/web`).

---

## 2. Environment Variables Configuration

| Variable | Description | Local / Development | Production Value |
| :--- | :--- | :--- | :--- |
| `PORT` | Node server port | `4000` | Provided automatically by Render (`process.env.PORT`) |
| `NODE_ENV` | Environment mode | `development` | `production` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/tech_auction` | Supabase Transaction Pooler URL (`postgresql://postgres.[ref]:[pass]@...supabase.com:6543/postgres`) |
| `CLIENT_ORIGIN` | Authorized CORS origin | `http://localhost:5173` | Vercel production frontend URL (`https://tech-auction.vercel.app`) |
| `ADMIN_USERNAME` | Organizer admin username | `admin` | `sns_admin_2026` |
| `ADMIN_PASSWORD` | Organizer admin password | `admin123` | `[SECURE_ORGANIZER_PASS]` |
| `GEMINI_API_KEY` | Google Gemini API Key | `[API_KEY]` | `[PRODUCTION_GEMINI_KEY]` |
| `SESSION_SECRET` | Secret key for signing sessions | `dev-secret-key-12345` | `[RANDOM_SECURE_SECRET]` |

---

## 3. Deployment Build & Execution Commands

### **Step 1: Install Dependencies**
```bash
npm install
```

### **Step 2: Run Database Migrations**
```bash
npm run db:migrate
```

### **Step 3: Seed Catalog & Initial Teams**
```bash
npm run db:seed
```

### **Step 4: Verify Database Health**
```bash
npm run db:health
```

### **Step 5: Build Web Frontend (Vercel Build Target)**
```bash
npm run build -w apps/web
```
*Creates optimized static distribution bundle in `apps/web/dist`.*

### **Step 6: Start Production Server (Render Start Target)**
```bash
npm run start -w apps/server
```

---

## 4. Reverse Proxy & CORS Configuration

Render automatically places Node.js applications behind a reverse proxy handling TLS termination. `apps/server/src/app.js` is configured with:
```javascript
app.set('trust proxy', 1);
```
CORS headers allow requests from `CLIENT_ORIGIN` and `VITE_API_URL` endpoints, enabling credentials (`credentials: 'include'`).

---

## 5. PostgreSQL Database Backup & Restore

### **Database Dump (Backup)**
```bash
pg_dump "$DATABASE_URL" -F c -b -v -f tech_auction_backup_$(date +%Y%m%d_%H%M%S).dump
```

### **Database Restore**
```bash
pg_restore --clean --if-exists --no-acl --no-owner -d "$DATABASE_URL" tech_auction_backup_target.dump
```
