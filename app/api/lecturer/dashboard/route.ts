import { NextResponse } from "next/server";
import { INSTITUTIONAL_EMAIL_PATTERN } from "@/lib/roster/validate";
import { getFirebaseAdmin } from "@/lib/firebase/admin";
import type { LecturerDashboardData, LecturerOffering, LecturerSessionSummary } from "@/lib/api/types";

export const runtime = "nodejs";

function tokenFrom(request: Request) {
  return /^Bearer (.+)$/.exec(request.headers.get("authorization") ?? "")?.[1] ?? null;
}

function getTodayKolkata(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * GET /api/lecturer/dashboard
 * Sourced from authoritative Firestore records.
 * Returns the authenticated lecturer's assigned course offerings, active enrollment counts,
 * and session history. Requires an active staff account with lecturer or admin role.
 */
export async function GET(request: Request) {
  const token = tokenFrom(request);
  if (!token) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
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
      return NextResponse.json(
        { error: "Staff account not found or inactive." },
        { status: 403 }
      );
    }

    const role = String(staffDoc.get("role") ?? "");
    if (role !== "lecturer" && role !== "admin") {
      return NextResponse.json(
        { error: "Only lecturers and administrators can access this dashboard." },
        { status: 403 }
      );
    }

    // 1. Fetch assigned offerings
    let offeringIds: string[] = [];
    if (role === "admin") {
      // Admins can see all active course offerings
      const allOfferings = await db.collection("courseOfferings").where("active", "==", true).get();
      offeringIds = allOfferings.docs.map((d) => d.id);
    } else {
      const assignments = await db
        .collection("teachingAssignments")
        .where("lecturerUid", "==", identity.uid)
        .where("active", "==", true)
        .get();
      offeringIds = assignments.docs
        .map((d) => String(d.get("offeringId") ?? ""))
        .filter((id) => id.length > 0);
    }

    // 2. Fetch offering details and courses
    const offerings: LecturerOffering[] = [];
    const offeringMap = new Map<string, { code: string | null; title: string }>();

    for (const offeringId of offeringIds) {
      const offeringDoc = await db.collection("courseOfferings").doc(offeringId).get();
      if (!offeringDoc.exists || offeringDoc.get("active") !== true) continue;

      const courseId = String(offeringDoc.get("courseId") ?? "");
      let courseCode: string | null = null;
      let courseTitle = offeringId;

      if (courseId) {
        const courseDoc = await db.collection("courses").doc(courseId).get();
        if (courseDoc.exists) {
          courseCode = courseDoc.get("code") ? String(courseDoc.get("code")) : null;
          courseTitle = courseDoc.get("title") ? String(courseDoc.get("title")) : offeringId;
        }
      }

      offeringMap.set(offeringId, { code: courseCode, title: courseTitle });

      // Count active enrolled students
      const enrollmentsSnap = await db
        .collection("enrollments")
        .where("offeringId", "==", offeringId)
        .where("active", "==", true)
        .get();

      offerings.push({
        id: offeringId,
        courseId,
        courseCode,
        courseTitle,
        term: offeringDoc.get("term") ? String(offeringDoc.get("term")) : null,
        batch: offeringDoc.get("batch") ? String(offeringDoc.get("batch")) : null,
        programme: offeringDoc.get("programme") ? String(offeringDoc.get("programme")) : null,
        enrolledCount: enrollmentsSnap.size,
        active: true,
      });
    }

    // 3. Fetch sessions for these offerings
    const sessions: LecturerSessionSummary[] = [];

    // Query sessions for each active offering
    for (const offering of offerings) {
      const sessionsSnap = await db
        .collection("sessions")
        .where("offeringId", "==", offering.id)
        .get();

      for (const sDoc of sessionsSnap.docs) {
        const sData = sDoc.data();
        const state = String(sData.state ?? "scheduled") as LecturerSessionSummary["state"];
        const sMeta = offeringMap.get(offering.id);

        let presentCount: number | null = null;
        let absentCount: number | null = null;
        let totalCount: number | null = null;

        if (state === "completed") {
          const attSnap = await db
            .collection("attendance")
            .where("sessionId", "==", sDoc.id)
            .get();

          let p = 0;
          let a = 0;
          for (const attDoc of attSnap.docs) {
            const m = attDoc.get("mark");
            if (m === "present") p++;
            else if (m === "absent") a++;
          }
          presentCount = p;
          absentCount = a;
          totalCount = p + a;
        }

        sessions.push({
          id: sDoc.id,
          offeringId: offering.id,
          courseCode: sMeta?.code ?? null,
          courseTitle: sMeta?.title ?? offering.id,
          sessionDate: String(sData.sessionDate ?? ""),
          startTime: typeof sData.startTime === "string" ? sData.startTime : null,
          endTime: typeof sData.endTime === "string" ? sData.endTime : null,
          room: typeof sData.room === "string" ? sData.room : null,
          state,
          cancellationReason: typeof sData.cancellationReason === "string" ? sData.cancellationReason : null,
          presentCount,
          absentCount,
          totalCount,
          createdAt: sData.createdAt?.toDate ? sData.createdAt.toDate().toISOString() : null,
        });
      }
    }

    // Sort sessions by date descending, then start time descending
    sessions.sort((a, b) => {
      const dateCmp = b.sessionDate.localeCompare(a.sessionDate);
      if (dateCmp !== 0) return dateCmp;
      return (b.startTime ?? "").localeCompare(a.startTime ?? "");
    });

    // Sort offerings alphabetically by courseCode
    offerings.sort((a, b) => (a.courseCode ?? "").localeCompare(b.courseCode ?? ""));

    const responsePayload: LecturerDashboardData = {
      lecturer: {
        uid: identity.uid,
        email: identity.email ?? "",
        name: identity.name ?? null,
        role: role as "lecturer" | "admin",
      },
      offerings,
      sessions,
      todayDate: getTodayKolkata(),
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(responsePayload, { status: 200 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    if (msg.includes("Firebase ID token")) {
      return NextResponse.json({ error: "Your sign-in session expired. Sign in again." }, { status: 401 });
    }
    return NextResponse.json({ error: "Unable to load lecturer dashboard. Please retry." }, { status: 503 });
  }
}
