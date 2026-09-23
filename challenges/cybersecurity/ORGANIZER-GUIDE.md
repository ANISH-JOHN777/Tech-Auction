# TECH AUCTION 2026 — Cybersecurity Challenge: ORGANIZER GUIDE

**Department:** Department of Information Technology, SNS College of Technology  
**Event:** TECH AUCTION 2026  
**Challenge:** SecureVault (Cybersecurity Track)

---

## 1. Challenge Overview & Duration

* **Target Time:** 30–45 minutes for a capable student team.
* **Environment:** Fully local Node.js + React + Vite + SQLite setup. Zero external network access required.
* **Objective:** Students conduct a security assessment of the local SecureVault application, analyze 7 controlled security cases across authentication, BOPA/IDOR, reflected XSS, info exposure, session handling, admin route bypass, and log analysis.

---

## 2. Environment Setup & Reset Procedure

### Event Day Setup
1. Copy `SecureVault/` to student workstation or deliver via USB bundle.
2. Run `npm install --workspaces` inside `SecureVault/`.
3. Launch with `npm run dev`.

### Laboratory Reset Procedure
To reset the SQLite database during or after testing:
```bash
# Delete the SQLite database file to force re-creation & re-seeding on restart
rm challenges/cybersecurity/SecureVault/backend/secure_vault.sqlite
```

---

## 3. Evaluation & 100-Point Rubric

| Evaluation Category | Max Points | Description |
| :--- | :---: | :--- |
| **Vulnerability Identification** | **30 Pts** | Accurate discovery of security issues across API, frontend, database, and logs (5-15 pts per case). |
| **Evidence & Analysis** | **20 Pts** | Clear evidence (HTTP requests, log timestamps, parameter names, payload samples). |
| **Risk Explanation** | **15 Pts** | Clear explanation of real-world impact (e.g., data breach, account takeover, session hijacking). |
| **Mitigation & Fix** | **20 Pts** | Proposed/implemented code fixes (e.g. server-side ownership check, HTML encoding, rate limiting). |
| **Technical Report** | **10 Pts** | Structured vulnerability report listing Case ID, Root Cause, Evidence, and Mitigation. |
| **Presentation** | **5 Pts** | Live demonstration of security investigation to event judges. |

---

## 4. Judging Checklist

- [ ] **CASE-01**: Did student identify plaintext password debug property in profile API?
- [ ] **CASE-02**: Did student demonstrate IDOR by accessing document ID 2 with User 1 token?
- [ ] **CASE-03**: Did student identify reflected XSS in search query parameter?
- [ ] **CASE-04**: Did student locate sensitive internal secrets in `/api/config`?
- [ ] **CASE-05**: Did student verify session token remains active after logout?
- [ ] **CASE-06**: Did student access unprotected `/api/admin/system-diagnostics` route?
- [ ] **CASE-07**: Did student identify brute force IP (`192.168.1.105`) and failure count in `auth.log`?
