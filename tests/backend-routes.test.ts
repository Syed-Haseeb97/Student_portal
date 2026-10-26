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
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= "127.0.0.1:9099";
process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";
process.env.GCLOUD_PROJECT = projectId;

test("admin academic import and completed-session correction routes enforce auth and audit writes", async () => {
  const [{ getFirebaseAdmin }, academicRoute, correctionRoute, dashboardRoute, sessionRoute, attendanceRoute, cancelRoute, staffRoute, rosterImportRoute, rosterClaimRoute] = await Promise.all([
    import("../lib/firebase/admin"),
    import("../app/api/admin/academic-data/route"),
    import("../app/api/admin/attendance/[attendanceId]/correction/route"),
    import("../app/api/student/dashboard/route"),
    import("../app/api/sessions/route"),
    import("../app/api/sessions/[sessionId]/attendance/route"),
    import("../app/api/sessions/[sessionId]/cancel/route"),
    import("../app/api/admin/staff/route"),
    import("../app/api/admin/roster/import/route"),
    import("../app/api/roster/claim/route"),
  ]);
  const { auth, db } = getFirebaseAdmin();
  const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
  const adminUid = `admin${suffix}`;
  const studentUid = `student${suffix}`;
  const lecturerUid = `lecturer${suffix}`;
  const newStaffUid = `newstaff${suffix}`;
  const claimUid = `claim${suffix}`;
  const inactiveAdminUid = `inactiveadmin${suffix}`;
  const adminEmail = `admin${suffix}@iiitt.ac.in`;
  const inactiveAdminEmail = `inactiveadmin${suffix}@iiitt.ac.in`;
  const studentEmail = `student${suffix}@iiitt.ac.in`;
  const lecturerEmail = `lecturer${suffix}@iiitt.ac.in`;
  const newStaffEmail = `newstaff${suffix}@iiitt.ac.in`;
  const claimEmail = `claim${suffix}@iiitt.ac.in`;
  const claimRollNumber = `26${suffix}`.toUpperCase();
  const rosterId = `roll${suffix}`;

  await auth.createUser({ uid: adminUid, email: adminEmail, emailVerified: true });
  await auth.createUser({ uid: studentUid, email: studentEmail, emailVerified: true });
  await auth.createUser({ uid: lecturerUid, email: lecturerEmail, emailVerified: true });
  await auth.createUser({ uid: newStaffUid, email: newStaffEmail, emailVerified: true });
  await auth.createUser({ uid: claimUid, email: claimEmail, emailVerified: true });
  await auth.createUser({ uid: inactiveAdminUid, email: inactiveAdminEmail, emailVerified: true });
  await db.collection("staff").doc(adminUid).set({ uid: adminUid, email: adminEmail, role: "admin", active: true });
  await db.collection("staff").doc(inactiveAdminUid).set({ uid: inactiveAdminUid, email: inactiveAdminEmail, role: "admin", active: false });
  await db.collection("staff").doc(lecturerUid).set({ uid: lecturerUid, email: lecturerEmail, role: "lecturer", active: true });
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
      `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=demo-api-key`,
      { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token: customToken, returnSecureToken: true }) },
    );
    const responseText = await response.text();
    assert.equal(response.ok, true, `Auth emulator token exchange failed: ${responseText}`);
    const payload = JSON.parse(responseText) as { idToken: string };
    return payload.idToken;
  }

  const adminToken = await idToken(adminUid);
  const inactiveAdminToken = await idToken(inactiveAdminUid);
  const studentToken = await idToken(studentUid);
  const lecturerToken = await idToken(lecturerUid);
  const claimToken = await idToken(claimUid);
  const request = (path: string, token: string | null, body: unknown) => new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const rawRequest = (path: string, token: string | null, body: string, contentLength?: string) => new Request(`http://localhost${path}`, {
    method: "POST",
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      "content-type": "application/json",
      ...(contentLength === undefined ? {} : { "content-length": contentLength }),
    },
    body,
  });

  const oversizedBody = " ".repeat(1_000_001);
  const oversizedMutationResponses = await Promise.all([
    staffRoute.POST(rawRequest("/api/admin/staff", adminToken, oversizedBody)),
    sessionRoute.POST(rawRequest("/api/sessions", lecturerToken, oversizedBody)),
    attendanceRoute.POST(
      rawRequest("/api/sessions/test-session/attendance", lecturerToken, oversizedBody),
      { params: Promise.resolve({ sessionId: "test-session" }) },
    ),
    cancelRoute.POST(
      rawRequest("/api/sessions/test-session/cancel", lecturerToken, oversizedBody),
      { params: Promise.resolve({ sessionId: "test-session" }) },
    ),
    correctionRoute.POST(
      rawRequest("/api/admin/attendance/test-attendance/correction", adminToken, oversizedBody),
      { params: Promise.resolve({ attendanceId: "test-attendance" }) },
    ),
  ]);
  for (const response of oversizedMutationResponses) {
    assert.equal(response.status, 413);
    assert.deepEqual(await response.json(), { error: "Request body is too large." });
  }

  const malformedMutationResponses = await Promise.all([
    staffRoute.POST(rawRequest("/api/admin/staff", adminToken, "{")),
    sessionRoute.POST(rawRequest("/api/sessions", lecturerToken, "{")),
    attendanceRoute.POST(
      rawRequest("/api/sessions/test-session/attendance", lecturerToken, "{"),
      { params: Promise.resolve({ sessionId: "test-session" }) },
    ),
    cancelRoute.POST(
      rawRequest("/api/sessions/test-session/cancel", lecturerToken, "{"),
      { params: Promise.resolve({ sessionId: "test-session" }) },
    ),
    correctionRoute.POST(
      rawRequest("/api/admin/attendance/test-attendance/correction", adminToken, "{"),
      { params: Promise.resolve({ attendanceId: "test-attendance" }) },
    ),
  ]);
  for (const response of malformedMutationResponses) {
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "Request body must be valid JSON." });
  }

  const unauthorizedOversizedMutation = await staffRoute.POST(rawRequest(
    "/api/admin/staff", null, oversizedBody,
  ));
  assert.equal(unauthorizedOversizedMutation.status, 401);

  const oversizedWithoutLength = await rosterImportRoute.POST(rawRequest(
    "/api/admin/roster/import", adminToken, oversizedBody,
  ));
  assert.equal(oversizedWithoutLength.status, 413);
  assert.deepEqual(await oversizedWithoutLength.json(), { error: "Import payload is too large." });

  const understatedLength = await academicRoute.POST(rawRequest(
    "/api/admin/academic-data", adminToken, oversizedBody, "1",
  ));
  assert.equal(understatedLength.status, 413);
  assert.deepEqual(await understatedLength.json(), { error: "Import payload is too large." });

  const oversizedWithLength = await rosterImportRoute.POST(rawRequest(
    "/api/admin/roster/import", adminToken, oversizedBody, String(Buffer.byteLength(oversizedBody)),
  ));
  assert.equal(oversizedWithLength.status, 413);

  const unauthorizedOversized = await academicRoute.POST(rawRequest(
    "/api/admin/academic-data", null, oversizedBody,
  ));
  assert.equal(unauthorizedOversized.status, 401);

  const malformedRoster = await rosterImportRoute.POST(rawRequest(
    "/api/admin/roster/import", adminToken, "{",
  ));
  assert.equal(malformedRoster.status, 400);
  assert.deepEqual(await malformedRoster.json(), { error: "Request body must be valid JSON." });

  const rosterImport = await rosterImportRoute.POST(request("/api/admin/roster/import", adminToken, {
    rows: [{ rollNumber: claimRollNumber, email: claimEmail, batch: "2026", programme: "CSE", active: true }],
  }));
  assert.equal(rosterImport.status, 200);
  assert.equal((await db.collection("studentRoster").doc(claimRollNumber).get()).get("emailNormalized"), claimEmail);
  assert.equal((await db.collection("auditEvents").where("action", "==", "roster.imported").get()).size, 1);

  const duplicateEmail = `duplicate${suffix}@iiitt.ac.in`;
  const duplicateRosterImport = await rosterImportRoute.POST(request("/api/admin/roster/import", adminToken, {
    rows: [
      { rollNumber: `dupA${suffix}`, email: duplicateEmail, batch: "2026", programme: "CSE", active: true },
      { rollNumber: `dupB${suffix}`, email: duplicateEmail, batch: "2026", programme: "CSE", active: true },
    ],
  }));
  assert.equal(duplicateRosterImport.status, 400);
  assert.equal((await db.collection("studentRoster").doc(`dupA${suffix}`).get()).exists, false);
  assert.equal((await db.collection("studentRoster").doc(`dupB${suffix}`).get()).exists, false);

  const claimResponse = await rosterClaimRoute.POST(request("/api/roster/claim", claimToken, {}));
  assert.equal(claimResponse.status, 200);
  assert.equal((await db.collection("userProfiles").doc(claimUid).get()).get("rosterId"), claimRollNumber);

  const courseId = `course${suffix}`;
  const importResponse = await academicRoute.POST(request("/api/admin/academic-data", adminToken, {
    kind: "courses", rows: [{ id: courseId, code: "CSE101", title: "Synthetic course", active: true }],
  }));
  assert.equal(importResponse.status, 200);
  assert.equal((await db.collection("courses").doc(courseId).get()).get("title"), "Synthetic course");

  const inactiveActorImport = await academicRoute.POST(request("/api/admin/academic-data", inactiveAdminToken, {
    kind: "courses", rows: [{ id: `inactiveBlocked${suffix}`, code: "INACTIVE", title: "Must not exist", active: true }],
  }));
  assert.equal(inactiveActorImport.status, 403);
  assert.equal((await db.collection("courses").doc(`inactiveBlocked${suffix}`).get()).exists, false);

  const malformedImport = await academicRoute.POST(new Request("http://localhost/api/admin/academic-data", {
    method: "POST",
    headers: { authorization: `Bearer ${adminToken}`, "content-type": "application/json" },
    body: "{",
  }));
  assert.equal(malformedImport.status, 400);
  assert.deepEqual(await malformedImport.json(), { error: "Request body must be valid JSON." });

  const offeringId = `offering${suffix}`;
  const offeringImport = await academicRoute.POST(request("/api/admin/academic-data", adminToken, {
    kind: "offerings", rows: [{ id: offeringId, courseId, term: "2026-S1", batch: "2026", programme: "CSE", active: true }],
  }));
  assert.equal(offeringImport.status, 200);
  assert.equal((await db.collection("courseOfferings").doc(offeringId).get()).get("courseId"), courseId);
  const enrollmentImport = await academicRoute.POST(request("/api/admin/academic-data", adminToken, {
    kind: "enrollments", rows: [{ offeringId, studentUid, active: true }],
  }));
  assert.equal(enrollmentImport.status, 200);
  assert.equal((await db.collection("enrollments").doc(`${offeringId}_${studentUid}`).get()).get("rosterId"), rosterId);

  const assignmentImport = await academicRoute.POST(request("/api/admin/academic-data", adminToken, {
    kind: "assignments", rows: [{ offeringId, lecturerUid, active: true }],
  }));
  assert.equal(assignmentImport.status, 200);

  const provisionStaff = await staffRoute.POST(request("/api/admin/staff", adminToken, {
    email: newStaffEmail, role: "lecturer", active: true,
  }));
  assert.equal(provisionStaff.status, 200);
  assert.equal((await db.collection("staff").doc(newStaffUid).get()).get("role"), "lecturer");
  assert.equal((await db.collection("auditEvents").where("targetUid", "==", newStaffUid).get()).size, 1);

  const shortfallOfferingId = `shortfallOffering${suffix}`;
  const shortfallOfferingImport = await academicRoute.POST(request("/api/admin/academic-data", adminToken, {
    kind: "offerings", rows: [{ id: shortfallOfferingId, courseId, term: "2026-S1", batch: "2026", programme: "CSE", active: true }],
  }));
  assert.equal(shortfallOfferingImport.status, 200);
  const shortfallEnrollmentImport = await academicRoute.POST(request("/api/admin/academic-data", adminToken, {
    kind: "enrollments", rows: [{ offeringId: shortfallOfferingId, studentUid, active: true }],
  }));
  assert.equal(shortfallEnrollmentImport.status, 200);

  const retiredOfferingId = `retiredOffering${suffix}`;
  const retiredOfferingImport = await academicRoute.POST(request("/api/admin/academic-data", adminToken, {
    kind: "offerings", rows: [{ id: retiredOfferingId, courseId, term: "2025-S2", batch: "2026", programme: "CSE", active: true }],
  }));
  assert.equal(retiredOfferingImport.status, 200);
  const retiredEnrollmentImport = await academicRoute.POST(request("/api/admin/academic-data", adminToken, {
    kind: "enrollments", rows: [{ offeringId: retiredOfferingId, studentUid, active: true }],
  }));
  assert.equal(retiredEnrollmentImport.status, 200);
  const deactivateRetiredOffering = await academicRoute.POST(request("/api/admin/academic-data", adminToken, {
    kind: "offerings", rows: [{ id: retiredOfferingId, courseId, term: "2025-S2", batch: "2026", programme: "CSE", active: false }],
  }));
  assert.equal(deactivateRetiredOffering.status, 200);

  const dashboardSessionId = `dashboardSession${suffix}`;
  await db.collection("sessions").doc(dashboardSessionId).set({
    offeringId: shortfallOfferingId, state: "completed", sessionDate: "2026-10-26",
  });
  await db.collection("attendance").doc(`${dashboardSessionId}_${studentUid}`).set({
    sessionId: dashboardSessionId, offeringId: shortfallOfferingId, sessionDate: "2026-10-26",
    studentUid, mark: "absent",
  });
  // Historical marks without an active enrollment must not recreate an offering.
  await db.collection("attendance").doc(`orphanSession${suffix}_${studentUid}`).set({
    sessionId: `orphanSession${suffix}`, offeringId: `inactiveOffering${suffix}`,
    sessionDate: "2026-09-01", studentUid, mark: "present",
  });
  // Inconsistent legacy data must not count marks from sessions that were never completed.
  const scheduledLegacySessionId = `scheduledLegacy${suffix}`;
  await db.collection("sessions").doc(scheduledLegacySessionId).set({
    offeringId: shortfallOfferingId, state: "scheduled", sessionDate: "2026-10-25",
  });
  await db.collection("attendance").doc(`${scheduledLegacySessionId}_${studentUid}`).set({
    sessionId: scheduledLegacySessionId, offeringId: shortfallOfferingId,
    sessionDate: "2026-10-25", studentUid, mark: "present",
  });

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

  assert.deepEqual(dashboard.summaries.find((summary) => summary.offeringId === shortfallOfferingId), {
    offeringId: shortfallOfferingId, courseId, courseCode: "CSE101", courseTitle: "Synthetic course", term: "2026-S1",
    attended: 0, missed: 1, total: 1, percentage: 0, status: "shortfall",
    thresholdPercent: 75, latestSessionDate: "2026-10-26",
  });
  assert.equal(dashboard.summaries.some((summary) => summary.offeringId === `inactiveOffering${suffix}`), false);
  assert.equal(dashboard.summaries.some((summary) => summary.offeringId === retiredOfferingId), false);

  const forbiddenImport = await academicRoute.POST(request("/api/admin/academic-data", studentToken, {
    kind: "courses", rows: [{ id: `blocked${suffix}`, code: "BLOCKED", title: "Must not exist", active: true }],
  }));
  assert.equal(forbiddenImport.status, 403);
  assert.equal((await db.collection("courses").doc(`blocked${suffix}`).get()).exists, false);

  const ambiguousOfferingId = `invalid_offering${suffix}`;
  const ambiguousOffering = await academicRoute.POST(request("/api/admin/academic-data", adminToken, {
    kind: "offerings",
    rows: [{ id: ambiguousOfferingId, courseId, term: "2026-S1", batch: "2026", programme: "CSE", active: true }],
  }));
  assert.equal(ambiguousOffering.status, 400);
  assert.equal((await db.collection("courseOfferings").doc(ambiguousOfferingId).get()).exists, false);

  const missingDependencyId = `invalidOffering${suffix}`;
  const invalidDependency = await academicRoute.POST(request("/api/admin/academic-data", adminToken, {
    kind: "offerings",
    rows: [{ id: missingDependencyId, courseId: `missing${suffix}`, term: "2026-S1", batch: "2026", programme: "CSE", active: true }],
  }));
  assert.equal(invalidDependency.status, 409);
  assert.equal((await db.collection("courseOfferings").doc(missingDependencyId).get()).exists, false);

  const ambiguousSession = await sessionRoute.POST(request("/api/sessions", lecturerToken, {
    offeringId: "ambiguous_offering", sessionDate: "2026-10-27",
  }));
  assert.equal(ambiguousSession.status, 400);

  const createSession = await sessionRoute.POST(request("/api/sessions", lecturerToken, {
    offeringId, sessionDate: "2026-10-27", startTime: "09:00", endTime: "10:00", room: "Synthetic Room",
  }));
  assert.equal(createSession.status, 201);
  const createdSession = await createSession.json() as { sessionId: string; state: string };
  assert.equal(createdSession.state, "scheduled");

  const submitAttendance = await attendanceRoute.POST(
    request(`/api/sessions/${createdSession.sessionId}/attendance`, lecturerToken, {
      marks: [{ studentUid, mark: "present" }],
    }),
    { params: Promise.resolve({ sessionId: createdSession.sessionId }) },
  );
  assert.equal(submitAttendance.status, 200);
  assert.equal((await db.collection("sessions").doc(createdSession.sessionId).get()).get("state"), "completed");

  const repeatAttendance = await attendanceRoute.POST(
    request(`/api/sessions/${createdSession.sessionId}/attendance`, lecturerToken, {
      marks: [{ studentUid, mark: "absent" }],
    }),
    { params: Promise.resolve({ sessionId: createdSession.sessionId }) },
  );
  assert.equal(repeatAttendance.status, 409);
  assert.equal((await db.collection("attendance").doc(`${createdSession.sessionId}_${studentUid}`).get()).get("mark"), "present");

  const attendanceId = `${createdSession.sessionId}_${studentUid}`;
  const deniedCorrection = await correctionRoute.POST(
    request(`/api/admin/attendance/${attendanceId}/correction`, studentToken, { mark: "absent", reason: "Student cannot correct" }),
    { params: Promise.resolve({ attendanceId }) },
  );
  assert.equal(deniedCorrection.status, 403);
  assert.equal((await db.collection("attendance").doc(attendanceId).get()).get("mark"), "present");

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

  const createForCancellation = await sessionRoute.POST(request("/api/sessions", lecturerToken, {
    offeringId, sessionDate: "2026-10-28",
  }));
  assert.equal(createForCancellation.status, 201);
  const cancellationSession = await createForCancellation.json() as { sessionId: string };
  const cancelResponse = await cancelRoute.POST(
    request(`/api/sessions/${cancellationSession.sessionId}/cancel`, lecturerToken, { reason: "Class cancelled for synthetic test" }),
    { params: Promise.resolve({ sessionId: cancellationSession.sessionId }) },
  );
  assert.equal(cancelResponse.status, 200);
  assert.equal((await db.collection("sessions").doc(cancellationSession.sessionId).get()).get("state"), "cancelled");

  const attendanceAfterCancellation = await attendanceRoute.POST(
    request(`/api/sessions/${cancellationSession.sessionId}/attendance`, lecturerToken, {
      marks: [{ studentUid, mark: "present" }],
    }),
    { params: Promise.resolve({ sessionId: cancellationSession.sessionId }) },
  );
  assert.equal(attendanceAfterCancellation.status, 409);
  assert.equal((await db.collection("attendance").doc(`${cancellationSession.sessionId}_${studentUid}`).get()).exists, false);
  assert.equal((await db.collection("auditEvents").where("sessionId", "==", cancellationSession.sessionId).get()).size, 2);

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
