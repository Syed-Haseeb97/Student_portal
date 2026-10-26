# IIITT Student Portal

A lightweight, mobile-first student portal for IIIT Tiruchirappalli, starting with attendance.

## Product goal

Give students a reliable view of their course-wise attendance and give authorized lecturers a fast, auditable workflow to record attendance for their assigned classes. The first release is a pilot, not a replacement for official institute systems.

## Initial stack

- **Web:** Next.js App Router, TypeScript, Tailwind CSS
- **Auth:** Supabase Auth passwordless email (magic link or email OTP)
- **Data:** Supabase-hosted PostgreSQL
- **Authorization:** PostgreSQL Row Level Security (RLS), with server-side checks for privileged actions
- **Hosting:** Vercel
- **Tests:** unit/integration tests for access rules and attendance calculations, plus end-to-end tests for the main flows

Exact package versions and lockfile will be pinned when the application scaffold is created.

## Authentication and identity

1. A user enters their institutional email address.
2. The app accepts only a verified email whose normalized domain is exactly `iiitt.ac.in`.
3. The authenticated identity is matched against an administrator-imported/approved roster. Email-domain verification alone does **not** prove student or lecturer status.
4. The roster provides the canonical roll number, batch, section and student status. The email-to-roll-number format will be confirmed using an example before implementing any parser.
5. New accounts do not receive lecturer or administrator permissions automatically. Roles and course assignments are provisioned by an authorized administrator.

Supabase passwordless email supports both magic links and email OTP. The UI may offer either mode; the project configuration and email template must match the selected mode.

## Core data model

- `profiles`: auth user ID, normalized institutional email, role and account status
- `students`: canonical roll number, batch, section, semester and active status
- `courses`: course code, title and semester
- `course_assignments`: lecturer-to-course/section assignment
- `class_sessions`: course, section, date/time, creator and session state
- `attendance_records`: one student status per class session, recorded by and timestamps
- `attendance_audit_log`: append-only record of attendance changes and reasons
- `roster_imports` (optional for MVP): import metadata and validation results

Use foreign keys, uniqueness constraints and transactions to prevent duplicate attendance records and inconsistent course assignments. Percentages are calculated from class sessions and attendance records rather than manually stored.

## Authorization invariants

- Students can read only their own attendance and their permitted course/session metadata.
- Lecturers can view rosters and create/update attendance only for course sections assigned to them.
- Only authorized administrators can import roster data, assign lecturers, manage roles or correct institutional mappings.
- Users cannot set their own role, roll number, batch, lecturer assignments or audit history.
- RLS is enabled on every exposed table. Policies must be tested with student, lecturer, administrator and unauthenticated identities.
- Never ship a Supabase service-role/secret key to the browser or commit secrets.
- Attendance edits are auditable; do not silently overwrite the history of a correction.

## MVP milestones

1. **Foundation:** scaffold app, environment validation, Supabase clients, auth screens, verified-email/domain guard and approved-roster matching.
2. **Schema and security:** migrations, constraints, RLS policies and automated authorization tests.
3. **Student dashboard:** course-wise attendance, totals, session history and clear empty/error states.
4. **Lecturer dashboard:** assigned courses, create session, mark roster, submit attendance and correct a record with a reason.
5. **Admin onboarding:** validated CSV roster import, batch/course setup and lecturer assignment.
6. **Pilot:** use synthetic data first; test with a small approved group before any real student data is entered.

## Not in the first release

Grades, fees, hostel management, assignments, messaging, timetables, native mobile apps and integration with official institute systems.

## Setup status

The GitHub repository was created empty. This document records the agreed direction; no Supabase project, credentials, schema or production app is assumed to exist yet.

Before implementing email-to-roll-number matching, add a **synthetic example** of the institutional email pattern (do not share anyone else's private email address). Before handling real attendance data, confirm the pilot process and data access with the relevant institute/lecturers.
