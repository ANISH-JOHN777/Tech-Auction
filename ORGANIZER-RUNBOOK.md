# TECH AUCTION 2026 — ORGANIZER OPERATIONAL RUNBOOK

Department of Information Technology  
SNS College of Technology  

---

## 1. System Initialization & Startup Sequence

1. **Open Workspace Directory**:
   ```bash
   cd "Tech Auction"
   ```

2. **Configure Local Environment (`.env`)**:
   Ensure `.env` contains:
   ```env
   PORT=5000
   NODE_ENV=production
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=admin123
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. **Start Backend Server**:
   ```bash
   npm run dev -w apps/server
   ```
   *Server starts on `http://localhost:5000` with SQLite database `tech-auction.sqlite` initialized.*

4. **Start Web Frontend**:
   ```bash
   npm run dev -w apps/web
   ```
   *Frontend starts on `http://localhost:5173`.*

---

## 2. Organizer Pre-Event Workflow

1. **Login as Admin**:
   - Navigate to `http://localhost:5173/admin` (or click Admin Login).
   - Enter `admin` / `admin123`.

2. **Reset Demo Event Data (Optional)**:
   - Go to `TEAMS MANAGEMENT` or `EVENT CONTROLS`.
   - Click `[ RESET DEMO EVENT DATA ]` to restore a clean state.

3. **Import Registration Roster**:
   - Go to `CSV REGISTRATION IMPORT` tab.
   - Paste team CSV or load standard roster.
   - Verify teams are listed under `TEAMS MANAGEMENT`.

4. **Assign Track & Mark Auction Eligibility**:
   - Under `TEAMS MANAGEMENT`, set challenge selection (`full-stack` or `cybersecurity`).
   - Enable `auction_eligible = 1` for teams eligible to enter auction.

5. **Configure Event Status to READY**:
   - Go to `⚙️ EVENT CONTROLS`.
   - Click `[ MARK EVENT READY ]`.
   - Students logging in see **"TECH AUCTION STARTING SOON"** and remain in waiting room.

---

## 3. Live Event Execution (2-Hour Timeline)

### **Phase 1: Event Start (0:00)**
- Click `[ START EVENT ]` on `⚙️ EVENT CONTROLS` panel.
- Event state changes to `LIVE`.

### **Phase 2: Tech Auction Track Rounds (0:05 – 0:35)**
- Open `AUCTION ENGINE CONTROL` tab.
- Click `[ START AUCTION ]` for `full-stack` track item (e.g. `FS-05 AI ASSIST`).
- Bidding proceeds in real-time. Winning team's credits are deducted and entitlement assigned automatically.
- Repeat for `cybersecurity` track items (`CY-06 AI ASSIST`).

### **Phase 3: Student Challenge Activity & Supervision (0:35 – 1:45)**
- Students work on CampusConnect (Full-Stack) or SecureVault (Cybersecurity).
- **AI Assist**: Teams with winning entitlement can use Gemini AI assistant under `⚡ AI ASSIST MONITOR`.
- **Anti-Malpractice**: Organizers monitor `🛡️ ANTI-MALPRACTICE` panel for window blur, tab hidden, or multiple session signals.
- **Team Actions**: If malpractice is verified, click `[ ACTION ]` -> `SUSPENDED` or `DISQUALIFIED` with mandatory reason.

### **Phase 4: Submission Deadline (1:45)**
- Server automatically rejects submissions after `challenge_deadline`.
- Click `[ END EVENT ]` on `⚙️ EVENT CONTROLS` (requires confirmation).
- All bidding, AI chat, and submission endpoints are blocked.

---

## 5. Evaluation, Judging & Final Results

1. **Faculty Judging**:
   - Go to `📝 SUBMISSIONS & EVALUATION`.
   - Faculty judges review submissions against official rubrics:
     - **Full-Stack (100 pts)**: Bug Fixes (60), Functional Testing (15), Code Quality (10), Technical Explanation (10), Presentation (5).
     - **Cybersecurity (100 pts)**: Vulnerability ID (30), Evidence & Analysis (20), Risk Impact (15), Mitigation Fix (20), Report Quality (10), Presentation (5).
   - Enter scores and click `[ FINALIZE SCORE ]`.

2. **Publish Official Leaderboard**:
   - Go to `⚙️ EVENT CONTROLS`.
   - Click `🏆 SHOW LEADERBOARD TO STUDENTS`.
   - Final ranked standings become visible to all participants.

3. **Backup Database**:
   - Copy `apps/server/tech-auction.sqlite` to secure backup folder.
