import { NextResponse } from "next/server";
import { INSTITUTIONAL_EMAIL_PATTERN } from "@/lib/roster/validate";
import { getFirebaseAdmin } from "@/lib/firebase/admin";
import type { SessionDetailData, RosterStudent, SessionStatus, AttendanceMark } from "@/lib/api/types";

export const runtime = "nodejs";

function tokenFrom(request: Request) {
  return /^Bearer (.+)$/.exec(request.headers.get("authorization") ?? "")?.[1] ?? null;
}

/**
 * GET /api/sessions/[sessionId]
 * Returns session details, offering metadata, and the enrolled student roster.
 * If the session is scheduled, returns the active enrolled students ready for roll call.
 * If completed, returns recorded present/absent marks.
 * Requires an active staff account assigned to the session's offering (or admin).
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ sessionId: string }> }
) {
  const token = tokenFrom(request);
  if (!token) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const { sessionId } = await context.params;
  if (!/^[A-Za-z0-9_-]{1,150}$/.test(sessionId)) {
    return NextResponse.json({ error: "Invalid session ID." }, { status: 400 });
  }

  try {
    const { auth, db } = getFirebaseAdmin();
    const identity = await auth.verifyIdToken(token, true);

    if (identity.email_verified !== true || !INSTITUTIONAL_EMAIL_PATTERN.test(identity.email ?? "")) {
      return NextResponse.json(
        { error: "A verified institutional staff account is required." },
        { status: 403 }
      );
    }

    const staffDoc = await db.collection("staff").doc(identity.uid).get();
    if (!staffDoc.exists || staffDoc.get("active") !== true) {
      return NextResponse.json({ error: "Staff account not found or inactive." }, { status: 403 });
    }

    const role = String(staffDoc.get("role") ?? "");
    if (role !== "lecturer" && role !== "admin") {
      return NextResponse.json({ error: "Only staff can access session details." }, { status: 403 });
    }

    const sessionDoc = await db.collection("sessions").doc(sessionId).get();
    if (!sessionDoc.exists) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    const sessionData = sessionDoc.data()!;
    const offeringId = String(sessionData.offeringId ?? "");
    const state = String(sessionData.state ?? "scheduled") as SessionStatus;

    // Verify course offering ownership
    if (role !== "admin") {
      const assignmentDoc = await db
        .collection("teachingAssignments")
        .doc(`${offeringId}_${identity.uid}`)
        .get();

      if (!assignmentDoc.exists || assignmentDoc.get("active") !== true) {
        return NextResponse.json(
          { error: "You are not assigned to this course offering." },
          { status: 403 }
        );
      }
    }

    // Fetch offering and course metadata
    const offeringDoc = await db.collection("courseOfferings").doc(offeringId).get();
    const courseId = offeringDoc.exists && offeringDoc.get("courseId") ? String(offeringDoc.get("courseId")) : null;

    let courseCode: string | null = null;
    let courseTitle = offeringId;

    if (courseId) {
      const courseDoc = await db.collection("courses").doc(courseId).get();
      if (courseDoc.exists) {
        courseCode = courseDoc.get("code") ? String(courseDoc.get("code")) : null;
        courseTitle = courseDoc.get("title") ? String(courseDoc.get("title")) : offeringId;
      }
    }

    // Fetch active enrollments for this offering
    const enrollmentsSnap = await db
      .collection("enrollments")
      .where("offeringId", "==", offeringId)
      .where("active", "==", true)
      .get();

    // Look up student roster information for roll numbers
    const roster: RosterStudent[] = [];
    for (const enrDoc of enrollmentsSnap.docs) {
      const studentUid = String(enrDoc.get("studentUid") ?? "");
      const rosterId = String(enrDoc.get("rosterId") ?? "");

      let rollNumber: string | null = null;
      let batch: string | null = null;
      let programme: string | null = null;
      let studentName: string | null = null;

      if (rosterId) {
        const rosterDoc = await db.collection("studentRoster").doc(rosterId).get();
        if (rosterDoc.exists) {
          rollNumber = rosterDoc.get("rollNumber") ? String(rosterDoc.get("rollNumber")) : null;
          batch = rosterDoc.get("batch") ? String(rosterDoc.get("batch")) : null;
          programme = rosterDoc.get("programme") ? String(rosterDoc.get("programme")) : null;
        }
      }

      if (!rollNumber) {
        // Fall back to student profile if rosterId was not on enrollment doc
        const profileDoc = await db.collection("userProfiles").doc(studentUid).get();
        if (profileDoc.exists) {
          rollNumber = profileDoc.get("rollNumber") ? String(profileDoc.get("rollNumber")) : null;
          studentName = profileDoc.get("name") ? String(profileDoc.get("name")) : null;
          if (!batch && profileDoc.get("batch")) batch = String(profileDoc.get("batch"));
          if (!programme && profileDoc.get("programme")) programme = String(profileDoc.get("programme"));
        }
      }

      roster.push({
        studentUid,
        rollNumber: rollNumber ?? studentUid,
        name: studentName,
        batch,
        programme,
      });
    }

    // Sort roster by rollNumber
    roster.sort((a, b) => (a.rollNumber ?? "").localeCompare(b.rollNumber ?? ""));

    const responsePayload: SessionDetailData = {
      session: {
        id: sessionDoc.id,
        offeringId,
        sessionDate: String(sessionData.sessionDate ?? ""),
        startTime: typeof sessionData.startTime === "string" ? sessionData.startTime : null,
        endTime: typeof sessionData.endTime === "string" ? sessionData.endTime : null,
        room: typeof sessionData.room === "string" ? sessionData.room : null,
        state,
        cancellationReason: typeof sessionData.cancellationReason === "string" ? sessionData.cancellationReason : null,
        completedAt: sessionData.completedAt?.toDate ? sessionData.completedAt.toDate().toISOString() : null,
        completedBy: typeof sessionData.completedBy === "string" ? sessionData.completedBy : null,
        cancelledAt: sessionData.cancelledAt?.toDate ? sessionData.cancelledAt.toDate().toISOString() : null,
        cancelledBy: typeof sessionData.cancelledBy === "string" ? sessionData.cancelledBy : null,
      },
      offering: {
        id: offeringId,
        courseId,
        courseCode,
        courseTitle,
        term: offeringDoc.exists && offeringDoc.get("term") ? String(offeringDoc.get("term")) : null,
        batch: offeringDoc.exists && offeringDoc.get("batch") ? String(offeringDoc.get("batch")) : null,
        programme: offeringDoc.exists && offeringDoc.get("programme") ? String(offeringDoc.get("programme")) : null,
      },
      roster,
      totalCount: roster.length,
    };

    // If completed, fetch marked attendance
    if (state === "completed") {
      const attSnap = await db
        .collection("attendance")
        .where("sessionId", "==", sessionId)
        .get();

      let presentCount = 0;
      let absentCount = 0;

      const rosterMap = new Map(roster.map((r) => [r.studentUid, r]));

      const marks = attSnap.docs.map((doc) => {
        const studentUid = String(doc.get("studentUid") ?? "");
        const mark = String(doc.get("mark") ?? "present") as AttendanceMark;
        const studentMeta = rosterMap.get(studentUid);

        if (mark === "present") presentCount++;
        else if (mark === "absent") absentCount++;

        return {
          studentUid,
          rollNumber: studentMeta?.rollNumber ?? studentUid,
          name: studentMeta?.name ?? null,
          mark,
          recordedAt: doc.get("recordedAt")?.toDate ? doc.get("recordedAt").toDate().toISOString() : null,
        };
      });

      marks.sort((a, b) => (a.rollNumber ?? "").localeCompare(b.rollNumber ?? ""));

      responsePayload.marks = marks;
      responsePayload.presentCount = presentCount;
      responsePayload.absentCount = absentCount;
      responsePayload.totalCount = marks.length;
    }

    return NextResponse.json(responsePayload, { status: 200 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    if (msg.includes("Firebase ID token")) {
      return NextResponse.json({ error: "Your sign-in session expired. Sign in again." }, { status: 401 });
    }
    return NextResponse.json({ error: "Unable to retrieve session details." }, { status: 503 });
  }
}
