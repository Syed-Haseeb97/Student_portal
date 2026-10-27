import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebase/admin";
import { normalizeEmail } from "@/lib/roster/validate";

export const runtime = "nodejs";

function bearerToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization") ?? "";
  const match = /^Bearer (.+)$/i.exec(authHeader);
  return match?.[1] ?? null;
}

export async function GET(request: Request) {
  const token = bearerToken(request);
  const isMock = process.env.NEXT_PUBLIC_ENABLE_MOCK_API === "true";

  if (!token) {
    if (isMock) {
      // In mock mode, allow fallback mock session
      return NextResponse.json({
        uid: "mock-student-261161",
        email: "261161@iiitt.ac.in",
        role: "student",
        name: "Syed Haseeb",
        rollNumber: "261161",
        batch: "2026",
        programme: "Computer Science & Engineering",
        active: true,
      });
    }
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  // Handle mock mode with token
  if (isMock) {
    return NextResponse.json({
      uid: "mock-student-261161",
      email: "261161@iiitt.ac.in",
      role: "student",
      name: "Syed Haseeb",
      rollNumber: "261161",
      batch: "2026",
      programme: "Computer Science & Engineering",
      active: true,
    });
  }

  try {
    const { auth, db } = getFirebaseAdmin();
    const identity = await auth.verifyIdToken(token, true);
    const email = normalizeEmail(identity.email ?? "");

    // 1. Check if identity belongs to provisioned staff (admin or lecturer)
    const staffDoc = await db.collection("staff").doc(identity.uid).get();
    if (staffDoc.exists) {
      const data = staffDoc.data();
      if (data?.active !== true) {
        return NextResponse.json(
          { error: "Staff account has been deactivated. Contact an administrator." },
          { status: 403 }
        );
      }
      return NextResponse.json({
        uid: identity.uid,
        email: data?.email || email,
        role: data?.role as "lecturer" | "admin",
        name: data?.name || identity.name || (data?.role === "admin" ? "System Administrator" : "Faculty Member"),
        staffId: data?.staffId,
        department: data?.department,
        active: true,
      });
    }

    // 2. Check if identity belongs to an enrolled student profile
    const profileDoc = await db.collection("userProfiles").doc(identity.uid).get();
    if (profileDoc.exists) {
      const data = profileDoc.data();
      if (data?.active !== true) {
        return NextResponse.json(
          { error: "Student profile has been deactivated. Contact the academic office." },
          { status: 403 }
        );
      }
      return NextResponse.json({
        uid: identity.uid,
        email: data?.email || email,
        role: "student",
        name: data?.name || identity.name || data?.rollNumber || "Student",
        rollNumber: data?.rollNumber,
        batch: data?.batch,
        programme: data?.programme,
        active: true,
      });
    }

    // 3. User is authenticated with Firebase, but no profile/staff document has been created yet.
    // They may need to claim their roster entry.
    return NextResponse.json({
      uid: identity.uid,
      email,
      role: null,
      unclaimed: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to verify identity";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
