import { test } from "node:test";
import assert from "node:assert/strict";
import {
  INSTITUTIONAL_EMAIL_PATTERN,
  normalizeEmail,
  normalizeRollNumber,
  validateRosterRow,
  validateRosterRows,
  inferStudentFromEmail,
} from "./validate";

test("normalizes roster identity fields without inferring data from roll number", () => {
  assert.equal(normalizeEmail(" Student@IIITT.AC.IN "), "student@iiitt.ac.in");
  assert.equal(normalizeRollNumber(" 261161 "), "261161");
  assert.deepEqual(validateRosterRow({
    rollNumber: "261161", email: "Student@IIITT.AC.IN", batch: "2026",
    programme: "CSE", active: "true",
  }), { rollNumber: "261161", email: "student@iiitt.ac.in", batch: "2026", programme: "CSE", active: true });
});

test("infers student roll number, intake batch year, and course programme correctly from email pattern", () => {
  // CSE Core (11)
  const cse = inferStudentFromEmail("261161@iiitt.ac.in");
  assert.ok(cse);
  assert.equal(cse.rollNumber, "261161");
  assert.equal(cse.batch, "2026");
  assert.equal(cse.programme, "B.Tech Computer Science & Engineering");
  assert.equal(cse.courseCode, "11");
  assert.equal(cse.classRoll, "61");

  // ECE Core (12)
  const ece = inferStudentFromEmail("261205@iiitt.ac.in");
  assert.ok(ece);
  assert.equal(ece.rollNumber, "261205");
  assert.equal(ece.batch, "2026");
  assert.equal(ece.programme, "B.Tech Electronics & Communication Engineering");
  assert.equal(ece.courseCode, "12");
  assert.equal(ece.classRoll, "05");

  // CSE AI & DS (13)
  const aids = inferStudentFromEmail("261320@iiitt.ac.in");
  assert.ok(aids);
  assert.equal(aids.rollNumber, "261320");
  assert.equal(aids.batch, "2026");
  assert.equal(aids.programme, "B.Tech Computer Science & Engineering (AI & DS)");
  assert.equal(aids.courseCode, "13");
  assert.equal(aids.classRoll, "20");

  // ECE VLSI Design (14)
  const vlsi = inferStudentFromEmail("261419@iiitt.ac.in");
  assert.ok(vlsi);
  assert.equal(vlsi.rollNumber, "261419");
  assert.equal(vlsi.batch, "2026");
  assert.equal(vlsi.programme, "B.Tech Electronics & Communication Engineering (VLSI Design)");
  assert.equal(vlsi.courseCode, "14");
  assert.equal(vlsi.classRoll, "19");

  // Non-matching formats return null
  assert.equal(inferStudentFromEmail("staff@iiitt.ac.in"), null);
  assert.equal(inferStudentFromEmail("admin@iiitt.ac.in"), null);
  assert.equal(inferStudentFromEmail("269999@iiitt.ac.in"), null); // Invalid course code 99
  assert.equal(inferStudentFromEmail("261161@gmail.com"), null);   // Non-iiitt domain
});

test("rejects non-institutional email and malformed batch", () => {
  assert.throws(() => validateRosterRow({
    rollNumber: "261161", email: "student@example.com", batch: "2026", programme: "CSE", active: true,
  }), /@iiitt\.ac\.in/);
  assert.throws(() => validateRosterRow({
    rollNumber: "261161", email: "student@iiitt.ac.in", batch: "26", programme: "CSE", active: true,
  }), /batch/);
});

test("rejects unsupported active flag", () => {
  assert.throws(() => validateRosterRow({
    rollNumber: "261161", email: "student@iiitt.ac.in", batch: "2026", programme: "CSE", active: "yes",
  }), /active/);
});

test("whole-file validation rejects duplicate normalized emails and roll numbers", () => {
  const base = { rollNumber: "261161", email: "student@iiitt.ac.in", batch: "2026", programme: "CSE", active: true };
  assert.throws(() => validateRosterRows([base, { ...base, rollNumber: "261162" }]), /Duplicate email/);
  assert.throws(() => validateRosterRows([base, { ...base, email: "other@iiitt.ac.in" }]), /Duplicate roll number/);
});

test("the shared institutional-email pattern accepts only verified-domain address shapes", () => {
  assert.equal(INSTITUTIONAL_EMAIL_PATTERN.test("student@iiitt.ac.in"), true);
  assert.equal(INSTITUTIONAL_EMAIL_PATTERN.test("STUDENT@IIITT.AC.IN"), true);
  assert.equal(INSTITUTIONAL_EMAIL_PATTERN.test("student+tag@iiitt.ac.in"), true);
  assert.equal(INSTITUTIONAL_EMAIL_PATTERN.test("student@iiitt.ac.in.example.com"), false);
  assert.equal(INSTITUTIONAL_EMAIL_PATTERN.test("student@notiiitt.ac.in"), false);
  assert.equal(INSTITUTIONAL_EMAIL_PATTERN.test("student name@iiitt.ac.in"), false);
  assert.equal(INSTITUTIONAL_EMAIL_PATTERN.test("student@iiitt.ac.in "), false);
  assert.equal(INSTITUTIONAL_EMAIL_PATTERN.test("@iiitt.ac.in"), false);
});
