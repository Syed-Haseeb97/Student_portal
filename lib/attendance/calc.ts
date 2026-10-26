export type SessionState = "scheduled" | "cancelled" | "completed";
export type AttendanceMark = "present" | "absent";
export type ComplianceStatus = "compliant" | "below_threshold" | "no_data";
export interface SessionAttendance { sessionId: string; offeringId: string; sessionDate?: string; sessionState: SessionState; mark: AttendanceMark | null; }
export interface AttendancePolicy { thresholdPercent: number; eligibleStates: readonly SessionState[]; }
export const DEFAULT_POLICY: AttendancePolicy = { thresholdPercent: 75, eligibleStates: ["completed"] };
export interface CourseAttendanceSummary { offeringId: string; attended: number; missed: number; total: number; unrecorded: number; percentage: number | null; status: ComplianceStatus; }
function assertPolicy(policy: AttendancePolicy) {
  if (!Number.isFinite(policy.thresholdPercent) || policy.thresholdPercent < 0 || policy.thresholdPercent > 100) throw new RangeError("thresholdPercent must be between 0 and 100");
}
export function evaluate(attended: number, total: number, policy = DEFAULT_POLICY) {
  assertPolicy(policy);
  if (!Number.isInteger(attended) || !Number.isInteger(total) || attended < 0 || total < 0 || attended > total) throw new RangeError("Attendance counts must be integers with 0 <= attended <= total");
  if (total === 0) return { percentage: null, status: "no_data" as const };
  const percentage = attended / total * 100;
  return { percentage, status: attended * 100 >= policy.thresholdPercent * total ? "compliant" as const : "below_threshold" as const };
}
export function summarizeByCourse(records: readonly SessionAttendance[], policy = DEFAULT_POLICY): CourseAttendanceSummary[] {
  assertPolicy(policy);
  const seen = new Set<string>();
  const byCourse = new Map<string, { attended: number; missed: number; unrecorded: number }>();
  for (const record of records) {
    if (seen.has(record.sessionId)) throw new Error(`Duplicate record for session ${record.sessionId}`);
    seen.add(record.sessionId);
    const course = byCourse.get(record.offeringId) ?? { attended: 0, missed: 0, unrecorded: 0 };
    byCourse.set(record.offeringId, course);
    if (!policy.eligibleStates.includes(record.sessionState)) continue;
    if (record.mark === "present") course.attended++;
    else if (record.mark === "absent") course.missed++;
    else course.unrecorded++;
  }
  const priority: Record<ComplianceStatus, number> = { below_threshold: 0, compliant: 1, no_data: 2 };
  return [...byCourse.entries()].map(([offeringId, counts]) => {
    const total = counts.attended + counts.missed;
    return { offeringId, ...counts, total, ...evaluate(counts.attended, total, policy) };
  }).sort((a, b) => priority[a.status] - priority[b.status] || a.offeringId.localeCompare(b.offeringId));
}
export function coursesBelowThreshold(summaries: readonly CourseAttendanceSummary[]) { return summaries.filter((summary) => summary.status === "below_threshold"); }
export function formatPercent(value: number | null) { return value === null ? "—" : `${(Math.floor(value * 10 + 1e-9) / 10).toFixed(1)}%`; }

export interface AttendanceGuidance {
  /** Number of upcoming consecutive sessions the student must attend to reach or restore thresholdPercent. 0 if compliant or no data. */
  sessionsToRecover: number;
  /** Number of upcoming sessions the student can afford to miss while remaining >= thresholdPercent. 0 if in shortfall or on the margin. */
  sessionsCanMiss: number;
}

export function calculateGuidance(
  attended: number,
  total: number,
  thresholdPercent = 75
): AttendanceGuidance {
  if (total <= 0 || attended < 0 || total < attended) {
    return { sessionsToRecover: 0, sessionsCanMiss: 0 };
  }
  const thresholdFraction = thresholdPercent / 100;
  if (attended * 100 < thresholdPercent * total) {
    const rawX = (thresholdFraction * total - attended) / (1 - thresholdFraction);
    const sessionsToRecover = Math.max(0, Math.ceil(rawX - 1e-9));
    return { sessionsToRecover, sessionsCanMiss: 0 };
  }
  const rawY = (attended - thresholdFraction * total) / thresholdFraction;
  const sessionsCanMiss = Math.max(0, Math.floor(rawY + 1e-9));
  return { sessionsToRecover: 0, sessionsCanMiss };
}
