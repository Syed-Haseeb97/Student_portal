# Instructions for coding agents

- Read `README.md`, `architecture.md`, and this file before changing the application.
- Keep the IIIT Trichy attendance portal focused: Next.js App Router, TypeScript, Tailwind CSS, Firebase Auth, and Cloud Firestore.
- **AUTHORIZATION OVERRIDE (Authorized by Repository Owner)**:
  The owner has explicitly authorized real email delivery (Resend) and live Firebase Auth/Firestore configuration through environment variables. Never commit secrets, `.env.local`, or private credentials to git.
- Keep all security rules strictly intact:
  - A verified `@iiitt.ac.in` email AND exactly one active approved-roster match are required for student access. Domain verification or roll-number parsing alone never authorizes anyone.
  - Student, lecturer, and admin roles are server-provisioned only. Firestore rules must deny client writes to roster, email index, profiles, staff, sessions, attendance, and audit records.
  - Keep Firebase Admin SDK and credentials server-only; guard against using the wrong Firebase project.
- Validate the entire roster import before writes. Reject duplicate normalized emails/roll numbers and do not silently change an existing roll number's email.
- Lecturers may create/cancel sessions only for active assigned offerings. Cancellation requires a reason and audit event.
- Completing a session requires exactly one present/absent mark per active enrollee. Attendance is per offering; exactly 75% is compliant; only completed sessions count.
- Preserve user changes and migration/history; never force-push or silently rewrite applied history.
- Run and report the actual lint, typecheck, unit tests, emulator authorization tests, and production build results. Never claim a command passed unless it was run.
- Final reports must list changed files, tests actually run, results, remaining unverified items, and exact manual steps required.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
