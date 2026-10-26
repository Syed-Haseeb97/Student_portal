# Instructions for coding agents

- Read README.md and architecture.md before changing the application.
- Keep the IIIT Trichy attendance MVP focused.
- Use Next.js App Router, TypeScript, Tailwind CSS, and Supabase unless changes are explained.
- Do not guess institutional email or roll-number rules; supplied examples are incomplete.
- Never treat email-domain verification or a roll-number parser as authorization. Match authenticated users to approved records.
- Keep service-role credentials server-only. Prefer the authenticated server client and RLS for normal operations.
- Never commit secrets, real student records, or production credentials. Use synthetic data only.
- Every attendance session is independent. Calculate 75% per subject, never across subjects.
- Preserve user changes and migration history; add migrations rather than silently rewriting applied migrations.
- Test permitted and denied access. Never claim a command passed unless actually run.
- Report changed files, tests actually run, results, and unverified checks.
