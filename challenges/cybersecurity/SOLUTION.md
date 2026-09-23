# TECH AUCTION 2026 — Cybersecurity Challenge: SOLUTION GUIDE

**Organizer Document — Strictly Private**  
**Challenge Laboratory:** SecureVault  
**Total Points:** 100 Points

---

## Controlled Security Cases Matrix

| Case ID | Title | Difficulty | Category | Points | Target Location |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **CASE-01** | Plaintext Credential Exposure | Easy | Authentication | 10 pts | `backend/src/index.js` & `user/profile` |
| **CASE-02** | Broken Object Level Authorization (IDOR) | Easy | Access Control | 15 pts | `backend/src/index.js` (`/api/documents/:id`) |
| **CASE-03** | Reflected Cross-Site Scripting (XSS) | Medium | Output Encoding | 15 pts | `frontend/src/pages/Search.jsx` |
| **CASE-04** | Public Configuration Leak | Medium | Info Exposure | 15 pts | `backend/src/index.js` (`/api/config`) |
| **CASE-05** | Insecure Session Lifecycle | Medium | Session Management | 15 pts | `backend/src/index.js` (`/api/auth/logout`) |
| **CASE-06** | Exposed Unprotected Admin Diagnostic Route | Hard | Access Control | 15 pts | `backend/src/index.js` (`/api/admin/system-diagnostics`) |
| **CASE-07** | Synthetic Log Brute Force Investigation | Hard | Log Analysis | 15 pts | `logs/auth.log` & `logs/access.log` |

---

## Detailed Case Breakdown & Solutions

### CASE-01 — Plaintext Credential Exposure
* **Case ID:** `CASE-01`
* **Title:** Plaintext password returned in profile API response
* **Difficulty:** Easy (10 Points)
* **Category:** Authentication / Data Exposure
* **Affected File:** [`SecureVault/backend/src/index.js`](file:///c:/Users/manue/OneDrive/Desktop/Tech%20Auction/challenges/cybersecurity/SecureVault/backend/src/index.js)
* **Symptom:** API calls to `/api/auth/login` and `/api/user/profile` return a `plaintext_password_debug` property containing the user's unhashed password.
* **Root Cause:** User passwords stored in plaintext in SQLite and returned directly in API JSON payloads.
* **Evidence:** HTTP JSON response: `"plaintext_password_debug": "password123"`.
* **Expected Mitigation:** Store salted password hashes (e.g. bcrypt/Argon2) and strip password fields from user profile API responses.
* **Verification:** `GET /api/user/profile` returns only safe attributes (`id`, `name`, `email`, `role`).

---

### CASE-02 — Broken Object Level Authorization (IDOR)
* **Case ID:** `CASE-02`
* **Title:** Direct object reference allows accessing other users' confidential documents
* **Difficulty:** Easy (15 Points)
* **Category:** Broken Access Control / BOPA / IDOR
* **Affected File:** [`SecureVault/backend/src/index.js`](file:///c:/Users/manue/OneDrive/Desktop/Tech%20Auction/challenges/cybersecurity/SecureVault/backend/src/index.js)
* **Symptom:** User 1 (`user1@securevault.local`) can view User 2's confidential financial document by querying `/api/documents/2`.
* **Root Cause:** Backend SQL query `SELECT * FROM documents WHERE id = ?` lacks authorization check `WHERE owner_id = req.user.id`.
* **Evidence:** `GET /api/documents/2` with User 1 bearer token returns User 2's executive payroll document.
* **Expected Mitigation:** Add server-side ownership check: `WHERE id = ? AND owner_id = ?` (or check user role for admin bypass).
```sql
-- Fix in backend/src/index.js:
SELECT * FROM documents WHERE id = ? AND owner_id = ?
```
* **Verification:** Querying document ID 2 with User 1 token returns HTTP 403 Forbidden.

---

### CASE-03 — Reflected Cross-Site Scripting (XSS)
* **Case ID:** `CASE-03`
* **Title:** Reflected XSS parameter in search results banner
* **Difficulty:** Medium (15 Points)
* **Category:** Input / Output Handling
* **Affected File:** [`SecureVault/frontend/src/pages/Search.jsx`](file:///c:/Users/manue/OneDrive/Desktop/Tech%20Auction/challenges/cybersecurity/SecureVault/frontend/src/pages/Search.jsx)
* **Symptom:** Entering `<script>alert(1)</script>` or `<img src=x onerror=alert(1)>` in the search box renders raw HTML in the browser.
* **Root Cause:** Frontend uses `dangerouslySetInnerHTML={{ __html: ... }}` to render the search query string returned from backend `/api/search`.
* **Evidence:** Search query string is rendered directly into DOM without HTML entity encoding.
* **Expected Mitigation:** Remove `dangerouslySetInnerHTML` and render standard React text elements: `{lastQuery}`.
* **Verification:** Searching `<script>` displays string literal `<script>` as plain text without DOM execution.

---

### CASE-04 — Public Configuration & Master Key Exposure
* **Case ID:** `CASE-04`
* **Title:** Endpoint `/api/config` publicly leaks internal server secrets & staging IPs
* **Difficulty:** Medium (15 Points)
* **Category:** Security Misconfiguration & Info Exposure
* **Affected File:** [`SecureVault/backend/src/index.js`](file:///c:/Users/manue/OneDrive/Desktop/Tech%20Auction/challenges/cybersecurity/SecureVault/backend/src/index.js)
* **Symptom:** Navigating to `http://localhost:5001/api/config` without login returns database filepath, master JWT secret, and internal staging server IP (`192.168.1.100`).
* **Root Cause:** Public diagnostic endpoint exposes internal environment configuration.
* **Evidence:** JSON response exposes `master_jwt_secret` and `internal_ip`.
* **Expected Mitigation:** Restrict endpoint behind admin authentication or remove sensitive secrets from production API responses.
* **Verification:** `/api/config` returns HTTP 401 or sanitized public parameters only.

---

### CASE-05 — Insecure Session Lifecycle (Missing Server Revocation)
* **Case ID:** `CASE-05`
* **Title:** Logout endpoint returns success without deleting session from database
* **Difficulty:** Medium (15 Points)
* **Category:** Session Management
* **Affected File:** [`SecureVault/backend/src/index.js`](file:///c:/Users/manue/OneDrive/Desktop/Tech%20Auction/challenges/cybersecurity/SecureVault/backend/src/index.js)
* **Symptom:** After clicking Logout, the previous bearer token can still be used to make authenticated API requests.
* **Root Cause:** `POST /api/auth/logout` returns a success message but does not execute `DELETE FROM sessions WHERE token = ?`.
* **Evidence:** Token retained in SQLite `sessions` table after logout request.
* **Expected Mitigation:** Execute server-side session deletion: `DELETE FROM sessions WHERE token = ?`.
* **Verification:** Re-using old token after logout yields HTTP 401 Invalid Session.

---

### CASE-06 — Exposed Unprotected Admin Diagnostic Route
* **Case ID:** `CASE-06`
* **Title:** System diagnostic route leaks user database without authentication
* **Difficulty:** Hard (15 Points)
* **Category:** Access Control / Exposed Administrative Interface
* **Affected File:** [`SecureVault/backend/src/index.js`](file:///c:/Users/manue/OneDrive/Desktop/Tech%20Auction/challenges/cybersecurity/SecureVault/backend/src/index.js)
* **Symptom:** Calling `/api/admin/system-diagnostics` dumps all registered user records and active session tokens to any unauthenticated client.
* **Root Cause:** Route lacks `authenticateToken` middleware and role authorization checks.
* **Evidence:** HTTP GET request returns entire `users` table including emails and passwords.
* **Expected Mitigation:** Attach `authenticateToken` middleware and verify `req.user.role === 'Admin'`.
* **Verification:** Unauthenticated GET returns HTTP 401; non-admin user returns HTTP 403.

---

### CASE-07 — Synthetic Log Brute Force Investigation
* **Case ID:** `CASE-07`
* **Title:** Identification of brute force credential stuffing attack in synthetic logs
* **Difficulty:** Hard (15 Points)
* **Category:** Log Analysis & Threat Detection
* **Affected File:** [`SecureVault/logs/auth.log`](file:///c:/Users/manue/OneDrive/Desktop/Tech%20Auction/challenges/cybersecurity/SecureVault/logs/auth.log)
* **Symptom:** Log audit shows high-frequency failed login attempts against `user2@securevault.local`.
* **Evidence:** 49 consecutive `AUTH_FAILURE` entries from synthetic IP `192.168.1.105` between 03:10:01 and 03:14:20, followed by `AUTH_SUCCESS` at 03:14:22.
* **Expected Analysis:** Student identifies source IP (`192.168.1.105`), targeted user (`user2@securevault.local`), failure count (49), time window (03:10 - 03:14), and recommends IP rate-limiting and account lockout policies.
* **Verification:** Student report documents IP, timestamps, failure count, and rate-limiting mitigation.
