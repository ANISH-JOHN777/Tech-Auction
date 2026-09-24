# TECH AUCTION 2026 — EMERGENCY RECOVERY PROCEDURES

**Department of Information Technology — SNS College of Technology**  
*Incident Response Protocols & Recovery Procedures.*

---

## Standard Incident Response Template
For every operational incident, follow the 5-step response protocol:
1. **Immediate Action**: Contain the incident and prevent data corruption.
2. **Verify State**: Query system state or database records to establish truth.
3. **Recovery**: Execute documented recovery procedure.
4. **Escalation**: Notify Technical Lead / Faculty Lead if unresolved within 3 minutes.
5. **Audit/Documentation**: Log incident details in event incident record.

---

## Operational Incident Protocols

### 1. Student Cannot Login
- **Immediate Action**: Check team code and PIN formatting. Ensure team login enabled toggle is active in admin panel.
- **Verify State**: Admin Dashboard → **Teams** → Confirm team code exists and status is `ACTIVE`.
- **Recovery**: If PIN is forgotten, admin can verify PIN `1234` or toggle login state OFF/ON.
- **Escalation**: Run `npm run db:seed` from backend terminal if team table is missing records.
- **Audit**: Log team login support request.

### 2. Frontend Unavailable (Vercel SPA)
- **Immediate Action**: Check browser console for network connection errors.
- **Verify State**: Open `https://tech-auction-2026.vercel.app` on secondary device.
- **Recovery**: Hard refresh (`Ctrl+F5`) or open Incognito tab.
- **Escalation**: Check Vercel deployment status dashboard.
- **Audit**: Note downtime window.

### 3. Backend Unavailable / 503 Gateway Error (Render Server)
- **Immediate Action**: Ping `https://tech-auction-server.onrender.com/api/health`.
- **Verify State**: Observe server response. If 503, Render web service is down or cold-starting.
- **Recovery**: Allow 30–50 seconds for Render free container to boot from sleep.
- **Escalation**: Trigger manual service restart in Render Dashboard.
- **Audit**: Record cold start delay.

### 4. Socket.IO Disconnected Banner
- **Immediate Action**: Advise student to stay on current page. Do not close browser tab.
- **Verify State**: Check top-right connection indicator on student navigation bar.
- **Recovery**: Socket.IO client automatically retries connection every 2 seconds. When restored, client re-joins room and syncs state automatically.
- **Escalation**: If disconnected > 2 minutes, check Render server status.
- **Audit**: Log socket reconnection event.

### 5. Database Connection Problem (Supabase PostgreSQL)
- **Immediate Action**: Check server logs for `DATABASE_DISCONNECTED` or connection pool timeouts.
- **Verify State**: `npm run db:health` or `/api/health`.
- **Recovery**: Verify Supabase transaction pooler port `6543` and `DATABASE_URL` credentials. Server automatically uses `pg-mem` fallback in test/dev modes.
- **Escalation**: Restart database connection pool via Render environment restart.
- **Audit**: Document database outage.

### 6. Gemini AI Provider Unavailable / Rate Limit
- **Immediate Action**: AI endpoint returns `502 AI_PROVIDER_ERROR` or request quota exhausted alert.
- **Verify State**: Check Admin **AI Monitor** for request count (`maxRequests: 30`).
- **Recovery**: The platform gracefully catches provider errors without crashing. Student can retry prompt or rely on standard technical hints.
- **Escalation**: Verify `GEMINI_API_KEY` quota in Google AI Studio console.
- **Audit**: Log AI quota limit or provider error.

### 7. Student Browser Crash / Accidental Tab Closure
- **Immediate Action**: Re-open browser and navigate back to `https://tech-auction-2026.vercel.app`.
- **Verify State**: Student logs in with team code/PIN.
- **Recovery**: Session token stored in `localStorage` restores team context, locked challenge track, wallet balance, and purchased advantages instantly.
- **Escalation**: If session is invalid, re-authenticate via login portal.
- **Audit**: No loss of data.

### 8. Network Interruption During Live Auction
- **Immediate Action**: Admin pauses auction if widespread network disruption occurs.
- **Verify State**: Admin Dashboard → **Auction Control** → Check current item status.
- **Recovery**: Timers are authoritative on server (`timer_ends_at`). Upon reconnect, client receives current remaining time.
- **Escalation**: If timer expired during outage, admin can launch a replacement auction item.
- **Audit**: Record auction pause/resume timestamps.

### 9. Incorrect Rubric Score Finalized by Judge
- **Immediate Action**: Notify Faculty Lead.
- **Verify State**: Admin Submissions → View finalized score for team.
- **Recovery**: Admin clicks **Reopen Submission**, enters justification notes, and submits updated rubric evaluation.
- **Escalation**: System generates an immutable `SUBMISSION_REOPENED` audit log entry.
- **Audit**: Audit record saved in `event_admin_actions`.

### 10. Accidental Event Pause
- **Immediate Action**: Admin clicks **Start Event (LIVE)**.
- **Verify State**: Confirm event status changes back to `LIVE`.
- **Recovery**: Normal bidding, AI access, and submission capabilities resume immediately.
- **Escalation**: None required.
- **Audit**: Action logged in admin audit history.

### 11. Suspicious Activity / Anti-Malpractice Alert Triggered
- **Immediate Action**: Open Admin **Anti-Malpractice Panel**.
- **Verify State**: Review violation log entry (type, severity, client metadata).
- **Recovery**: If false positive, click **Dismiss Violation**. If confirmed cheating, click **Suspend Team** or **Disqualify Team**.
- **Escalation**: Notify Faculty Head of Department.
- **Audit**: Audit record created for administrative action.

### 12. Final Submission Failure
- **Immediate Action**: Verify team submission status and event state.
- **Verify State**: Check if event state is `PAUSED` or team is `SUSPENDED`.
- **Recovery**: Ensure event state is `LIVE` and team status is `ACTIVE`. If deadline expired, admin can adjust deadline in Event Settings.
- **Escalation**: Assist team in submitting draft code before hard event termination.
- **Audit**: Document deadline extension if granted.
