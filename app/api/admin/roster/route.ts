import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebase/admin";

export const runtime = "nodejs";

function tokenFrom(request: Request) {
  return /^Bearer (.+)$/i.exec(request.headers.get("authorization") ?? "")?.[1] ?? null;
}

export async function GET(request: Request) {
  const token = tokenFrom(request);
  const isMock = process.env.NEXT_PUBLIC_ENABLE_MOCK_API === "true";

  if (isMock) {
    return NextResponse.json({
      roster: [
        { id: "261161", rollNumber: "261161", email: "261161@iiitt.ac.in", batch: "2026", programme: "Computer Science and Engineering", active: true },
        { id: "261162", rollNumber: "261162", email: "261162@iiitt.ac.in", batch: "2026", programme: "Computer Science and Engineering", active: true },
        { id: "261163", rollNumber: "261163", email: "261163@iiitt.ac.in", batch: "2026", programme: "Computer Science and Engineering", active: true },
        { id: "261201", rollNumber: "261201", email: "261201@iiitt.ac.in", batch: "2026", programme: "Electronics and Communication Engineering", active: true },
        { id: "261202", rollNumber: "261202", email: "261202@iiitt.ac.in", batch: "2026", programme: "Electronics and Communication Engineering", active: true },
        { id: "251101", rollNumber: "251101", email: "251101@iiitt.ac.in", batch: "2025", programme: "Computer Science and Engineering", active: true },
      ],
      total: 6,
    });
  }

  if (!token) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  try {
    const { auth, db } = getFirebaseAdmin();
    const actor = await auth.verifyIdToken(token, true);

    const actorDoc = await db.collection("staff").doc(actor.uid).get();
    if (!actorDoc.exists || actorDoc.get("role") !== "admin" || actorDoc.get("active") !== true) {
      return NextResponse.json({ error: "Administrator authorization required." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim().toLowerCase();
    const batch = (searchParams.get("batch") || "").trim();
    const limit = Math.min(parseInt(searchParams.get("limit") || "100", 10), 500);

    let query: FirebaseFirestore.Query = db.collection("studentRoster");
    if (batch) {
      query = query.where("batch", "==", batch);
    }
    const snap = await query.limit(limit).get();

    let roster = snap.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        rollNumber: d.rollNumber || doc.id,
        email: d.email || d.emailNormalized || "",
        batch: d.batch || "",
        programme: d.programme || "",
        active: d.active === true,
      };
    });

    if (q) {
      roster = roster.filter(
        (r) =>
          r.rollNumber.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q) ||
          r.programme.toLowerCase().includes(q)
      );
    }

    return NextResponse.json({ roster, total: roster.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (
      msg.includes("Firebase ID token") ||
      msg.includes("decoding Firebase ID token") ||
      msg.includes("auth/argument-error") ||
      msg.includes("auth/id-token-expired") ||
      msg.includes("auth/invalid-id-token")
    ) {
      return NextResponse.json({ error: "Your sign-in session expired. Sign in again." }, { status: 401 });
    }
    return NextResponse.json({ error: msg || "Failed to load roster" }, { status: 500 });
  }
}
