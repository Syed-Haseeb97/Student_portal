import test from "node:test";
import assert from "node:assert/strict";
import {
  OFFICIAL_FACULTY_ROSTER,
  getFacultyByEmail,
  isAuthorizedPortalEmail,
} from "../lib/roster/validate";
import { mutableNotices } from "../app/api/notices/route";

test("Faculty Roster: All faculty from timetable document are authorized and recognized", () => {
  const expectedTeachers = [
    { email: "karuppasamys.tf@iiitt.ac.in", name: "Mr. Karuppasamy S", course: "MA1103" },
    { email: "kamakshik@iiitt.ac.in", name: "Dr. K. Kamakshi", course: "PH1101" },
    { email: "anoopjt@iiitt.ac.in", name: "Dr. Anoop Jacob Thomas", course: "CS1101" },
    { email: "velmuruganc@iiitt.ac.in", name: "Dr. Velmurugan C", course: "ME1101" },
    { email: "tdevashena@gmail.com", name: "Dr. T. Devashena", course: "EC1103" },
    { email: "devashena@iiitt.ac.in", name: "Dr. T. Devashena", course: "EC1103" },
    { email: "jayasrik.tf@iiitt.ac.in", name: "Dr. K. Jayasri", course: "CS1102" },
    { email: "ravib@iiitt.ac.in", name: "Dr. B. Ravi", course: "HM1102" },
    { email: "poornimap.tf@iiitt.ac.in", name: "Dr. Poornima P", course: "MA1101" },
    { email: "sindhuv@iiitt.ac.in", name: "Dr. Sindhu V", course: "HM1101" },
    { email: "kokilaj@iiitt.ac.in", name: "Dr. J. Kokila", course: "CS1101" },
    { email: "harishadhithyam@iiitt.ac.in", name: "Dr. M. Harish Adhithya", course: "EC1101" },
  ];

  for (const t of expectedTeachers) {
    assert.equal(
      isAuthorizedPortalEmail(t.email),
      true,
      `Email ${t.email} should be authorized`
    );

    const faculty = getFacultyByEmail(t.email);
    assert.ok(faculty, `Faculty entry must exist for ${t.email}`);
    assert.equal(faculty.name, t.name);
    assert.ok(faculty.courses.includes(t.course), `Faculty ${faculty.name} should teach ${t.course}`);
    assert.ok(faculty.staffId.startsWith("FAC-"));
    assert.ok(faculty.phone.length > 5);
  }
});

test("Notices & Assignments: Store contains active assignments and notices with due dates", () => {
  assert.ok(mutableNotices.length >= 4);

  const assignments = mutableNotices.filter((n) => n.type === "assignment");
  assert.ok(assignments.length >= 2, "Must contain at least 2 default assignments");

  for (const a of assignments) {
    assert.ok(a.title.length > 0);
    assert.ok(a.dueDate, "Assignment must have due date");
    assert.ok(typeof a.maxMarks === "number");
    assert.ok(a.courseCode, "Assignment should be linked to a course code");
  }

  const circulars = mutableNotices.filter((n) => n.type === "notice");
  assert.ok(circulars.length >= 2, "Must contain at least 2 default circulars");
  for (const c of circulars) {
    assert.ok(c.title.length > 0);
    assert.ok(c.content.length > 0);
  }
});
