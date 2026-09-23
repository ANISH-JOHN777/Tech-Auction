# TECH AUCTION 2026 — Full-Stack Challenge: SOLUTION GUIDE

**Organizer Document — Strictly Private**  
**Challenge Project:** CampusConnect  
**Total Points:** 100 Points

---

## Intentional Bugs & Solution Matrix

| Bug ID | Difficulty | Category | Points | Affected File |
| :--- | :--- | :--- | :--- | :--- |
| **BUG-01** | Easy | Auth API Contract | 10 pts | `frontend/src/pages/Login.jsx` & `backend/src/index.js` |
| **BUG-02** | Easy | UI Data Binding | 5 pts | `frontend/src/components/OpportunityCard.jsx` |
| **BUG-03** | Medium | Backend SQL Search | 10 pts | `backend/src/index.js` |
| **BUG-04** | Medium | Client Form Validation | 10 pts | `frontend/src/components/ApplyModal.jsx` |
| **BUG-05** | Medium | SQL Query Join Column Collision | 10 pts | `backend/src/index.js` |
| **BUG-06** | Hard | React State Mutation | 10 pts | `frontend/src/pages/Dashboard.jsx` |
| **BUG-07** | Hard | API Contract & HTTP Method Mismatch | 15 pts | `frontend/src/services/api.js` |
| **BUG-08** | Arch | Unhandled Exception / Null Check | 10 pts | `backend/src/index.js` |

---

## Detailed Bug Breakdown & Fixes

### BUG-01 — Authentication Response Payload Mismatch
* **Bug ID:** `BUG-01`
* **Title:** Login response payload key mismatch
* **Difficulty:** Easy (10 Points)
* **Affected File:** [`CampusConnect/frontend/src/pages/Login.jsx`](file:///c:/Users/manue/OneDrive/Desktop/Tech%20Auction/challenges/full-stack/CampusConnect/frontend/src/pages/Login.jsx)
* **Symptom:** Entering valid student credentials (`alex@campus.edu` / `student123`) returns success, but login fails with error "Login succeeded but student profile data is missing".
* **Root Cause:** Backend returns `{ success: true, user: { ... } }`, but frontend checks `res.student` instead of `res.user`.
* **Expected Fix:** Change `res.student` to `res.user` in `Login.jsx` (or adjust backend payload to return `student`).
```javascript
// Fix in Login.jsx:
if (res.success && res.user) {
  onLoginSuccess(res.user);
}
```
* **Testing Method:** Login with `alex@campus.edu` / `student123` -> Dashboard loads immediately.

---

### BUG-02 — Missing Company Name on Opportunity Cards
* **Bug ID:** `BUG-02`
* **Title:** Incorrect API property name on opportunity card
* **Difficulty:** Easy (5 Points)
* **Affected File:** [`CampusConnect/frontend/src/components/OpportunityCard.jsx`](file:///c:/Users/manue/OneDrive/Desktop/Tech%20Auction/challenges/full-stack/CampusConnect/frontend/src/components/OpportunityCard.jsx)
* **Symptom:** All opportunity cards display "Company details unavailable" instead of the actual hiring company name.
* **Root Cause:** Frontend renders `opportunity.company`, whereas backend database returns `company_name`.
* **Expected Fix:** Replace `opportunity.company` with `opportunity.company_name` in `OpportunityCard.jsx`.
```jsx
// Fix in OpportunityCard.jsx:
{opportunity.company_name || 'Company Name Unavailable'}
```
* **Testing Method:** Dashboard listings render "TechCorp Solutions", "SecureNet Labs", etc.

---

### BUG-03 — Opportunity Search Exact Equality Failure
* **Bug ID:** `BUG-03`
* **Title:** Backend SQL query missing LIKE wildcards
* **Difficulty:** Medium (10 Points)
* **Affected File:** [`CampusConnect/backend/src/index.js`](file:///c:/Users/manue/OneDrive/Desktop/Tech%20Auction/challenges/full-stack/CampusConnect/backend/src/index.js)
* **Symptom:** Searching for "Tech" or "Software" returns 0 placement results, unless the student types the exact 100% full title string.
* **Root Cause:** Backend SQL query uses exact string equality: `WHERE title = ? OR company_name = ?` without `LIKE` and `%` wildcards.
* **Expected Fix:** Update query to use `LIKE` with SQL wildcard params.
```javascript
// Fix in backend/src/index.js:
const searchPattern = `%${search.trim()}%`;
opportunities = await db.all(
  'SELECT * FROM opportunities WHERE title LIKE ? OR company_name LIKE ? ORDER BY id DESC',
  [searchPattern, searchPattern]
);
```
* **Testing Method:** Type "Tech" or "Developer" into search box -> Matching listings populate.

---

### BUG-04 — Rigid GPA Form Validation Error
* **Bug ID:** `BUG-04`
* **Title:** Rigid regex requiring exactly 2 decimal places
* **Difficulty:** Medium (10 Points)
* **Affected File:** [`CampusConnect/frontend/src/components/ApplyModal.jsx`](file:///c:/Users/manue/OneDrive/Desktop/Tech%20Auction/challenges/full-stack/CampusConnect/frontend/src/components/ApplyModal.jsx)
* **Symptom:** Submitting an application with standard GPA values like `3.8` or `4.0` fails with validation error "GPA format invalid. Must be formatted with exactly 2 decimal places".
* **Root Cause:** Regex `/^[0-4]\.[0-9]{2}$/` rejects numbers with 1 decimal place or standard floating point values.
* **Expected Fix:** Update validation logic to numeric range check: `const num = parseFloat(gpa); if (isNaN(num) || num < 0 || num > 4.0)`.
```javascript
// Fix in ApplyModal.jsx:
const numGpa = parseFloat(gpa);
if (isNaN(numGpa) || numGpa < 0 || numGpa > 4.0) {
  setError('GPA must be a valid number between 0.0 and 4.0');
  return;
}
```
* **Testing Method:** Enter `3.8` in GPA input -> Form passes validation.

---

### BUG-05 — SQL Join Column Name Collision in Applications API
* **Bug ID:** `BUG-05`
* **Title:** `SELECT *` column collision overwriting application ID
* **Difficulty:** Medium (10 Points)
* **Affected File:** [`CampusConnect/backend/src/index.js`](file:///c:/Users/manue/OneDrive/Desktop/Tech%20Auction/challenges/full-stack/CampusConnect/backend/src/index.js)
* **Symptom:** Application status reports incorrect IDs or joining data gets corrupted when querying student applications.
* **Root Cause:** `SELECT * FROM applications JOIN opportunities` causes `opportunities.id` to overwrite `applications.id`.
* **Expected Fix:** Explicitly select columns or alias `applications.id AS application_id`.
```sql
-- Fix in backend/src/index.js:
SELECT applications.id AS id, applications.student_id, applications.opportunity_id,
       applications.cover_letter, applications.gpa, applications.status, applications.applied_at,
       opportunities.title, opportunities.company_name, opportunities.role, opportunities.stipend
FROM applications 
JOIN opportunities ON applications.opportunity_id = opportunities.id 
WHERE applications.student_id = ?
```
* **Testing Method:** View student applications -> `id` reflects application ID correctly.

---

### BUG-06 — Stale React State Array Mutation on Application Submit
* **Bug ID:** `BUG-06`
* **Title:** Direct state array mutation (`applications.push`) without setter call
* **Difficulty:** Hard (10 Points)
* **Affected File:** [`CampusConnect/frontend/src/pages/Dashboard.jsx`](file:///c:/Users/manue/OneDrive/Desktop/Tech%20Auction/challenges/full-stack/CampusConnect/frontend/src/pages/Dashboard.jsx)
* **Symptom:** After applying for an opportunity, the UI button status does not change to "Application Submitted" until page refresh.
* **Root Cause:** `applications.push(res.application)` mutates state directly without triggering React re-render.
* **Expected Fix:** Use immutable state updater function: `setApplications([...applications, res.application])`.
```javascript
// Fix in Dashboard.jsx:
setApplications((prev) => [...prev, res.application]);
```
* **Testing Method:** Apply to listing -> "Apply Now" button immediately transforms to "Application Submitted".

---

### BUG-07 — Application Submission HTTP Method & Field Name Mismatch
* **Bug ID:** `BUG-07`
* **Title:** API client method mismatch (`PUT` vs `POST`) & camelCase keys
* **Difficulty:** Hard (15 Points)
* **Affected File:** [`CampusConnect/frontend/src/services/api.js`](file:///c:/Users/manue/OneDrive/Desktop/Tech%20Auction/challenges/full-stack/CampusConnect/frontend/src/services/api.js)
* **Symptom:** Submitting application throws HTTP 404 or backend validation error "student_id and opportunity_id required".
* **Root Cause:** Frontend API client sends `PUT` request with `{ opportunityId, coverLetter }` instead of `POST` with `{ opportunity_id, cover_letter }`.
* **Expected Fix:** Update `applyOpportunity` in `api.js` to use `POST` method and snake_case body properties.
```javascript
// Fix in frontend/src/services/api.js:
export async function applyOpportunity(studentId, opportunityId, coverLetter, gpa) {
  const res = await fetch(`${API_URL}/applications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      student_id: studentId,
      opportunity_id: opportunityId,
      cover_letter: coverLetter,
      gpa,
    }),
  });
  return res.json();
}
```
* **Testing Method:** Click Apply -> Application reaches backend API successfully.

---

### BUG-08 — Server Crash on Omitted Cover Letter
* **Bug ID:** `BUG-08`
* **Title:** Unhandled `TypeError: Cannot read properties of undefined (reading 'trim')`
* **Difficulty:** Architecture / Debugging (10 Points)
* **Affected File:** [`CampusConnect/backend/src/index.js`](file:///c:/Users/manue/OneDrive/Desktop/Tech%20Auction/challenges/full-stack/CampusConnect/backend/src/index.js)
* **Symptom:** Submitting an application without entering a cover letter crashes the Node.js backend server with HTTP 500 error.
* **Root Cause:** `const processedLetter = cover_letter.trim();` executes without checking if `cover_letter` is undefined.
* **Expected Fix:** Add nullish check: `const processedLetter = cover_letter ? cover_letter.trim() : '';`.
```javascript
// Fix in backend/src/index.js:
const processedLetter = cover_letter && typeof cover_letter === 'string' ? cover_letter.trim() : '';
```
* **Testing Method:** Submit application with blank cover letter -> Server handles request gracefully without crashing.
