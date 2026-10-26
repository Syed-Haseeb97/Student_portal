import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, randomUUID } from "node:crypto";

// Set synthetic emulator configuration before importing route handlers.
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
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.GCLOUD_PROJECT = projectId;

test("admin academic import and completed-session correction routes enforce auth and audit writes", async () => {
  const [{ getFirebaseAdmin }, academicRoute, correctionRoute, dashboardRoute] = await Promise.all([
    import("../lib/firebase/admin"),
    import("../app/api/admin/academic-data/route"),
    import("../app/api/admin/attendance/[attendanceId]/correction/route"),
    import("../app/api/student/dashboard/route"),
  ]);
  const { auth, db } = getFirebaseAdmin();
  const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
  const adminUid = `admin${suffix}`;
  const studentUid = `student${suffix}`;
  const adminEmail = `admin${suffix}@iiitt.ac.in`;
  const studentEmail = `student${suffix}@iiitt.ac.in`;
  const rosterId = `roll${suffix}`;

  await auth.createUser({ uid: adminUid, email: adminEmail, emailVerified: true });
  await auth.createUser({ uid: studentUid, email: studentEmail, emailVerified: true });
  await db.collection("staff").doc(adminUid).set({ uid: adminUid, email: adminEmail, role: "admin", active: true });
  await db.collection("studentRoster").doc(rosterId).set({
    rollNumber: "AUTHORITATIVE-" + suffix,
    emailNormalized: studentEmail,
    batch: "2026",
    programme: "CSE",
    active: true,
  });
  // Deliberately stale cached fields: dashboard and import must trust the roster.
  await db.collection("userProfiles").doc(studentUid).set({
    uid: studentUid, email: studentEmail, role: "student", active: true, rosterId,
    rollNumber: "STALE-ROLL", batch: "2025", programme: "ECE",
  });

  async function idToken(uid: string) {
    const customToken = await auth.createCustomToken(uid);
    const response = await fetch(
      "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=demo-api-key",
      { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token: customToken, returnSecureToken: true }) },
    );
    const responseText = await response.text();
    assert.equal(response.ok, true, `Auth emulator token exchange failed: ${responseText}`);
    const payload = JSON.parse(responseText) as { idToken: string };
    return payload.idToken;
  }

  const adminToken = await idToken(adminUid);
  const studentToken = await idToken(studentUid);
  const request = (path: string, token: string | null, body: unknown) => new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  const courseId = `course${suffix}`;
  const importResponse = await academicRoute.POST(request("/api/admin/academic-data", adminToken, {
    kind: "courses", rows: [{ id: courseId, code: "CSE101", title: "Synthetic course", active: true }],
  }));
  assert.equal(importResponse.status, 200);
  assert.equal((await db.collection("courses").doc(courseId).get()).get("title"), "Synthetic course");

  const offeringId = `offering${suffix}`;
  await db.collection("courseOfferings").doc(offeringId).set({
    courseId, term: "2026-S1", batch: "2026", programme: "CSE", active: true,
  });
  const enrollmentImport = await academicRoute.POST(request("/api/admin/academic-data", adminToken, {
    kind: "enrollments", rows: [{ offeringId, studentUid, active: true }],
  }));
  assert.equal(enrollmentImport.status, 200);
  assert.equal((await db.collection("enrollments").doc(`${offeringId}_${studentUid}`).get()).get("rosterId"), rosterId);
  const dashboardResponse = await dashboardRoute.GET(new Request("http://localhost/api/student/dashboard", {
    headers: { authorization: `Bearer ${studentToken}` },
  }));
  assert.equal(dashboardResponse.status, 200);
  const dashboard = await dashboardResponse.json() as {
    student: { rollNumber: string | null; batch: string | null; programme: string | null };
    summaries: Array<{ offeringId: string; status: string; total: number }>;
  };
  assert.equal(dashboard.student.rollNumber, "AUTHORITATIVE-" + suffix);
  assert.equal(dashboard.student.batch, "2026");
  assert.equal(dashboard.student.programme, "CSE");
  assert.deepEqual(dashboard.summaries.find((summary) => summary.offeringId === offeringId), {
    offeringId, courseId, courseCode: "CSE101", courseTitle: "Synthetic course", term: "2026-S1",
    attended: 0, missed: 0, total: 0, percentage: null, status: "no_data",
    thresholdPercent: 75, latestSessionDate: null,
  });

  const forbiddenImport = await academicRoute.POST(request("/api/admin/academic-data", studentToken, {
    kind: "courses", rows: [{ id: `blocked${suffix}`, code: "BLOCKED", title: "Must not exist", active: true }],
  }));
  assert.equal(forbiddenImport.status, 403);
  assert.equal((await db.collection("courses").doc(`blocked${suffix}`).get()).exists, false);

  const missingDependencyId = `invalidOffering${suffix}`;
  const invalidDependency = await academicRoute.POST(request("/api/admin/academic-data", adminToken, {
    kind: "offerings",
    rows: [{ id: missingDependencyId, courseId: `missing${suffix}`, term: "2026-S1", batch: "2026", programme: "CSE", active: true }],
  }));
  assert.equal(invalidDependency.status, 409);
  assert.equal((await db.collection("courseOfferings").doc(missingDependencyId).get()).exists, false);

  const attendanceId = `attendance${suffix}`;
  const completedSessionId = `completed${suffix}`;
  await db.collection("sessions").doc(completedSessionId).set({ offeringId: courseId, state: "completed" });
  await db.collection("attendance").doc(attendanceId).set({
    sessionId: completedSessionId, offeringId: courseId, studentUid, mark: "present",
  });
  const correction = await correctionRoute.POST(
    request(`/api/admin/attendance/${attendanceId}/correction`, adminToken, { mark: "absent", reason: "Corrected after register review" }),
    { params: Promise.resolve({ attendanceId }) },
  );
  assert.equal(correction.status, 200);
  assert.equal((await db.collection("attendance").doc(attendanceId).get()).get("mark"), "absent");
  const audit = await db.collection("auditEvents").where("attendanceId", "==", attendanceId).get();
  assert.equal(audit.size, 1);
  assert.equal(audit.docs[0]?.get("previousMark"), "present");
  assert.equal(audit.docs[0]?.get("newMark"), "absent");
  assert.equal(audit.docs[0]?.get("reason"), "Corrected after register review");

  const scheduledId = `scheduled${suffix}`;
  const scheduledAttendanceId = `scheduledAttendance${suffix}`;
  await db.collection("sessions").doc(scheduledId).set({ offeringId: courseId, state: "scheduled" });
  await db.collection("attendance").doc(scheduledAttendanceId).set({
    sessionId: scheduledId, offeringId: courseId, studentUid, mark: "present",
  });
  const rejectScheduled = await correctionRoute.POST(
    request(`/api/admin/attendance/${scheduledAttendanceId}/correction`, adminToken, { mark: "absent", reason: "This should not be allowed" }),
    { params: Promise.resolve({ attendanceId: scheduledAttendanceId }) },
  );
  assert.equal(rejectScheduled.status, 409);
  assert.equal((await db.collection("attendance").doc(scheduledAttendanceId).get()).get("mark"), "present");

  const noToken = await academicRoute.POST(request("/api/admin/academic-data", null, {
    kind: "courses", rows: [{ id: `anonymous${suffix}`, code: "NOAUTH", title: "No auth", active: true }],
  }));
  assert.equal(noToken.status, 401);
});
