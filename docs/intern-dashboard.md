Intern Dashboard — Feature Specification

Overview
This document defines the intern-facing dashboard features and recommended data model for the Internly OJT system. It focuses on what interns need to manage their OJT obligations and evidence.

1) OJT Profile Management
- Fields:
  - `fullName` (string)
  - `course` (string)
  - `contactInfo` (object: phone, email)
  - `company` (object: name, address, supervisorName, supervisorContact)
  - `companyDetails` (string)
  - `photoUrl` (string)
- Actions:
  - View and edit profile
  - Upload / change profile image (store in Firebase Storage)

2) OJT Hours Monitoring
- Fields (per intern):
  - `hoursToRender` (number)
  - `hoursRendered` (array of records {date, hours, source})
  - `hoursRenderedThisWeek` (derived)
  - `hoursRemaining` (derived: hoursToRender - sum(hoursRendered))
- UI:
  - Summary tiles: this week, total rendered, total remaining
  - Timeline or table of rendered hours with date and approval status

3) Weekly Report Generation
- Report fields:
  - `date` (ISO date)
  - `natureOfActivity` (string)
  - `body` (string / markdown)
  - `taskAssignedFrom` (string: who assigned)
  - `signature` (string or digital stamp)
  - `remarks` (string)
- Actions:
  - Create new weekly report (save to Firestore)
  - Export to PDF (use jspdf + autotable)

4) OJT Sanction Management
- Data:
  - `sanctions` collection with records: {internId, daysSanctioned, scheduledDate, status}
  - `sanctionSchedule` separate collection for scheduled sanction days (date, capacity, internsAssigned[])
- UI:
  - View assigned sanction days and remaining days
  - Sign up to take a scheduled sanction day (if capacity allows)
  - View interns scheduled on a given sanction day (for transparency)

5) OJT Competencies Management
- Data & Assets:
  - `competencies` collection per intern: {title, description, evidence: [ {type: image|video|link, url, caption} ] }
- Actions:
  - Add / edit competency
  - Upload images/videos to Firebase Storage and save URLs
  - Attach external links (YouTube, Google Drive)

Suggested Firestore Collections
- `interns/{internId}` (profile + summary fields)
- `interns/{internId}/hours/{entryId}` (hours log)
- `interns/{internId}/reports/{reportId}` (weekly reports)
- `sanctions/{sanctionId}` (sanction schedule and assignments)
- `competencies/{competencyId}` or nested under interns

Next Implementation Steps
- Create UI pages: `/dashboard/profile`, `/dashboard/hours`, `/dashboard/reports`, `/dashboard/sanctions`, `/dashboard/competencies`.
- Build Firestore rules and indexes for interns and reports.
- Implement file upload flow and secure storage rules.
- Add basic tests for data validation and UI flows.

Notes
- This spec is intern-facing only. A separate Dean/Admin dashboard should expose aggregated reports, approvals, sanction management at scale, and batch operations.
