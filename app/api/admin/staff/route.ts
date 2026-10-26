import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebase/admin";
import { normalizeEmail, INSTITUTIONAL_EMAIL_PATTERN } from "@/lib/roster/validate";

export const runtime = "nodejs";
function tokenFrom(request: Request) {
  return /^Bearer (.+)$/.exec(request.headers.get("authorization") ?? "")?.[1] ?? null;
}

/** Provision an already-created, verified institutional Firebase Auth account as staff. */
export async function POST(request: Request) {
  const token = tokenFrom(request);
  if (!token) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = await request.json().catch(() => null) as { email?: unknown; role?: unknown; active?: unknown } | null;
  const email = typeof body?.email === "string" ? normalizeEmail(body.email) : "";
  if (!INSTITUTIONAL_EMAIL_PATTERN.test(email) ||
      !["lecturer", "admin"].includes(String(body?.role)) ||
      typeof body?.active !== "boolean") {
    return NextResponse.json({ error: "Provide a verified institutional email, role (lecturer/admin), and boolean active flag." }, { status: 400 });
  }

  try {
    const { auth, db } = getFirebaseAdmin();
    const actor = await auth.verifyIdToken(token, true);
    const actorRef = db.collection("staff").doc(actor.uid);
    const actorDoc = await actorRef.get();
    if (!actorDoc.exists || actorDoc.get("role") !== "admin" || actorDoc.get("active") !== true) {
      return NextResponse.json({ error: "An active administrator role is required." }, { status: 403 });
    }

    const targetUser = await auth.getUserByEmail(email);
    if (!targetUser.emailVerified || normalizeEmail(targetUser.email ?? "") !== email) {
      return NextResponse.json({ error: "The target account must already exist and have a verified matching institutional email." }, { status: 409 });
    }
    if (targetUser.uid === actor.uid) {
      return NextResponse.json({ error: "Administrators cannot change their own staff role through this endpoint." }, { status: 409 });
    }

    const targetRef = db.collection("staff").doc(targetUser.uid);
    const admins = await db.collection("staff").where("role", "==", "admin").where("active", "==", true).get();
    const existingTarget = await targetRef.get();
    const removesActiveAdmin = existingTarget.exists && existingTarget.get("role") === "admin" &&
      existingTarget.get("active") === true && (body.role !== "admin" || body.active !== true);
    if (removesActiveAdmin && admins.size <= 1) {
      return NextResponse.json({ error: "The last active administrator cannot be demoted or deactivated." }, { status: 409 });
    }

    await db.runTransaction(async (transaction) => {
      const current = await transaction.get(targetRef);
      transaction.set(targetRef, {
        uid: targetUser.uid,
        email,
        role: body.role,
        active: body.active,
        ...(current.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: actor.uid,
      }, { merge: true });
      transaction.create(db.collection("auditEvents").doc(), {
        action: "staff.provisioned",
        actorUid: actor.uid,
        targetUid: targetUser.uid,
        role: body.role,
        active: body.active,
        createdAt: FieldValue.serverTimestamp(),
      });
    });

    return NextResponse.json({ ok: true, uid: targetUser.uid, role: body.role, active: body.active });
  } catch {
    return NextResponse.json({ error: "Staff provisioning failed. Verify the target account and retry." }, { status: 409 });
  }
}
