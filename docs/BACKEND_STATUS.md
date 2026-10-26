# Firebase backend implementation status

This document replaces the original proposal, which described the pre-Firebase scaffold and is now superseded by the implemented backend.

## Current implementation

- Next.js App Router, TypeScript, Firebase Authentication email-link sign-in, Cloud Firestore, Firebase Admin SDK for trusted server operations.
- Student roster claim and admin-only roster/staff provisioning.
- Admin academic-data imports for courses, offerings, enrollments, and lecturer assignments.
- Lecturer-scoped session creation, complete attendance submission, and reasoned session cancellation.
- Admin-only completed-session attendance correction with before/after audit data.
- Student dashboard API and deny-by-default Firestore security rules.
- Unit tests, Firestore Emulator rules tests, lint/typecheck, dependency audit gate, and production build in CI.

## Still required before a real pilot

1. Extend route-level integration coverage to session creation, attendance submission, cancellation, and staff provisioning. Current emulator-backed tests cover academic imports, roster-backed dashboard behavior, and completed-session corrections.
2. Complete a human review of transaction behavior, import bounds, error handling, and audit integrity.
3. Review the first-admin bootstrap runbook with an authorized institutional stakeholder.
4. Connect the UI to the authenticated APIs (frontend implementation is being handled separately).
5. Obtain institution-approved roster and academic data through authorized channels.
6. Configure a separate production Firebase project and deployment secrets only with explicit human approval.
7. Conduct an institution-approved security and workflow review before any live pilot.

## Safety boundary

The current preview uses synthetic data. Do not create production Firebase resources, deploy production rules, provision a live administrator, or upload real student records as part of automated repository work.

For the current architecture and collection model, see [architecture.md](../architecture.md). For request/response details, see [the backend API contract](BACKEND_API_CONTRACT.md). Attendance defaults and roster rules are documented in [ROSTER_AND_ATTENDANCE_RULES.md](ROSTER_AND_ATTENDANCE_RULES.md).
