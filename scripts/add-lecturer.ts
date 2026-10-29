import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdmin } from "../lib/firebase/admin";
import { normalizeEmail, INSTITUTIONAL_EMAIL_PATTERN } from "../lib/roster/validate";

function loadEnvLocal(): void {
  const envPath = resolve(process.cwd(), ".env.local");
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

async function main() {
  loadEnvLocal();
  const args = process.argv.slice(2);
  const emailArg = args[0];
  const nameArg = args[1] || "Faculty Member";
  const departmentArg = args[2] || "Computer Science & Engineering";
  const staffIdArg = args[3] || `FAC-${Date.now().toString().slice(-4)}`;

  if (!emailArg) {
    console.error("Usage: npx tsx scripts/add-lecturer.ts <teacher-email@iiitt.ac.in> [Name] [Department] [StaffId]");
    console.error("Example: npx tsx scripts/add-lecturer.ts renugadevi@iiitt.ac.in \"Dr. N. Renugadevi\" \"Computer Science & Engineering\" \"FAC-01\"");
    process.exit(1);
  }

  const email = normalizeEmail(emailArg);
  if (!INSTITUTIONAL_EMAIL_PATTERN.test(email)) {
    console.error(`Error: "${email}" is not a valid @iiitt.ac.in institutional email address.`);
    process.exit(1);
  }

  const { auth, db } = getFirebaseAdmin();
  console.log(`Checking Firebase Auth for ${email}...`);

  let userRecord;
  try {
    userRecord = await auth.getUserByEmail(email);
  } catch {
    console.log(`User does not exist in Firebase Auth yet. Creating pre-provisioned user account...`);
    userRecord = await auth.createUser({
      email,
      emailVerified: true,
      displayName: nameArg,
    });
  }

  const staffRef = db.collection("staff").doc(userRecord.uid);
  const now = new Date().toISOString();

  await db.runTransaction(async (transaction) => {
    transaction.set(staffRef, {
      uid: userRecord.uid,
      email,
      role: "lecturer",
      active: true,
      name: nameArg,
      department: departmentArg,
      staffId: staffIdArg,
      updatedAt: now,
      updatedBy: "script-provision",
    }, { merge: true });

    const auditRef = db.collection("auditEvents").doc();
    transaction.set(auditRef, {
      action: "staff.provisioned",
      actorUid: "admin-script",
      targetUid: userRecord.uid,
      targetEmail: email,
      assignedRole: "lecturer",
      createdAt: now,
      timestamp: FieldValue.serverTimestamp(),
    });
  });

  console.log("=================================================================");
  console.log(` SUCCESS: Faculty member provisioned successfully!`);
  console.log(` UID: ${userRecord.uid}`);
  console.log(` Name: ${nameArg}`);
  console.log(` Email: ${email}`);
  console.log(` Department: ${departmentArg}`);
  console.log(` Staff ID: ${staffIdArg}`);
  console.log(` Role: lecturer`);
  console.log(` Active: true`);
  console.log("=================================================================");
}

main().catch((err) => {
  console.error("Provisioning failed:", err);
  process.exit(1);
});
