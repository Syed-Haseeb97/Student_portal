import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebase/admin";
import { mutableNotices } from "../route";

export const runtime = "nodejs";

function bearerToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization") ?? "";
  const match = /^Bearer (.+)$/i.exec(authHeader);
  return match?.[1] ?? null;
}

/**
 * DELETE /api/notices/[noticeId]
 * Deletes or archives a notice/assignment. Must be the author or admin.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ noticeId: string }> }
) {
  const token = bearerToken(request);
  const isMock = process.env.NEXT_PUBLIC_ENABLE_MOCK_API === "true";
  const { noticeId } = await params;

  if (isMock || !token) {
    const idx = mutableNotices.findIndex((n) => n.id === noticeId);
    if (idx !== -1) {
      mutableNotices.splice(idx, 1);
    }
    return NextResponse.json({ ok: true, deletedId: noticeId });
  }

  try {
    const { auth, db } = getFirebaseAdmin();
    const identity = await auth.verifyIdToken(token, true);

    const noticeRef = db.collection("notices").doc(noticeId);
    const noticeSnap = await noticeRef.get();
    if (!noticeSnap.exists) {
      return NextResponse.json({ error: "Notice not found." }, { status: 404 });
    }

    const staffDoc = await db.collection("staff").doc(identity.uid).get();
    const role = staffDoc.data()?.role;
    const authorUid = noticeSnap.data()?.postedByUid;

    if (role !== "admin" && authorUid !== identity.uid) {
      return NextResponse.json(
        { error: "You can only delete notices that you personally published." },
        { status: 403 }
      );
    }

    await noticeRef.delete();
    return NextResponse.json({ ok: true, deletedId: noticeId });
  } catch (err) {
    console.error("Error deleting notice:", err);
    return NextResponse.json({ error: "Failed to delete notice." }, { status: 500 });
  }
}
