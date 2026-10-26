import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebase/admin";

export const runtime = "nodejs";
function tokenFrom(request: Request) {
  return /^Bearer (.+)$/.exec(request.headers.get("authorization") ?? "")?.[1] ?? null;
}

/** Cancel a not-yet-completed session with a required reason and audit record. */
export async function POST(request: Request, context: { params: Promise<{ sessionId: string }> }) {
  const token = tokenFrom(request);
  if (!token) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { sessionId } = await context.params;
  if (!/^[A-Za-z0-9_-]{1,150}$/.test(sessionId)) return NextResponse.json({ error: "Invalid session ID." }, { status: 400 });
  const body = await request.json().catch(() => null) as { reason?: unknown } | null;
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
  if (reason.length < 5 || reason.length > 300) {
    return NextResponse.json({ error: "Provide a cancellation reason between 5 and 300 characters." }, { status: 400 });
  }

  try {
    const { auth, db } = getFirebaseAdmin();
    const identity = await auth.verifyIdToken(token, true);
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
        const assignment = await transaction.get(db.collection("teachingAssignments").doc(`${offeringId}_${identity.uid}`));
        if (!assignment.exists || assignment.get("active") !== true) throw new Error("NOT_ASSIGNED");
      }
      const now = FieldValue.serverTimestamp();
      transaction.update(sessionRef, {
        state: "cancelled",
        cancelledBy: identity.uid,
        cancellationReason: reason,
        cancelledAt: now,
        updatedAt: now,
      });
      transaction.create(db.collection("auditEvents").doc(), {
        action: "session.cancelled",
        actorUid: identity.uid,
        sessionId,
        offeringId,
        reason,
        createdAt: now,
      });
    });
    return NextResponse.json({ ok: true, sessionId, state: "cancelled" });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const known: Record<string, { status: number; error: string }> = {
      SESSION_NOT_FOUND: { status: 404, error: "Session not found." },
      SESSION_NOT_SCHEDULED: { status: 409, error: "Only scheduled sessions can be cancelled." },
      NOT_STAFF: { status: 403, error: "An active lecturer or administrator is required." },
      NOT_ASSIGNED: { status: 403, error: "You are not assigned to this course offering." },
    };
    if (known[code]) return NextResponse.json({ error: known[code]!.error }, { status: known[code]!.status });
    if (code.includes("Firebase ID token")) return NextResponse.json({ error: "Your sign-in session expired. Sign in again." }, { status: 401 });
    return NextResponse.json({ error: "Unable to cancel the session. Please retry." }, { status: 503 });
  }
}
