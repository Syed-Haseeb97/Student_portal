import test from "node:test";
import assert from "node:assert/strict";
import {
  BRANCH_TIMETABLES,
  PERIOD_SLOTS,
  resolveSlotCourse,
  resolveBranchFromRollOrEmail,
} from "./first-year-data";

test("Timetable: all 4 branches are configured with complete course rosters", () => {
  const branches = ["11", "12", "13", "14"] as const;
  for (const code of branches) {
    const timetable = BRANCH_TIMETABLES[code];
    assert.ok(timetable, `Branch ${code} should exist`);
    assert.equal(timetable.branchCode, code);
    assert.ok(timetable.branchName.length > 0);
    assert.ok(timetable.shortName.length > 0);
    assert.ok(Object.keys(timetable.courses).length >= 8);

    // Verify all courses have required faculty contact information
    for (const [slotKey, course] of Object.entries(timetable.courses)) {
      assert.ok(course.name.length > 0, `Course ${slotKey} must have name`);
      assert.ok(course.facultyName.length > 0, `Course ${slotKey} must have facultyName`);
      assert.ok(course.facultyEmail.includes("@"), `Course ${slotKey} must have valid facultyEmail`);
      assert.ok(course.facultyPhone.length > 0, `Course ${slotKey} must have facultyPhone`);
      assert.ok(course.theme.bg.length > 0, `Course ${slotKey} must have color theme`);
    }

    // Verify all 5 weekdays have 10 period slots (matching PERIOD_SLOTS)
    for (const day of ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const) {
      assert.equal(timetable.schedule[day].length, PERIOD_SLOTS.length);
    }
  }
});

test("Timetable: resolveBranchFromRollOrEmail correctly maps student intake patterns", () => {
  // CSE Core (11)
  assert.equal(resolveBranchFromRollOrEmail("261161@iiitt.ac.in"), "11");
  assert.equal(resolveBranchFromRollOrEmail("261101"), "11");

  // ECE Core (12)
  assert.equal(resolveBranchFromRollOrEmail("261205@iiitt.ac.in"), "12");
  assert.equal(resolveBranchFromRollOrEmail("261245"), "12");

  // CSE AI & DS (13)
  assert.equal(resolveBranchFromRollOrEmail("261314@iiitt.ac.in"), "13");
  assert.equal(resolveBranchFromRollOrEmail("261301"), "13");

  // VLSI Design (14)
  assert.equal(resolveBranchFromRollOrEmail("261419@iiitt.ac.in"), "14");
  assert.equal(resolveBranchFromRollOrEmail("261402"), "14");

  // Fallback defaults to CSE Core (11)
  assert.equal(resolveBranchFromRollOrEmail(undefined), "11");
  assert.equal(resolveBranchFromRollOrEmail("unknown@iiitt.ac.in"), "11");
});

test("Timetable: resolveSlotCourse resolves lecture, lab, and activity slot codes", () => {
  const cse = BRANCH_TIMETABLES["11"];

  // Lecture slot C1 maps to CS1101
  const progCourse = resolveSlotCourse(cse, "C1");
  assert.ok(progCourse);
  assert.equal(progCourse?.code, "CS1101");
  assert.equal(progCourse?.facultyName, "Dr. Anoop Jacob Thomas");

  // Lab slot F11 maps to PH1102 (Slot F)
  const labCourse = resolveSlotCourse(cse, "F11");
  assert.ok(labCourse);
  assert.equal(labCourse?.code, "PH1102");
  assert.equal(labCourse?.facultyName, "Dr. K. Kamakshi");

  // NSS activity slot maps to HM1102 (Slot H)
  const nssCourse = resolveSlotCourse(cse, "NSS");
  assert.ok(nssCourse);
  assert.equal(nssCourse?.code, "HM1102");
  assert.equal(nssCourse?.facultyName, "Dr. B. Ravi");

  // Empty slot returns null
  assert.equal(resolveSlotCourse(cse, null), null);
});
