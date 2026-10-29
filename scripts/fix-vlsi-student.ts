import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdmin } from "../lib/firebase/admin";
import { COURSE_CODE_MAP, normalizeEmail } from "../lib/roster/validate";

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
  const { db } = getFirebaseAdmin();
  console.log("Auditing and fixing student programmes for all registered students...");

  const snap = await db.collection("studentRoster").get();
  for (const doc of snap.docs) {
    const data = doc.data();
    const roll = doc.id;
    const match = roll.match(/\b(?:26|2026)?(11|12|13|14)\d{2}\b/);
    if (match && match[1]) {
      const correctProg = COURSE_CODE_MAP[match[1]];
      if (correctProg && data.programme !== correctProg) {
        console.log(`Fixing studentRoster doc ${roll}: ${data.programme} -> ${correctProg}`);
        await doc.ref.update({
          programme: correctProg,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }
  }

  const profilesSnap = await db.collection("userProfiles").get();
  for (const doc of profilesSnap.docs) {
    const data = doc.data();
    const roll = data.rollNumber || "";
    const match = roll.match(/\b(?:26|2026)?(11|12|13|14)\d{2}\b/);
    if (match && match[1]) {
      const correctProg = COURSE_CODE_MAP[match[1]];
      if (correctProg && data.programme !== correctProg) {
        console.log(`Fixing userProfiles doc ${doc.id} (${roll}): ${data.programme} -> ${correctProg}`);
        await doc.ref.update({
          programme: correctProg,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }
  }

  console.log("Done checking and updating programmes!");
}

main().catch(console.error);
