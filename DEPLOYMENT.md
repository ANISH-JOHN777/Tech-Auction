# TECH AUCTION 2026 — DEPLOYMENT READINESS & INFRASTRUCTURE GUIDE

Department of Information Technology  
SNS College of Technology  

---

## 1. Operating Modes Overview

### **A. LOCAL EVENT MODE (Recommended for College Event)**
- **Architecture**: Single host laptop/server connected to a dedicated local Wi-Fi router / LAN switch.
- **Backend Server**: Node.js running on Port `5000`.
- **Database**: Embedded SQLite database file (`tech-auction.sqlite`).
- **Frontend Web App**: Vite dev server or static build served over LAN on Port `5173`.
- **Network**: All student laptops connect to host IP (e.g. `http://192.168.1.100:5173`).

### **B. NETWORKED / PRODUCTION MODE**
- **Reverse Proxy**: NGINX / Caddy forwarding HTTP requests on Port `80`/`443` to Node backend.
- **SSL / HTTPS**: Self-signed or Let's Encrypt certificate.
- **Process Manager**: PM2 running Node server in background (`pm2 start apps/server/src/index.js --name "tech-auction-server"`).

---

## 2. Environment Variables Configuration

| Variable | Description | Recommended Local Value | Production Value |
| :--- | :--- | :--- | :--- |
| `PORT` | Node server port | `5000` | `5000` |
| `NODE_ENV` | Environment mode | `development` | `production` |
| `CLIENT_ORIGIN` | Authorized CORS origin | `http://localhost:5173` | `http://192.168.1.100:5173` |
| `ADMIN_USERNAME` | Organizer admin username | `admin` | `sns_admin_2026` |
| `ADMIN_PASSWORD` | Organizer admin password | `admin123` | `[SECURE_ORGANIZER_PASS]` |
| `GEMINI_API_KEY` | Google Gemini API Key | `AIzaSy...` | `[PRODUCTION_GEMINI_KEY]` |
| `DB_PATH` | SQLite database file location | `./tech-auction.sqlite` | `/var/data/tech-auction.sqlite` |

---

## 3. Step-by-Step Production Build & Start Commands

### **Step 1: Install Dependencies**
```bash
npm install
```

### **Step 2: Build Web Frontend**
```bash
npm run build -w apps/web
```
*Creates optimized static distribution bundle in `apps/web/dist`.*

### **Step 3: Start Node Production Server**
```bash
node apps/server/src/index.js
```
*Server initializes database schema, seeds default catalog if empty, and listens for HTTP/WebSocket traffic.*

---

## 4. Reverse Proxy Setup (NGINX Example)

```nginx
server {
    listen 80;
    server_name techauction.local;

    # Frontend Static Assets
    location / {
        root /path/to/Tech Auction/apps/web/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 5. SQLite Backup & Restore Procedure

### **Backup Procedure**
1. Ensure database is not locked by heavy write transactions.
2. Copy `tech-auction.sqlite` to dated backup directory:
   ```bash
   cp apps/server/tech-auction.sqlite backups/tech-auction-backup-$(date +%Y%m%d_%H%M%S).sqlite
   ```

### **Restore Procedure**
1. Stop backend server process.
2. Replace `tech-auction.sqlite` with target backup file:
   ```bash
   cp backups/tech-auction-backup-target.sqlite apps/server/tech-auction.sqlite
   ```
3. Restart backend server.
