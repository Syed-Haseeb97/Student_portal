# IIITT Student Portal

A mobile-first attendance portal MVP for IIIT Tiruchirappalli. The homepage is a visual preview and uses synthetic data only.

## Status and safety boundary

The Firebase attendance foundation includes email-link sign-in, a server-side approved-roster claim check, admin-only roster/staff provisioning endpoints, lecturer-scoped session lifecycle routes, Firestore rules/indexes, emulator authorization tests, and CI. This is not a production-authorized system. No live Firebase project, real institutional roster, or production admin is configured as part of this repository work.

**Synthetic data only.** Do not import real student data, create a production admin, deploy Firestore rules, or configure live Firebase resources without explicit human approval and institutional authorization.

## Stack

- Next.js App Router, TypeScript, Tailwind CSS v4
- Firebase Authentication (passwordless email link) and Cloud Firestore
- Firebase Admin SDK for narrowly scoped trusted server routes only
- Firebase Emulator Suite for local authorization tests
- Vercel (planned; not configured here)

## Locked attendance rules

- Verified `@iiitt.ac.in` email plus an active approved-roster match is required. Neither domain verification nor roll-number parsing alone grants access.
- Roles are server-provisioned; Firestore client writes to protected records are denied.
- Attendance is calculated per course offering. Exactly 75% is compliant.
- Only completed sessions count; scheduled and cancelled sessions are excluded.
- A session can be completed only with exactly one present/absent mark per active enrollee.
- Cancellation requires a reason and is audited.
- The backend branch includes admin-only course/offering/enrollment/assignment imports, audited completed-session corrections, and a student dashboard API. The frontend is not wired to live data yet, and no production Firebase project or roster is configured.

See [architecture.md](architecture.md), [roster and attendance rules](docs/ROSTER_AND_ATTENDANCE_RULES.md), [backend status](docs/FIREBASE_ATTENDANCE_BACKEND_PLAN.md), [backend API contract](docs/BACKEND_API_CONTRACT.md), and the [first-admin bootstrap runbook](docs/FIRST_ADMIN_BOOTSTRAP.md). The CSV template contains fake examples only.

## Local setup

Requires Node.js 22+ and npm.

```bash
npm install
cp .env.example .env.local
npm run check
npm run dev
```

On Windows PowerShell, use `Copy-Item .env.example .env.local` instead of `cp`.

The synthetic homepage can be reviewed without enabling a real backend. For local auth/backend testing, use the Firebase Emulator Suite and synthetic fixtures. Do not add live credentials to `.env.local` for this task.

## Emulator and checks

Run the unit/lint/type checks:

```bash
npm run check
```

Run Firestore authorization tests and protected-route integration tests against synthetic Firebase Auth/Firestore emulators:

```bash
npx firebase emulators:exec --only auth,firestore --project demo-iiitt-portal "npm run test:rules && npm run test:api"
```

Run the production build:

```bash
npm run build
```

CI runs these checks on pull requests targeting `main` and pushes to `main` or the configured backend feature branches. Emulator tests use the demo project ID and synthetic documents; they do not create a live Firebase project.

## Environment contract

`.env.example` documents public Firebase web configuration and server-only Admin SDK variables. Public web config is not an access-control boundary; Firebase Auth and Firestore rules are mandatory. Keep `FIREBASE_SERVICE_ACCOUNT_JSON` and `FIREBASE_ADMIN_PROJECT_ID` server-side and uncommitted. The Admin SDK helper checks project identity to reduce accidental cross-project use.

No Firebase project configuration, production rule deployment, real roster upload, or real admin bootstrap is included here. Do not run production deployment commands for this MVP phase.

## Follow-ups before any real pilot

1. Triage and resolve dependency audit advisories without unsafe blind major-version downgrades.
2. Review the first-admin provisioning runbook with the institution.
3. Validate the academic-data import and completed-session correction endpoints with synthetic fixtures and a focused security review.
4. Wire the frontend to the student dashboard API and authenticated admin/lecturer endpoints.
5. Obtain and import the institute-approved roster and academic catalog only after explicit authorization.
6. Verify institutional policy and operational workflows with authorized stakeholders.
7. Consider a live pilot only after a focused security review and separate, explicit approval.
