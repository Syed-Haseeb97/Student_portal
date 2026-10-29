export type AttendanceStatus = "compliant" | "shortfall" | "no_data";
export type NormalizedAttendanceStatus = "compliant" | "shortfall" | "no_data";
export type SessionStatus = "scheduled" | "completed" | "cancelled";
export type AttendanceMark = "present" | "absent";
export type UserRole = "student" | "lecturer" | "admin";

export interface StudentSummary {
  offeringId: string;
  courseId: string | null;
  courseCode: string | null;
  courseTitle: string;
  term: string | null;
  attended: number;
  missed: number;
  total: number;
  percentage: number | null;
  status: NormalizedAttendanceStatus;
  thresholdPercent: number;
  latestSessionDate: string | null;
}

export interface StudentIdentity {
  uid: string;
  rollNumber: string | null;
  batch: string | null;
  programme: string | null;
  name?: string | null;
  email?: string | null;
}

export interface AttendancePolicy {
  thresholdPercent: number;
  countsOnlyCompletedSessions: boolean;
}

export interface StudentDashboardData {
  student: StudentIdentity;
  policy: AttendancePolicy;
  summaries: StudentSummary[];
  generatedAt: string;
  isSynthetic?: boolean;
}

export function normalizeAttendanceStatus(
  status: string | null | undefined
): NormalizedAttendanceStatus {
  if (!status) return "no_data";
  if (status === "below_threshold") return "shortfall";
  if (status === "compliant" || status === "shortfall" || status === "no_data") {
    return status;
  }
  return "no_data";
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

export interface RosterClaimResponse {
  ok: boolean;
  role?: UserRole;
  error?: string;
}

export interface SessionCreatePayload {
  offeringId: string;
  sessionDate: string; // YYYY-MM-DD
  startTime?: string;
  endTime?: string;
  room?: string;
}

export interface AttendanceSubmissionPayload {
  marks?: Array<{
    studentUid: string;
    mark: AttendanceMark;
  }>;
  records?: Array<{
    studentUid: string;
    status: AttendanceMark;
  }>;
}

export interface SessionCancelPayload {
  reason: string; // 5-300 characters
}

export interface AttendanceCorrectionPayload {
  mark: AttendanceMark;
  reason: string; // 5-300 characters
}

export interface StaffProvisionPayload {
  email: string;
  role: "lecturer" | "admin";
  active: boolean;
}

export type AcademicDataKind = "courses" | "offerings" | "enrollments" | "assignments";

export interface AcademicDataImportPayload {
  kind: AcademicDataKind;
  rows: Array<Record<string, unknown>>;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
  isMock?: boolean;
}

export interface ApiErrorResponse {
  error: string;
  code?: string;
}

// ==========================================
// Lecturer Workflow Types
// ==========================================

export interface LecturerIdentity {
  uid: string;
  email: string;
  name?: string | null;
  displayName?: string | null;
  employeeId?: string | null;
  department?: string | null;
  designation?: string | null;
  role: "lecturer" | "admin";
}

export interface LecturerOffering {
  id: string; // offeringId
  courseId: string;
  courseCode: string | null;
  courseTitle: string;
  term: string | null;
  batch: string | null;
  programme: string | null;
  department?: string | null;
  enrolledCount: number;
  enrolledStudentsCount?: number;
  sessionCount?: number;
  active: boolean;
}

export interface LecturerSessionSummary {
  id: string;
  offeringId: string;
  courseCode: string | null;
  courseTitle: string;
  sessionDate: string; // YYYY-MM-DD
  startTime?: string | null;
  endTime?: string | null;
  room?: string | null;
  state: SessionStatus;
  status?: SessionStatus;
  cancellationReason?: string | null;
  presentCount?: number | null;
  absentCount?: number | null;
  totalCount?: number | null;
  totalEligible?: number | null;
  createdAt?: string | null;
}

export interface LecturerDashboardData {
  lecturer: LecturerIdentity;
  offerings: LecturerOffering[];
  sessions: LecturerSessionSummary[];
  todayDate: string; // YYYY-MM-DD
  generatedAt: string;
  isSynthetic?: boolean;
}

export interface RosterStudent {
  studentUid: string;
  rollNumber: string | null;
  name?: string | null;
  displayName?: string | null;
  email?: string | null;
  batch?: string | null;
  programme?: string | null;
  program?: string | null;
  semester?: number | null;
  status?: AttendanceMark;
}

export interface SessionDetailData {
  session: {
    id: string;
    offeringId: string;
    sessionDate: string;
    courseCode?: string | null;
    courseTitle?: string | null;
    startTime?: string | null;
    endTime?: string | null;
    room?: string | null;
    state: SessionStatus;
    status?: SessionStatus;
    cancellationReason?: string | null;
    completedAt?: string | null;
    completedBy?: string | null;
    cancelledAt?: string | null;
    cancelledBy?: string | null;
    presentCount?: number;
    absentCount?: number;
    totalCount?: number;
  };
  offering: {
    id: string;
    courseId: string | null;
    courseCode: string | null;
    courseTitle: string;
    term: string | null;
    batch: string | null;
    programme: string | null;
  };
  roster: RosterStudent[];
  marks?: Array<{
    studentUid: string;
    rollNumber: string | null;
    name?: string | null;
    mark: AttendanceMark;
    recordedAt?: string | null;
  }>;
  presentCount?: number;
  absentCount?: number;
  totalCount?: number;
  isSynthetic?: boolean;
}

// ==========================================
// Subject Detail & Session History Types
// ==========================================

export interface StudentSessionRecord {
  id: string;
  offeringId: string;
  sessionDate: string; // YYYY-MM-DD
  startTime?: string | null;
  endTime?: string | null;
  room?: string | null;
  status: SessionStatus;
  mark?: AttendanceMark;
  cancelReason?: string | null;
  topic?: string | null;
}

// ==========================================
// Notices, Deadlines & Assignment Types
// ==========================================

export type NoticeType = "notice" | "assignment";
export type NoticePriority = "normal" | "important" | "urgent";

export interface AcademicNotice {
  id: string;
  type: NoticeType;
  title: string;
  content: string;
  courseCode?: string | null;
  courseTitle?: string | null;
  targetBranch?: "all" | "11" | "12" | "13" | "14";
  priority: NoticePriority;
  postedByUid: string;
  postedByName: string;
  postedByEmail: string;
  postedByDepartment?: string | null;
  createdAt: string; // ISO date
  dueDate?: string | null; // For assignments (e.g. 2026-11-05T23:59)
  maxMarks?: number | null;
  submissionInfo?: string | null;
}

export interface CreateNoticePayload {
  type: NoticeType;
  title: string;
  content: string;
  courseCode?: string;
  courseTitle?: string;
  targetBranch?: "all" | "11" | "12" | "13" | "14";
  priority?: NoticePriority;
  dueDate?: string;
  maxMarks?: number;
  submissionInfo?: string;
}
