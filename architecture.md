# Architecture and decisions

## Scope and status

The IIITT Student Portal is a full-stack, attendance-focused Next.js application built for the Indian Institute of Information Technology, Tiruchirappalli. Under the repository owner's explicit authorization override, the portal supports both local development against the Firebase Emulator Suite and live institutional deployments using real Firebase Auth, Cloud Firestore, and Resend email delivery.

## Stack

- Next.js 16 App Router, TypeScript, and Tailwind CSS.
- Firebase Authentication with passwordless institutional email-link sign-in.
- Resend API for transactional institutional sign-in link delivery with HTML/plain-text templates, rate limiting, and dev/emulator console fallback.
- Cloud Firestore for roster, profiles, staff, courses, offerings, enrollments, teaching assignments, sessions, attendance, audit events, and rate limits.
- Firebase Admin SDK strictly server-only for trusted provisioning, link generation, and atomic multi-document transactions.
- Firestore Emulator Suite for local automated security rules and API integration test execution.
- Vercel is a supported deployment target, configured via environment variables.

## Identity and authorization

- A verified institutional email ending exactly in `@iiitt.ac.in` is necessary but not sufficient for student access.
- A server-side roster claim (`POST /api/roster/claim`) must match the authenticated email against exactly one active, approved roster entry in `studentRoster`.
- Roll numbers, email prefixes, and programme patterns are never client authorization mechanisms. Batch, programme, and roll number are authoritative roster fields populated by administration.
- Student, lecturer, and admin roles are server-provisioned (`userProfiles` and `staff`). Client writes to roster, email index, profiles, staff, sessions, attendance, assignments, enrollments, offerings, rate limits, and audit events are denied by Firestore rules.
- Normal client reads use Firebase Auth tokens verified by Firestore rules. Admin SDK credentials are server-only, validated on startup, and guarded against project ID mismatches.
- Client state is managed by a central `AuthProvider` and `useAuth` hook. Server endpoints verify ID tokens on every request.

## Roster import & Administration

- The approved CSV contract is `rollNumber,email,batch,programme,active`. The admin portal validates the entire batch before writing, normalizes email and roll number, rejects duplicate normalized email/roll values, and processes imports atomically.
- Existing roll-number email changes require separate review.
- Imports, staff provisioning, session lifecycle changes, and attendance corrections write immutable records to `auditEvents`.
- The first administrator is provisioned safely via the offline CLI script `scripts/bootstrap-admin.ts`.

## Session lifecycle and attendance

- Sessions have distinct IDs; multiple sessions for the same offering on the same date remain separate.
- Active lecturers can create and cancel sessions only for active offerings assigned to them.
- Cancellation requires a non-empty reason and emits an audit event.
- A session can be completed only with exactly one `present` or `absent` mark for every active enrollee. Missing, duplicate, or out-of-scope marks cannot complete the session.
- Attendance is calculated independently per course offering/term. Exactly 75% is compliant: `present / (present + absent) >= 0.75`.
- Only completed sessions count; scheduled and cancelled sessions are excluded.
- Completed-session corrections are restricted to the admin-only correction endpoint (`/api/admin/attendance/[attendanceId]/correction`); each correction requires a mandatory reason and writes before/after values to an audit event in the same transaction.

## Verification

Continuous verification includes:
- Linting (ESLint) and TypeScript strict type checking (`tsc --noEmit`).
- Fast unit tests for attendance formulas, roster validation, bounded JSON streaming, API client normalization, send-link rate limiting, `/api/me`, and role guards.
- Firestore Emulator unit tests verifying client denial-of-service and collection isolation rules (`npm run test:rules`).
- Full backend route integration tests against the Firebase Auth + Firestore emulators (`npm run test:api`).
- Complete production build (`next build`).
