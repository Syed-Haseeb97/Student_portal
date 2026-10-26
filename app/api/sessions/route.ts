import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebase/admin";

export const runtime = "nodejs";

function tokenFrom(request: Request) {
  return /^Bearer (.+)$/.exec(request.headers.get("authorization") ?? "")?.[1] ?? null;
}

function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\\d{4}-\\d{2}-\\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Create a distinct scheduled session for an assigned course offering. */
export async function POST(request: Request) {
  const token = tokenFrom(request);
  if (!token) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = await request.json().catch(() => null) as { offeringId?: unknown; sessionDate?: unknown; startTime?: unknown; endTime?: unknown; room?: unknown } | null;
  if (!body || typeof body.offeringId !== "string" || !/^[A-Za-z0-9_-]{1,100}$/.test(body.offeringId) ||
      !validDate(body.sessionDate)) {
    return NextResponse.json({ error: "Provide a valid offeringId and sessionDate (YYYY-MM-DD)." }, { status: 400 });
  }
  if (body.startTime !== undefined && (typeof body.startTime !== "string" || !/^([01]\\d|2[0-3]):[0-5]\\d$/.test(body.startTime))) {
    return NextResponse.json({ error: "startTime must use 24-hour HH:MM format." }, { status: 400 });
  }
  if (body.endTime !== undefined && (typeof body.endTime !== "string" || !/^([01]\\d|2[0-3]):[0-5]\\d$/.test(body.endTime))) {
    return NextResponse.json({ error: "endTime must use 24-hour HH:MM format." }, { status: 400 });
  }
  if (body.room !== undefined && (typeof body.room !== "string" || body.room.trim().length > 80)) {
    return NextResponse.json({ error: "room must be at most 80 characters." }, { status: 400 });
  }

  try {
    const { auth, db } = getFirebaseAdmin();
    const identity = await auth.verifyIdToken(token, true);
    const staffRef = db.collection("staff").doc(identity.uid);
    const assignmentRef = db.collection("teachingAssignments").doc(`${body.offeringId}_${identity.uid}`);
    const offeringRef = db.collection("courseOfferings").doc(body.offeringId);
    const [staff, assignment, offering] = await Promise.all([staffRef.get(), assignmentRef.get(), offeringRef.get()]);
    const isAdmin = staff.exists && staff.get("active") === true && staff.get("role") === "admin";
    const isAssignedLecturer = staff.exists && staff.get("active") === true && staff.get("role") === "lecturer" &&
      assignment.exists && assignment.get("active") === true;
    if (!isAdmin && !isAssignedLecturer) {
      return NextResponse.json({ error: "You are not authorized to schedule sessions for this offering." }, { status: 403 });
    }
    if (!offering.exists || offering.get("active") !== true) {
      return NextResponse.json({ error: "The course offering is missing or inactive." }, { status: 404 });
    }

    const ref = db.collection("sessions").doc();
    await db.runTransaction(async (transaction) => {
      transaction.create(ref, {
        offeringId: body.offeringId,
        sessionDate: body.sessionDate,
        ...(body.startTime ? { startTime: body.startTime } : {}),
        ...(body.endTime ? { endTime: body.endTime } : {}),
        ...(typeof body.room === "string" && body.room.trim() ? { room: body.room.trim() } : {}),
        state: "scheduled",
        createdBy: identity.uid,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.create(db.collection("auditEvents").doc(), {
        action: "session.created",
        actorUid: identity.uid,
        sessionId: ref.id,
        offeringId: body.offeringId,
        sessionDate: body.sessionDate,
        createdAt: FieldValue.serverTimestamp(),
      });
    });
    return NextResponse.json({ ok: true, sessionId: ref.id, state: "scheduled" }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unable to create the session. Please retry." }, { status: 503 });
  }
}
