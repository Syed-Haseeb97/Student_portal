/**
 * IIIT Tiruchirappalli Student Portal
 * Core API & Domain Types
 *
 * Aligned with docs/BACKEND_API_CONTRACT.md and docs/ROSTER_AND_ATTENDANCE_RULES.md.
 */

export type UserRole = "student" | "lecturer" | "admin";

export type AttendanceStatus = "compliant" | "shortfall" | "no_data";

export type SessionStatus = "scheduled" | "completed" | "cancelled";

export type AttendanceMark = "present" | "absent";

export interface StudentIdentity {
  uid: string;
  rollNumber: string;
  batch: string;
  programme: string;
  name?: string;
  email?: string;
}

export interface AttendancePolicy {
  thresholdPercent: number; // Locked at 75
  countsOnlyCompletedSessions: boolean; // Locked: true
}

export interface CourseSummary {
  offeringId: string;
  courseId: string;
  courseCode: string;
  courseTitle: string;
  term: string;
  attended: number;
  missed: number;
  total: number;
  percentage: number;
  status: AttendanceStatus;
  thresholdPercent: number;
  latestSessionDate?: string;
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
  startTime?: string;
  endTime?: string;
  room?: string;
  status: SessionStatus;
  cancelReason?: string;
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
