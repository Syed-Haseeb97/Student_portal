import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeEmail, normalizeRollNumber, validateRosterRow } from "./validate";

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
