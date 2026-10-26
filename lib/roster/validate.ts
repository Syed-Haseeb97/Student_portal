export const INSTITUTIONAL_EMAIL_PATTERN = /^[^\s@]+@iiitt\.ac\.in$/i;

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
