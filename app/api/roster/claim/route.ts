import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebase/admin";
import { normalizeEmail } from "@/lib/roster/validate";

export const runtime = "nodejs";

function bearerToken(request: Request) {
  return /^Bearer (.+)$/.exec(request.headers.get("authorization") ?? "")?.[1] ?? null;
}

/** Match a verified Firebase identity to an admin-imported roster entry. */
export async function POST(request: Request) {
  const token = bearerToken(request);
  if (!token) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  try {
    const { auth, db } = getFirebaseAdmin();
    const identity = await auth.verifyIdToken(token, true);
    const email = normalizeEmail(identity.email ?? "");
    if (identity.email_verified !== true || !/^[^\s@]+@iiitt\.ac\.in$/.test(email)) {
      return NextResponse.json({ error: "A verified @iiitt.ac.in email is required." }, { status: 403 });
    }

    const staffIdentity = await db.collection("staff").doc(identity.uid).get();
    if (staffIdentity.exists) {
      if (normalizeEmail(staffIdentity.get("email") ?? "") !== email) {
        return NextResponse.json({ error: "The signed-in email does not match the email on the provisioned staff account." }, { status: 403 });
      }
      if (staffIdentity.get("active") !== true || !["lecturer", "admin"].includes(String(staffIdentity.get("role")))) {
        return NextResponse.json({ error: "This staff account is inactive or incorrectly provisioned. Contact the portal administrator." }, { status: 403 });
      }
      return NextResponse.json({ ok: true, role: staffIdentity.get("role") });
    }

    const roster = await db.collection("studentRoster")
      .where("emailNormalized", "==", email)
      .where("active", "==", true)
      .limit(2)
      .get();
    if (roster.size !== 1) {
      return NextResponse.json({ error: "This email is not uniquely matched to an active approved student roster entry. Contact the portal administrator." }, { status: 403 });
    }

    const rosterDoc = roster.docs[0]!;
    const rosterData = rosterDoc.data();
    if (typeof rosterData.rollNumber !== "string" || typeof rosterData.batch !== "string" ||
        typeof rosterData.programme !== "string") {
      return NextResponse.json({ error: "The roster entry is incomplete. Contact the portal administrator." }, { status: 500 });
    }

    const profileRef = db.collection("userProfiles").doc(identity.uid);
    const existing = await profileRef.get();
    if (existing.exists && existing.get("rosterId") !== rosterDoc.id) {
      return NextResponse.json({ error: "This account is already linked to a different roster entry. Contact the portal administrator." }, { status: 409 });
    }
    if (existing.exists && existing.get("active") === false) {
      return NextResponse.json({ error: "This portal account has been disabled. Contact the portal administrator." }, { status: 403 });
    }
    if (existing.exists && existing.get("role") && existing.get("role") !== "student") {
      return NextResponse.json({ error: "This identity is already provisioned with a non-student role. Contact the portal administrator." }, { status: 409 });
    }

    await profileRef.set({
      uid: identity.uid,
      rosterId: rosterDoc.id,
      email,
      rollNumber: rosterData.rollNumber,
      batch: rosterData.batch,
      programme: rosterData.programme,
      role: "student",
      active: true,
      ...(existing.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    return NextResponse.json({ ok: true, role: "student" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("Firebase ID token")) {
      return NextResponse.json({ error: "Your sign-in session expired. Sign in again." }, { status: 401 });
    }
    return NextResponse.json({ error: "Unable to verify roster access right now. Please retry." }, { status: 503 });
  }
}
