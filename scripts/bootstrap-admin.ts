/**
 * Safe First Administrator Bootstrap Script
 *
 * Usage:
 *   npx tsx scripts/bootstrap-admin.ts <admin-email@iiitt.ac.in> "<approval-reason>"
 *
 * Following docs/FIRST_ADMIN_BOOTSTRAP.md:
 * This script runs locally or in CI using the Firebase Admin SDK.
 * It is NOT a public HTTP endpoint. It creates staff/{uid} with role: "admin"
 * and appends an audit event to auditEvents.
 */

import { FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdmin } from "../lib/firebase/admin";
import { normalizeEmail, INSTITUTIONAL_EMAIL_PATTERN } from "../lib/roster/validate";

async function main() {
  const args = process.argv.slice(2);
  const emailArg = args[0];
  const reasonArg = args[1] || "Initial authorized bootstrap of first portal administrator";

  if (!emailArg) {
    console.error("Usage: npx tsx scripts/bootstrap-admin.ts <admin-email@iiitt.ac.in> [reason]");
    process.exit(1);
  }

  const email = normalizeEmail(emailArg);
  if (!INSTITUTIONAL_EMAIL_PATTERN.test(email)) {
    console.error(`Error: "${email}" is not a valid @iiitt.ac.in institutional email address.`);
    process.exit(1);
  }

  console.log(`Connecting to Firebase Admin project...`);
  const { auth, db } = getFirebaseAdmin();

  let userRecord;
  try {
    userRecord = await auth.getUserByEmail(email);
  } catch {
    console.error(`Error: Account with email "${email}" not found in Firebase Auth.`);
    console.error("Please sign in or create the user account in Firebase Auth first.");
    process.exit(1);
  }

  if (!userRecord.emailVerified) {
    console.warn(`Warning: User email is not marked as verified in Firebase Auth.`);
    console.log(`Updating user to emailVerified = true as part of manual bootstrap...`);
    await auth.updateUser(userRecord.uid, { emailVerified: true });
  }

  const staffRef = db.collection("staff").doc(userRecord.uid);
  const now = new Date().toISOString();

  await db.runTransaction(async (transaction) => {
    const existing = await transaction.get(staffRef);
    if (existing.exists && existing.get("role") === "admin" && existing.get("active") === true) {
      console.log(`User ${email} (${userRecord.uid}) is already an active administrator.`);
      return;
    }

    transaction.set(staffRef, {
      uid: userRecord.uid,
      email,
      role: "admin",
      active: true,
      name: userRecord.displayName || "System Administrator",
      createdAt: existing.exists ? (existing.get("createdAt") || now) : now,
      updatedAt: now,
      updatedBy: "bootstrap-script",
    }, { merge: true });

    const auditRef = db.collection("auditEvents").doc();
    transaction.set(auditRef, {
      action: "staff.bootstrap",
      actorUid: "bootstrap-script",
      targetUid: userRecord.uid,
      targetEmail: email,
      assignedRole: "admin",
      reason: reasonArg,
      createdAt: now,
      timestamp: FieldValue.serverTimestamp(),
    });
  });

  console.log("=================================================================");
  console.log(" SUCCESS: Administrator account provisioned successfully!");
  console.log(` UID: ${userRecord.uid}`);
  console.log(` Email: ${email}`);
  console.log(` Role: admin`);
  console.log(` Active: true`);
  console.log(` Audit event recorded.`);
  console.log("=================================================================");
}

main().catch((err) => {
  console.error("Bootstrap execution failed:", err);
  process.exit(1);
});
