import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { INSTITUTIONAL_EMAIL_PATTERN } from "@/lib/roster/validate";
import { getFirebaseAdmin } from "@/lib/firebase/admin";
import { readBoundedJson } from "@/lib/http/read-bounded-json";

export const runtime = "nodejs";
const MAX_ENROLLED_STUDENTS_PER_SUBMISSION = 450;

function tokenFrom(request: Request) {
  return /^Bearer (.+)$/.exec(request.headers.get("authorization") ?? "")?.[1] ?? null;
}

type MarkInput = { studentUid: string; mark: "present" | "absent" };

/** Submit a complete roll-call once; missing/duplicate/non-enrolled students block completion. */
export async function POST(request: Request, context: { params: Promise<{ sessionId: string }> }) {
  const token = tokenFrom(request);
  if (!token) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { sessionId } = await context.params;
  if (!/^[A-Za-z0-9_-]{1,150}$/.test(sessionId)) {
    return NextResponse.json({ error: "Invalid session ID." }, { status: 400 });
  }
  const parsed = await readBoundedJson(request);
  if (!parsed.ok) {
    if (parsed.reason === "too_large") return NextResponse.json({ error: "Request body is too large." }, { status: 413 });
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const body = parsed.value as { marks?: unknown } | null;
  if (!body || !Array.isArray(body.marks) || body.marks.length < 1 || body.marks.length > MAX_ENROLLED_STUDENTS_PER_SUBMISSION) {
    return NextResponse.json({ error: `marks must contain 1–${MAX_ENROLLED_STUDENTS_PER_SUBMISSION} attendance entries.` }, { status: 400 });
  }
  const marks: MarkInput[] = [];
  for (const value of body.marks) {
    if (!value || typeof value !== "object" ||
        typeof (value as MarkInput).studentUid !== "string" ||
        !/^[A-Za-z0-9_-]{1,128}$/.test((value as MarkInput).studentUid) ||
        !["present", "absent"].includes((value as MarkInput).mark)) {
      return NextResponse.json({ error: "Each mark needs a valid studentUid and a present/absent mark." }, { status: 400 });
    }
    marks.push(value as MarkInput);
  }
  if (new Set(marks.map((mark) => mark.studentUid)).size !== marks.length) {
    return NextResponse.json({ error: "Duplicate student marks were submitted." }, { status: 400 });
  }

  try {
    const { auth, db } = getFirebaseAdmin();
    const identity = await auth.verifyIdToken(token, true);
    if (identity.email_verified !== true || !INSTITUTIONAL_EMAIL_PATTERN.test(identity.email ?? "")) {
      return NextResponse.json({ error: "A verified institutional staff account is required." }, { status: 403 });
    }
    const sessionRef = db.collection("sessions").doc(sessionId);
    const staffRef = db.collection("staff").doc(identity.uid);

    await db.runTransaction(async (transaction) => {
      const session = await transaction.get(sessionRef);
      const staff = await transaction.get(staffRef);
      if (!session.exists) throw new Error("SESSION_NOT_FOUND");
      if (session.get("state") !== "scheduled") throw new Error("SESSION_NOT_SCHEDULED");
      if (!staff.exists || staff.get("active") !== true ||
          !["lecturer", "admin"].includes(String(staff.get("role")))) throw new Error("NOT_STAFF");
      const offeringId = String(session.get("offeringId") ?? "");
      if (staff.get("role") !== "admin") {
        const assignmentRef = db.collection("teachingAssignments").doc(`${offeringId}_${identity.uid}`);
        const assignment = await transaction.get(assignmentRef);
        if (!assignment.exists || assignment.get("active") !== true) throw new Error("NOT_ASSIGNED");
      }
      const enrollmentQuery = db.collection("enrollments")
        .where("offeringId", "==", offeringId)
        .where("active", "==", true);
      const enrollmentSnapshot = await transaction.get(enrollmentQuery);
      if (enrollmentSnapshot.empty || enrollmentSnapshot.size > MAX_ENROLLED_STUDENTS_PER_SUBMISSION) {
        throw new Error("INVALID_ENROLLMENT_SIZE");
      }
      const enrolledUids = new Set(enrollmentSnapshot.docs.map((doc) => String(doc.get("studentUid") ?? "")));
      if (enrolledUids.size !== enrollmentSnapshot.size || marks.length !== enrolledUids.size ||
          marks.some((mark) => !enrolledUids.has(mark.studentUid))) {
        throw new Error("MARKS_MUST_MATCH_ENROLLMENT");
      }

      const sessionDate = String(session.get("sessionDate") ?? "");
      const now = FieldValue.serverTimestamp();
      for (const mark of marks) {
        const enrollment = enrollmentSnapshot.docs.find((doc) => doc.get("studentUid") === mark.studentUid)!;
        const attendanceRef = db.collection("attendance").doc(`${sessionId}_${mark.studentUid}`);
        transaction.create(attendanceRef, {
          sessionId,
          offeringId,
          sessionDate,
          studentUid: mark.studentUid,
          rosterId: String(enrollment.get("rosterId") ?? ""),
          mark: mark.mark,
          recordedBy: identity.uid,
          recordedAt: now,
        });
      }
      transaction.update(sessionRef, {
        state: "completed",
        completedBy: identity.uid,
        completedAt: now,
        updatedAt: now,
      });
      transaction.create(db.collection("auditEvents").doc(), {
        action: "attendance.submitted",
        actorUid: identity.uid,
        sessionId,
        offeringId,
        studentCount: marks.length,
        createdAt: now,
      });
    });

    return NextResponse.json({ ok: true, sessionId, state: "completed", recorded: marks.length });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const responses: Record<string, { status: number; error: string }> = {
      SESSION_NOT_FOUND: { status: 404, error: "Session not found." },
      SESSION_NOT_SCHEDULED: { status: 409, error: "This session is no longer open for attendance submission." },
      NOT_STAFF: { status: 403, error: "Only an active lecturer or administrator can submit attendance." },
      NOT_ASSIGNED: { status: 403, error: "You are not assigned to this course offering." },
      INVALID_ENROLLMENT_SIZE: { status: 409, error: "Enrollment is empty or too large for one submission." },
      MARKS_MUST_MATCH_ENROLLMENT: { status: 400, error: "Submit exactly one present/absent mark for every active enrollee." },
    };
    const known = responses[code];
    if (known) return NextResponse.json({ error: known.error }, { status: known.status });
    if (code.includes("Firebase ID token")) return NextResponse.json({ error: "Your sign-in session expired. Sign in again." }, { status: 401 });
    return NextResponse.json({ error: "Unable to submit attendance. Please retry." }, { status: 503 });
  }
}
