import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { INSTITUTIONAL_EMAIL_PATTERN } from "@/lib/roster/validate";
import { getFirebaseAdmin } from "@/lib/firebase/admin";

export const runtime = "nodejs";

function tokenFrom(request: Request) {
  return /^Bearer (.+)$/.exec(request.headers.get("authorization") ?? "")?.[1] ?? null;
}

/** Correct one completed-session mark with a required reason and immutable audit record. */
export async function POST(request: Request, context: { params: Promise<{ attendanceId: string }> }) {
  const token = tokenFrom(request);
  if (!token) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { attendanceId } = await context.params;
  if (!/^[A-Za-z0-9_-]{1,300}$/.test(attendanceId)) {
    return NextResponse.json({ error: "Invalid attendance ID." }, { status: 400 });
  }
  const body = await request.json().catch(() => null) as { mark?: unknown; reason?: unknown } | null;
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
  if (!body || !["present", "absent"].includes(String(body.mark)) || reason.length < 5 || reason.length > 300) {
    return NextResponse.json({ error: "Provide a present/absent mark and a correction reason between 5 and 300 characters." }, { status: 400 });
  }

  try {
    const { auth, db } = getFirebaseAdmin();
    const identity = await auth.verifyIdToken(token, true);
    if (identity.email_verified !== true || !INSTITUTIONAL_EMAIL_PATTERN.test(identity.email ?? "")) {
      return NextResponse.json({ error: "A verified institutional administrator account is required." }, { status: 403 });
    }
    const attendanceRef = db.collection("attendance").doc(attendanceId);
    const staffRef = db.collection("staff").doc(identity.uid);
    const auditRef = db.collection("auditEvents").doc();

    await db.runTransaction(async (transaction) => {
      const [actor, attendance] = await Promise.all([
        transaction.get(staffRef),
        transaction.get(attendanceRef),
      ]);
      if (!actor.exists || actor.get("role") !== "admin" || actor.get("active") !== true) throw new Error("NOT_ADMIN");
      if (!attendance.exists) throw new Error("ATTENDANCE_NOT_FOUND");
      const sessionId = String(attendance.get("sessionId") ?? "");
      const sessionRef = db.collection("sessions").doc(sessionId);
      const session = await transaction.get(sessionRef);
      if (!session.exists) throw new Error("SESSION_NOT_FOUND");
      if (session.get("state") !== "completed") throw new Error("SESSION_NOT_COMPLETED");
      const previousMark = attendance.get("mark");
      if (!["present", "absent"].includes(String(previousMark))) throw new Error("INVALID_EXISTING_MARK");
      if (previousMark === body.mark) throw new Error("UNCHANGED_MARK");
      transaction.update(attendanceRef, {
        mark: body.mark,
        correctedBy: identity.uid,
        correctedAt: FieldValue.serverTimestamp(),
        correctionReason: reason,
      });
      transaction.create(auditRef, {
        action: "attendance.corrected",
        actorUid: identity.uid,
        attendanceId,
        sessionId,
        offeringId: attendance.get("offeringId"),
        studentUid: attendance.get("studentUid"),
        previousMark,
        newMark: body.mark,
        reason,
        createdAt: FieldValue.serverTimestamp(),
      });
    });

    return NextResponse.json({ ok: true, attendanceId, mark: body.mark });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const known: Record<string, { status: number; error: string }> = {
      NOT_ADMIN: { status: 403, error: "An active administrator role is required." },
      ATTENDANCE_NOT_FOUND: { status: 404, error: "Attendance record not found." },
      SESSION_NOT_FOUND: { status: 409, error: "The associated session record is missing." },
      SESSION_NOT_COMPLETED: { status: 409, error: "Only marks from completed sessions can be corrected." },
      INVALID_EXISTING_MARK: { status: 409, error: "The existing attendance mark is invalid." },
      UNCHANGED_MARK: { status: 409, error: "The submitted mark matches the existing mark; no correction was made." },
    };
    if (known[code]) return NextResponse.json({ error: known[code]!.error }, { status: known[code]!.status });
    if (code.includes("Firebase ID token")) return NextResponse.json({ error: "Your sign-in session expired. Sign in again." }, { status: 401 });
    return NextResponse.json({ error: "Unable to correct attendance. Please retry." }, { status: 503 });
  }
}
