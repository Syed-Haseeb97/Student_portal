# Architecture and decisions

## Confirmed requirements

- IIIT Trichy student portal, initially attendance-focused.
- Supabase Auth magic link or email OTP, verified institutional `@iiitt.ac.in` email, and approved-roster matching.
- At least 75% attendance independently for each subject.
- Every class session has its own attendance submission; multiple same-day sessions are separate.
- Assigned lecturers create sessions, including ahead of time.
- Multiple lecturers may be assigned to an offering.
- Students see only their own attendance; lecturers access only assigned offerings/sections.
- Dark, mobile-first interface with restrained teal/indigo accents.

## Roll-number convention (partially confirmed)

- `261161`: 2026-entry, CSE, roll 61.
- `261261`: 2026-entry, AI & DS, roll 61.
- `2613xx`: ECE.
- `2614xx`: VLSI.
- `25xxxx`: initial pattern for the senior batch.

The complete branch mapping and historical variation are not confirmed. Preserve roll numbers as strings; do not infer authorization from parsing. The approved roster is the source of truth.

## Proposed architecture

Next.js App Router + TypeScript + Tailwind CSS, Supabase Auth and PostgreSQL, explicit server-side authorization and RLS, version-controlled SQL migrations, and Vercel after verification.

## Attendance calculation

The pure helper counts completed sessions only by default. Scheduled and cancelled sessions are excluded. Threshold defaults to 75% and is configurable. Confirm institute policy before real use.

## Security boundaries

Email verification does not automatically authorize an account. Roles must be explicitly granted. Route redirects alone are not authorization. Service-role credentials bypass RLS and are reserved for narrowly scoped admin operations. Development examples must use synthetic data. SQL and RLS require execution and tests against PostgreSQL before they are considered verified.

## Open decisions

- Exact institutional email format and whether it contains a roll number.
- Full branch-code mapping for all batches.
- Initial administrator provisioning.
- Attendance correction and audit workflow.
- Exceptions to the default completed/cancelled session policy.
- Whether elective enrollment is required for the first pilot.
