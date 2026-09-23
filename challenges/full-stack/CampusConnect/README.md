# CampusConnect — Campus Placement & Internship Portal

**Organized by:** Department of Information Technology, SNS College of Technology  
**Event:** TECH AUCTION 2026 — Full-Stack Challenge

---

## Scenario & Background

CampusConnect is a campus recruitment and placement management application built to connect students with corporate internship and placement opportunities.

Recently, the development team pushed an unverified update before deployment, leading to several reported functional issues, search failures, API response bugs, state glitches, and submission crashes.

As the Full-Stack Engineering team assigned to this challenge, your objective is to investigate the application source code, diagnose API contracts, debug database queries, fix frontend/backend bugs, and restore full system functionality.

---

## Application Features

1. **Student Authentication**: Secure login using registered campus email and password.
2. **Opportunities Dashboard**: Browse available placement & internship listings.
3. **Search & Filter**: Search placement listings by title or recruiting company name.
4. **Opportunity Details**: Inspect requirements, stipend, location, and application deadline.
5. **Application Submission**: Submit internship applications along with GPA and optional cover letter.
6. **Application Status Tracking**: View submitted application status (Pending, Under Review, Accepted).
7. **Placement Office Admin Audit**: View registered student rosters and overall application submissions.

---

## Setup & Running Instructions

### Prerequisites
- Node.js (v18+)
- npm

### 1. Install Dependencies
From the `CampusConnect/` directory, install workspace dependencies:
```bash
npm install --workspaces
```

### 2. Start Development Servers
Run the concurrent dev command:
```bash
npm run dev
```

* **Frontend Client**: Runs on `http://localhost:5174`
* **Backend API Server**: Runs on `http://localhost:5000`

### Demo Credentials
* **Student Email**: `alex@campus.edu`
* **Password**: `student123`

---

## Challenge Rules & Deliverables

1. **Do not create a new application from scratch.** Fix and refine the existing codebase.
2. **Authoritative Backend**: Ensure server validation and database logic are clean.
3. **User Experience**: Maintain clean UI feedback, error messages, and seamless navigation.
4. **Presentation**: Be prepared to demonstrate your fixed application and explain the root cause of the bugs you discovered.
