# TECH AUCTION 2026 — PHASE 11 BUG LOG

**Project**: TECH AUCTION 2026 — HACKATHON PLATFORM MVP  
**Phase**: Phase 11 — Real User Testing & Bug Fixing  
**Date**: September 23, 2026  

---

## Bug Summary Table

| BUG ID | Severity | Area | Description | Status | Verification |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **BUG-001** | P2 | Admin / Auth | `EventControls.jsx` used un-standardized `adminToken` local storage key instead of `tech_auction_admin_token` | FIXED | Verified via `api.js` central routing |
| **BUG-002** | P2 | Socket UX | Lack of persistent visual Socket.IO connection status indicator during network interruptions | FIXED | Verified via `ConnectionStatus.jsx` component |
| **BUG-003** | P2 | Admin / Evaluation | Score finalization lacked an explicit safety confirmation dialog before publishing rankings | FIXED | Verified via `SubmissionsAdmin.jsx` modal |
| **BUG-004** | P3 | Student UX | No dedicated card displaying won auction advantages (hints, time extensions, AI assist) on dashboard | FIXED | Verified via `PurchasedAdvantages.jsx` component |

---

## Detailed Bug Reports

### BUG-001: Un-standardized Admin Token Storage Key in Event Controls
- **Severity**: P2 (Important Usability Issue)
- **Area**: Admin Console / Authentication
- **Steps to reproduce**:
  1. Login to admin console as `admin` / `admin123`.
  2. Navigate to Event Controls tab and attempt to update event status or fetch event summary.
  3. Observe token header discrepancy when raw `fetch` read `localStorage.getItem('adminToken')`.
- **Expected behavior**: All admin requests should use the canonical `tech_auction_admin_token` header.
- **Actual behavior**: Header fallback returned HTTP 401 if `adminToken` key was missing.
- **Root Cause**: Raw `fetch` call bypassing central `api.js` handler.
- **Fix**: Refactored `EventControls.jsx` to delegate state updates to `api.updateAdminEventState()` and `api.getEventSummary()`.
- **Verification**: Verified via test suite and admin state transition testing.

---

### BUG-002: Missing Persistent Socket.IO Connection Feedback
- **Severity**: P2 (Important Usability Issue)
- **Area**: Student Experience / Socket Real-time Engine
- **Steps to reproduce**:
  1. Open student dashboard.
  2. Simulate network disconnect or socket drop.
  3. Observe student user had no clear indicator whether live auction updates were active.
- **Expected behavior**: Fixed status badge displaying `CONNECTED`, `RECONNECTING`, or `DISCONNECTED` with reconnect toast.
- **Actual behavior**: Silent disconnect with no user feedback.
- **Root Cause**: Missing dedicated socket connection state listener component.
- **Fix**: Created `ConnectionStatus.jsx` listening to `connect`, `disconnect`, `connect_error`, and `reconnect_attempt` socket events.
- **Verification**: Verified component state transitions on socket events.

---

### BUG-003: Lack of Confirmation Dialog Before Score Finalization
- **Severity**: P2 (Important Usability Issue)
- **Area**: Admin Console / Submissions & Evaluation
- **Steps to reproduce**:
  1. Open organizer submission evaluation modal.
  2. Enter score components and click "FINALIZE SCORE".
  3. Score was immediately saved as `FINAL` without a second confirmation step.
- **Expected behavior**: Prompt judge with confirmation dialog detailing calculated total score before publishing.
- **Actual behavior**: Immediate score finalization.
- **Root Cause**: Direct state submission without modal gate.
- **Fix**: Added `confirmFinalize` modal gate in `SubmissionsAdmin.jsx`.
- **Verification**: Verified modal prompt before calling `evaluateAdminSubmission('FINAL')`.

---

### BUG-004: Missing Won Auction Advantages Section on Dashboard
- **Severity**: P3 (Cosmetic / Minor UX Issue)
- **Area**: Student Experience / Auction Room
- **Steps to reproduce**:
  1. Win an auction item (e.g., `FS-01` API Hint or `FS-05` AI Assist).
  2. Observe team had to check wallet transaction logs to see won items.
- **Expected behavior**: Consolidated "YOUR AUCTION ADVANTAGES" card on dashboard.
- **Actual behavior**: No central advantages list.
- **Root Cause**: Item catalog wins were tracked in wallet transactions but not rendered in a dedicated advantage card.
- **Fix**: Created `PurchasedAdvantages.jsx` rendering won items with code, type, status, and winning bid cost.
- **Verification**: Integrated into `Auction.jsx` and verified rendering.
