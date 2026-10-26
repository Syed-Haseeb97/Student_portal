# Agent instructions

Read `README.md` before making changes. This project handles student identity and attendance; security and correctness take priority over speed.

## Required rules

- Keep the first release focused on student attendance and lecturer recording workflows.
- Use Next.js App Router + TypeScript and Supabase Auth/PostgreSQL unless the owner explicitly approves a change.
- Check current official Supabase documentation before implementing auth, database access, RLS, or migrations.
- Never commit `.env`, `.env.local`, credentials, Supabase service-role/secret keys, private student records, or real roster exports.
- Use only synthetic data in tests and screenshots.
- Never trust a client-supplied role, roll number, batch, course assignment, or user ID for authorization. Derive identity from the authenticated session and approved database records.
- Enforce access in PostgreSQL RLS and server-side code. Hiding a UI control is not access control.
- Students may only see their own attendance. Lecturers may act only on assigned course sections. Admin privileges must be granted explicitly.
- Keep an audit trail for attendance edits. Prevent duplicate records with database constraints.
- Do not guess the institutional email/roll-number format. Wait for a synthetic example and document the confirmed rule with tests.
- Do not use a service-role key in browser/client code.
- Add tests for both allowed and denied access, including attempts to access another student's records and an unassigned course.
- Keep secrets out of commits and include a safe `.env.example` with placeholders when environment variables are introduced.
- Prefer small, reviewable changes. Report changed files, tests run, results, known gaps, and the next step.

## Before marking a feature complete

1. Run the relevant lint, type-check, unit/integration and build commands.
2. Verify authorization failures are denied by the database, not only the UI.
3. Inspect the diff for secrets, personal data, accidental unrelated changes and unsafe defaults.
4. Clearly distinguish tested behavior from behavior that still needs a configured Supabase project or real environment.
