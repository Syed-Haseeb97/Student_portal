import { test } from "node:test";
import assert from "node:assert/strict";
import {
  summarizeByCourse,
  coursesBelowThreshold,
  evaluate,
  formatPercent,
  type SessionAttendance,
  type AttendanceMark,
} from "../../lib/attendance/calc.ts";

let n = 0;
function sessions(
  courseId: string,
  marks: (AttendanceMark | null)[],
  extra: Partial<SessionAttendance> = {},
): SessionAttendance[] {
  return marks.map((mark) => ({
    sessionId: `s${++n}`,
    courseId,
    sessionState: "completed",
    mark,
    ...extra,
  }));
}
const rep = (m: AttendanceMark, k: number) => Array<AttendanceMark>(k).fill(m);

test("attendance is calculated independently per subject", () => {
  const records = [
    ...sessions("MATH", [...rep("present", 9), "absent"]), // 90%
    ...sessions("PHY", [...rep("present", 7), ...rep("absent", 3)]), // 70%
    ...sessions("PROG", [...rep("present", 9), ...rep("absent", 2)]), // 81.8%
  ];
  const by = Object.fromEntries(summarizeByCourse(records).map((s) => [s.courseId, s]));
  assert.equal(by.MATH?.percentage, 90);
  assert.equal(by.MATH?.status, "compliant");
  assert.equal(by.PHY?.percentage, 70);
  assert.equal(by.PHY?.status, "below_threshold");
  assert.equal(by.PROG?.attended, 9);
  assert.equal(by.PROG?.total, 11);
  assert.equal(by.PROG?.status, "compliant");
});

test("above 75% overall but below 75% in one subject is flagged for that subject", () => {
  const records = [
    ...sessions("MATH", rep("present", 10)),
    ...sessions("PHY", [...rep("present", 7), ...rep("absent", 3)]),
    ...sessions("PROG", [...rep("present", 9), "absent"]),
  ];
  const attended = records.filter((r) => r.mark === "present").length;
  assert.ok((attended / records.length) * 100 > 75, "overall is above 75%");

  const summaries = summarizeByCourse(records);
  const flagged = coursesBelowThreshold(summaries);
  assert.deepEqual(flagged.map((s) => s.courseId), ["PHY"]);
  assert.equal(summaries[0]?.courseId, "PHY", "below-threshold courses are listed first");
  for (const s of summaries) {
    assert.ok(!("overallPercentage" in s), "no overall figure is produced");
  }
});

test("two sessions of the same subject on the same day count separately", () => {
  const records = sessions("MATH", ["present", "absent"], { sessionDate: "2026-10-26" });
  assert.notEqual(records[0]?.sessionId, records[1]?.sessionId);
  const [m] = summarizeByCourse(records);
  assert.equal(m?.attended, 1);
  assert.equal(m?.missed, 1);
  assert.equal(m?.total, 2);
});

test("the same session cannot appear twice for one student", () => {
  const [r] = sessions("MATH", ["present"]);
  assert.ok(r);
  assert.throws(() => summarizeByCourse([r, { ...r, mark: "absent" }]), /Duplicate record/);
});

test("boundary: exactly 75% is compliant, just below is not", () => {
  assert.equal(evaluate(3, 4).status, "compliant");
  assert.equal(evaluate(74, 100).status, "below_threshold");
  assert.equal(evaluate(75, 100).status, "compliant");
});

test("threshold is configurable", () => {
  assert.equal(evaluate(7, 10, { thresholdPercent: 65, eligibleStates: ["completed"] }).status, "compliant");
  assert.throws(() => evaluate(1, 1, { thresholdPercent: 120, eligibleStates: ["completed"] }), RangeError);
});

test("cancelled and scheduled sessions are excluded by default", () => {
  const records: SessionAttendance[] = [
    ...sessions("MATH", ["present", "present"]),
    ...sessions("MATH", [null], { sessionState: "cancelled" }),
    ...sessions("MATH", [null], { sessionState: "scheduled" }),
  ];
  const [m] = summarizeByCourse(records);
  assert.equal(m?.total, 2);
  assert.equal(m?.unrecorded, 0);
  assert.equal(m?.percentage, 100);
});

test("completed session with no record is reported as unrecorded, not as attended", () => {
  const [m] = summarizeByCourse(sessions("MATH", ["present", null]));
  assert.equal(m?.attended, 1);
  assert.equal(m?.unrecorded, 1);
  assert.equal(m?.total, 1);
});

test("a course with no eligible sessions has no_data", () => {
  const [m] = summarizeByCourse(sessions("MATH", [null], { sessionState: "scheduled" }));
  assert.equal(m?.status, "no_data");
  assert.equal(m?.percentage, null);
});

test("formatPercent never rounds a failing value up to 75.0", () => {
  const { percentage, status } = evaluate(7496, 10000);
  assert.equal(status, "below_threshold");
  assert.equal(formatPercent(percentage), "74.9%");
  assert.equal(formatPercent(75), "75.0%");
  assert.equal(formatPercent(null), "—");
});

test("only COMPLETED sessions count: marks on cancelled or scheduled sessions are ignored", () => {
  const records: SessionAttendance[] = [
    ...sessions("MATH", ["present", "absent"]), // completed: 1 of 2
    ...sessions("MATH", ["absent", "absent"], { sessionState: "cancelled" }),
    ...sessions("MATH", ["absent"], { sessionState: "scheduled" }),
  ];
  const [m] = summarizeByCourse(records);
  assert.equal(m?.attended, 1);
  assert.equal(m?.missed, 1);
  assert.equal(m?.total, 2, "cancelled and scheduled sessions are not in the denominator");
  assert.equal(m?.percentage, 50);
});

test("a cancelled session cannot rescue or sink a subject", () => {
  // 3 of 4 completed = exactly 75%. Cancelled absences must not push it below.
  const records: SessionAttendance[] = [
    ...sessions("MATH", ["present", "present", "present", "absent"]),
    ...sessions("MATH", ["absent", "absent", "absent"], { sessionState: "cancelled" }),
  ];
  assert.equal(summarizeByCourse(records)[0]?.status, "compliant");
});
