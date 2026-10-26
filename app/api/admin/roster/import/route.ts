import { createHash } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebase/admin";
import { validateRosterRows } from "@/lib/roster/validate";

export const runtime = "nodejs";
const MAX_ROWS_PER_IMPORT = 200;

function tokenFrom(request: Request) {
  return /^Bearer (.+)$/.exec(request.headers.get("authorization") ?? "")?.[1] ?? null;
}
function emailHash(email: string) {
  return createHash("sha256").update(email).digest("hex");
}

/**
 * Admin-only, atomic import of at most 200 validated rows. Input is JSON rows parsed
 * from the approved CSV by a trusted admin tool. No public roster reads are exposed.
 */
export async function POST(request: Request) {
  const token = tokenFrom(request);
  if (!token) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > 1_000_000) return NextResponse.json({ error: "Roster import payload is too large." }, { status: 413 });
  const body = await request.json().catch(() => null) as { rows?: unknown } | null;
  if (!body || !Array.isArray(body.rows) || body.rows.length < 1 || body.rows.length > MAX_ROWS_PER_IMPORT ||
      body.rows.some((row) => !row || typeof row !== "object" || Array.isArray(row))) {
    return NextResponse.json({ error: `rows must contain 1–${MAX_ROWS_PER_IMPORT} roster objects per atomic import.` }, { status: 400 });
  }

  let rows;
  try {
    rows = validateRosterRows(body.rows as Record<string, unknown>[]);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid roster import." }, { status: 400 });
  }

  try {
    const { auth, db } = getFirebaseAdmin();
    const identity = await auth.verifyIdToken(token, true);
    if (identity.email_verified !== true || !/^[^\\s@]+@iiitt\\.ac\\.in$/i.test(identity.email ?? "")) {
      return NextResponse.json({ error: "A verified institutional admin account is required." }, { status: 403 });
    }
    const rosterRefs = rows.map((row) => db.collection("studentRoster").doc(row.rollNumber));
    const emailRefs = rows.map((row) => db.collection("rosterEmailIndex").doc(emailHash(row.email)));
    const auditRef = db.collection("auditEvents").doc();

    await db.runTransaction(async (transaction) => {
      const actor = await transaction.get(db.collection("staff").doc(identity.uid));
      if (!actor.exists || actor.get("role") !== "admin" || actor.get("active") !== true) {
        throw new Error("NOT_ADMIN");
      }
      const existingRoster = [];
      const existingEmailIndex = [];
      for (let i = 0; i < rows.length; i++) {
        existingRoster.push(await transaction.get(rosterRefs[i]!));
        existingEmailIndex.push(await transaction.get(emailRefs[i]!));
      }

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]!;
        const oldRoster = existingRoster[i]!;
        const emailIndex = existingEmailIndex[i]!;
        if (oldRoster.exists && oldRoster.get("emailNormalized") !== row.email) {
          throw new Error(`EMAIL_CHANGE_REQUIRES_REVIEW:${row.rollNumber}`);
        }
        if (emailIndex.exists && emailIndex.get("rollNumber") !== row.rollNumber) {
          throw new Error(`EMAIL_ALREADY_ASSIGNED:${row.email}`);
        }
      }

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]!;
        const oldRoster = existingRoster[i]!;
        transaction.set(rosterRefs[i]!, {
          rollNumber: row.rollNumber,
          emailNormalized: row.email,
          batch: row.batch,
          programme: row.programme,
          active: row.active,
          ...(oldRoster.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
        transaction.set(emailRefs[i]!, {
          emailNormalized: row.email,
          rollNumber: row.rollNumber,
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
      }
      transaction.create(auditRef, {
        action: "roster.imported",
        actorUid: identity.uid,
        rowCount: rows.length,
        createdAt: FieldValue.serverTimestamp(),
      });
    });

    return NextResponse.json({ ok: true, imported: rows.length });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "NOT_ADMIN") return NextResponse.json({ error: "An active administrator role is required." }, { status: 403 });
    if (code.startsWith("EMAIL_CHANGE_REQUIRES_REVIEW:")) {
      return NextResponse.json({ error: "A roster email change requires a separately reviewed admin correction; no rows were imported." }, { status: 409 });
    }
    if (code.startsWith("EMAIL_ALREADY_ASSIGNED:")) {
      return NextResponse.json({ error: "An email is already linked to a different roll number; no rows were imported." }, { status: 409 });
    }
    if (code.includes("Firebase ID token")) return NextResponse.json({ error: "Your sign-in session expired. Sign in again." }, { status: 401 });
    return NextResponse.json({ error: "The roster import failed. No rows were imported; check the input and retry." }, { status: 409 });
  }
}
