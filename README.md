# IIITT Student Portal

A mobile-first student portal for IIIT Tiruchirappalli, starting with subject-wise attendance and lecturer-recorded class sessions.

## Current status

The homepage remains a synthetic-data visual preview. A Firebase integration is being built on `feature/firebase-attendance-backend`: browser/Admin SDK initialization, passwordless institutional email-link screens, roster claim/import endpoints, staff provisioning, attendance session endpoints, emulator rules tests, and deny-by-default Firestore rules. This branch is not yet a production-ready or institution-authorized system.

## Stack

- Next.js App Router + TypeScript
- Firebase Authentication (email link) and Cloud Firestore
- Firebase Admin SDK for trusted server routes only
- Firebase Emulator Suite for local security testing
- Vercel (planned)

## Attendance rules

- The 75% threshold applies independently to each course offering.
- Each class session has its own ID; multiple sessions of one subject on one day count separately.
- Only completed sessions count. Scheduled and cancelled sessions are excluded.
- A session can be completed only with exactly one present/absent mark for every active enrollee.
- No aggregate across subjects determines compliance.
- Completed-session corrections must use a separately authorized, reasoned and audited process. That workflow is not yet implemented.

See [roster and attendance rules](docs/ROSTER_AND_ATTENDANCE_RULES.md) and [Firebase architecture plan](docs/FIREBASE_ATTENDANCE_BACKEND_PLAN.md).

## Local setup

Requires Node.js 22+ and npm.

```bash
npm install
cp .env.example .env.local
npm run check
npm run dev
```

On Windows PowerShell, use `Copy-Item .env.example .env.local` instead of `cp`.

Fill the public Firebase web configuration from a **separate portal Firebase project**. Set `FIREBASE_SERVICE_ACCOUNT_JSON` and `FIREBASE_ADMIN_PROJECT_ID` only in local untracked environment variables or deployment secrets. Never commit service-account JSON, `.env.local`, or real student records. Add the local redirect domain to Firebase Auth's authorized domains and enable Email/Password plus Email link sign-in.

## Firestore setup

```bash
npx firebase emulators:start --only auth,firestore
```

Deploy reviewed rules and indexes only after creating the intended portal Firebase project and confirming the project ID:

```bash
npx firebase deploy --only firestore:rules,firestore:indexes --project YOUR_PORTAL_PROJECT_ID
```

Do not deploy the rules or enable a real roster until emulator authorization tests pass. All roster and staff records must be provisioned through trusted server-side workflows. The initial administrator bootstrap remains a manual, documented setup task and must never be open to public requests.

## Roster

Use [the roster import template](docs/roster-import-template.csv) as a schema example only. Its rows are fake examples, not real records. Import only an institute-approved roster. Roll number, batch, and programme are stored explicitly; the app does not infer programme from a roll-number prefix.

## Verification status

Source files have been written to a feature branch, but no dependency install, lint, TypeScript check, unit test, production build, or Firestore Emulator rules test has been run in this environment. Do not use this branch with real student records until these checks and a security review are complete.
