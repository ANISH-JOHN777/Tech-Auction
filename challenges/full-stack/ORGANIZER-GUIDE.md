# TECH AUCTION 2026 — Full-Stack Challenge: ORGANIZER GUIDE

**Department:** Department of Information Technology, SNS College of Technology  
**Event:** TECH AUCTION 2026  
**Challenge:** CampusConnect (Full-Stack Track)

---

## 1. Challenge Overview & Duration

* **Target Time:** 30–45 minutes for a skilled student team.
* **Environment:** Fully local Node.js + React + Vite + SQLite setup. Zero external API dependencies.
* **Objective:** Students debug a realistic college placement portal containing 8 deliberate bugs across auth, UI binding, SQL queries, form validation, React state, and API contracts.

---

## 2. Environment Setup & Reset Procedure

### Event Day Setup
1. Copy `CampusConnect/` to student workstation or deliver via USB / local network bundle.
2. Run `npm install --workspaces` inside `CampusConnect/`.
3. Launch with `npm run dev`.

### Database Reset Procedure
To reset the SQLite database during or after testing:
```bash
# Delete the SQLite database file to force re-creation & re-seeding on restart
rm challenges/full-stack/CampusConnect/backend/campus_connect.sqlite
```

---

## 3. Evaluation & 100-Point Rubric

| Evaluation Category | Max Points | Description |
| :--- | :---: | :--- |
| **Bug Fixes (8 Bugs)** | **60 Pts** | Successful identification and correction of intentional bugs (Points assigned per bug in SOLUTION.md). |
| **Functional Testing** | **15 Pts** | Student login, search filter, application submission, and status badge work end-to-end without errors. |
| **Code Quality & Architecture** | **10 Pts** | Clean code formatting, proper state management, non-destructive database updates, and error handling. |
| **Technical Explanation** | **10 Pts** | Team can clearly explain root cause for at least 3 fixed bugs during judging. |
| **Presentation** | **5 Pts** | Live demonstration of fixed CampusConnect application to event judges. |

---

## 4. Judging Checklist

- [ ] Can student log in using `alex@campus.edu` / `student123`? (BUG-01)
- [ ] Are company names visible on opportunity cards? (BUG-02)
- [ ] Does keyword search ("Tech", "Software") work properly? (BUG-03)
- [ ] Does GPA input accept standard numbers like `3.8`? (BUG-04)
- [ ] Does querying student applications return correct IDs? (BUG-05)
- [ ] Does button update immediately to "Application Submitted" upon applying? (BUG-06)
- [ ] Does clicking Apply submit request to server without HTTP 404 error? (BUG-07)
- [ ] Does submitting without a cover letter work without server crash? (BUG-08)
