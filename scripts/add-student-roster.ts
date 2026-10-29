import { createHash } from "node:crypto";
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

function emailHash(email: string) {
  return createHash("sha256").update(email).digest("hex");
}

async function main() {
  loadEnvLocal();
  const args = process.argv.slice(2);
  const emailArg = args[0] || "261419@iiitt.ac.in";
  const rollNumber = args[1] || emailArg.split("@")[0];
  const batch = args[2] || "2026";
  const programme = args[3] || "B.Tech Computer Science and Engineering";

  const email = normalizeEmail(emailArg);
  if (!INSTITUTIONAL_EMAIL_PATTERN.test(email)) {
    console.error(`Invalid institutional email: ${email}`);
    process.exit(1);
  }

  const { db } = getFirebaseAdmin();
  console.log(`Adding ${email} (Roll: ${rollNumber}, Batch: ${batch}, Programme: ${programme}) to studentRoster...`);

  const rosterRef = db.collection("studentRoster").doc(rollNumber);
  const emailIndexRef = db.collection("rosterEmailIndex").doc(emailHash(email));

  await db.runTransaction(async (transaction) => {
    transaction.set(rosterRef, {
      rollNumber,
      emailNormalized: email,
      batch,
      programme,
      active: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    transaction.set(emailIndexRef, {
      emailNormalized: email,
      rollNumber,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  });

  console.log(`[SUCCESS] Student ${rollNumber} (${email}) is now an active, approved student on the institutional roster!`);
}

main().catch((err) => {
  console.error("Failed to add student to roster:", err);
  process.exit(1);
});
