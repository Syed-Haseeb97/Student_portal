import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdmin } from "../lib/firebase/admin";
import { OFFICIAL_FACULTY_ROSTER, normalizeEmail } from "../lib/roster/validate";

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
  const { auth, db } = getFirebaseAdmin();
  console.log("Seeding all 1st Year timetable faculty into Firebase Auth and Firestore...");

  const facultyList = Object.values(OFFICIAL_FACULTY_ROSTER);

  for (const faculty of facultyList) {
    const email = normalizeEmail(faculty.email);
    console.log(`\nProcessing: ${faculty.name} (${email})...`);

    let uid = "";
    try {
      const existingUser = await auth.getUserByEmail(email);
      uid = existingUser.uid;
      console.log(`  Found Firebase Auth user: ${uid}`);
    } catch {
      const newUser = await auth.createUser({
        email,
        emailVerified: true,
        displayName: faculty.name,
      });
      uid = newUser.uid;
      console.log(`  Created Firebase Auth user: ${uid}`);
    }

    const staffRef = db.collection("staff").doc(uid);
    await staffRef.set(
      {
        uid,
        email,
        role: "lecturer",
        active: true,
        name: faculty.name,
        department: faculty.department,
        staffId: faculty.staffId,
        designation: faculty.designation,
        phone: faculty.phone,
        courses: faculty.courses,
        updatedAt: FieldValue.serverTimestamp(),
        provisionedBy: "seed-timetable-faculty",
      },
      { merge: true }
    );
    console.log(`  Saved to Firestore staff/${uid} (role: lecturer)`);
  }

  console.log("\n========================================================");
  console.log(`SUCCESS: All ${facultyList.length} faculty members seeded successfully!`);
}

main().catch((err) => {
  console.error("Error seeding faculty:", err);
  process.exit(1);
});
