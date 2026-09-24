# TECH AUCTION 2026 — FACULTY EVALUATION & RUBRIC GUIDE

**Department of Information Technology — SNS College of Technology**  
*Official Scoring Rubrics and Judging Standards.*

---

## 1. Full-Stack Web Development Track Rubric (100 Points Total)

| Category | Max Points | Evaluation Criteria & What Judges Should Look For |
| :--- | :--- | :--- |
| **Bug Fixes** | **60 pts** | - Correct resolution of CampusConnect application bugs (REST API parameters, SQL filter flaw, React state mutation issue).<br>- Functional correctness of user registration, login, and application workflows. |
| **E2E Testing** | **15 pts** | - Complete end-to-end user flow execution without runtime console errors or uncaught exceptions.<br>- Seamless integration between frontend React components and backend API endpoints. |
| **Code Quality** | **10 pts** | - Clean, readable, modular JavaScript code adhering to modern ES6+ standards.<br>- Proper error handling, variable naming conventions, and structural organization. |
| **Technical Explanation** | **10 pts** | - Clear submission notes explaining the root cause of identified bugs.<br>- Accurate description of technical changes made to fix each issue. |
| **Presentation** | **5 pts** | - Professional clarity, poise, and structured delivery during the oral demonstration. |

---

## 2. Cybersecurity Track Rubric (100 Points Total)

| Category | Max Points | Evaluation Criteria & What Judges Should Look For |
| :--- | :--- | :--- |
| **Vulnerability Identification** | **30 pts** | - Accurate detection of security vulnerabilities in SecureVault (BOPA/IDOR document access, reflected XSS, authentication exposure). |
| **Evidence & Technical Analysis** | **20 pts** | - Submission includes HTTP request/response payloads, screenshots, log traces, or proof-of-concept evidence. |
| **Risk Explanation & Impact** | **15 pts** | - Comprehensive assessment of business and data exposure risks associated with each vulnerability. |
| **Mitigation & Fix Implementation** | **20 pts** | - Technically sound remediation code or policy changes implemented to patch identified flaws. |
| **Technical Report Quality** | **10 pts** | - Well-organized incident report following standard security reporting templates. |
| **Presentation** | **5 pts** | - Effective communication of vulnerability findings and remediation strategy to judges. |

---

## 3. General Evaluation Rules for Faculty
1. **Server-Side Validation**: All score component inputs are validated by the server to enforce strict numeric bounds (`0 <= Score <= Category Max`).
2. **Deterministic Total Calculation**: The backend automatically sums component scores to determine total team points.
3. **Audit Records**: Once a score is finalized by clicking **Finalize Evaluation**, an immutable audit event (`EVALUATION_FINALIZED`) is recorded in the `evaluation_events` table.
4. **Tie-Breaker Rule**: In the event of equal total scores on the official leaderboard, rankings are automatically broken by submission timestamp (`submitted_at ASC`).
