# Attendance Portal Backend Plan — Firebase Adaptation

Status: architecture proposal only. This document does not enable authentication, connect production data, or change the existing Unplug Firebase project.

## Decision

Use the existing Unplug repository as an implementation reference, not as the attendance portal's production data store. Create a **separate Firebase project** for the IIITT portal. Reuse its proven patterns: Firebase Auth, Firestore repositories, deny-by-default rules, explicit validation, transactions, manual dependency wiring, secrets kept out of Git, and CI checks.

The portal is relational in nature. Firestore can support the MVP, but it has no SQL joins; course rosters and attendance summaries need deliberate document design and denormalized fields. If extensive reporting, timetable joins, or institution-wide exports become a central requirement, compare the cost of moving to PostgreSQL before production rather than silently building a hybrid.

## Existing evidence and gaps

- `quit_addiction/feature/foundation` contains a working Android Firebase Auth + Firestore foundation, `AppContainer`, repository interfaces, and Firestore rules.
- Its rules are specific to Unplug's social entities (users, posts, follows, likes, reports, blocks); they are **not** suitable for attendance.
- The portal's current page is a synthetic preview. Supabase browser/server/admin clients and an attendance calculation helper exist, but no reviewed schema, migration, row-level security policy, roster import, or real attendance workflow has been verified.
- The archived attendance tests encode the 75%-per-course rule and distinct same-day sessions. Preserve and expand those tests while replacing the unverified data layer.

## Proposed web architecture

- Next.js App Router + TypeScript on Vercel.
- Firebase Web SDK for client sign-in and permitted Firestore reads/writes.
- Firebase Admin SDK only in server-side route handlers for trusted roster matching, staff provisioning, bulk imports, and privileged operations. Keep service credentials in deployment secrets; never expose them to browser code.
- Small domain modules/repositories: `auth`, `roster`, `courses`, `sessions`, `attendance`, `staff`.
- Firebase Emulator Suite for Auth/Firestore rules and integration tests before any real student records are used.
- Separate portal Firebase project and authorized domains. Do not reuse Unplug's project, collections, or credentials.

## Identity and authorization

1. Student signs in with Firebase email-link (passwordless) authentication. It verifies control of the mailbox; the UI may require an `@iiitt.ac.in` address, but the UI check is not the security boundary.
2. A server-side endpoint verifies the Firebase ID token, requires a verified institutional email, and checks an **admin-imported roster**. An institutional email alone does not grant portal membership.
3. Student identity is linked to one canonical roster record and a verified roll number. The user cannot submit their own role, roll number, department, or batch as authoritative data.
4. Lecturer and administrator roles are provisioned only through a trusted admin workflow. Never let a user write their own role. Use server-issued custom claims or a server-managed staff registry; never infer lecturer/admin status from email domain alone.
5. Firestore rules enforce roles, ownership, and allowed state transitions. Hiding UI buttons is not authorization.
6. No public roster listing. The roster matching endpoint returns only the minimal result needed and is rate-limited where practical.

Email-link sign-in is supported by Firebase's web SDK. The final flow must handle a user opening the link on another device by asking them to re-enter the same email address; never trust an email copied from a URL parameter.

## Firestore collection model

Use stable IDs and keep documents small. Suggested initial collections:

- `studentRoster/{studentKey}`: admin-imported canonical roster entry; normalized email, roll number, batch, department/program, active status. Never client-writable; no broad student reads.
- `userProfiles/{uid}`: UID, roster key, verified email, display name, created/last-seen timestamps. Student cannot edit privileged fields.
- `staff/{uid}`: role (`lecturer` or `admin`), active flag, optional staff code. Server/admin writes only.
- `courses/{courseId}`: stable course code, title, term/semester, active state.
- `courseOfferings/{offeringId}`: course reference, term, section/group, enrolled roster keys or a separate enrollment collection.
- `enrollments/{enrollmentId}`: offering ID + student key + active state. Enforce one active enrollment per student/offering using deterministic document IDs.
- `teachingAssignments/{assignmentId}`: offering ID + lecturer UID + active state. Multiple lecturers per offering are supported.
- `sessions/{sessionId}`: offering ID, local class date, start/end times (if needed), state (`scheduled`, `completed`, `cancelled`), createdBy UID, timestamps, optional completion metadata. Every class meeting gets its own ID, including two same-subject sessions on the same date.
- `attendance/{sessionId_studentKey}`: deterministic unique key, session ID, student key, mark (`present`/`absent`), recordedBy UID, recordedAt, optional correction metadata. No client can create duplicate marks for the same student/session.
- `auditEvents/{eventId}`: append-only audit metadata for attendance submission, corrections, roster imports, and staff/course changes. Avoid storing unnecessary personal data in audit entries.

The exact roster key and course/term identifiers must be finalized before coding. Avoid guessing roll-number parsing rules from a few examples; store batch, program, and roll number explicitly in the authoritative roster import.

## Authorization matrix (minimum)

- Student: read their own profile, enrolled offerings, scheduled/completed sessions for those offerings, and their own attendance marks/derived summaries. No roster browsing; no attendance writes.
- Lecturer: read assigned offerings and their enrolled students; create future sessions for assigned offerings; submit attendance only for an assigned offering's session. Cannot manage roster, staff roles, or unrelated offerings.
- Admin: manage/import roster, courses, offerings, enrollments, lecturer assignments, and staff. Privileged operations run server-side and are audited.
- All users: cannot grant themselves roles, change another user's identity, write an arbitrary attendance mark, or alter a completed session without the defined correction flow.
- Default deny for unmatched paths. Test both allowed and denied cases in the emulator.

## Attendance lifecycle and calculation

- Session creation: authorized assigned lecturer (or admin) creates a distinct `scheduled` session, including future dates.
- Submission: lecturer submits a complete attendance list for that session. Validate the lecturer assignment, session state, enrolled roster, mark values, and one mark per enrolled student. Prefer an atomic batch/transaction for bounded class sizes; for large cohorts, define a safe staged submission protocol before implementation.
- Completion: session becomes `completed` only after submission is validated. A completed session with missing marks must not silently count as attended; the final policy should decide whether missing marks block completion or are reported as unrecorded.
- Cancellation: `cancelled` sessions are excluded from the denominator. Scheduled sessions are also excluded. This matches current helper assumptions but remains an institutional policy to confirm.
- Correction: no silent edits after completion. Require an authorized correction path with reason, before/after audit, actor, and timestamp. Decide whether lecturer corrections require admin approval.
- Percentage: compute per offering/course as `present / (present + absent) * 100`; exactly 75% is compliant. Never aggregate subjects to determine compliance. Display unrecorded separately; do not treat it as present.
- Dashboard: today's class count is the count of distinct sessions scheduled for that local date, grouped by assigned offerings; multiple sessions of the same course count separately.

## Security and operational controls

- Publishable Firebase config is not a secret; Admin SDK credentials are. Use a separate portal project and separate Vercel environment variables.
- Firestore rules must validate immutable IDs, mark/state enums, allowed fields, ownership, assignment, and session state. Admin SDK bypasses Firestore rules, so every privileged route must verify the caller's ID token and role explicitly.
- Avoid storing aggregate attendance percentages as source of truth; derive them from marks or maintain explicitly rebuildable aggregates only if usage demands it.
- Add composite indexes only for real queries and commit the index manifest.
- Use synthetic fixtures during development. Do not upload real student roster/attendance data to a public repository or test environment.
- Add CI for typecheck, lint, unit tests, and emulator rules/integration tests. Build checks alone do not prove production auth/rules are safe.

## Existing portal scaffold migration

1. Preserve the current visual preview and pure attendance calculation module/tests.
2. Remove or replace Supabase client modules and Supabase environment variables only after the Firebase design and project decision is accepted; do not leave a mixed, ambiguous backend.
3. Add Firebase web initialization with public web config, server-only Admin SDK initialization, and an explicit auth/session strategy.
4. Add roster import format validation and a dry-run report before permitting writes.
5. Implement and test security rules plus emulator tests before connecting dashboards to live records.
6. Implement session submission/correction flows, then wire student/lecturer UI to real repositories.
7. Run lint, typecheck, unit tests, emulator integration/rules tests, and production build. Conduct a security review before any real data pilot.

## Decisions required before implementation

1. Confirm the portal will use a **separate Firebase project** (recommended) rather than the Unplug project.
2. Obtain an approved roster export and confirm its authoritative fields: institutional email, roll number, batch, program/branch, active status, and any historical exceptions.
3. Confirm whether all students actually have usable `@iiitt.ac.in` mailboxes and whether email-link sign-in is acceptable.
4. Define course offering, semester, section, elective enrollment, and multiple-lecturer assignment source.
5. Decide whether a completed session may be corrected by a lecturer directly or only after admin approval.
6. Confirm whether an attendance submission must mark every enrolled student present/absent before a session can be completed.
7. Confirm the cancellation and attendance correction policy with the institution.

## References

- Firebase email-link sign-in for web: https://firebase.google.com/docs/auth/web/email-link-auth
- Firebase Auth + Firestore security rules: https://firebase.google.com/docs/rules/rules-and-auth
- Firestore data model: https://firebase.google.com/docs/firestore/data-model
- Firestore transactions and batched writes: https://firebase.google.com/docs/firestore/manage-data/transactions
