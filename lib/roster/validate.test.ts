import { test } from "node:test";
import assert from "node:assert/strict";
import { INSTITUTIONAL_EMAIL_PATTERN, normalizeEmail, normalizeRollNumber, validateRosterRow, validateRosterRows } from "./validate";

test("normalizes roster identity fields without inferring data from roll number", () => {
  assert.equal(normalizeEmail(" Student@IIITT.AC.IN "), "student@iiitt.ac.in");
  assert.equal(normalizeRollNumber(" 261161 "), "261161");
  assert.deepEqual(validateRosterRow({
    rollNumber: "261161", email: "Student@IIITT.AC.IN", batch: "2026",
    programme: "CSE", active: "true",
  }), { rollNumber: "261161", email: "student@iiitt.ac.in", batch: "2026", programme: "CSE", active: true });
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
