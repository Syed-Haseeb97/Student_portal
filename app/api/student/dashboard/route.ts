import { FieldPath } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { INSTITUTIONAL_EMAIL_PATTERN } from "@/lib/roster/validate";
import { getFirebaseAdmin } from "@/lib/firebase/admin";
import { evaluate, DEFAULT_POLICY } from "@/lib/attendance/calc";
import type { AttendanceStatus, StudentDashboardData } from "@/lib/api/types";

export const runtime = "nodejs";

function tokenFrom(request: Request) {
  return /^Bearer (.+)$/.exec(request.headers.get("authorization") ?? "")?.[1] ?? null;
}

function validSessionDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Return attendance summaries only for the signed-in student's own roster-linked account. */
export async function GET(request: Request) {
  const token = tokenFrom(request);
  if (!token) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  try {
    const { auth, db } = getFirebaseAdmin();
    const identity = await auth.verifyIdToken(token, true);
    if (identity.email_verified !== true || !INSTITUTIONAL_EMAIL_PATTERN.test(identity.email ?? "")) {
      return NextResponse.json({ error: "A verified @iiitt.ac.in account is required." }, { status: 403 });
    }

    const profileRef = db.collection("userProfiles").doc(identity.uid);
    const profile = await profileRef.get();
    if (!profile.exists || profile.get("active") !== true || profile.get("role") !== "student") {
      return NextResponse.json({ error: "Your student portal profile is inactive or not provisioned." }, { status: 403 });
    }
    const rosterId = profile.get("rosterId");
    if (typeof rosterId !== "string" || !rosterId) {
      return NextResponse.json({ error: "Your portal profile is not linked to an approved roster entry." }, { status: 403 });
    }
    const roster = await db.collection("studentRoster").doc(rosterId).get();
    if (!roster.exists || roster.get("active") !== true || roster.get("emailNormalized") !== identity.email?.trim().toLowerCase()) {
      return NextResponse.json({ error: "Your approved roster entry is inactive or no longer matches your account." }, { status: 403 });
    }

    // Seed summaries from active enrollments so a course with zero completed
    // sessions still appears with a no-data status instead of disappearing.
    const [enrollmentsSnapshot, marksSnapshot] = await Promise.all([
      db.collection("enrollments")
        .where("studentUid", "==", identity.uid)
        .where("active", "==", true)
        .get(),
      db.collection("attendance")
        .where("studentUid", "==", identity.uid)
        .get(),
    ]);
    // Attendance marks are written atomically with session completion by the
    // attendance endpoint. Still verify session state when reading so legacy,
    // imported, or inconsistent marks from scheduled/cancelled sessions never
    // affect the student's percentage.
    const sessionIds = [...new Set(marksSnapshot.docs
      .map((doc) => doc.get("sessionId"))
      .filter((sessionId): sessionId is string => typeof sessionId === "string" && sessionId.length > 0))];
    const sessionDetails = new Map<string, { state: string; offeringId: string; sessionDate: string | null }>();
    const sessions = db.collection("sessions");
    // Firestore supports up to 30 document IDs in an "in" query; batch to
    // avoid issuing an unbounded number of concurrent reads for long histories.
    for (let offset = 0; offset < sessionIds.length; offset += 30) {
      const batch = sessionIds.slice(offset, offset + 30);
      const snapshot = await sessions.where(FieldPath.documentId(), "in", batch).get();
      for (const session of snapshot.docs) {
        const state = session.get("state");
        const offeringId = session.get("offeringId");
        if (typeof state === "string" && typeof offeringId === "string") {
          const sessionDate = session.get("sessionDate");
          sessionDetails.set(session.id, {
            state,
            offeringId,
            sessionDate: validSessionDate(sessionDate) ? sessionDate : null,
          });
        }
      }
    }

    const grouped = new Map<string, { attended: number; missed: number; latestDate: string | null }>();
    for (const enrollment of enrollmentsSnapshot.docs) {
      const offeringId = enrollment.get("offeringId");
      if (typeof offeringId === "string" && offeringId) {
        grouped.set(offeringId, grouped.get(offeringId) ?? { attended: 0, missed: 0, latestDate: null });
      }
    }
    const marksBySession = new Map<string, { offeringId: string; mark: "present" | "absent"; sessionDate: string | null }>();
    const ambiguousSessionMarks = new Set<string>();
    for (const doc of marksSnapshot.docs) {
      const data = doc.data();
      if (typeof data.offeringId !== "string" || typeof data.sessionId !== "string" ||
          !["present", "absent"].includes(String(data.mark))) continue;
      const session = sessionDetails.get(data.sessionId);
      if (!session || session.state !== "completed" || session.offeringId !== data.offeringId) continue;
      const mark = data.mark as "present" | "absent";
      const existing = marksBySession.get(data.sessionId);
      if (existing && (existing.offeringId !== data.offeringId || existing.mark !== mark)) {
        ambiguousSessionMarks.add(data.sessionId);
        continue;
      }
      if (existing) continue;
      marksBySession.set(data.sessionId, {
        offeringId: data.offeringId,
        mark,
        sessionDate: session.sessionDate,
      });
    }
    for (const [sessionId, data] of marksBySession) {
      if (ambiguousSessionMarks.has(sessionId)) continue;
      // The dashboard represents current active enrollments only. Historical marks for removed/deactivated enrollments must not recreate an inactive offering.
      const counts = grouped.get(data.offeringId);
      if (!counts) continue;
      if (data.mark === "present") counts.attended++;
      else counts.missed++;
      if (data.sessionDate && (!counts.latestDate || data.sessionDate > counts.latestDate)) {
        counts.latestDate = data.sessionDate;
      }
      grouped.set(data.offeringId, counts);
    }

    const summaries = (await Promise.all([...grouped.entries()].map(async ([offeringId, counts]) => {
      const offering = await db.collection("courseOfferings").doc(offeringId).get();
      // Deactivating an offering does not automatically rewrite every enrollment.
      // Fail closed here so retired offerings do not remain on the current dashboard.
      if (!offering.exists || offering.get("active") !== true) return null;
      const courseId = typeof offering.get("courseId") === "string" ? offering.get("courseId") as string : "";
      const course = courseId ? await db.collection("courses").doc(courseId).get() : null;
      const total = counts.attended + counts.missed;
      const result = evaluate(counts.attended, total, DEFAULT_POLICY);
      const status: AttendanceStatus = result.status === "below_threshold" ? "shortfall" : result.status;
      return {
        offeringId,
        courseId: courseId || null,
        courseCode: course?.exists && typeof course.get("code") === "string" ? course.get("code") as string : null,
        courseTitle: course?.exists && typeof course.get("title") === "string" ? course.get("title") as string :
          (course?.exists && typeof course.get("name") === "string" ? course.get("name") as string : offeringId),
        term: typeof offering.get("term") === "string" ? offering.get("term") as string : null,
        attended: counts.attended,
        missed: counts.missed,
        total,
        percentage: result.percentage,
        status,
        thresholdPercent: DEFAULT_POLICY.thresholdPercent,
        latestSessionDate: counts.latestDate,
      };
    }))).filter((summary) => summary !== null);

    summaries.sort((a, b) =>
      (a.status === "shortfall" ? 0 : a.status === "compliant" ? 1 : 2) -
      (b.status === "shortfall" ? 0 : b.status === "compliant" ? 1 : 2) ||
      (a.courseCode ?? a.courseTitle).localeCompare(b.courseCode ?? b.courseTitle));

    const response: StudentDashboardData = {
      student: {
        uid: identity.uid,
        // The approved roster is the source of truth; cached profile fields can
        // become stale when an authorized roster correction is imported.
        rollNumber: typeof roster.get("rollNumber") === "string" ? roster.get("rollNumber") : null,
        batch: typeof roster.get("batch") === "string" ? roster.get("batch") : null,
        programme: typeof roster.get("programme") === "string" ? roster.get("programme") : null,
      },
      policy: { thresholdPercent: DEFAULT_POLICY.thresholdPercent, countsOnlyCompletedSessions: true },
      summaries,
      generatedAt: new Date().toISOString(),
    };
    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("Firebase ID token")) {
      return NextResponse.json({ error: "Your sign-in session expired. Sign in again." }, { status: 401 });
    }
    return NextResponse.json({ error: "Unable to load attendance data right now. Please retry." }, { status: 503 });
  }
}
