# TECH AUCTION — Hackathon Platform MVP

SNS College of Technology — Department of Information Technology

## What is included
- React/Vite student portal
- Node/Express backend
- SQLite database for the small-event MVP
- Real-time Socket.IO auction rooms separated by challenge
- Team login and challenge selection
- Server-side wallet/bid validation
- Gemini API integration point with server-side key
- Separate challenge folders for Full Stack and Cybersecurity

## Demo teams
- `FS01` — Code Warriors — Full Stack
- `CY01` — Cyber Hawks — Cybersecurity
- `FS02` — Bug Hunters — Full Stack

## Run
1. Copy `.env.example` to `.env`.
2. Put the Gemini API key in `GEMINI_API_KEY` if AI testing is needed.
3. Run `npm install`.
4. Run `npm run dev`.
5. Open `http://localhost:5173`.

## Important production work still required
- Google Form/Sheets import and validation
- Organizer authentication and admin dashboard
- Auction lifecycle/state machine and winner wallet settlement
- AI entitlement purchase + countdown + usage limits
- Challenge file/workspace delivery and submission system
- Full-stack and cybersecurity challenge packages
- Evaluation/rubric and results dashboard
- Anti-malpractice event logging
- HTTPS, secure sessions, rate limiting and secret management
- Event-day load testing and a backup/manual auction mode

This MVP intentionally does not embed consumer ChatGPT/Gemini websites. AI access is intended to be provided through a server-side API integration.
