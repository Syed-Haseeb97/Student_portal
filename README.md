# IIIT Trichy Student Portal

Mobile-first attendance portal. See `docs/architecture.md` for decisions and open questions.

## Setup
1. Node 22+. Run `npm install`.
2. Copy `.env.example` to `.env.local` and fill in your Supabase project values. Use a dev project, never production, and never commit `.env.local`.
3. `npm run dev`

## Checks
`npm run check` runs lint, typecheck and unit tests. `npm test` alone needs no install.

## Database (Stage 3)
Needs Docker. Local database only, never production.
```
npx supabase init          # once; creates supabase/config.toml, keeps existing files
npm run db:start
npm run db:reset           # applies migrations + synthetic seed.sql
npm run db:test            # pgTAP authorization and attendance tests
```

## Status
Stages 1-3 written. Auth, routes and UI for lecturers/students come in Stages 4-5. Synthetic data only.
