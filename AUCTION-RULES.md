# TECH AUCTION 2026 — OFFICIAL AUCTION RULES & SPECIFICATIONS

**Department of Information Technology — SNS College of Technology**  
*Governing Rules for Real-Time Technical Auctions.*

---

## 1. Credit Allocation & Wallet Mechanics
- **Initial Balance**: Every registered team is allocated exactly **1,000 virtual credits** upon event initialization.
- **Credit Value**: Credits have zero monetary value and exist solely as competition points within Tech Auction 2026.
- **Wallet State Machine**:
  - `Available Balance`: Unrestricted credits available for placing bids.
  - `Held Balance`: Credits temporarily locked during an active leading bid.
  - `Total Balance`: `Available + Held`.

---

## 2. Bidding Parameters & Increments
- **Minimum Starting Price**: 100 credits (or as specified by catalog item DDL).
- **Minimum Bid Increment**: 25 credits per raise (or 50 credits for high-tier items like `AI ASSIST`).
- **Valid Bid Rule**: `New Bid >= Current Highest Bid + Minimum Increment`.
- **Concurrency & Atomic Locking**: Bids are processed using database row locking (`SELECT ... FOR UPDATE`). In the event of simultaneous bids, the server processes bids strictly in timestamp order.

---

## 3. Outbid & Settlement Behavior
- **Outbid Refund**: When Team A is outbid by Team B, Team A's held credits are immediately released back to their available wallet balance via real-time WebSocket broadcast.
- **Winner Settlement**:
  - When the countdown timer expires (reaching `00:00`), the item status changes to `COMPLETED`.
  - The highest bidder is declared the winner (`auction_winners` table entry created).
  - The held credits are permanently deducted from the winner's wallet.
  - The purchased item/advantage is assigned exclusively to the winning team's ID.

---

## 4. Item Specifications & Limits

| Item Code | Track | Advantage Name | Item Type | Duration / Quota |
| :--- | :--- | :--- | :--- | :--- |
| `FS-01` | Full-Stack | API Contract Hint | `HINT` | Permanent text hint |
| `FS-02` | Full-Stack | Database Query Hint | `HINT` | Permanent text hint |
| `FS-03` | Full-Stack | Frontend Debug Hint | `HINT` | Permanent text hint |
| `FS-04` | Full-Stack | Extra Development Time | `TIME` | +15 minutes deadline extension |
| `FS-05` | Full-Stack | AI ASSIST | `AI_ASSIST` | 15 minutes / 30 max requests |
| `CY-01` | Cybersecurity| Authentication Hint | `HINT` | Permanent text hint |
| `CY-02` | Cybersecurity| Access Control Hint | `HINT` | Permanent text hint |
| `CY-03` | Cybersecurity| Web Security Hint | `HINT` | Permanent text hint |
| `CY-04` | Cybersecurity| Log Analysis Hint | `HINT` | Permanent text hint |
| `CY-05` | Cybersecurity| Extra Investigation Time| `TIME` | +15 minutes deadline extension |
| `CY-06` | Cybersecurity| AI ASSIST | `AI_ASSIST` | 15 minutes / 30 max requests |

---

## 5. Track Isolation & Conduct
- Full-Stack teams bid exclusively in `room_full-stack`; Cybersecurity teams bid exclusively in `room_cybersecurity`.
- Bids cannot be canceled or revoked once submitted.
- Any attempt to manipulate Socket payload data or automate bid submission via unauthorized bots will result in immediate team disqualification.
