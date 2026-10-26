# IIITT Student Portal

A mobile-first student portal for IIIT Tiruchirappalli, starting with subject-wise attendance and lecturer-recorded class sessions.

## Current status

Early application scaffold. The homepage uses synthetic preview data only. Authentication, roster matching, database migrations, RLS, lecturer workflows, and production deployment are not yet verified as working.

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS v4
- Supabase Auth and PostgreSQL
- PostgreSQL Row Level Security (RLS)
- Vercel (planned)

## Confirmed attendance rules

- The 75% threshold applies independently to each subject.
- Each class session has its own attendance submission.
- Multiple sessions of one subject on one day remain separate.
- Only completed sessions count by default; scheduled and cancelled sessions are excluded.
- Do not use an aggregate across subjects to determine compliance.

## Local setup

Requires a current Node.js LTS release and npm.

```bash
npm install
cp .env.example .env.local
npm run check
npm run dev
```

On Windows PowerShell, use `Copy-Item .env.example .env.local` instead of `cp`.

The homepage can render without Supabase credentials. Authentication and database features must not be enabled until a Supabase project is configured and its migrations and policies have been reviewed and tested.

## Security

Never commit `.env.local`, credentials, or real student records. The publishable key is browser-safe; RLS is still mandatory. The service-role key bypasses RLS and must stay server-side. Use synthetic data until an institutional pilot is authorized.

## Verification

The source tree has not yet been installed or built in a network-enabled environment. Do not interpret this scaffold as a verified production application.
