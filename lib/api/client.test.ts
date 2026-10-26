import test from "node:test";
import assert from "node:assert/strict";
import { getStudentDashboard, isMockModeEnabled } from "./client";
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
    assert.ok(c.percentage >= 75, `${c.courseCode} percentage (${c.percentage}) must be >= 75`);
  }
  for (const s of shortfall) {
    assert.ok(s.percentage < 75, `${s.courseCode} percentage (${s.percentage}) must be < 75`);
  }
  for (const nd of noData) {
    assert.equal(nd.total, 0, "No-data course must have 0 total sessions");
  }
});

test("API client: real mode denies missing token without silent fallback to mock", async () => {
  // Temporarily force mock mode off
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
