import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveUpcomingSchedule,
  inferLabBatchFromRoll,
} from "./schedule-resolver";

test("Schedule Resolver: Monday 17:05 (day complete) correctly identifies Tuesday's first class", () => {
  // Monday Nov 2, 2026 at 17:05:51 IST (user's exact situation)
  const mondayEvening = new Date("2026-11-02T17:05:51+05:30");

  const result = resolveUpcomingSchedule("11", "all", mondayEvening);

  assert.equal(result.isWeekend, false);
  assert.equal(result.isDayComplete, true);
  assert.equal(result.ongoingSession, null);

  // All 7 sessions of Monday are marked past
  assert.equal(result.todaySessions.length, 7);
  assert.ok(result.todaySessions.every((s) => s.isPast));

  // The up next session is Tuesday's first class (Slot F21 at 10:10 for general batch)
  assert.ok(result.upNextSession);
  assert.equal(result.upNextSession.day, "Tuesday");
  assert.equal(result.upNextSession.start, "10:10");
  assert.equal(result.heroBadge.status, "day_complete");
  assert.ok(result.heroBadge.label.includes("tomorrow"));
  assert.ok(result.heroBadge.timingLabel.includes("Tomorrow"));
});

test("Schedule Resolver: Monday 17:05 for Batch 1/Batch 3 student correctly identifies their first Tuesday class", () => {
  // Batch 3 student (roll 261161)
  const mondayEvening = new Date("2026-11-02T17:05:51+05:30");
  const batch3 = inferLabBatchFromRoll("261161");
  assert.equal(batch3, "3");

  const result = resolveUpcomingSchedule("11", batch3, mondayEvening);

  // For Batch 3, Tuesday morning 10:10 (F21 Physics Lab Batch 2) is not applicable.
  // Batch 3's first class on Tuesday is A1 (Calculus & Matrices) at 14:00!
  assert.ok(result.upNextSession);
  assert.equal(result.upNextSession.day, "Tuesday");
  assert.equal(result.upNextSession.start, "14:00");
  assert.equal(result.upNextSession.code, "MA1103");
  assert.equal(result.upNextSession.title, "Calculus & Matrices");
});

test("Schedule Resolver: Live class detection when class is in progress", () => {
  // Monday Nov 2, 2026 at 09:40:00 IST (during Period 1: 09:20 - 10:10)
  const duringClass = new Date("2026-11-02T09:40:00+05:30");

  const result = resolveUpcomingSchedule("11", "all", duringClass);

  assert.equal(result.heroBadge.status, "ongoing");
  assert.ok(result.heroBadge.label.includes("Live now"));
  assert.ok(result.heroBadge.label.includes("30m")); // 10:10 - 09:40 = 30m remaining
  assert.equal(result.ongoingSession?.code, "CS1101");
  assert.equal(result.upNextSession?.code, "CS1101");
  assert.equal(result.upNextSession?.title, "Computer Programming");
});

test("Schedule Resolver: Break time correctly identifies next period starting today", () => {
  // Monday Nov 2, 2026 at 11:05:00 IST (during Tea Break: 11:00 - 11:20)
  const duringBreak = new Date("2026-11-02T11:05:00+05:30");

  const result = resolveUpcomingSchedule("11", "all", duringBreak);

  assert.equal(result.heroBadge.status, "upcoming_today");
  assert.ok(result.heroBadge.label.includes("15m")); // 11:20 - 11:05 = 15m
  assert.equal(result.ongoingSession, null);
  assert.equal(result.upNextSession.start, "11:20");
});

test("Schedule Resolver: Weekend (Saturday) points to Monday's first class", () => {
  // Saturday Nov 7, 2026 at 14:00:00 IST
  const saturday = new Date("2026-11-07T14:00:00+05:30");

  const result = resolveUpcomingSchedule("11", "all", saturday);

  assert.equal(result.isWeekend, true);
  assert.equal(result.heroBadge.status, "weekend");
  assert.ok(result.heroBadge.label.includes("Monday"));
  assert.equal(result.upNextSession.day, "Monday");
  assert.equal(result.upNextSession.start, "09:20");
  assert.equal(result.upNextSession.code, "CS1101");
});

test("Schedule Resolver: Friday evening points to Monday's first class", () => {
  // Friday Nov 6, 2026 at 18:00:00 IST (after all classes ended)
  const fridayEvening = new Date("2026-11-06T18:00:00+05:30");

  const result = resolveUpcomingSchedule("11", "all", fridayEvening);

  assert.equal(result.isDayComplete, true);
  assert.ok(result.heroBadge.label.includes("Monday"));
  assert.equal(result.upNextSession.day, "Monday");
  assert.equal(result.upNextSession.start, "09:20");
  assert.equal(result.upNextSession.code, "CS1101");
});
