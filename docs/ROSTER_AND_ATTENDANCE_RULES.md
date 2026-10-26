# Finalized MVP Roster and Attendance Rules

These are implementation defaults for the first MVP. They are not a substitute for an institute-approved roster export or formal academic policy.

## Roster contract

The source of truth is an approved administrator-provided CSV. Required columns: `rollNumber,email,batch,programme,active`.

- `rollNumber`: canonical roll number stored as text to preserve leading zeroes and historical formats.
- `email`: unique institutional email, normalized to lowercase and required to end exactly in `@iiitt.ac.in`.
- `batch`: four-digit entry year, explicitly supplied and never inferred from roll number.
- `programme`: institute-approved programme/branch label, explicitly supplied.
- `active`: `true`/`false` or `1`/`0`.
- Duplicate normalized emails or roll numbers fail validation. Inactive entries cannot claim portal access.
- The sample rows in `roster-import-template.csv` are fake examples only.
- The admin-only import endpoint accepts already-parsed JSON rows from an approved CSV, limited to 200 rows per atomic request. It validates the entire batch before writing and rejects email/roll conflicts. Email changes for existing roll numbers require separate review. Imports are audited.
- The first administrator must be provisioned manually in the Firebase Console before the import endpoint can be used. Never expose a public admin-bootstrap endpoint.

## Sign-in and identity binding

- Use Firebase passwordless email-link sign-in and require a verified email matching `@iiitt.ac.in` exactly.
- After sign-in, a server route verifies the Firebase ID token and checks the private roster for exactly one active match.
- No match or duplicate match means deny access. Never create a student profile from user-entered roll number or programme.
- Profile and role fields are server-owned. Student sign-in only maintains the `student` role.
- Lecturers and administrators must be provisioned through a trusted workflow; email domain is not proof of staff status.
- Cross-device email-link completion asks for the same email again and never trusts an email passed in the URL.

## Attendance policy

- Calculate attendance separately per course offering in each term/semester.
- `present / (present + absent) * 100`; exactly 75% is compliant.
- Each session has a distinct ID. Multiple sessions of the same subject on one date count separately.
- Only completed sessions count. Scheduled and cancelled sessions are excluded.
- A session can be completed only when every active enrollee has exactly one mark, either present or absent. Missing marks block submission; they are never assumed present.
- A completed session is immutable through the normal lecturer flow.
- Corrections are restricted to the admin-only completed-session correction endpoint, require a non-empty reason, and write immutable before/after audit metadata in the same transaction.
- Attendance marks store student UID, roster ID, offering ID, session ID/date, mark, recorder UID, and timestamp.
- Students may read only their own marks. Active lecturers may read marks for assigned offerings. Admin access is audited.
- Lecturer access is scoped to active teaching assignments. Admins provision offerings, enrollments, assignments, and staff roles.
- The lecturer dashboard's "today" count uses the campus timezone (Asia/Kolkata) and counts distinct scheduled sessions.

## Implemented on this feature branch

Firebase browser/Admin SDK setup, email-link sign-in screens/helpers, roster-claim endpoint, admin-only atomic roster import and academic-data import endpoints, session creation, audited cancellation and complete attendance submission endpoints, an admin-only audited correction endpoint, a student attendance dashboard API, deny-by-default Firestore rules, indexes/emulator config, and CSV row validation.

Still required before a real pilot: first-admin bootstrap, synthetic integration tests for academic imports and corrections, frontend wiring to the dashboard API, and the actual institute-approved roster. Firestore Emulator authorization tests are now included in CI, but their run must pass before any real data is used. Do not use real student records until those items are complete and reviewed.
