/**
 * IIIT Tiruchirappalli Student Portal
 * Core API & Domain Types
 *
 * Aligned with docs/BACKEND_API_CONTRACT.md and docs/ROSTER_AND_ATTENDANCE_RULES.md.
 */

export type UserRole = "student" | "lecturer" | "admin";

/**
 * Attendance status in API contract is "compliant" | "shortfall" | "no_data".
 * The calculation engine and backend route also emit "below_threshold" as an alias for "shortfall".
 */
export type AttendanceStatus = "compliant" | "shortfall" | "below_threshold" | "no_data";

export type NormalizedAttendanceStatus = "compliant" | "shortfall" | "no_data";

export function normalizeAttendanceStatus(
  status: AttendanceStatus | string | null | undefined
): NormalizedAttendanceStatus {
  if (status === "compliant") return "compliant";
  if (status === "shortfall" || status === "below_threshold") return "shortfall";
  return "no_data";
}

export type SessionStatus = "scheduled" | "completed" | "cancelled";

export type AttendanceMark = "present" | "absent";

export interface StudentIdentity {
  uid: string;
  rollNumber: string | null;
  batch: string | null;
  programme: string | null;
  name?: string | null;
  email?: string | null;
}

export interface AttendancePolicy {
  thresholdPercent: number; // Locked at 75
  countsOnlyCompletedSessions: boolean; // Locked: true
}

export interface CourseSummary {
  offeringId: string;
  courseId: string | null;
  courseCode: string | null;
  courseTitle: string;
  term: string | null;
  attended: number;
  missed: number;
  total: number;
  percentage: number | null;
  status: AttendanceStatus;
  thresholdPercent: number;
  latestSessionDate?: string | null;
}

export interface StudentDashboardData {
  student: StudentIdentity;
  policy: AttendancePolicy;
  summaries: CourseSummary[];
  generatedAt: string;
  isSynthetic?: boolean;
}

export interface SessionRecord {
  id: string;
  offeringId: string;
  sessionDate: string; // YYYY-MM-DD
  startTime?: string | null;
  endTime?: string | null;
  room?: string | null;
  status: SessionStatus;
  cancelReason?: string | null;
}

export interface AttendanceCorrectionPayload {
  mark: AttendanceMark;
  reason: string; // 5-300 characters
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
  isMock?: boolean;
}
