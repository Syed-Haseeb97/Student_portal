# Architecture

Status key: **Confirmed** = you told me. **Assumption** = my default, change it if wrong.

## Stack (Confirmed)
Next.js App Router, TypeScript, Tailwind, Supabase Auth + Postgres + RLS, SQL migrations, Vercel. No extra backend. Server code talks to Supabase as the signed-in user, so RLS always applies. The service-role client (`lib/supabase/admin.ts`) is server-only and reserved for roster import and first-admin bootstrap.

## Structure
```
app/            routes: (auth) (student) (lecturer) (admin)   - Stages 4-6
lib/supabase/   browser.ts, server.ts, admin.ts (server-only)
lib/attendance/ calc.ts: pure, unit-tested mirror of the database view
supabase/       migrations/, seed.sql (synthetic), tests/ (pgTAP)
```

## Attendance rules (Confirmed unless marked)
- 75% minimum applies **per subject**, never overall. Threshold lives in `attendance_policy` (admin-editable).
- Only **completed** sessions count. Cancelled and scheduled sessions never enter the denominator. Exactly 75% is compliant.
- No overall percentage is stored or exposed anywhere.
- **Assumption:** marks are `present | absent` only. Late and excused are undecided, so not built.
- **Assumption:** once submitted, attendance is locked (no edits, no deletes). Corrections need a policy decision first.

## Data model
| Table | Notes |
|---|---|
| `branches`, `batches`, `sections` | branch codes are data |
| `approved_identities` | email (lowercase, exact `@iiitt.ac.in` enforced by a CHECK), role, status, `auth_user_id`. The access source of truth |
| `students`, `lecturers` | 1:1 with an identity of the matching role (composite FK stops a lecturer identity becoming a student) |
| `courses`, `course_offerings` | offering = course + section + term |
| `lecturer_assignments` | many lecturers per offering, one explicit row each |
| `enrollments` | (offering, student); separate from section membership so electives can come later. `enroll_section_in_offering()` fills it from the section roster |
| `class_sessions` | one row per class; state `scheduled / cancelled / completed` |
| `attendance_records` | unique (session, student); composite FKs force the student to be enrolled in that session's offering |
| `attendance_audit` | written by trigger on every insert/update/delete |
| `roster_imports`, `roster_import_rows` | admin-only |
| view `student_course_attendance` | per student per offering: attended, missed, unrecorded, total, percentage, status. `security_invoker`, so RLS applies |

**Sessions.** Creation by assigned lecturers (Confirmed). "Upcoming/in progress" are derived from date and time at display; only `scheduled/cancelled/completed` are stored. Duplicate protection: an exclusion constraint forbids two non-cancelled sessions of the same offering overlapping in time, plus an idempotency `client_token` so a retried request is a no-op. Back-to-back classes of one subject on one day are allowed.

**Submission.** `submit_session_attendance(session, marks)` inserts that session's records and completes it in one transaction. A trigger refuses completion unless every enrolled student has a record, and sets who/when itself. Nothing outside that session is touched.

## Authorization summary
| Actor | Can |
|---|---|
| Student | read own identity, profile, enrolments, sessions of their offerings, own records, own summary |
| Lecturer | read/create/reschedule/cancel/delete-while-scheduled sessions and submit attendance, only for offerings they are assigned; read those rosters and records |
| Admin | manage identities, roster, courses, assignments, enrolments, policy; read everything including the audit log. No direct write path to attendance records |
| Not on roster | sees nothing |
| anon | no grants at all |

Enforced three ways: RLS policies, column-level grants (lecturers cannot set `submitted_by`, offering, etc.), and triggers. All grants are explicit; we do not rely on Supabase defaults (they are changing, enforced on existing projects from 30 Oct 2026).

## Open questions
**Stage 4:** do students get pre-approved by roster import only, or can they request access? Email format vs roll number.
**Stage 5/6:** edit-after-submit and correction workflow; late/excused; elective enrolment rules if the pilot needs them.
**Known limits:** one role per identity (an admin who also teaches needs a second identity for now); a student has one current section.
