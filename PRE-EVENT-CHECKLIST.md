# TECH AUCTION 2026 — PRE-EVENT CHECKLIST

Department of Information Technology  
SNS College of Technology  

---

## BEFORE EVENT (PRE-START PREPARATION)

- [ ] **Database Backup & Reset**
  - [ ] Create a physical copy/backup of SQLite database (`tech-auction.sqlite`).
  - [ ] Execute `[ RESET DEMO EVENT DATA ]` via Organizer Admin Panel if re-initializing.
- [ ] **Environment Configuration (`.env`)**
  - [ ] Verify `PORT=5000`, `NODE_ENV=production` or `development`.
  - [ ] Verify `CLIENT_ORIGIN` matches host URL (e.g., `http://localhost:5173` or local LAN IP).
  - [ ] Verify `ADMIN_USERNAME` and `ADMIN_PASSWORD` are updated from default defaults.
  - [ ] Verify `GEMINI_API_KEY` is present and valid.
- [ ] **Gemini AI Model Verification**
  - [ ] Run test request via server to confirm Gemini API key quota and model availability (`gemini-1.5-flash`).
- [ ] **Team Registrations & Credentials**
  - [ ] Import/verify team CSV roster via Organizer Admin (`/api/admin/import/registrations`).
  - [ ] Confirm team codes, default PINs (`1234`), college names, and department info.
  - [ ] Confirm `auction_eligible = 1` for participating teams.
- [ ] **Challenge Projects & Lab Isolation**
  - [ ] Confirm CampusConnect application starts cleanly.
  - [ ] Confirm SecureVault laboratory runs locally with synthetic data.
  - [ ] Verify student README files do NOT expose organizer solution guides (`SOLUTION.md`).
- [ ] **Auction Catalog Verification**
  - [ ] Verify Full-Stack items (`FS-01` to `FS-05` including `FS-05 AI ASSIST`).
  - [ ] Verify Cybersecurity items (`CY-01` to `CY-06` including `CY-06 AI ASSIST`).
  - [ ] Confirm wallet initial balances (default 1,000 credits per team).
- [ ] **Event Timing & Controls**
  - [ ] Set event status to `SETUP` or `READY`.
  - [ ] Set `challenge_deadline` (2-hour duration from planned start).
  - [ ] Set `leaderboard_visible = false`.
- [ ] **Infrastructure & Venue Setup**
  - [ ] Test organizer laptop connected to local network / router.
  - [ ] Confirm faculty judges briefed on 60/15/10/10/5 (Full-Stack) and 30/20/15/20/10/5 (Cybersecurity) evaluation rubrics.
  - [ ] Test student network connectivity to organizer server IP.

---

## DURING EVENT (LIVE SUPERVISION)

- [ ] **Event Start**
  - [ ] Transition event status from `READY` to `LIVE`.
- [ ] **Auction Room Supervision**
  - [ ] Monitor live bids on organizer Auction Control panel for both `full-stack` and `cybersecurity` tracks.
  - [ ] Ensure AI ASSIST winners receive entitlement tokens automatically.
- [ ] **AI Assist Monitoring**
  - [ ] Keep `⚡ AI ASSIST MONITOR` tab open to track request counts and session expiry.
- [ ] **Anti-Malpractice Supervision**
  - [ ] Monitor `🛡️ ANTI-MALPRACTICE` panel for real-time `TAB_HIDDEN`, `WINDOW_BLUR`, `FULLSCREEN_EXIT`, `DEVTOOLS_SUSPECTED`, and `MULTIPLE_SESSION` signals.
  - [ ] Handle any necessary team warnings, reviews, or suspensions with mandatory reason logging.
- [ ] **Submission Tracking**
  - [ ] Monitor incoming zip/file submissions on `📝 SUBMISSIONS & EVALUATION` panel.

---

## AFTER EVENT (WRAP-UP & LEADERBOARD)

- [ ] **Stop Competition Activity**
  - [ ] Transition event state to `ENDED` after confirmation prompt.
- [ ] **Faculty Evaluation & Judging**
  - [ ] Judges grade submissions out of 100 points using official rubrics.
  - [ ] Mark evaluated scores as `FINAL`.
- [ ] **Publish Leaderboard**
  - [ ] Toggle `SHOW LEADERBOARD TO STUDENTS` (`leaderboard_visible = true`).
- [ ] **Data Export & Archiving**
  - [ ] Copy final `tech-auction.sqlite` database and save event audit logs.
