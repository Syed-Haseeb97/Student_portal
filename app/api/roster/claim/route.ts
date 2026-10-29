import { createHash } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebase/admin";
import {
  INSTITUTIONAL_EMAIL_PATTERN,
  normalizeEmail,
  inferStudentFromEmail,
  getFacultyByEmail,
  isAuthorizedPortalEmail,
} from "@/lib/roster/validate";

export const runtime = "nodejs";

function bearerToken(request: Request) {
  return /^Bearer (.+)$/.exec(request.headers.get("authorization") ?? "")?.[1] ?? null;
}

/** Match a verified Firebase identity to an admin-imported or auto-patterned roster entry. */
export async function POST(request: Request) {
  const token = bearerToken(request);
  if (!token) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  try {
    const { auth, db } = getFirebaseAdmin();
    const identity = await auth.verifyIdToken(token, true);
    const email = normalizeEmail(identity.email ?? "");
    if (identity.email_verified !== true || (!INSTITUTIONAL_EMAIL_PATTERN.test(email) && !isAuthorizedPortalEmail(email))) {
      return NextResponse.json({ error: "A verified institutional or authorized faculty email is required." }, { status: 403 });
    }

    // 1. Staff check (admin or lecturer)
    let staffIdentity = await db.collection("staff").doc(identity.uid).get();
    if (!staffIdentity.exists) {
      // Check if existing staff record exists by email
      const staffByEmail = await db.collection("staff").where("email", "==", email).limit(1).get();
      if (!staffByEmail.empty) {
        const prevDoc = staffByEmail.docs[0]!;
        await db.collection("staff").doc(identity.uid).set({
          ...prevDoc.data(),
          uid: identity.uid,
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
        staffIdentity = await db.collection("staff").doc(identity.uid).get();
      } else {
        // Check if email matches official 1st year faculty roster
        const faculty = getFacultyByEmail(email);
        if (faculty) {
          await db.collection("staff").doc(identity.uid).set({
            uid: identity.uid,
            email,
            role: "lecturer",
            active: true,
            name: faculty.name,
            department: faculty.department,
            staffId: faculty.staffId,
            designation: faculty.designation,
            phone: faculty.phone,
            courses: faculty.courses,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            autoProvisioned: true,
          }, { merge: true });
          staffIdentity = await db.collection("staff").doc(identity.uid).get();
        }
      }
    }

    if (staffIdentity.exists) {
      if (normalizeEmail(staffIdentity.get("email") ?? "") !== email) {
        return NextResponse.json({ error: "The signed-in email does not match the email on the provisioned staff account." }, { status: 403 });
      }
      if (staffIdentity.get("active") !== true || !["lecturer", "admin"].includes(String(staffIdentity.get("role")))) {
        return NextResponse.json({ error: "This staff account is inactive or incorrectly provisioned. Contact the portal administrator." }, { status: 403 });
      }
      return NextResponse.json({ ok: true, role: staffIdentity.get("role") });
    }

    // 2. Student roster matching
    let roster = await db.collection("studentRoster")
      .where("emailNormalized", "==", email)
      .where("active", "==", true)
      .limit(2)
      .get();

    // If no existing roster record, check if email matches the institutional student roll pattern:
    // [YY][CourseCode][Roll]@iiitt.ac.in
    // 11 = CSE, 12 = ECE, 13 = CSE AIDS, 14 = ECE VLSI
    if (roster.empty) {
      const inferred = inferStudentFromEmail(email);
      if (inferred) {
        const newRosterRef = db.collection("studentRoster").doc(inferred.rollNumber);
        await newRosterRef.set({
          rollNumber: inferred.rollNumber,
          emailNormalized: email,
          batch: inferred.batch,
          programme: inferred.programme,
          active: true,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          autoProvisioned: true,
        }, { merge: true });

        const emailHash = createHash("sha256").update(email).digest("hex");
        await db.collection("rosterEmailIndex").doc(emailHash).set({
          emailNormalized: email,
          rollNumber: inferred.rollNumber,
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });

        roster = await db.collection("studentRoster")
          .where("emailNormalized", "==", email)
          .where("active", "==", true)
          .limit(2)
          .get();
      }
    }

    if (roster.size !== 1) {
      return NextResponse.json({ error: "This email is not uniquely matched to an active approved student roster entry. Contact the portal administrator." }, { status: 403 });
    }

    const rosterDoc = roster.docs[0]!;
    const profileRef = db.collection("userProfiles").doc(identity.uid);

    // Re-check the authoritative roster row and profile in one transaction.
    // This prevents a stale roster lookup or concurrent profile update from
    // silently linking/re-enabling an account using outdated identity data.
    await db.runTransaction(async (transaction) => {
      const [currentRoster, existing] = await Promise.all([
        transaction.get(rosterDoc.ref),
        transaction.get(profileRef),
      ]);
      if (!currentRoster.exists || currentRoster.get("active") !== true ||
          normalizeEmail(currentRoster.get("emailNormalized") ?? "") !== email) {
        throw new Error("ROSTER_CHANGED");
      }
      const rosterData = currentRoster.data()!;
      if (typeof rosterData.rollNumber !== "string" || typeof rosterData.batch !== "string" ||
          typeof rosterData.programme !== "string") {
        throw new Error("ROSTER_INCOMPLETE");
      }
      if (existing.exists && existing.get("rosterId") !== currentRoster.id) {
        throw new Error("PROFILE_ROSTER_CONFLICT");
      }
      if (existing.exists && existing.get("active") === false) {
        throw new Error("PROFILE_DISABLED");
      }
      if (existing.exists && existing.get("role") && existing.get("role") !== "student") {
        throw new Error("PROFILE_ROLE_CONFLICT");
      }

      transaction.set(profileRef, {
        uid: identity.uid,
        rosterId: currentRoster.id,
        email,
        rollNumber: rosterData.rollNumber,
        batch: rosterData.batch,
        programme: rosterData.programme,
        role: "student",
        active: true,
        ...(existing.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    });

    return NextResponse.json({ ok: true, role: "student" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("Firebase ID token")) {
      return NextResponse.json({ error: "Your sign-in session expired. Sign in again." }, { status: 401 });
    }
    if (message === "ROSTER_CHANGED") {
      return NextResponse.json({ error: "The approved roster entry changed or was deactivated. Refresh and contact the portal administrator if this continues." }, { status: 409 });
    }
    if (message === "ROSTER_INCOMPLETE") {
      return NextResponse.json({ error: "The roster entry is incomplete. Contact the portal administrator." }, { status: 500 });
    }
    if (message === "PROFILE_ROSTER_CONFLICT") {
      return NextResponse.json({ error: "This account is already linked to a different roster entry. Contact the portal administrator." }, { status: 409 });
    }
    if (message === "PROFILE_DISABLED") {
      return NextResponse.json({ error: "This portal account has been disabled. Contact the portal administrator." }, { status: 403 });
    }
    if (message === "PROFILE_ROLE_CONFLICT") {
      return NextResponse.json({ error: "This identity is already provisioned with a non-student role. Contact the portal administrator." }, { status: 409 });
    }
    return NextResponse.json({ error: "Unable to verify roster access right now. Please retry." }, { status: 503 });
  }
}
