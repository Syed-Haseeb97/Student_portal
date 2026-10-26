/**
 * Attendance calculation. Pure functions, no I/O.
 *
 * Rules encoded here:
 * - Percentages are computed PER COURSE. There is deliberately no overall figure.
 * - Only sessions in `policy.eligibleStates` count. Default: completed sessions
 *   (attendance submitted). Cancelled sessions are excluded. This default is an
 *   assumption pending confirmation of the institution's cancelled-class policy.
 * - Threshold is configurable; 75 is the currently confirmed requirement.
 */

export type SessionState = "scheduled" | "cancelled" | "completed";
export type AttendanceMark = "present" | "absent";
export type ComplianceStatus = "compliant" | "below_threshold" | "no_data";

export interface SessionAttendance {
  sessionId: string;
  courseId: string;
  sessionDate?: string;
  sessionState: SessionState;
  /** null = no record exists for this student in this session */
  mark: AttendanceMark | null;
}

export interface AttendancePolicy {
  thresholdPercent: number;
  eligibleStates: readonly SessionState[];
}

export const DEFAULT_POLICY: AttendancePolicy = {
  thresholdPercent: 75,
  eligibleStates: ["completed"],
};

export interface CourseAttendanceSummary {
  courseId: string;
  attended: number;
  missed: number;
  /** attended + missed: eligible sessions with a recorded mark */
  total: number;
  /** eligible sessions with no record for this student */
  unrecorded: number;
  percentage: number | null;
  status: ComplianceStatus;
}

function assertPolicy(policy: AttendancePolicy): void {
  const t = policy.thresholdPercent;
  if (!Number.isFinite(t) || t < 0 || t > 100) {
    throw new RangeError("thresholdPercent must be between 0 and 100");
  }
}

/** Status from raw counts. Integer comparison avoids float edge cases at the threshold. */
export function evaluate(
  attended: number,
  total: number,
  policy: AttendancePolicy = DEFAULT_POLICY,
): { percentage: number | null; status: ComplianceStatus } {
  assertPolicy(policy);
  if (total <= 0) return { percentage: null, status: "no_data" };
  const percentage = (attended / total) * 100;
  const ok = attended * 100 >= policy.thresholdPercent * total;
  return { percentage, status: ok ? "compliant" : "below_threshold" };
}

/**
 * Summarise one student's attendance, separately for every course.
 * Below-threshold courses are listed first.
 */
export function summarizeByCourse(
  records: readonly SessionAttendance[],
  policy: AttendancePolicy = DEFAULT_POLICY,
): CourseAttendanceSummary[] {
  assertPolicy(policy);
  const seen = new Set<string>();
  const byCourse = new Map<string, { attended: number; missed: number; unrecorded: number }>();

  for (const r of records) {
    if (seen.has(r.sessionId)) {
      throw new Error(`Duplicate record for session ${r.sessionId}`);
    }
    seen.add(r.sessionId);

    // Ensure the course appears even if none of its sessions are eligible yet.
    const c = byCourse.get(r.courseId) ?? { attended: 0, missed: 0, unrecorded: 0 };
    byCourse.set(r.courseId, c);

    if (!policy.eligibleStates.includes(r.sessionState)) continue;
    if (r.mark === "present") c.attended += 1;
    else if (r.mark === "absent") c.missed += 1;
    else c.unrecorded += 1;
  }

  const rank: Record<ComplianceStatus, number> = { below_threshold: 0, compliant: 1, no_data: 2 };
  return [...byCourse.entries()]
    .map(([courseId, c]): CourseAttendanceSummary => {
      const total = c.attended + c.missed;
      return { courseId, ...c, total, ...evaluate(c.attended, total, policy) };
    })
    .sort((a, b) => rank[a.status] - rank[b.status] || a.courseId.localeCompare(b.courseId));
}

/** Courses a student must be warned about. */
export function coursesBelowThreshold(
  summaries: readonly CourseAttendanceSummary[],
): CourseAttendanceSummary[] {
  return summaries.filter((s) => s.status === "below_threshold");
}

/**
 * Display helper: truncates (never rounds up) to one decimal so a
 * non-compliant 74.96% can never be shown as "75.0%".
 */
export function formatPercent(percentage: number | null): string {
  if (percentage === null) return "—";
  return `${(Math.floor(percentage * 10 + 1e-9) / 10).toFixed(1)}%`;
}
