import test from "node:test";
import assert from "node:assert/strict";
import { getStudentDashboard, isMockModeEnabled } from "./client";
import { normalizeAttendanceStatus } from "./types";
import { SYNTHETIC_STUDENT } from "./mock-data";

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
