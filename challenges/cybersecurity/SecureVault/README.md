# SecureVault — Cybersecurity Audit & Investigation Laboratory

**Organized by:** Department of Information Technology, SNS College of Technology  
**Event:** TECH AUCTION 2026 — Cybersecurity Challenge Track

---

## Scenario & Background

SecureVault is an internal records and document management portal used by corporate analysts and department managers.

Following recent infrastructure changes and internal system audits, security officers flagged potential configuration flaws, authorization weaknesses, logging anomalies, and sensitive data exposures within the application environment.

As the Cybersecurity Engineering team assigned to this challenge, your task is to conduct a controlled security assessment of the local SecureVault application, analyze authentication and access behaviors, investigate synthetic server logs, identify security risks, and propose/implement safe engineering mitigations.

---

## Synthetic Demo Accounts

The local laboratory provides three pre-configured synthetic test accounts:

1. **Analyst Account (User 1)**:
   - Email: `user1@securevault.local`
   - Password: `password123`
   - Role: Analyst

2. **Manager Account (User 2)**:
   - Email: `user2@securevault.local`
   - Password: `welcome2026`
   - Role: Manager

3. **Administrator Account**:
   - Email: `admin@securevault.local`
   - Password: `adminpass`
   - Role: System Admin

---

## Setup & Running Instructions

### Prerequisites
- Node.js (v18+)
- npm

### 1. Install Workspace Dependencies
From the `SecureVault/` directory:
```bash
npm install --workspaces
```

### 2. Start Local Challenge Laboratory
Run the concurrent dev command:
```bash
npm run dev
```

* **Frontend Portal Client**: `http://localhost:5175`
* **Backend API Gateway**: `http://localhost:5001`

---

## Student Challenge Tasks

During the competition, your team must investigate:

1. **Authentication & Password Handling**: Inspect how credentials and user profile data are returned by the API.
2. **Access Control & Authorization**: Verify whether document records are strictly isolated between different user accounts.
3. **Input / Output Handling**: Test how search parameters are processed and rendered on the client interface.
4. **Configuration Exposure**: Inspect server configuration endpoints and client-accessible diagnostic routes.
5. **Session Lifecycle**: Verify whether logging out properly revokes session tokens on the server.
6. **Log Audit & Evidence Analysis**: Inspect synthetic log files in `logs/` to identify suspicious login attempts and brute force patterns.

---

## Rules of Engagement

1. **100% Local Scope**: All activities must strictly target `localhost` ports (`5001` / `5175`). Do not attempt to scan or target external networks.
2. **Synthetic Data Only**: All users, documents, and log entries are 100% synthetic mock data.
3. **Deliverables**: Prepare a technical investigation report outlining your findings, root causes, evidence, and proposed mitigations.
