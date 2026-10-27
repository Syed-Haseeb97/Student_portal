import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { INSTITUTIONAL_EMAIL_PATTERN } from "@/lib/roster/validate";
import { getFirebaseAdmin } from "@/lib/firebase/admin";
import { readBoundedJson } from "@/lib/http/read-bounded-json";

export const runtime = "nodejs";
const MAX_ROWS = 100;
const ID = /^[A-Za-z0-9_-]{1,100}$/;
// Offering IDs prefix compound enrollment/assignment document IDs, so they
// must not contain the underscore used as the separator.
const OFFERING_ID = /^[A-Za-z0-9-]{1,100}$/;

type Kind = "courses" | "offerings" | "enrollments" | "assignments";
type Row = Record<string, unknown>;

function tokenFrom(request: Request) {
  return /^Bearer (.+)$/i.exec(request.headers.get("authorization") ?? "")?.[1] ?? null;
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
      if (!OFFERING_ID.test(id) || !ID.test(courseId) || !/^20\d{2}$/.test(batch)) throw new Error("INVALID:Offering id must use letters, digits, or hyphens; courseId or batch is invalid.");
      return { id, courseId, term, batch, programme, active: activeFlag(row.active) };
    }
    if (kind === "enrollments") {
      const offeringId = requiredString(row.offeringId, "offeringId", 100);
      const studentUid = requiredString(row.studentUid, "studentUid", 128);
      if (!OFFERING_ID.test(offeringId) || !ID.test(studentUid)) throw new Error("INVALID:offeringId or studentUid contains unsupported characters.");
      return { id: `${offeringId}_${studentUid}`, offeringId, studentUid, active: activeFlag(row.active) };
    }
    const offeringId = requiredString(row.offeringId, "offeringId", 100);
    const lecturerUid = requiredString(row.lecturerUid, "lecturerUid", 128);
    if (!OFFERING_ID.test(offeringId) || !ID.test(lecturerUid)) throw new Error("INVALID:offeringId or lecturerUid contains unsupported characters.");
    return { id: `${offeringId}_${lecturerUid}`, offeringId, lecturerUid, active: activeFlag(row.active) };
  });
  const seen = new Set<string>();
  for (const row of rows) {
    const id = String(row.id);
    if (seen.has(id)) throw new Error("INVALID:Duplicate document IDs in this import.");
    seen.add(id);
  }
  return rows;
}

/** Atomically replace or upsert an academic-data collection chunk. */
export async function POST(request: Request) {
  const token = tokenFrom(request);
  if (!token) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const parsed = await readBoundedJson(request);
  if (!parsed.ok) {
    if (parsed.reason === "too_large") return NextResponse.json({ error: "Import payload is too large." }, { status: 413 });
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const body = parsed.value as { kind?: unknown; rows?: unknown } | null;
  const kind = body?.kind as Kind;
  if (!["courses", "offerings", "enrollments", "assignments"].includes(String(kind)) || !Array.isArray(body?.rows)) {
    return NextResponse.json({ error: "Provide kind (courses|offerings|enrollments|assignments) and a rows array." }, { status: 400 });
  }
  if (body.rows.length === 0 || body.rows.length > MAX_ROWS) {
    return NextResponse.json({ error: `Import batches must contain between 1 and ${MAX_ROWS} rows.` }, { status: 400 });
  }

  let rows: Row[];
  try {
    rows = normalizedRows(kind, body.rows);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Malformed rows.";
    if (message.startsWith("CONFLICT:")) return NextResponse.json({ error: message.slice("CONFLICT:".length) }, { status: 409 });
    return NextResponse.json({ error: message.replace(/^INVALID:/, "") }, { status: 400 });
  }

  try {
    const { auth, db } = getFirebaseAdmin();
    const identity = await auth.verifyIdToken(token, true);
    if (identity.email_verified !== true || !INSTITUTIONAL_EMAIL_PATTERN.test(identity.email ?? "")) {
      return NextResponse.json({ error: "A verified institutional administrator account is required." }, { status: 403 });
    }

    const collectionName =
      kind === "courses" ? "courses" :
      kind === "offerings" ? "courseOfferings" :
      kind === "enrollments" ? "enrollments" : "teachingAssignments";

    const actorRef = db.collection("staff").doc(identity.uid);
    const refs = rows.map((r) => db.collection(collectionName).doc(String(r.id)));

    await db.runTransaction(async (transaction) => {
      const actorDoc = await transaction.get(actorRef);
      if (!actorDoc.exists || actorDoc.get("role") !== "admin" || actorDoc.get("active") !== true) {
        throw new Error("NOT_ADMIN");
      }

      // Read every target document so that the write pipeline stays within Firestore's read-before-write constraint.
      const targetDocs = await Promise.all(refs.map((ref) => transaction.get(ref)));

      // Validate referential dependencies inside the transaction before any writes are applied.
      if (kind === "offerings") {
        const courseIds = [...new Set(rows.map((r) => String(r.courseId)))];
        const courseDocs = await Promise.all(courseIds.map((id) => transaction.get(db.collection("courses").doc(id))));
        const activeCourseIds = new Set(courseDocs.filter((d) => d.exists && d.get("active") === true).map((d) => d.id));
        for (const row of rows) {
          if (row.active === true && !activeCourseIds.has(String(row.courseId))) {
            throw new Error("DEPENDENCY:Every active course offering must reference an active course.");
          }
        }
      } else if (kind === "enrollments" || kind === "assignments") {
        const offeringIds = [...new Set(rows.map((r) => String(r.offeringId)))];
        const offeringDocs = await Promise.all(offeringIds.map((id) => transaction.get(db.collection("courseOfferings").doc(id))));
        const offeringMap = new Map(offeringDocs.map((d) => [d.id, d]));

        for (const row of rows) {
          if (row.active !== true) continue;
          const offeringId = String(row.offeringId);
          const studentUid = String(row.studentUid ?? "");
          const lecturerUid = String(row.lecturerUid ?? "");
          const dependency = offeringMap.get(offeringId);

          if (kind === "enrollments") {
            if (!dependency?.exists || dependency.get("active") !== true) {
              throw new Error("DEPENDENCY:Every active enrollment must reference an active course offering.");
            }
            const student = await transaction.get(db.collection("userProfiles").doc(studentUid));
            if (!student.exists || student.get("role") !== "student" || student.get("active") !== true) {
              throw new Error("DEPENDENCY:Active enrollments require an active student user profile.");
            }
            row.rosterId = student.get("rosterId");
          } else {
            if (!dependency?.exists || dependency.get("active") !== true) {
              throw new Error("DEPENDENCY:Every active assignment must reference an active course offering.");
            }
            const lecturer = await transaction.get(db.collection("staff").doc(lecturerUid));
            if (!lecturer.exists || lecturer.get("role") !== "lecturer" || lecturer.get("active") !== true) {
              throw new Error("DEPENDENCY:Active teaching assignments require an active lecturer account.");
            }
          }
        }
      }

      const auditRef = db.collection("auditEvents").doc();
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]!;
        const data = Object.fromEntries(Object.entries(row).filter(([key]) => key !== "id"));
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
    return NextResponse.json({ error: "The import could not be completed right now. No records were imported; retry later." }, { status: 503 });
  }
}

/** Retrieve academic catalog data (courses and offerings) */
export async function GET(request: Request) {
  const token = tokenFrom(request);
  const isMock = process.env.NEXT_PUBLIC_ENABLE_MOCK_API === "true";

  if (isMock) {
    return NextResponse.json({
      courses: [
        { id: "cs201", code: "CS201", title: "Data Structures and Algorithms", credits: 4, active: true },
        { id: "cs202", code: "CS202", title: "Operating Systems Principles", credits: 4, active: true },
        { id: "cs203", code: "CS203", title: "Computer System Architecture", credits: 3, active: true },
        { id: "cs204", code: "CS204", title: "Database Management Systems", credits: 4, active: true },
        { id: "ma201", code: "MA201", title: "Discrete Mathematics & Linear Algebra", credits: 4, active: true },
      ],
      offerings: [
        { id: "offering-cs201-2026", courseId: "cs201", courseCode: "CS201", courseTitle: "Data Structures and Algorithms", term: "Spring 2026", batch: "2026", programme: "Computer Science & Engineering", active: true },
        { id: "offering-cs202-2026", courseId: "cs202", courseCode: "CS202", courseTitle: "Operating Systems Principles", term: "Spring 2026", batch: "2026", programme: "Computer Science & Engineering", active: true },
        { id: "offering-cs203-2026", courseId: "cs203", courseCode: "CS203", courseTitle: "Computer System Architecture", term: "Spring 2026", batch: "2026", programme: "Computer Science & Engineering", active: true },
        { id: "offering-cs204-2026", courseId: "cs204", courseCode: "CS204", courseTitle: "Database Management Systems", term: "Spring 2026", batch: "2026", programme: "Computer Science & Engineering", active: true },
        { id: "offering-ma201-2026", courseId: "ma201", courseCode: "MA201", courseTitle: "Discrete Mathematics & Linear Algebra", term: "Spring 2026", batch: "2026", programme: "Computer Science & Engineering", active: true },
      ],
    });
  }

  if (!token) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  try {
    const { auth, db } = getFirebaseAdmin();
    await auth.verifyIdToken(token, true);

    const [coursesSnap, offeringsSnap] = await Promise.all([
      db.collection("courses").limit(100).get(),
      db.collection("courseOfferings").limit(100).get(),
    ]);

    const courses = coursesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const offerings = offeringsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    return NextResponse.json({ courses, offerings });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error reading academic data";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
