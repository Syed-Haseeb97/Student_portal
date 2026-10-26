import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluate, formatPercent, summarizeByCourse, coursesBelowThreshold, type SessionAttendance } from "./calc";
const row = (sessionId: string, offeringId: string, mark: "present" | "absent" | null, sessionState: SessionAttendance["sessionState"] = "completed"): SessionAttendance => ({ sessionId, offeringId, mark, sessionState });

test("attendance is calculated independently per subject", () => {
  const records = [
    ...Array.from({ length: 9 }, (_, i) => row(`m${i}`, "MATH", "present")), row("m9", "MATH", "absent"),
    ...Array.from({ length: 7 }, (_, i) => row(`p${i}`, "PHYS", "present")),
    row("p7", "PHYS", "absent"), row("p8", "PHYS", "absent"), row("p9", "PHYS", "absent")
  ];
  const result = Object.fromEntries(summarizeByCourse(records).map((item) => [item.offeringId, item]));
  assert.equal(result.MATH?.percentage, 90);
  assert.equal(result.PHYS?.percentage, 70);
  assert.deepEqual(coursesBelowThreshold(Object.values(result)).map((item) => item.offeringId), ["PHYS"]);
});
test("exactly 75% is compliant and below 75% is not", () => {
  assert.equal(evaluate(3, 4).status, "compliant");
  assert.equal(evaluate(74, 100).status, "below_threshold");
});
test("scheduled and cancelled sessions do not count", () => {
  const result = summarizeByCourse([row("done", "MATH", "present"), row("cancelled", "MATH", "absent", "cancelled"), row("future", "MATH", null, "scheduled")])[0];
  assert.equal(result?.total, 1); assert.equal(result?.percentage, 100);
});
test("unrecorded completed marks are not treated as present or absent", () => {
  const result = summarizeByCourse([row("a", "MATH", "present"), row("b", "MATH", null)])[0];
  assert.equal(result?.attended, 1); assert.equal(result?.unrecorded, 1); assert.equal(result?.total, 1);
});
test("duplicate session IDs are rejected", () => {
  const record = row("same", "MATH", "present");
  assert.throws(() => summarizeByCourse([record, { ...record, mark: "absent" }]), /Duplicate record/);
});
test("display helper never rounds a failing 74.96% up to 75.0%", () => {
  assert.equal(formatPercent(74.96), "74.9%"); assert.equal(formatPercent(75), "75.0%"); assert.equal(formatPercent(null), "—");
});


test("two sessions of one offering on the same date count separately", () => {
  const sameDay = [
    { ...row("morning", "CSE101", "present"), sessionDate: "2026-10-26" },
    { ...row("afternoon", "CSE101", "absent"), sessionDate: "2026-10-26" },
  ];
  const result = summarizeByCourse(sameDay)[0];
  assert.equal(result?.attended, 1);
  assert.equal(result?.missed, 1);
  assert.equal(result?.total, 2);
  assert.equal(result?.percentage, 50);
});

test("an offering with no completed sessions has no_data", () => {
  const result = summarizeByCourse([
    row("future", "CSE101", null, "scheduled"),
    row("cancelled", "CSE101", "absent", "cancelled"),
  ])[0];
  assert.equal(result?.status, "no_data");
  assert.equal(result?.percentage, null);
  assert.equal(result?.total, 0);
});

test("attendance policy and counts reject invalid values", () => {
  assert.equal(evaluate(7, 10, { thresholdPercent: 65, eligibleStates: ["completed"] }).status, "compliant");
  assert.throws(() => evaluate(1, 1, { thresholdPercent: 101, eligibleStates: ["completed"] }), RangeError);
  assert.throws(() => evaluate(2, 1), RangeError);
  assert.throws(() => evaluate(-1, 2), RangeError);
});
