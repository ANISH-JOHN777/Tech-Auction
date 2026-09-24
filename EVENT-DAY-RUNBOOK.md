# TECH AUCTION 2026 — EVENT-DAY OPERATIONAL RUNBOOK

**Department of Information Technology — SNS College of Technology**  
**Event**: TECH AUCTION 2026 Hackathon  
**Target Architecture**: Supabase PostgreSQL + Render Backend + Vercel SPA  

---

## Chronological Operational Procedure

| Time Marker | Phase | WHO | DOES WHAT | WHERE IN UI | EXPECTED RESULT | WHAT TO DO IF IT FAILS |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **T-60 min** | Infrastructure Verification | Technical Lead | Send GET request to health endpoint | Browser URL: `https://tech-auction-server.onrender.com/api/health` | Returns `200 OK` with `{ status: "ok", database: "connected" }`. | Check Render dashboard service logs. If cold starting, wait 30s. Verify Supabase connection string if 503. |
| **T-45 min** | Organizer Login & State Setup | Faculty Lead | Log into admin portal & verify state | URL: `/admin` → Enter `admin` / `admin123` | Logged into Admin Dashboard. Event status displays `SETUP`. | Verify password in `.env`. If blocked, clear localStorage `tech_auction_admin_token` & retry. |
| **T-30 min** | Catalog & Team Seed Check | Technical Lead | Verify team list & auction catalog | Admin Dashboard → **Teams** & **Auction Control** | All 6 demo/registered teams present with 1000 credits each; 11 auction items loaded. | Click **Reset Demo Data** or run `npm run db:seed` from backend terminal. |
| **T-15 min** | Student Arrival & Briefing | Event Host | Distribute Team Codes (`FS01`-`FS03`, `CY01`-`CY03`) & PINs (`1234`) | Stage / Projection Screen | Students receive team credentials and open portal URL (`https://tech-auction-2026.vercel.app`). | Provide physical backup credential cards to team leads. |
| **T-10 min** | Move State to READY | Faculty Lead | Click **Change State to READY** | Admin Dashboard → **Event State Control** | Event status changes to `READY`. Student login enabled; track selection form unlocked. | Refresh admin page. Check server logs if database write fails. |
| **T-0 min** | Move State to LIVE | Faculty Lead | Click **Start Event (LIVE)** | Admin Dashboard → **Event State Control** | Event status updates to `LIVE`. Full platform bidding and challenge capabilities unlocked. | Verify event state in database (`event_settings` key `event_status`). |
| **T+5 min** | Student Login & Track Lock | Student Teams | Log in with team code/PIN & select track | Student Portal → Login & Track Selection | Team authenticated; track locked to `full-stack` or `cybersecurity`. | Verify PIN with faculty. Ensure team login enabled toggle is ON in admin team management. |
| **T+15 min** | Full-Stack Auction Round | Faculty Operator | Launch Full-Stack Auction items (e.g. `FS-05` AI Assist) | Admin Dashboard → **Auction Control** → Click **Start Auction Item** | Item countdown starts (90s); teams bid in real time; highest bidder wins upon timer expiry. | Pause auction if network latency is reported. Timer auto-reconstructs on refresh. |
| **T+30 min** | Cybersecurity Auction Round | Faculty Operator | Launch Cybersecurity Auction items (e.g. `CY-06` AI Assist) | Admin Dashboard → **Auction Control** → Select `cybersecurity` track → Start Item | Separate cybersecurity room active; bidding isolated from full-stack room. | Verify room isolation. If bids cross-stream, refresh socket connections. |
| **T+45 min** | Challenge Execution & AI Assist | Student Teams | Access challenge workspace & activate AI Assist | Student Dashboard → Challenge Workspace & AI Desk | Teams solve challenges. AI winners prompt Gemini for guidance within request quota (30 max). | If AI entitlement fails, verify entitlement status in Admin AI Monitor panel. |
| **T+120 min**| Submission Phase | Student Teams | Draft response notes & click **SUBMIT FINAL SOLUTION** | Student Dashboard → Submission Form | Submission status updates to `FINAL`; form locks against further modifications. | If final submit fails, verify team is not suspended or event isn't PAUSED. |
| **T+150 min**| Faculty Evaluation | Faculty Judges | Review submissions & enter rubric scores | Admin Dashboard → **Submissions** → Click **Evaluate** | Rubric scores validated; server calculates total score; audit event recorded. | Ensure score components stay within max category limits (60/15/10/10/5 or 30/20/15/20/10/5). |
| **T+170 min**| Publish Leaderboard | Faculty Lead | Click **Publish Leaderboard** | Admin Dashboard → **Event Controls** → Toggle **Leaderboard Visibility** | Leaderboard becomes public on student portals, sorted by total score DESC. | Verify all teams are scored before toggling visibility ON. |
| **T+180 min**| Event Termination | Faculty Lead | Click **End Event (ENDED)** | Admin Dashboard → **Event State Control** | Event state transitions to `ENDED`. Competition locked; official winners declared. | Backup audit logs and export database records. |
