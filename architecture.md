# Architecture and decisions

## Scope and status

The IIITT Student Portal is an attendance-focused Next.js application. The homepage remains a synthetic preview; Firebase Auth/Firestore backend routes and emulator rules are implemented on the Firebase feature branch. No live Firebase project, production roster, or real admin is configured by this repository workflow.

## Stack

- Next.js App Router, TypeScript, and Tailwind CSS.
- Firebase Authentication with passwordless email-link sign-in.
- Cloud Firestore for roster, profiles, staff, courses, offerings, enrollments, teaching assignments, sessions, attendance, and audit events.
- Firebase Admin SDK only in server routes that require trusted provisioning or atomic multi-document operations.
- Firestore Emulator Suite for local security rules tests.
- Vercel is a planned deployment target, not configured here.

## Identity and authorization

- A verified institutional email ending exactly in `@iiitt.ac.in` is necessary but not sufficient for access.
- A server-side roster claim must also find exactly one active, approved roster entry for the authenticated email.
- Roll numbers, email prefixes, and programme patterns are never authorization mechanisms. Batch, programme, and roll number are explicit approved-roster fields.
- Student, lecturer, and admin roles are server-provisioned. Client writes to roster, email index, profiles, staff, sessions, attendance, assignments, enrollments, offerings, and audit events are denied by Firestore rules.
- Normal reads use Firebase Auth plus Firestore rules. Admin SDK credentials are server-only, narrowly scoped, and guarded against a mismatch between configured project IDs.
- The portal must use a separate Firebase project from any unrelated application. Never put service-account credentials in browser-visible variables or source control.

## Roster import

The approved CSV contract is `rollNumber,email,batch,programme,active`. Validate the whole batch before writes, normalize email and roll number, reject duplicate normalized email/roll values, and process the import atomically. Existing roll-number email changes require separate review. Imports and staff provisioning emit audit events. The included CSV template contains synthetic examples only.

## Session lifecycle and attendance

- Sessions have distinct IDs; multiple sessions for the same offering on the same date remain separate.
- Active lecturers can create and cancel sessions only for active offerings assigned to them. Scheduled sessions may be created in advance.
- Cancellation requires a non-empty reason and an audit event.
- A session can be completed only with exactly one `present` or `absent` mark for every active enrollee. Missing, duplicate, or out-of-scope marks must not complete the session.
- Attendance is calculated independently per course offering/term. Exactly 75% is compliant: `present / (present + absent) >= 0.75`.
- Only completed sessions count; scheduled and cancelled sessions are excluded.
- Completed-session corrections are restricted to the admin-only correction endpoint; each correction requires a reason and writes before/after values to an audit event in the same transaction. Validate this endpoint with synthetic fixtures before any pilot.

## Verification and remaining work

CI runs lint, TypeScript checks, unit tests, Firestore Emulator authorization tests, and a production build. A successful CI run verifies the tested code path but does not substitute for a human security review or production configuration.

Remaining: expand negative/edge-case integration coverage for duplicate imports, inactive actors, malformed bodies, and concurrent role changes; complete a human transaction/security review; review the first-admin bootstrap runbook with the institution; wire the frontend to the student dashboard API; obtain institution-approved roster/academic data; and complete a focused security review before any live pilot. The current dependency audit reports zero vulnerabilities. The repository still lacks a committed npm lockfile, so dependency resolution is not yet fully reproducible. Do not create live Firebase resources, deploy rules, or use real student records without explicit human approval.
