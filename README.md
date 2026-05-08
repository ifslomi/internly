Internly — Intern Management Dashboard (Intern-facing)

This repository contains the Intern Dashboard for Internly, an on-the-job training (OJT) management system. This web app is the intern-facing dashboard where interns can manage their OJT profile, monitor hours, submit weekly reports, view and take assigned sanctions, and manage competencies.

Purpose
- Provide interns with a single, easy-to-use dashboard to manage OJT requirements and communicate status to program administrators.
- Serve as the first front-end deliverable; a separate Dean/Admin dashboard will be created later.

Key Features (Intern Dashboard)
- OJT Profile Management: full name, course, contact info, company, company details, edit profile, and image upload.
- OJT Hours Monitoring: view hours to render, hours rendered this week, total hours rendered, and total hours remaining.
- Weekly Report Generation: create and review weekly reports including date, activity description, task assignment source, and signatures/remarks.
- OJT Sanction Management: view sanction days, scheduled sanction days, take a scheduled day to render sanctions, and view interns scheduled for a given sanction day.
- OJT Competencies Management: manage competencies and upload images, videos, and links as evidence.

Getting Started
1. Install dependencies:

```bash
npm install
```

2. Run the development server:

```bash
npm run dev
```

3. Open http://localhost:3000 and log in as an intern to access the dashboard.

Project Structure
- The intern-facing dashboard lives under `src/app` and `src/components`.
- Global styles and theme tokens are in `src/app/globals.css`.
- API routes and server functions are in `src/app/api`.

Next Steps
- Implement intern dashboard pages under `src/app/dashboard` (profile, hours, reports, sanctions, competencies).
- Wire up Firebase authentication and Firestore collections for interns, hours, reports, sanctions, and competencies.
- Add tests and CI as needed.

For details on the intern dashboard features and data model, see `docs/intern-dashboard.md`.
