# TECH AUCTION 2026 — PHASE 11 REAL-WORLD TEST PLAN

**Project**: TECH AUCTION 2026 — HACKATHON PLATFORM MVP  
**Phase**: Phase 11 — Real User Testing & Bug Fixing  
**Date**: September 23, 2026  

---

## 1. Objectives & Scope
The objective of Phase 11 is to systematically test the platform end-to-end as participant teams and event administrators would experience it, identify defects, fix root causes, and verify zero regression against the 78-test backend baseline and production frontend build.

---

## 2. Test Workflows & Scenarios

### Workflow 1: Student Authentication & Session Lifecycle
- **Goal**: Verify student login, PIN validation, token persistence, and invalid login handling.
- **Scenarios**:
  1. Valid login using `FS01` and `CY01` with PIN `1234`.
  2. Invalid team code (e.g., `INVALID99`) or wrong PIN (e.g., `9999`).
  3. Session recovery via local storage token on page refresh.

### Workflow 2: Track Selection & Locking
- **Goal**: Verify team track association and server-side track lock.
- **Scenarios**:
  1. Unassigned team selects Full-Stack track (`CampusConnect`).
  2. Verify track selection is permanently locked on server.
  3. Verify team cannot change track after lock.

### Workflow 3: Dual-Track Auction Engine & Bidding
- **Goal**: Verify real-time Socket.IO auction room isolation, bid validation, wallet holds, outbids, and settlement.
- **Scenarios**:
  1. Team `FS01` places valid bid on Full-Stack item.
  2. Verify `held_balance` updates and `available_balance` decreases.
  3. Team `FS02` outbids `FS01`. Verify `FS01` held balance is released.
  4. Team `CY01` bids in Cybersecurity room. Verify `FS` teams do not receive `CY` auction socket events.
  5. Verify auction countdown timer expiration auto-finalizes winner and settles wallet balance.

### Workflow 4: Gemini AI Assist Entitlement Lifecycle
- **Goal**: Verify AI entitlement claim, 15-minute server-authoritative timer, request rate limits, and chat interface.
- **Scenarios**:
  1. Non-winner attempts to start AI Assist (expects rejection/locked UI).
  2. Auction winner starts 15-minute AI entitlement timer.
  3. Send technical questions to server-side Gemini API. Verify response formatting.
  4. Verify request counter (Max 30) and 4000 character length limit.
  5. Verify session expiry blocks further AI requests.

### Workflow 5: Solution Submission Portal
- **Goal**: Verify challenge draft uploads, reference links, final submission locks, and deadline enforcement.
- **Scenarios**:
  1. Submit draft package reference. Verify draft state.
  2. Submit final solution with confirmation. Verify status changes to `FINAL`.
  3. Attempt second final submission (expects server rejection).
  4. Attempt submission past deadline timestamp (expects server rejection).

### Workflow 6: Organizer Evaluation & Scoring Rubric
- **Goal**: Verify rubric scoring, server-side score calculation, judge notes, and submission reopening.
- **Scenarios**:
  1. Admin opens Full-Stack submission, inputs rubric components (60/15/10/10/5).
  2. Admin opens Cybersecurity submission, inputs rubric components (30/20/15/20/10/5).
  3. Save draft score vs Finalize score. Verify audit event created.
  4. Admin reopens submission. Verify team can update solution draft.

### Workflow 7: Live Leaderboard & Privacy Visibility Gate
- **Goal**: Verify official leaderboard rankings and privacy toggle.
- **Scenarios**:
  1. Leaderboard disabled in event settings -> verify student portal shows private mode banner.
  2. Leaderboard enabled -> verify correct ranks sorted by total score DESC, tie-broken by final `submitted_at` ASC.

### Workflow 8: Event State Control & Machine Enforcement
- **Goal**: Verify `SETUP` -> `READY` -> `LIVE` -> `PAUSED` -> `ENDED` transitions.
- **Scenarios**:
  1. Event in `PAUSED` state -> verify student bidding, AI assist, and submissions are blocked server-side.
  2. Event in `ENDED` state -> verify all competition endpoints return `EVENT_PAUSED` / `EVENT_ENDED` error codes.

### Workflow 9: Socket Reconnection & Network Resiliency
- **Goal**: Verify visual connection feedback and automatic socket reconnection.
- **Scenarios**:
  1. Simulate network disconnect / socket drop.
  2. Verify indicator shows `RECONNECTING` / `DISCONNECTED`.
  3. Restore connection -> verify `CONNECTED` badge and state re-sync.

### Workflow 10: Database & Server State Persistence
- **Goal**: Verify PostgreSQL server-authoritative state recovery.
- **Scenarios**:
  1. Refresh browser during active auction item. Verify room state restored.
  2. Refresh browser during active AI Assist session. Verify remaining timer matches server clock.

### Workflow 11: Security & Cross-Authorization Matrix
- **Goal**: Verify strict authorization boundaries.
- **Scenarios**:
  1. Student API token calling `/api/admin/*` endpoints (expects HTTP 403 / 401).
  2. Student `FS01` attempting to fetch or modify `CY01` submission or wallet.
  3. Suspended team attempting competition actions (expects rejection).

### Workflow 12: Mobile & Responsive Layout Audit
- **Goal**: Verify UI rendering across laptop, desktop, tablet, and mobile viewports.
- **Scenarios**:
  1. 1920x1080, 1440x900, 1366x768, 768x1024, 375x812 viewports.
  2. Verify horizontal scrollbar absence on main container, button alignment, modal overlay positioning, and text contrast.
