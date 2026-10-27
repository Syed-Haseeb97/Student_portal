import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, randomUUID } from "node:crypto";

const projectId = "demo-iiitt-portal";
const { privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});
process.env.FIREBASE_ADMIN_PROJECT_ID = projectId;
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = projectId;
process.env.FIREBASE_SERVICE_ACCOUNT_JSON = JSON.stringify({
  project_id: projectId,
  client_email: "synthetic-admin@demo-iiitt-portal.iam.gserviceaccount.com",
  private_key: privateKey,
});
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= "127.0.0.1:9099";
process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8085";
process.env.GCLOUD_PROJECT = projectId;
process.env.NEXT_PUBLIC_ENABLE_MOCK_API = "false";

function emailHash(email: string) {
  return createHash("sha256").update(email).digest("hex");
}

function resolveRoleRedirect(role: string | null | undefined): string {
  if (role === "admin") return "/admin";
  if (role === "lecturer") return "/lecturer";
  if (role === "student") return "/dashboard";
  return "/sign-in";
}

test("end-to-end institutional auth flow against Auth + Firestore emulators", async () => {
  const [{ getFirebaseAdmin }, sendLinkRoute, rosterClaimRoute, meRoute] = await Promise.all([
    import("../lib/firebase/admin"),
    import("../app/api/auth/send-link/route"),
    import("../app/api/roster/claim/route"),
    import("../app/api/me/route"),
  ]);

  const { auth, db } = getFirebaseAdmin();
  const suffix = randomUUID().replaceAll("-", "").slice(0, 8);

  const rollNumber = `26${suffix}`.toUpperCase();
  const studentEmail = `student${suffix}@iiitt.ac.in`;
  const lecturerEmail = `lecturer${suffix}@iiitt.ac.in`;
  const adminEmail = `admin${suffix}@iiitt.ac.in`;

  const lecturerUid = `lecturer_${suffix}`;
  const adminUid = `admin_${suffix}`;

  // 1. Seed authoritative student roster and reverse index
  await db.collection("studentRoster").doc(rollNumber).set({
    rollNumber,
    emailNormalized: studentEmail,
    batch: "2026",
    programme: "Computer Science & Engineering",
    active: true,
  });
  await db.collection("rosterEmailIndex").doc(emailHash(studentEmail)).set({
    emailNormalized: studentEmail,
    rollNumber,
    active: true,
  });

  // 2. Seed provisioned staff records (lecturer and admin)
  await db.collection("staff").doc(lecturerUid).set({
    uid: lecturerUid,
    email: lecturerEmail,
    role: "lecturer",
    name: "Dr. Faculty",
    staffId: `FAC-${suffix}`,
    active: true,
  });
  await db.collection("staff").doc(adminUid).set({
    uid: adminUid,
    email: adminEmail,
    role: "admin",
    name: "Admin Officer",
    staffId: `ADM-${suffix}`,
    active: true,
  });

  // =========================================================================
  // STUDENT FLOW: send-link -> oob link -> sign-in -> roster claim -> me -> redirect
  // =========================================================================

  // Call POST /api/auth/send-link
  const sendLinkReq = new Request("http://localhost/api/auth/send-link", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: studentEmail }),
  });
  const sendLinkRes = await sendLinkRoute.POST(sendLinkReq);
  assert.equal(sendLinkRes.status, 200);
  const sendLinkData = await sendLinkRes.json();
  assert.equal(sendLinkData.ok, true);

  // Retrieve the generated action link from the Auth emulator's OOB codes endpoint
  const oobResponse = await fetch(
    `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/emulator/v1/projects/${projectId}/oobCodes`
  );
  assert.equal(oobResponse.ok, true);
  const oobData = (await oobResponse.json()) as {
    oobCodes: Array<{ email: string; oobCode: string; oobLink: string; requestType: string }>;
  };
  const studentOob = oobData.oobCodes.find(
    (c) => c.email === studentEmail && c.requestType === "EMAIL_SIGNIN"
  );
  assert.ok(studentOob, "Auth emulator did not record EMAIL_SIGNIN OOB code for student");

  // Complete sign-in using the emulator REST API with the oobCode
  const signInResponse = await fetch(
    `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithEmailLink?key=demo-key`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: studentEmail,
        oobCode: studentOob.oobCode,
      }),
    }
  );
  assert.equal(signInResponse.ok, true);
  const signInData = (await signInResponse.json()) as { idToken: string; localId: string };
  const studentToken = signInData.idToken;
  assert.ok(studentToken);

  // Call POST /api/roster/claim to attach roster entry to authenticated user
  const claimReq = new Request("http://localhost/api/roster/claim", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${studentToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });
  const claimRes = await rosterClaimRoute.POST(claimReq);
  assert.equal(claimRes.status, 200);
  const claimData = await claimRes.json();
  assert.equal(claimData.ok, true);
  assert.equal(claimData.role, "student");

  // Call GET /api/me to retrieve session identity
  const studentMeReq = new Request("http://localhost/api/me", {
    method: "GET",
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const studentMeRes = await meRoute.GET(studentMeReq);
  assert.equal(studentMeRes.status, 200);
  const studentMeData = await studentMeRes.json();
  assert.equal(studentMeData.role, "student");
  assert.equal(studentMeData.rollNumber, rollNumber);
  assert.equal(studentMeData.batch, "2026");
  assert.equal(resolveRoleRedirect(studentMeData.role), "/dashboard");

  // =========================================================================
  // LECTURER FLOW: auth -> verify /api/me -> confirm redirect to /lecturer
  // =========================================================================

  await auth.createUser({ uid: lecturerUid, email: lecturerEmail, emailVerified: true });
  const lecturerCustomToken = await auth.createCustomToken(lecturerUid);
  const lecturerTokenRes = await fetch(
    `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=demo-key`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: lecturerCustomToken, returnSecureToken: true }),
    }
  );
  const lecturerTokenData = (await lecturerTokenRes.json()) as { idToken: string };
  const lecturerToken = lecturerTokenData.idToken;

  const lecturerMeReq = new Request("http://localhost/api/me", {
    method: "GET",
    headers: { Authorization: `Bearer ${lecturerToken}` },
  });
  const lecturerMeRes = await meRoute.GET(lecturerMeReq);
  assert.equal(lecturerMeRes.status, 200);
  const lecturerMeData = await lecturerMeRes.json();
  assert.equal(lecturerMeData.role, "lecturer");
  assert.equal(lecturerMeData.email, lecturerEmail);
  assert.equal(resolveRoleRedirect(lecturerMeData.role), "/lecturer");

  // =========================================================================
  // ADMIN FLOW: auth -> verify /api/me -> confirm redirect to /admin
  // =========================================================================

  await auth.createUser({ uid: adminUid, email: adminEmail, emailVerified: true });
  const adminCustomToken = await auth.createCustomToken(adminUid);
  const adminTokenRes = await fetch(
    `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=demo-key`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: adminCustomToken, returnSecureToken: true }),
    }
  );
  const adminTokenData = (await adminTokenRes.json()) as { idToken: string };
  const adminToken = adminTokenData.idToken;

  const adminMeReq = new Request("http://localhost/api/me", {
    method: "GET",
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const adminMeRes = await meRoute.GET(adminMeReq);
  assert.equal(adminMeRes.status, 200);
  const adminMeData = await adminMeRes.json();
  assert.equal(adminMeData.role, "admin");
  assert.equal(adminMeData.email, adminEmail);
  assert.equal(resolveRoleRedirect(adminMeData.role), "/admin");
});
