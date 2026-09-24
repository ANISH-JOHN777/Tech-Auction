# TECH AUCTION 2026 — FACULTY OPERATOR GUIDE

**Department of Information Technology — SNS College of Technology**  
*A plain-language guide for event organizers, judges, and faculty facilitators.*

---

## 1. Organizer Admin Access
To manage the event, open your browser and navigate to:
- **URL**: `https://tech-auction-2026.vercel.app/admin` (or click **ORGANIZER ADMIN** in the top navigation bar).
- **Default Username**: `admin`
- **Default Password**: `admin123`

---

## 2. Event Dashboard Overview
The Organizer Dashboard provides complete control over the hackathon:
1. **Event State Control**: Change event status (`SETUP` → `READY` → `LIVE` → `PAUSED` → `ENDED`).
2. **Team Management**: View registered teams, login status, wallet balances, and track selections.
3. **Auction Engine Controls**: Launch real-time bidding items for Full-Stack or Cybersecurity rooms.
4. **AI Assist Monitor**: Track which teams have purchased AI prompt credits and monitor their request counts.
5. **Submissions & Rubric Evaluation**: Review team submissions and grade them using standardized rubrics.
6. **Leaderboard Visibility Toggle**: Hide or publish official competition results.
7. **Anti-Malpractice & Audit Logs**: Monitor suspicious student browser actions (tab switches, focus loss).

---

## 3. Managing Event States
- **SETUP**: Default preparation mode. Student logins are blocked while organizers set up.
- **READY**: Team login and track selection unlocked. Bidding and challenge submissions remain locked.
- **LIVE**: Full event active. Bidding, challenge workspaces, AI assist, and submissions are active.
- **PAUSED**: Emergency freeze. Instantly halts all bidding, AI queries, and submissions. Displays a warning banner on all student screens.
- **ENDED**: Competition completed. All actions locked; final scores preserved.

---

## 4. Real-Time Auction Operation
1. Click **Auction Control** in the admin header.
2. Select the track (**Full-Stack** or **Cybersecurity**).
3. Pick an auction item (e.g., *FS-05 AI ASSIST* or *CY-01 Hint*).
4. Click **Start Auction Item** (Set duration, e.g., 90 seconds).
5. Watch the live bidding feed. The system automatically handles wallet checks, held balances, outbid refunds, and winner settlement upon countdown completion.

---

## 5. Wallet & Virtual Credits
- Every team starts with **1,000 virtual credits**.
- Credits are used during auctions to acquire hints, extra development time, or AI access.
- When a team places a bid, the bid amount is temporarily held. If another team outbids them, the held points are immediately returned.
- Winning bid amounts are permanently deducted upon auction completion.

---

## 6. AI Assist Monitoring
- Teams that win an `AI ASSIST` auction item receive a timed entitlement (15 minutes of AI prompt access).
- Organizers can view active AI sessions under **AI Monitor**.
- If a team engages in misconduct, faculty can click **Revoke AI Session** to terminate their access instantly.

---

## 7. Submission & Rubric Scoring
When teams finalize their work:
1. Go to **Submissions Admin** panel.
2. Select the team's track to filter submissions.
3. Click **Evaluate** next to a team submission.
4. Fill out the category sliders/input fields. The system automatically computes the total score out of 100.
5. Click **Finalize Evaluation**. This locks the score and records an audit log entry.

---

## 8. Publishing the Leaderboard
- The public leaderboard is **hidden by default** during the hackathon to prevent bias.
- Once all team evaluations are finalized, go to **Event Controls** and toggle **Leaderboard Visibility** to `ON`.
- Students can then view official rankings on their portal.

---

## 9. Team Suspension & Disqualification
If a team violates event rules or exhibits suspicious anti-malpractice alerts:
1. Navigate to **Teams Management**.
2. Click **Suspend** or **Disqualify** next to the target team code.
3. Enter an administrative reason (required).
4. Suspended teams are immediately blocked from placing bids, sending AI prompts, or submitting code.
