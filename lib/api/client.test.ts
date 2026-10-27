import test from "node:test";
import assert from "node:assert/strict";
import {
  getStudentDashboard,
  getLecturerDashboard,
  getSessionDetails,
  createSession,
  submitAttendance,
  cancelSession,
  isMockModeEnabled,
  resetMockLecturerState,
} from "./client";
import { normalizeAttendanceStatus } from "./types";
import { SYNTHETIC_STUDENT, SYNTHETIC_STUDENT_ROSTER } from "./mock-data";

test("API client: mock mode is enabled by default in local dev without Firebase config", () => {
  assert.equal(isMockModeEnabled(), true);
});

test("API client: getStudentDashboard returns synthetic student payload with locked 75% policy in mock mode", async () => {
  const result = await getStudentDashboard();
  assert.equal(result.status, 200);
  assert.equal(result.isMock, true);
  assert.ok(result.data);
  assert.equal(result.data.policy.thresholdPercent, 75);
  assert.equal(result.data.policy.countsOnlyCompletedSessions, true);
  assert.equal(result.data.isSynthetic, true);
  assert.equal(result.data.student.rollNumber, "261161");
});

test("API client: mock summaries correctly reflect compliance and shortfall states", () => {
  const summaries = SYNTHETIC_STUDENT.summaries;
  const compliant = summaries.filter((s) => s.status === "compliant");
  const shortfall = summaries.filter((s) => s.status === "shortfall");
  const noData = summaries.filter((s) => s.status === "no_data");

  assert.equal(compliant.length, 3, "Expected 3 compliant courses");
  assert.equal(shortfall.length, 1, "Expected 1 shortfall course");
  assert.equal(noData.length, 1, "Expected 1 newly enrolled course with no completed sessions");

  // Check 75% threshold consistency
  for (const c of compliant) {
    assert.ok(c.percentage !== null && c.percentage >= 75, `${c.courseCode} percentage must be >= 75`);
  }
  for (const s of shortfall) {
    assert.ok(s.percentage !== null && s.percentage < 75, `${s.courseCode} percentage must be < 75`);
  }
  for (const nd of noData) {
    assert.equal(nd.total, 0, "No-data course must have 0 total sessions");
    assert.equal(nd.percentage, null, "No-data course percentage must be null");
  }
});

test("API client: supports testing mock states (empty, unauthorized, error)", async () => {
  const emptyRes = await getStudentDashboard(undefined, { mockScenario: "empty" });
  assert.equal(emptyRes.status, 200);
  assert.equal(emptyRes.data?.summaries.length, 0);

  const unauthRes = await getStudentDashboard(undefined, { mockScenario: "unauthorized" });
  assert.equal(unauthRes.status, 403);
  assert.ok(unauthRes.error?.includes("approved student roster"));

  const errorRes = await getStudentDashboard(undefined, { mockScenario: "error" });
  assert.equal(errorRes.status, 503);
  assert.ok(errorRes.error?.includes("Unable to load"));
});

test("API client: status normalizer handles backend below_threshold alias safely", () => {
  assert.equal(normalizeAttendanceStatus("below_threshold"), "shortfall");
  assert.equal(normalizeAttendanceStatus("shortfall"), "shortfall");
  assert.equal(normalizeAttendanceStatus("compliant"), "compliant");
  assert.equal(normalizeAttendanceStatus("no_data"), "no_data");
  assert.equal(normalizeAttendanceStatus(null), "no_data");
});

test("API client: real mode denies missing token without silent fallback to mock", async () => {
  const originalEnv = process.env.NEXT_PUBLIC_ENABLE_MOCK_API;
  process.env.NEXT_PUBLIC_ENABLE_MOCK_API = "false";

  try {
    const result = await getStudentDashboard(); // no token provided
    assert.equal(result.status, 401);
    assert.equal(result.isMock, false);
    assert.ok(result.error?.includes("Authentication required"));
    assert.equal(result.data, undefined, "Must not return synthetic data when real mode fails");
  } finally {
    process.env.NEXT_PUBLIC_ENABLE_MOCK_API = originalEnv;
  }
});

test("API client: validates the real dashboard contract and normalizes the legacy status alias", async () => {
  const originalEnv = process.env.NEXT_PUBLIC_ENABLE_MOCK_API;
  const originalFetch = globalThis.fetch;
  process.env.NEXT_PUBLIC_ENABLE_MOCK_API = "false";
  globalThis.fetch = async () => new Response(JSON.stringify({
    student: { uid: "synthetic-student", rollNumber: null, batch: null, programme: null },
    policy: { thresholdPercent: 75, countsOnlyCompletedSessions: true },
    summaries: [{
      offeringId: "synthetic-offering", courseId: null, courseCode: null, courseTitle: "Synthetic course", term: null,
      attended: 2, missed: 2, total: 4, percentage: 50, status: "below_threshold",
      thresholdPercent: 75, latestSessionDate: null,
    }],
    generatedAt: new Date().toISOString(),
  }), { headers: { "content-type": "application/json" } });

  try {
    const result = await getStudentDashboard("synthetic-token");
    assert.equal(result.status, 200);
    assert.equal(result.isMock, false);
    assert.equal(result.data?.student.rollNumber, null);
    assert.equal(result.data?.summaries[0]?.courseId, null);
    assert.equal(result.data?.summaries[0]?.status, "shortfall");
  } finally {
    globalThis.fetch = originalFetch;
    process.env.NEXT_PUBLIC_ENABLE_MOCK_API = originalEnv;
  }
});

test("API client: rejects unknown attendance statuses instead of hiding them as no_data", async () => {
  const originalEnv = process.env.NEXT_PUBLIC_ENABLE_MOCK_API;
  const originalFetch = globalThis.fetch;
  process.env.NEXT_PUBLIC_ENABLE_MOCK_API = "false";
  globalThis.fetch = async () => new Response(JSON.stringify({
    student: { uid: "synthetic-student", rollNumber: "261161", batch: "2026", programme: "CSE" },
    policy: { thresholdPercent: 75, countsOnlyCompletedSessions: true },
    summaries: [{
      offeringId: "synthetic-offering", courseId: "synthetic-course", courseCode: "CSE101", courseTitle: "Synthetic course", term: "2026-S1",
      attended: 0, missed: 1, total: 1, percentage: 0, status: "attending",
      thresholdPercent: 75, latestSessionDate: "2026-10-26",
    }],
    generatedAt: new Date().toISOString(),
  }), { headers: { "content-type": "application/json" } });

  try {
    const result = await getStudentDashboard("synthetic-token");
    assert.equal(result.status, 502);
    assert.equal(result.data, undefined);
    assert.equal(result.error, "Malformed dashboard response: fields do not match the attendance API contract.");
  } finally {
    globalThis.fetch = originalFetch;
    process.env.NEXT_PUBLIC_ENABLE_MOCK_API = originalEnv;
  }
});

// --- Lecturer API Client Tests ---

test("API client: getLecturerDashboard returns faculty identity, offerings, and sessions in mock mode", async () => {
  resetMockLecturerState();
  const result = await getLecturerDashboard();
  assert.equal(result.status, 200);
  assert.equal(result.isMock, true);
  assert.ok(result.data);
  assert.equal(result.data.lecturer.role, "lecturer");
  assert.equal(result.data.lecturer.employeeId, "FAC-01");
  assert.ok(result.data.offerings.length >= 2, "Expected at least 2 assigned offerings");
  assert.ok(result.data.sessions.length >= 2, "Expected sessions to be present");

  const offering = result.data.offerings[0];
  assert.ok(offering.courseCode);
  assert.ok(offering.courseTitle);
  assert.ok(offering.enrolledCount > 0);
});

test("API client: getSessionDetails returns session metadata and roster in mock mode", async () => {
  resetMockLecturerState();
  const result = await getSessionDetails("sess-104");
  assert.equal(result.status, 200);
  assert.equal(result.isMock, true);
  assert.ok(result.data);
  assert.equal(result.data.session.id, "sess-104");
  assert.equal(result.data.session.state, "scheduled");
  assert.ok(result.data.roster.length > 0, "Roster must contain enrolled students");
  assert.equal(result.data.roster[0].rollNumber, "261101");
});

test("API client: createSession adds a new scheduled session in mock mode", async () => {
  resetMockLecturerState();
  const createRes = await createSession({
    offeringId: "cs201-2026s1",
    sessionDate: "2026-10-30",
    startTime: "11:00",
    endTime: "12:00",
    room: "LH-103",
  });

  assert.equal(createRes.status, 201);
  assert.ok(createRes.data);
  assert.ok(createRes.data.sessionId);
  assert.equal(createRes.data.state, "scheduled");

  // Verify it appears in dashboard
  const dashRes = await getLecturerDashboard();
  const created = dashRes.data?.sessions.find((s) => s.id === createRes.data?.sessionId);
  assert.ok(created, "Created session must appear in dashboard sessions list");
  assert.equal(created?.sessionDate, "2026-10-30");
});

test("API client: submitAttendance records attendance and marks session completed in mock mode", async () => {
  resetMockLecturerState();
  const createRes = await createSession({
    offeringId: "cs201-2026s1",
    sessionDate: "2026-10-31",
    startTime: "14:00",
    endTime: "15:00",
    room: "LH-101",
  });
  assert.ok(createRes.data?.sessionId);
  const sessionId = createRes.data.sessionId;

  // Incomplete submission (missing students)
  const incompleteRes = await submitAttendance(sessionId, {
    marks: [{ studentUid: SYNTHETIC_STUDENT_ROSTER[0].studentUid, mark: "present" }],
  });
  assert.equal(incompleteRes.status, 400);
  assert.ok(incompleteRes.error?.includes("must include attendance marks for all enrolled students"));

  // Complete submission for all students
  const fullMarks = SYNTHETIC_STUDENT_ROSTER.map((s, idx) => ({
    studentUid: s.studentUid,
    mark: idx === 0 ? ("absent" as const) : ("present" as const),
  }));

  const completeRes = await submitAttendance(sessionId, { marks: fullMarks });
  assert.equal(completeRes.status, 200);
  assert.ok(completeRes.data);
  assert.equal(completeRes.data.state, "completed");
  assert.equal(completeRes.data.recorded, fullMarks.length);

  // Subsequent submission rejected
  const duplicateRes = await submitAttendance(sessionId, { marks: fullMarks });
  assert.equal(duplicateRes.status, 400);
  assert.ok(duplicateRes.error?.includes("already completed"));
});

test("API client: cancelSession cancels a scheduled session with audited reason in mock mode", async () => {
  resetMockLecturerState();
  const createRes = await createSession({
    offeringId: "cs202-2026s1",
    sessionDate: "2026-11-01",
    startTime: "10:00",
    endTime: "11:00",
    room: "LH-102",
  });
  assert.ok(createRes.data?.sessionId);
  const sessionId = createRes.data.sessionId;

  // Short reason rejected
  const shortReasonRes = await cancelSession(sessionId, { reason: "bad" });
  assert.equal(shortReasonRes.status, 400);
  assert.ok(shortReasonRes.error?.includes("between 5 and 300 characters"));

  // Valid cancellation
  const cancelRes = await cancelSession(sessionId, {
    reason: "Institute guest lecture on VLSI architecture scheduled.",
  });
  assert.equal(cancelRes.status, 200);
  assert.ok(cancelRes.data);
  assert.equal(cancelRes.data.state, "cancelled");

  // Check detail retrieval reflects cancellation
  const detailRes = await getSessionDetails(sessionId);
  assert.equal(detailRes.data?.session.state, "cancelled");
  assert.equal(
    detailRes.data?.session.cancellationReason,
    "Institute guest lecture on VLSI architecture scheduled."
  );
});

test("API client: lecturer endpoints deny requests without token when mock mode is disabled", async () => {
  const originalEnv = process.env.NEXT_PUBLIC_ENABLE_MOCK_API;
  process.env.NEXT_PUBLIC_ENABLE_MOCK_API = "false";

  try {
    const dashRes = await getLecturerDashboard();
    assert.equal(dashRes.status, 401);
    assert.equal(dashRes.isMock, false);
    assert.ok(dashRes.error?.includes("Authentication required"));

    const detailRes = await getSessionDetails("sess-104");
    assert.equal(detailRes.status, 401);
    assert.equal(detailRes.isMock, false);
    assert.ok(detailRes.error?.includes("Authentication required"));

    const createRes = await createSession({
      offeringId: "test",
      sessionDate: "2026-10-30",
    });
    assert.equal(createRes.status, 401);
    assert.equal(createRes.isMock, false);

    const submitRes = await submitAttendance("sess-104", { marks: [] });
    assert.equal(submitRes.status, 401);
    assert.equal(submitRes.isMock, false);

    const cancelRes = await cancelSession("sess-104", { reason: "Reason test" });
    assert.equal(cancelRes.status, 401);
    assert.equal(cancelRes.isMock, false);
  } finally {
    process.env.NEXT_PUBLIC_ENABLE_MOCK_API = originalEnv;
  }
});
