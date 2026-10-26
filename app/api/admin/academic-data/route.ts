import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebase/admin";

export const runtime = "nodejs";
const MAX_ROWS = 100;
const ID = /^[A-Za-z0-9_-]{1,100}$/;

type Kind = "courses" | "offerings" | "enrollments" | "assignments";
type Row = Record<string, unknown>;

function tokenFrom(request: Request) {
  return /^Bearer (.+)$/.exec(request.headers.get("authorization") ?? "")?.[1] ?? null;
}
function requiredString(value: unknown, field: string, max = 120) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) {
    throw new Error(`INVALID:${field} must be a non-empty string of at most ${max} characters.`);
  }
  return value.trim();
}
function activeFlag(value: unknown) {
  if (typeof value !== "boolean") throw new Error("INVALID:active must be a boolean.");
  return value;
}
function normalizedRows(kind: Kind, rawRows: unknown[]): Row[] {
  const rows = rawRows.map((raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("INVALID:Every row must be an object.");
    const row = raw as Row;
    if (kind === "courses") {
      const id = requiredString(row.id, "id", 100);
      const code = requiredString(row.code, "code", 40).toUpperCase();
      const title = requiredString(row.title, "title", 120);
      if (!ID.test(id)) throw new Error("INVALID:Course id contains unsupported characters.");
      if (row.credits !== undefined && (!Number.isInteger(row.credits) || Number(row.credits) < 0 || Number(row.credits) > 100)) {
        throw new Error("INVALID:credits must be an integer from 0 to 100.");
      }
      return { id, code, title, ...(row.credits === undefined ? {} : { credits: row.credits }), active: activeFlag(row.active) };
    }
    if (kind === "offerings") {
      const id = requiredString(row.id, "id", 100);
      const courseId = requiredString(row.courseId, "courseId", 100);
      const term = requiredString(row.term, "term", 40);
      const batch = requiredString(row.batch, "batch", 4);
      const programme = requiredString(row.programme, "programme", 80);
      if (!ID.test(id) || !ID.test(courseId) || !/^20\d{2}$/.test(batch)) throw new Error("INVALID:Offering id/courseId or batch is invalid.");
      return { id, courseId, term, batch, programme, active: activeFlag(row.active) };
    }
    if (kind === "enrollments") {
      const offeringId = requiredString(row.offeringId, "offeringId", 100);
      const studentUid = requiredString(row.studentUid, "studentUid", 128);
      if (!ID.test(offeringId) || !ID.test(studentUid)) throw new Error("INVALID:Enrollment offeringId/studentUid is invalid.");
      return { id: `${offeringId}_${studentUid}`, offeringId, studentUid, active: activeFlag(row.active) };
    }
    const offeringId = requiredString(row.offeringId, "offeringId", 100);
    const lecturerUid = requiredString(row.lecturerUid, "lecturerUid", 128);
    if (!ID.test(offeringId) || !ID.test(lecturerUid)) throw new Error("INVALID:Assignment offeringId/lecturerUid is invalid.");
    return { id: `${offeringId}_${lecturerUid}`, offeringId, lecturerUid, active: activeFlag(row.active) };
  });
  const ids = new Set<string>();
  for (const row of rows) {
    const id = String(row.id);
    if (ids.has(id)) throw new Error("INVALID:Duplicate document IDs in this import.");
    ids.add(id);
  }
  return rows;
}

/**
 * Admin-only, per-kind atomic import. Import courses, then offerings, then
 * enrollments/assignments. Each request is validated before any writes.
 */
export async function POST(request: Request) {
  const token = tokenFrom(request);
  if (!token) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > 1_000_000) return NextResponse.json({ error: "Import payload is too large." }, { status: 413 });
  const body = await request.json().catch(() => null) as { kind?: unknown; rows?: unknown } | null;
  if (!body || !["courses", "offerings", "enrollments", "assignments"].includes(String(body.kind)) ||
      !Array.isArray(body.rows) || body.rows.length < 1 || body.rows.length > MAX_ROWS) {
    return NextResponse.json({ error: `Provide kind (courses/offerings/enrollments/assignments) and 1–${MAX_ROWS} rows.` }, { status: 400 });
  }
  const kind = body.kind as Kind;
  let rows: Row[];
  try {
    rows = normalizedRows(kind, body.rows);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message.replace(/^INVALID:/, "") : "Invalid import." }, { status: 400 });
  }

  try {
    const { auth, db } = getFirebaseAdmin();
    const identity = await auth.verifyIdToken(token, true);
    if (identity.email_verified !== true || !/^[^\\s@]+@iiitt\\.ac\\.in$/i.test(identity.email ?? "")) {
      return NextResponse.json({ error: "A verified institutional administrator account is required." }, { status: 403 });
    }
    const refs = rows.map((row) => {
      const collection = kind === "courses" ? "courses" : kind === "offerings" ? "courseOfferings" :
        kind === "enrollments" ? "enrollments" : "teachingAssignments";
      return db.collection(collection).doc(String(row.id));
    });
    const dependencies = rows.map((row) => {
      if (kind === "offerings") return db.collection("courses").doc(String(row.courseId));
      if (kind === "enrollments") return db.collection("courseOfferings").doc(String(row.offeringId));
      if (kind === "assignments") return db.collection("courseOfferings").doc(String(row.offeringId));
      return null;
    });

    await db.runTransaction(async (transaction) => {
      const actor = await transaction.get(db.collection("staff").doc(identity.uid));
      if (!actor.exists || actor.get("role") !== "admin" || actor.get("active") !== true) throw new Error("NOT_ADMIN");
      const dependencyDocs = await Promise.all(dependencies.map((ref) => ref ? transaction.get(ref) : Promise.resolve(null)));
      const targetDocs = await Promise.all(refs.map((ref) => transaction.get(ref)));

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]!;
        const dependency = dependencyDocs[i];
        if (kind === "offerings" && (!dependency?.exists || dependency.get("active") !== true)) {
          throw new Error("DEPENDENCY:Every offering must reference an active course.");
        }
        if ((kind === "enrollments" || kind === "assignments") && (!dependency?.exists || dependency.get("active") !== true)) {
          throw new Error("DEPENDENCY:Every record must reference an active course offering.");
        }
        if (kind === "enrollments") {
          const studentUid = String(row.studentUid);
          const profile = await transaction.get(db.collection("userProfiles").doc(studentUid));
          if (!profile.exists || profile.get("active") !== true || profile.get("role") !== "student" ||
              typeof profile.get("rosterId") !== "string") throw new Error("DEPENDENCY:Every enrollee must have an active roster-linked student profile.");
          const roster = await transaction.get(db.collection("studentRoster").doc(String(profile.get("rosterId"))));
          if (!roster.exists || roster.get("active") !== true) throw new Error("DEPENDENCY:Every enrollee must have an active approved roster entry.");
          const offering = dependencyDocs[i];
          if (row.active === true && (profile.get("batch") !== offering?.get("batch") ||
              profile.get("programme") !== offering?.get("programme"))) {
            throw new Error("DEPENDENCY:Student batch and programme must match the course offering.");
          }
          if (row.active === true && targetDocs[i]?.exists && targetDocs[i]?.get("studentUid") !== studentUid) {
            throw new Error("CONFLICT:An enrollment ID is already assigned to another student.");
          }
          row.rosterId = profile.get("rosterId");
        }
        if (kind === "assignments") {
          const lecturer = await transaction.get(db.collection("staff").doc(String(row.lecturerUid)));
          if (!lecturer.exists || lecturer.get("role") !== "lecturer" || lecturer.get("active") !== true) {
            throw new Error("DEPENDENCY:Teaching assignments require an active lecturer account.");
          }
        }
      }

      const auditRef = db.collection("auditEvents").doc();
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]!;
        const { id, ...data } = row;
        transaction.set(refs[i]!, {
          ...data,
          ...(targetDocs[i]?.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: identity.uid,
        }, { merge: true });
      }
      transaction.create(auditRef, {
        action: `academic-data.${kind}.imported`,
        actorUid: identity.uid,
        rowCount: rows.length,
        createdAt: FieldValue.serverTimestamp(),
      });
    });

    return NextResponse.json({ ok: true, kind, imported: rows.length });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "NOT_ADMIN") return NextResponse.json({ error: "An active administrator role is required." }, { status: 403 });
    if (code.startsWith("DEPENDENCY:")) return NextResponse.json({ error: code.slice("DEPENDENCY:".length) }, { status: 409 });
    if (code.startsWith("CONFLICT:")) return NextResponse.json({ error: code.slice("CONFLICT:".length) }, { status: 409 });
    if (code.includes("Firebase ID token")) return NextResponse.json({ error: "Your sign-in session expired. Sign in again." }, { status: 401 });
    return NextResponse.json({ error: "The import failed. No records were imported; check the input and retry." }, { status: 409 });
  }
}
