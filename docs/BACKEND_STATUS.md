# Firebase backend implementation status

This document summarizes the current backend and frontend integration status for the IIIT Trichy attendance portal.

## Implemented Capabilities

- **Auth & Identity**: Next.js App Router, Firebase Authentication passwordless email-link sign-in via Resend (`POST /api/auth/send-link`), client `AuthProvider` / `useAuth` hook, and `/api/me` profile resolution.
- **Roster & Claim**: Verified student roster claim (`POST /api/roster/claim`) with single-match active roster check and staff verification.
- **Admin Management Console (`/admin`)**:
  - Full UI for CSV roster upload with client-side preview/validation and atomic import.
  - Staff management for provisioning lecturers and administrators with last-admin lockout safeguards.
  - Academic catalog and offerings management with referential integrity validation.
  - Attendance mark correction with mandatory administrative justification.
  - Immutable security audit trail viewer (`/admin/audit`).
  - Safe First Administrator bootstrap CLI script (`scripts/bootstrap-admin.ts`).
- **Lecturer Management (`/lecturer`)**:
  - Live session scheduling with room and time conflict detection.
  - Roll-call attendance submission and session cancellation with audit trail.
- **Student Portal (`/dashboard`)**:
  - Live attendance summaries, 75% statutory bunk margin engine, per-subject session history, and student profile (`/dashboard/profile`).
- **Security Rules**:
  - Deny-by-default Cloud Firestore rules (`firestore.rules`).
  - Server-only Admin SDK operations protected by transactions.
  - Anti-enumeration generic sign-in response and rate-limiting (`lib/auth/rate-limit.ts`).

## Operational Checklist Before Live Institutional Pilot

1. **Firebase Console**: Enable Email Link sign-in, add authorized domains (`portal.iiitt.ac.in`), and generate service account JSON credentials.
2. **Resend Domain Verification**: Verify `iiitt.ac.in` domain in the Resend console so emails reach all students and faculty.
3. **First Admin Bootstrap**: Execute `npx tsx scripts/bootstrap-admin.ts <admin@iiitt.ac.in>` once to establish the initial institutional admin.
4. **Roster Upload**: Upload the official approved institute roster CSV through `/admin/roster`.
5. **Academic Catalog**: Populate courses and semester offerings through `/admin/academic`.
