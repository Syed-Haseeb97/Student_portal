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
      events: [
        {
          id: "evt-001",
          action: "staff.bootstrap",
          actorUid: "bootstrap-script",
          targetEmail: "admin@iiitt.ac.in",
          reason: "Initial deployment bootstrap",
          createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        },
        {
          id: "evt-002",
          action: "roster.import",
          actorUid: "admin@iiitt.ac.in",
          insertedCount: 120,
          batch: "2026",
          createdAt: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: "evt-003",
          action: "staff.provisioned",
          actorUid: "admin@iiitt.ac.in",
          targetEmail: "fac01@iiitt.ac.in",
          role: "lecturer",
          createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
        },
        {
          id: "evt-004",
          action: "academic.import",
          actorUid: "admin@iiitt.ac.in",
          courseCount: 5,
          createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
        },
      ],
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
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);

    const snap = await db.collection("auditEvents")
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get()
      .catch(() => db.collection("auditEvents").limit(limit).get()); // Fallback if index building

    const events = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate().toISOString() : String(data.createdAt)) : new Date().toISOString(),
      };
    });

    return NextResponse.json({ events });
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
    return NextResponse.json({ error: msg || "Failed to load audit log" }, { status: 500 });
  }
}
