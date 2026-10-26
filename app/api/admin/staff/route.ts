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
    if (actor.email_verified !== true || !INSTITUTIONAL_EMAIL_PATTERN.test(normalizeEmail(actor.email ?? ""))) {
      return NextResponse.json({ error: "A verified institutional administrator account is required." }, { status: 403 });
    }
    const actorRef = db.collection("staff").doc(actor.uid);
    const targetRef = db.collection("staff").doc(targetUser.uid);

    await db.runTransaction(async (transaction) => {
      // Recheck the actor, target, and active-admin set inside the transaction.
      // This prevents a concurrent request from removing the last active admin.
      const [currentActor, currentTarget, activeAdmins] = await Promise.all([
        transaction.get(actorRef),
        transaction.get(targetRef),
        transaction.get(db.collection("staff").where("role", "==", "admin").where("active", "==", true)),
      ]);
      if (!currentActor.exists || currentActor.get("role") !== "admin" || currentActor.get("active") !== true) {
        throw new Error("NOT_ADMIN");
      }

      const removesActiveAdmin = currentTarget.exists && currentTarget.get("role") === "admin" &&
        currentTarget.get("active") === true && (body.role !== "admin" || body.active !== true);
      if (removesActiveAdmin && activeAdmins.size <= 1) throw new Error("LAST_ACTIVE_ADMIN");

      transaction.set(targetRef, {
        uid: targetUser.uid,
        email,
        role: body.role,
        active: body.active,
        ...(currentTarget.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
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
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "NOT_ADMIN") return NextResponse.json({ error: "An active administrator role is required." }, { status: 403 });
    if (code === "LAST_ACTIVE_ADMIN") return NextResponse.json({ error: "The last active administrator cannot be demoted or deactivated." }, { status: 409 });
    if (code.includes("Firebase ID token")) return NextResponse.json({ error: "Your sign-in session expired. Sign in again." }, { status: 401 });
    return NextResponse.json({ error: "Staff provisioning failed. Verify the target account and retry." }, { status: 409 });
  }
}
