# First administrator bootstrap runbook

This is a manual operational procedure, not an automated endpoint. Do not perform it against a production project until an authorized IIITT representative approves the project and the person being provisioned.

## Why it is manual

Every admin API requires an existing active `staff/{uid}` document with `role: "admin"`. There is deliberately no public "make me admin" route.

## Preconditions

- The institution has authorized the portal pilot and named the first administrator.
- A dedicated Firebase project for the IIITT portal has been created by an authorized owner. Do not reuse an unrelated application's Firebase project.
- The project's ID matches `FIREBASE_ADMIN_PROJECT_ID` and `NEXT_PUBLIC_FIREBASE_PROJECT_ID` in the server/deployment environment.
- The named administrator controls a real `@iiitt.ac.in` mailbox and completes Firebase email verification.
- Production secrets are stored only in the deployment secret manager, never in Git or browser-visible variables.

## Bootstrap steps

1. In Firebase Authentication for the approved portal project, confirm the administrator's user exists and the email is verified. Do not mark an address verified merely because it ends in the institutional domain.
2. Copy the user's Firebase Auth UID and normalized email from the Authentication console.
3. In the same project's Firestore database, create `staff/{uid}` with these fields:
   - `uid`: the exact Firebase Auth UID
   - `email`: the verified institutional email in lowercase
   - `role`: `admin`
   - `active`: `true`
   - `createdAt`: current UTC timestamp
   - `updatedAt`: current UTC timestamp
   - `updatedBy`: the authorized operator's identity/reference, if one is available
4. Create an `auditEvents/{new-id}` record for the manual bootstrap:
   - `action`: `staff.bootstrap`
   - `actorUid`: the operator's identity/reference
   - `targetUid`: the new administrator's Firebase UID
   - `reason`: the institutional approval/reference for the bootstrap
   - `createdAt`: current UTC timestamp
5. Have the administrator sign in through the portal and verify that their ID token contains `email_verified: true`. Confirm that the first protected admin operation succeeds and that a non-admin institutional account receives `403`.
6. Provision all additional staff through the audited `POST /api/admin/staff` route. Do not share service-account credentials or allow browser clients to write staff documents.

## Rollback and safety

- If the wrong account is provisioned, set its `active` field to `false` immediately, record the action in `auditEvents`, and review access logs.
- Do not remove/deactivate the only active administrator. Provision and verify a second authorized admin first.
- Do not upload a real roster or attendance data until institutional authorization, the security review, and the production deployment checklist are complete.
- This repository task does not create a Firebase project, seed a real administrator, deploy rules, or import real student records.
