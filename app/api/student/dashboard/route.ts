import { NextResponse } from "next/server";
import { INSTITUTIONAL_EMAIL_PATTERN } from "@/lib/roster/validate";
import { getFirebaseAdmin } from "@/lib/firebase/admin";
import { evaluate, DEFAULT_POLICY } from "@/lib/attendance/calc";

export const runtime = "nodejs";

function tokenFrom(request: Request) {
  return /^Bearer (.+)$/.exec(request.headers.get("authorization") ?? "")?.[1] ?? null;
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
    const grouped = new Map<string, { attended: number; missed: number; latestDate: string | null }>();
    for (const enrollment of enrollmentsSnapshot.docs) {
      const offeringId = enrollment.get("offeringId");
      if (typeof offeringId === "string" && offeringId) {
        grouped.set(offeringId, grouped.get(offeringId) ?? { attended: 0, missed: 0, latestDate: null });
      }
    }
    for (const doc of marksSnapshot.docs) {
      const data = doc.data();
      if (typeof data.offeringId !== "string" || typeof data.sessionId !== "string" ||
          !["present", "absent"].includes(String(data.mark))) continue;
      const counts = grouped.get(data.offeringId) ?? { attended: 0, missed: 0, latestDate: null };
      if (data.mark === "present") counts.attended++;
      else counts.missed++;
      if (typeof data.sessionDate === "string" && (!counts.latestDate || data.sessionDate > counts.latestDate)) {
        counts.latestDate = data.sessionDate;
      }
      grouped.set(data.offeringId, counts);
    }

    const summaries = await Promise.all([...grouped.entries()].map(async ([offeringId, counts]) => {
      const offering = await db.collection("courseOfferings").doc(offeringId).get();
      const courseId = offering.exists && typeof offering.get("courseId") === "string" ? offering.get("courseId") as string : "";
      const course = courseId ? await db.collection("courses").doc(courseId).get() : null;
      const total = counts.attended + counts.missed;
      const result = evaluate(counts.attended, total, DEFAULT_POLICY);
      return {
        offeringId,
        courseId: courseId || null,
        courseCode: course?.exists && typeof course.get("code") === "string" ? course.get("code") as string : null,
        courseTitle: course?.exists && typeof course.get("title") === "string" ? course.get("title") as string :
          (course?.exists && typeof course.get("name") === "string" ? course.get("name") as string : offeringId),
        term: offering?.exists && typeof offering.get("term") === "string" ? offering.get("term") as string : null,
        attended: counts.attended,
        missed: counts.missed,
        total,
        percentage: result.percentage,
        status: result.status,
        thresholdPercent: DEFAULT_POLICY.thresholdPercent,
        latestSessionDate: counts.latestDate,
      };
    }));

    summaries.sort((a, b) =>
      (a.status === "below_threshold" ? 0 : a.status === "compliant" ? 1 : 2) -
      (b.status === "below_threshold" ? 0 : b.status === "compliant" ? 1 : 2) ||
      (a.courseCode ?? a.courseTitle).localeCompare(b.courseCode ?? b.courseTitle));

    return NextResponse.json({
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
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("Firebase ID token")) {
      return NextResponse.json({ error: "Your sign-in session expired. Sign in again." }, { status: 401 });
    }
    return NextResponse.json({ error: "Unable to load attendance data right now. Please retry." }, { status: 503 });
  }
}
