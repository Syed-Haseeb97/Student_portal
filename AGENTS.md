# Instructions for coding agents

- Read `README.md`, `architecture.md`, and this file before changing the application.
- Keep the IIIT Trichy attendance MVP focused: Next.js App Router, TypeScript, Tailwind CSS, Firebase Auth, and Cloud Firestore.
- Use synthetic data only. Never create/configure a live Firebase project, deploy production rules, upload a real roster, or seed a real admin without explicit human approval.
- Never commit secrets, `.env.local`, service-account keys, production credentials, or real student records.
- A verified `@iiitt.ac.in` email AND exactly one active approved-roster match are required for student access. Domain verification or roll-number parsing alone never authorizes anyone.
- Student, lecturer, and admin roles are server-provisioned only. Firestore rules must deny client writes to roster, email index, profiles, staff, sessions, attendance, and audit records.
- Keep Firebase Admin SDK and credentials server-only; guard against using the wrong Firebase project. Prefer authenticated Firebase client reads subject to security rules; use Admin SDK only for narrowly scoped server workflows.
- Validate the entire roster import before writes. Reject duplicate normalized emails/roll numbers and do not silently change an existing roll number's email.
- Lecturers may create/cancel sessions only for active assigned offerings. Cancellation requires a reason and audit event.
- Completing a session requires exactly one present/absent mark per active enrollee. Attendance is per offering; exactly 75% is compliant; only completed sessions count.
- Preserve synthetic homepage behavior and label preview data clearly as synthetic. Do not wire fake records into real user identities.
- Preserve user changes and migration/history; never force-push or silently rewrite applied history.
- Run and report the actual lint, typecheck, unit tests, emulator authorization tests, and production build results. Never claim a command passed unless it was run.
- Before merge, inspect CI status and dependency audit findings. A green CI run does not mean reported security advisories are fixed.
- Final reports must list changed files, tests actually run, results, remaining unverified items, and exact next commands if needed.
