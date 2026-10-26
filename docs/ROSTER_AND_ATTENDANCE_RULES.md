# Finalized MVP Roster and Attendance Rules

These are the implementation defaults for the first MVP. They are not a substitute for an institute-approved roster export or formal academic policy.

## Roster contract

The source of truth is an approved administrator-provided CSV. Required columns:

`rollNumber,email,batch,programme,active`

- `rollNumber`: canonical roll number, stored as text to preserve leading zeroes and historical formats.
- `email`: unique institutional email, normalized to lowercase and required to end exactly in `@iiitt.ac.in`.
- `batch`: four-digit entry year (for example `2026`), explicitly supplied, never inferred from roll number.
- `programme`: institute-approved programme/branch label, explicitly supplied.
- `active`: `true`/`false` or `1`/`0`.
- One active roster entry per email and per roll number. Duplicate normalized values must fail validation.
- Inactive entries cannot claim portal access.
- Unknown, missing, duplicate, or malformed values fail the import; never partially import a file silently.
- The sample rows in `roster-import-template.csv` are examples only and are not real student records.

Roster import must eventually support dry-run output, row-numbered errors, and a transaction/batched write strategy. It must be an authenticated admin-only server operation; no browser writes to `studentRoster`.

## Sign-in and identity binding

- Use Firebase passwordless email-link sign-in.
- Require a verified email matching `@iiitt.ac.in` exactly.
- After Firebase sign-in, a server route verifies the ID token and checks the private roster for exactly one active match.
- No match or duplicate match means deny access. Never create a student profile from user-entered roll number/branch.
- Profile and role fields are server-owned. Student sign-in always creates/maintains only the `student` role.
- Lecturers and administrators are provisioned through a trusted admin-only workflow. Email domain is not proof of staff status.
- Cross-device email-link completion must ask for the same email again; never trust an email passed in the URL.

## Attendance policy

- Attendance is evaluated separately for each course offering in a term/semester.
- `present / (present + absent) * 100`; exactly 75% is compliant.
- Each session has a distinct ID. Multiple sessions of the same course on one date count separately.
- Only completed sessions count in the denominator. Scheduled and cancelled sessions do not.
- A session can be completed only when every active enrollee has exactly one mark, either present or absent. Missing marks block submission; they are never assumed present.
- A session is not editable after completion through the normal lecturer flow.
- Corrections require a separately authorized correction workflow with a non-empty reason and immutable before/after audit metadata. Until that workflow is implemented, corrections require admin intervention; never edit Firestore manually without recording an audit event.
- Each attendance mark stores the student UID, roster ID, offering ID, session ID, date, mark, recorder UID, and timestamp.
- Students may read only their own attendance. Assigned lecturers may read attendance for their assigned offerings. Admin access is audited.
- Lecturer access is scoped to active teaching assignments. Admins provision course offerings, enrollments, assignments, and roles.
- The lecturer dashboard's "today" count means distinct scheduled sessions for the local campus date; duplicate course sessions remain separate.

## Current implementation boundary

The first Firebase integration adds browser/admin SDK setup, email-link sign-in helpers, roster-claim endpoint, private roster rules, deny-by-default Firestore rules, index/emulator config, and CSV validation. A trusted roster-import endpoint, staff provisioning UI, session creation/submission routes, correction workflow, and rules-emulator tests remain required before a real pilot.
