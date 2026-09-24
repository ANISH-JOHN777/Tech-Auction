# TECH AUCTION 2026 — POST-EVENT CHECKLIST & SHUTDOWN PROCEDURE

**Department of Information Technology — SNS College of Technology**  
*Must be completed immediately following event conclusion.*

---

## Post-Event Verification Steps

- [ ] **1. Finalize Submissions & Evaluation**
  - Verify all student submissions have status `FINAL`.
  - Confirm every submission has been graded by faculty judges (`scores` table entries complete).
  - Verify total score calculations and tie-breaker ordering.

- [ ] **2. Public Leaderboard & Winner Declaration**
  - Toggle **Leaderboard Visibility** to `ON` in Admin Event Controls.
  - Project official leaderboard rankings on main hall screen.
  - Announce track winners (Full-Stack Champion & Cybersecurity Champion).

- [ ] **3. Event Termination & State Lock**
  - Change event state to `ENDED` in Admin Dashboard.
  - Confirm all active bidding rooms, AI endpoints, and submission APIs are locked.

- [ ] **4. Audit & Record Preservation**
  - Verify audit events in `event_admin_actions` and `evaluation_events` tables.
  - Verify anti-malpractice violation records in `violations` table.
  - Export database records or create database dump if required for college archives.

- [ ] **5. Credential & Access Security**
  - Log out of organizer admin sessions on all faculty devices.
  - Clear temporary admin session tokens (`tech_auction_admin_token`) from browser storage.
  - Change default admin password (`ADMIN_PASSWORD`) on production environment settings if reusing deployment.

- [ ] **6. Incident Documentation & Debrief**
  - Review any logged technical or behavioral incidents in `EMERGENCY-RECOVERY.md`.
  - Document operational observations and faculty feedback for future hackathon events.
