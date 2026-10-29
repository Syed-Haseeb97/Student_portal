export const INSTITUTIONAL_EMAIL_PATTERN = /^[^\s@]+@iiitt\.ac\.in$/i;

/**
 * Official IIIT Tiruchirappalli Department / Course Code Mapping:
 * - 11: CSE (Core) -> Computer Science & Engineering
 * - 12: ECE (Core) -> Electronics & Communication Engineering
 * - 13: CSE AIDS   -> Computer Science & Engineering (AI & DS)
 * - 14: ECE VLSI   -> Electronics & Communication Engineering (VLSI Design)
 */
export const COURSE_CODE_MAP: Record<string, string> = {
  "11": "B.Tech Computer Science & Engineering",
  "12": "B.Tech Electronics & Communication Engineering",
  "13": "B.Tech Computer Science & Engineering (AI & DS)",
  "14": "B.Tech Electronics & Communication Engineering (VLSI Design)",
};

export interface InferredStudentInfo {
  rollNumber: string;
  batch: string;
  programme: string;
  courseCode: "11" | "12" | "13" | "14";
  classRoll: string;
}

export function inferStudentFromRollOrEmail(identifier: string): InferredStudentInfo | null {
  if (!identifier) return null;
  const clean = identifier.trim().toLowerCase().split("@")[0]!;
  const match = clean.match(/^(?:20)?([0-9]{2})(11|12|13|14)([0-9]{2,4})$/);
  if (!match) return null;

  const intakeYearShort = match[1]!;
  const courseCode = match[2]! as "11" | "12" | "13" | "14";
  const classRoll = match[3]!;

  const rollNumber = `${intakeYearShort}${courseCode}${classRoll}`.toUpperCase();
  const batch = `20${intakeYearShort}`;
  const programme = COURSE_CODE_MAP[courseCode] || "B.Tech Computer Science & Engineering";

  return {
    rollNumber,
    batch,
    programme,
    courseCode,
    classRoll,
  };
}

/**
 * Infers student roll number, intake batch, and academic programme from an @iiitt.ac.in email address.
 * Pattern: [YY][CC][RRR]@iiitt.ac.in
 * e.g. 261161@iiitt.ac.in -> Intake: 2026, Course: 11 (CSE), Roll: 61
 * e.g. 261419@iiitt.ac.in -> Intake: 2026, Course: 14 (ECE VLSI), Roll: 19
 */
export function inferStudentFromEmail(email: string): InferredStudentInfo | null {
  if (!email) return null;
  const clean = email.trim().toLowerCase();
  if (!INSTITUTIONAL_EMAIL_PATTERN.test(clean)) return null;
  return inferStudentFromRollOrEmail(clean);
}

export interface RosterRow {
  rollNumber: string;
  email: string;
  batch: string;
  programme: string;
  active: boolean;
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function normalizeRollNumber(rollNumber: string) {
  return rollNumber.trim().toUpperCase();
}

/** Validate and normalize one already-parsed CSV row. No roll-number inference is performed. */
export function validateRosterRow(input: Record<string, unknown>): RosterRow {
  const rollNumber = normalizeRollNumber(String(input.rollNumber ?? input.roll_number ?? ""));
  const email = normalizeEmail(String(input.email ?? ""));
  const batch = String(input.batch ?? "").trim();
  const programme = String(input.programme ?? input.branch ?? "").trim();
  const rawActive = input.active;
  const active = rawActive === true || String(rawActive ?? "").trim().toLowerCase() === "true" ||
    String(rawActive ?? "").trim() === "1";

  if (!/^[A-Z0-9][A-Z0-9-]{2,19}$/.test(rollNumber)) {
    throw new Error("rollNumber must be 3–20 letters, digits, or hyphens.");
  }
  if (!INSTITUTIONAL_EMAIL_PATTERN.test(email)) {
    throw new Error("email must be a valid @iiitt.ac.in address.");
  }
  if (!/^20[0-9]{2}$/.test(batch)) {
    throw new Error("batch must be a four-digit year, for example 2026.");
  }
  if (programme.length < 2 || programme.length > 80) {
    throw new Error("programme must be between 2 and 80 characters.");
  }
  if (rawActive === undefined || ![true, false, "true", "false", "1", "0", 1, 0].includes(rawActive as never)) {
    throw new Error("active must be true/false or 1/0.");
  }
  return { rollNumber, email, batch, programme, active };
}

/** Validate a complete import before any writes are attempted. */
export function validateRosterRows(inputs: readonly Record<string, unknown>[]) {
  if (inputs.length < 1) throw new Error("The roster import must contain at least one row.");
  const rows = inputs.map(validateRosterRow);
  const emails = new Set<string>();
  const rolls = new Set<string>();
  for (const row of rows) {
    if (emails.has(row.email)) throw new Error(`Duplicate email in import: ${row.email}`);
    if (rolls.has(row.rollNumber)) throw new Error(`Duplicate roll number in import: ${row.rollNumber}`);
    emails.add(row.email);
    rolls.add(row.rollNumber);
  }
  return rows;
}

/**
 * Authoritative Faculty Directory for 1st Year (2026-27 Batch)
 * Extracted directly from official semester I timetable document.
 */
export interface FacultyRosterEntry {
  email: string;
  name: string;
  department: string;
  staffId: string;
  designation: string;
  phone: string;
  courses: string[];
}

export const OFFICIAL_FACULTY_ROSTER: Record<string, FacultyRosterEntry> = {
  "karuppasamys.tf@iiitt.ac.in": {
    email: "karuppasamys.tf@iiitt.ac.in",
    name: "Mr. Karuppasamy S",
    department: "Science & Humanities (Mathematics)",
    staffId: "FAC-MATH-01",
    designation: "Teaching Faculty",
    phone: "+91 96551 14806",
    courses: ["MA1103"],
  },
  "kamakshik@iiitt.ac.in": {
    email: "kamakshik@iiitt.ac.in",
    name: "Dr. K. Kamakshi",
    department: "Science & Humanities (Physics)",
    staffId: "FAC-PHY-01",
    designation: "Assistant Professor",
    phone: "+91 89781 63865",
    courses: ["PH1101", "PH1102"],
  },
  "anoopjt@iiitt.ac.in": {
    email: "anoopjt@iiitt.ac.in",
    name: "Dr. Anoop Jacob Thomas",
    department: "Computer Science & Engineering",
    staffId: "FAC-CSE-01",
    designation: "Assistant Professor",
    phone: "+91 76962 65939",
    courses: ["CS1101"],
  },
  "velmuruganc@iiitt.ac.in": {
    email: "velmuruganc@iiitt.ac.in",
    name: "Dr. Velmurugan C",
    department: "Mechanical Engineering",
    staffId: "FAC-MECH-01",
    designation: "Assistant Professor",
    phone: "+91 99430 22961",
    courses: ["ME1101", "ME2101", "ME1102"],
  },
  "tdevashena@gmail.com": {
    email: "tdevashena@gmail.com",
    name: "Dr. T. Devashena",
    department: "Electronics & Communication Engineering",
    staffId: "FAC-ECE-01",
    designation: "Visiting Faculty",
    phone: "+91 98432 85927",
    courses: ["EC1103"],
  },
  "devashena@iiitt.ac.in": {
    email: "devashena@iiitt.ac.in",
    name: "Dr. T. Devashena",
    department: "Electronics & Communication Engineering",
    staffId: "FAC-ECE-01",
    designation: "Visiting Faculty",
    phone: "+91 98432 85927",
    courses: ["EC1103"],
  },
  "jayasrik.tf@iiitt.ac.in": {
    email: "jayasrik.tf@iiitt.ac.in",
    name: "Dr. K. Jayasri",
    department: "Computer Science & Engineering",
    staffId: "FAC-CSE-02",
    designation: "Teaching Faculty",
    phone: "+91 63808 73082",
    courses: ["CS1102"],
  },
  "ravib@iiitt.ac.in": {
    email: "ravib@iiitt.ac.in",
    name: "Dr. B. Ravi",
    department: "Humanities & Social Sciences",
    staffId: "FAC-HUM-01",
    designation: "Assistant Professor",
    phone: "+91 98498 82720",
    courses: ["HM1102"],
  },
  "poornimap.tf@iiitt.ac.in": {
    email: "poornimap.tf@iiitt.ac.in",
    name: "Dr. Poornima P",
    department: "Science & Humanities (Mathematics)",
    staffId: "FAC-MATH-02",
    designation: "Teaching Faculty",
    phone: "+91 88914 42676",
    courses: ["MA1101"],
  },
  "sindhuv@iiitt.ac.in": {
    email: "sindhuv@iiitt.ac.in",
    name: "Dr. Sindhu V",
    department: "Humanities & Social Sciences (English)",
    staffId: "FAC-HUM-02",
    designation: "Assistant Professor",
    phone: "+91 88705 14441",
    courses: ["HM1101"],
  },
  "kokilaj@iiitt.ac.in": {
    email: "kokilaj@iiitt.ac.in",
    name: "Dr. J. Kokila",
    department: "Computer Science & Engineering",
    staffId: "FAC-CSE-03",
    designation: "Assistant Professor",
    phone: "+91 95978 18491",
    courses: ["CS1101", "CS1102"],
  },
  "harishadhithyam@iiitt.ac.in": {
    email: "harishadhithyam@iiitt.ac.in",
    name: "Dr. M. Harish Adhithya",
    department: "Electronics & Communication Engineering",
    staffId: "FAC-ECE-02",
    designation: "Assistant Professor",
    phone: "+91 78452 37545",
    courses: ["EC1101", "EC1102"],
  },
};

export function getFacultyByEmail(email: string): FacultyRosterEntry | null {
  const norm = normalizeEmail(email);
  return OFFICIAL_FACULTY_ROSTER[norm] || null;
}

export function isAuthorizedPortalEmail(email: string): boolean {
  const norm = normalizeEmail(email);
  if (INSTITUTIONAL_EMAIL_PATTERN.test(norm)) return true;
  if (norm in OFFICIAL_FACULTY_ROSTER) return true;
  return false;
}
