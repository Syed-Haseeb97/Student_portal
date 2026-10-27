/**
 * IIIT Tiruchirappalli Student Portal
 * Typed API Client & Service Abstraction
 *
 * Provides a clean interface between the UI and backend routes.
 * When real Firebase credentials / backend are not configured, or when
 * NEXT_PUBLIC_ENABLE_MOCK_API is enabled, it returns clearly identified synthetic data.
 * When mock mode is disabled, it strictly enforces authentication and surfaces real API errors.
 */

import type {
  ApiResponse,
  StudentDashboardData,
  StudentSummary,
  LecturerDashboardData,
  SessionDetailData,
  SessionCreatePayload,
  AttendanceSubmissionPayload,
  SessionCancelPayload,
  LecturerSessionSummary,
  AttendanceMark,
} from "./types";
import { normalizeAttendanceStatus } from "./types";
import {
  SYNTHETIC_STUDENT,
  SYNTHETIC_EMPTY_STUDENT,
  SYNTHETIC_LECTURER_DASHBOARD,
  SYNTHETIC_SESSION_DETAILS,
  SYNTHETIC_STUDENT_ROSTER,
} from "./mock-data";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNullableString(value: unknown) {
  return value === null || typeof value === "string";
}

function isDateOnly(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function parseDashboardData(body: unknown): StudentDashboardData | null {
  if (!isRecord(body) || !isRecord(body.student) || !isRecord(body.policy) || !Array.isArray(body.summaries)) return null;

  const student = body.student;
  if (typeof student.uid !== "string" || !student.uid ||
      !isNullableString(student.rollNumber) || !isNullableString(student.batch) ||
      !isNullableString(student.programme) ||
      (student.name !== undefined && !isNullableString(student.name)) ||
      (student.email !== undefined && !isNullableString(student.email))) return null;

  const policy = body.policy;
  if (policy.thresholdPercent !== 75 || policy.countsOnlyCompletedSessions !== true) return null;
  if (typeof body.generatedAt !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(body.generatedAt) ||
      !Number.isFinite(Date.parse(body.generatedAt)) || new Date(body.generatedAt).toISOString() !== body.generatedAt) return null;

  const summaries: StudentSummary[] = [];
  for (const item of body.summaries) {
    if (!isRecord(item) || typeof item.offeringId !== "string" || !item.offeringId ||
        !isNullableString(item.courseId) || !isNullableString(item.courseCode) ||
        typeof item.courseTitle !== "string" || !isNullableString(item.term) ||
        !Number.isInteger(item.attended) || (item.attended as number) < 0 ||
        !Number.isInteger(item.missed) || (item.missed as number) < 0 ||
        !Number.isInteger(item.total) || (item.total as number) < 0 ||
        (item.attended as number) + (item.missed as number) !== item.total ||
        (item.percentage !== null && (typeof item.percentage !== "number" || !Number.isFinite(item.percentage) || item.percentage < 0 || item.percentage > 100)) ||
        !["compliant", "shortfall", "no_data", "below_threshold"].includes(String(item.status)) ||
        item.thresholdPercent !== 75 ||
        (item.latestSessionDate !== undefined && item.latestSessionDate !== null && !isDateOnly(item.latestSessionDate))) return null;

    const status = normalizeAttendanceStatus(String(item.status));
    if ((item.total === 0 && (item.percentage !== null || status !== "no_data")) ||
        (item.total !== 0 && (item.percentage === null || status === "no_data" ||
          (status === "compliant") !== ((item.percentage as number) >= 75)))) return null;
    summaries.push({ ...item, status } as StudentSummary);
  }

  return {
    ...body,
    student: student as unknown as StudentDashboardData["student"],
    policy: policy as unknown as StudentDashboardData["policy"],
    summaries,
    generatedAt: body.generatedAt,
  } as StudentDashboardData;
}

export function isMockModeEnabled(): boolean {
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_ENABLE_MOCK_API) {
    if (process.env.NEXT_PUBLIC_ENABLE_MOCK_API === "true") return true;
    if (process.env.NEXT_PUBLIC_ENABLE_MOCK_API === "false") return false;
  }
  // If NEXT_PUBLIC_ENABLE_MOCK_API is not set, check if Firebase config is present
  const hasFirebaseConfig = Boolean(
    typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  );
  return !hasFirebaseConfig;
}

export type MockScenario = "normal" | "empty" | "unauthorized" | "error";

// Mutable in-memory mock store for interactive dev session actions
let mutableLecturerDashboard: LecturerDashboardData = JSON.parse(
  JSON.stringify(SYNTHETIC_LECTURER_DASHBOARD)
);
const mutableSessionDetails: Record<string, SessionDetailData> = JSON.parse(
  JSON.stringify(SYNTHETIC_SESSION_DETAILS)
);

export function resetMockLecturerState() {
  mutableLecturerDashboard = JSON.parse(JSON.stringify(SYNTHETIC_LECTURER_DASHBOARD));
  for (const k of Object.keys(mutableSessionDetails)) {
    delete mutableSessionDetails[k];
  }
  Object.assign(mutableSessionDetails, JSON.parse(JSON.stringify(SYNTHETIC_SESSION_DETAILS)));
}

async function extractResponseBody(response: Response): Promise<{ body: unknown; safeError?: string }> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      const body = await response.json();
      return { body };
    } catch {
      return { body: null, safeError: "Response contained invalid or truncated JSON." };
    }
  }
  return { body: null, safeError: `Unexpected response format: ${contentType || "none"}` };
}

/**
 * Fetch student attendance dashboard data.
 */
export async function getStudentDashboard(
  idToken?: string,
  options?: { mockScenario?: MockScenario }
): Promise<ApiResponse<StudentDashboardData>> {
  if (isMockModeEnabled()) {
    const scenario = options?.mockScenario ?? "normal";
    if (scenario === "empty") {
      return { status: 200, data: SYNTHETIC_EMPTY_STUDENT, isMock: true };
    }
    if (scenario === "unauthorized") {
      return {
        status: 403,
        error: "Your account is not linked to an active approved student roster entry.",
        isMock: true,
      };
    }
    if (scenario === "error") {
      return {
        status: 503,
        error: "Unable to load student attendance right now. Please retry in a few moments.",
        isMock: true,
      };
    }
    return { status: 200, data: SYNTHETIC_STUDENT, isMock: true };
  }

  if (!idToken || !idToken.trim()) {
    return {
      status: 401,
      error: "Authentication required: missing or empty Firebase ID token",
      isMock: false,
    };
  }

  try {
    const response = await fetch("/api/student/dashboard", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${idToken.trim()}`,
        "Content-Type": "application/json",
      },
    });

    const { body, safeError } = await extractResponseBody(response);
    if (safeError && !response.ok) {
      return { status: response.status || 502, error: safeError, isMock: false };
    }

    if (!response.ok) {
      let errorMsg = `Request failed with HTTP status ${response.status}`;
      if (body && typeof body === "object" && "error" in body && typeof body.error === "string") {
        errorMsg = body.error;
      } else if (response.status === 401) {
        errorMsg = "Your sign-in session expired. Sign in again.";
      } else if (response.status === 403) {
        errorMsg = "Your account is not linked to an active approved roster entry. Contact the administrator.";
      }
      return { status: response.status, error: errorMsg, isMock: false };
    }

    const parsed = parseDashboardData(body);
    if (!parsed) {
      return {
        status: 502,
        error: "Malformed dashboard response: fields do not match the attendance API contract.",
        isMock: false,
      };
    }

    return { status: 200, data: parsed, isMock: false };
  } catch (err) {
    return {
      status: 503,
      error: err instanceof Error ? err.message : "Network error contacting portal service",
      isMock: false,
    };
  }
}

/**
 * Fetch lecturer dashboard: assigned offerings, today's classes, and session history.
 */
export async function getLecturerDashboard(
  idToken?: string,
  options?: { mockScenario?: MockScenario }
): Promise<ApiResponse<LecturerDashboardData>> {
  if (isMockModeEnabled()) {
    const scenario = options?.mockScenario ?? "normal";
    if (scenario === "empty") {
      return {
        status: 200,
        data: {
          ...mutableLecturerDashboard,
          offerings: [],
          sessions: [],
        },
        isMock: true,
      };
    }
    if (scenario === "unauthorized") {
      return {
        status: 403,
        error: "Only authorized faculty accounts on the approved staff register can access this dashboard.",
        isMock: true,
      };
    }
    if (scenario === "error") {
      return {
        status: 503,
        error: "Unable to retrieve lecturer course assignments right now. Please retry.",
        isMock: true,
      };
    }
    return { status: 200, data: mutableLecturerDashboard, isMock: true };
  }

  if (!idToken || !idToken.trim()) {
    return {
      status: 401,
      error: "Authentication required: missing or empty Firebase ID token",
      isMock: false,
    };
  }

  try {
    const response = await fetch("/api/lecturer/dashboard", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${idToken.trim()}`,
        "Content-Type": "application/json",
      },
    });

    const { body, safeError } = await extractResponseBody(response);
    if (safeError && !response.ok) {
      return { status: response.status || 502, error: safeError, isMock: false };
    }

    if (!response.ok) {
      let errorMsg = `Request failed with HTTP status ${response.status}`;
      if (body && typeof body === "object" && "error" in body && typeof body.error === "string") {
        errorMsg = body.error;
      }
      return { status: response.status, error: errorMsg, isMock: false };
    }

    return { status: 200, data: body as LecturerDashboardData, isMock: false };
  } catch (err) {
    return {
      status: 503,
      error: err instanceof Error ? err.message : "Network error contacting portal service",
      isMock: false,
    };
  }
}

/**
 * Fetch detailed view for a single class session, including enrolled roster (if scheduled) or marks (if completed).
 */
export async function getSessionDetails(
  sessionId: string,
  idToken?: string,
  options?: { mockScenario?: MockScenario }
): Promise<ApiResponse<SessionDetailData>> {
  if (isMockModeEnabled()) {
    const scenario = options?.mockScenario ?? "normal";
    if (scenario === "unauthorized") {
      return { status: 403, error: "You are not assigned to this course offering.", isMock: true };
    }
    if (scenario === "error") {
      return { status: 503, error: "Unable to retrieve session roster.", isMock: true };
    }

    const session = mutableSessionDetails[sessionId] ?? SYNTHETIC_SESSION_DETAILS[sessionId];
    if (session) {
      return { status: 200, data: session, isMock: true };
    }

    // If not found in detailed map, construct from dashboard sessions or synthetic roster
    const summary = mutableLecturerDashboard.sessions.find((s) => s.id === sessionId);
    if (!summary) {
      return { status: 404, error: "Session not found.", isMock: true };
    }

    const offering = mutableLecturerDashboard.offerings.find((o) => o.id === summary.offeringId) ?? {
      id: summary.offeringId,
      courseId: "course",
      courseCode: summary.courseCode,
      courseTitle: summary.courseTitle,
      term: "2026-S1",
      batch: "2026",
      programme: "CSE",
      enrolledCount: SYNTHETIC_STUDENT_ROSTER.length,
      active: true,
    };

    const isComp = summary.state === "completed";
    const detail: SessionDetailData = {
      isSynthetic: true,
      session: {
        id: summary.id,
        offeringId: summary.offeringId,
        courseCode: summary.courseCode,
        courseTitle: summary.courseTitle,
        sessionDate: summary.sessionDate,
        startTime: summary.startTime,
        endTime: summary.endTime,
        room: summary.room,
        state: summary.state,
        status: summary.state,
        cancellationReason: summary.cancellationReason,
      },
      offering,
      roster: SYNTHETIC_STUDENT_ROSTER,
      totalCount: SYNTHETIC_STUDENT_ROSTER.length,
      ...(isComp
        ? {
            marks: SYNTHETIC_STUDENT_ROSTER.map((s, idx) => ({
              studentUid: s.studentUid,
              rollNumber: s.rollNumber,
              name: s.name,
              mark: idx === 1 ? ("absent" as const) : ("present" as const),
            })),
            presentCount: SYNTHETIC_STUDENT_ROSTER.length - 1,
            absentCount: 1,
          }
        : {}),
    };
    mutableSessionDetails[sessionId] = detail;
    return { status: 200, data: detail, isMock: true };
  }

  if (!idToken || !idToken.trim()) {
    return { status: 401, error: "Authentication required: missing ID token", isMock: false };
  }

  try {
    const response = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${idToken.trim()}`,
        "Content-Type": "application/json",
      },
    });

    const { body, safeError } = await extractResponseBody(response);
    if (safeError && !response.ok) {
      return { status: response.status || 502, error: safeError, isMock: false };
    }

    if (!response.ok) {
      let errorMsg = `Request failed with HTTP status ${response.status}`;
      if (body && typeof body === "object" && "error" in body && typeof body.error === "string") {
        errorMsg = body.error;
      }
      return { status: response.status, error: errorMsg, isMock: false };
    }

    return { status: 200, data: body as SessionDetailData, isMock: false };
  } catch (err) {
    return {
      status: 503,
      error: err instanceof Error ? err.message : "Network error contacting portal service",
      isMock: false,
    };
  }
}

/**
 * Create a new scheduled class session.
 */
export async function createSession(
  payload: SessionCreatePayload,
  idToken?: string
): Promise<ApiResponse<{ sessionId: string; state: string }>> {
  if (isMockModeEnabled()) {
    if (!payload.offeringId || !payload.sessionDate) {
      return { status: 400, error: "Provide a valid offeringId and sessionDate (YYYY-MM-DD).", isMock: true };
    }

    const newSessionId = `sess-mock-${Date.now().toString(36)}`;
    const offering = mutableLecturerDashboard.offerings.find((o) => o.id === payload.offeringId);

    const newSummary: LecturerSessionSummary = {
      id: newSessionId,
      offeringId: payload.offeringId,
      courseCode: offering?.courseCode ?? null,
      courseTitle: offering?.courseTitle ?? payload.offeringId,
      sessionDate: payload.sessionDate,
      startTime: payload.startTime ?? null,
      endTime: payload.endTime ?? null,
      room: payload.room ?? null,
      state: "scheduled",
      status: "scheduled",
      totalCount: SYNTHETIC_STUDENT_ROSTER.length,
      totalEligible: SYNTHETIC_STUDENT_ROSTER.length,
      createdAt: new Date().toISOString(),
    };

    mutableLecturerDashboard.sessions.unshift(newSummary);

    mutableSessionDetails[newSessionId] = {
      isSynthetic: true,
      session: {
        id: newSessionId,
        offeringId: payload.offeringId,
        courseCode: offering?.courseCode ?? null,
        courseTitle: offering?.courseTitle ?? payload.offeringId,
        sessionDate: payload.sessionDate,
        startTime: payload.startTime,
        endTime: payload.endTime,
        room: payload.room,
        state: "scheduled",
        status: "scheduled",
        totalCount: SYNTHETIC_STUDENT_ROSTER.length,
      },
      offering: offering ?? {
        id: payload.offeringId,
        courseId: "course",
        courseCode: null,
        courseTitle: payload.offeringId,
        term: "2026-S1",
        batch: "2026",
        programme: "CSE",
        enrolledCount: SYNTHETIC_STUDENT_ROSTER.length,
        active: true,
      },
      roster: SYNTHETIC_STUDENT_ROSTER,
      totalCount: SYNTHETIC_STUDENT_ROSTER.length,
    };

    return {
      status: 201,
      data: { sessionId: newSessionId, state: "scheduled" },
      isMock: true,
    };
  }

  if (!idToken || !idToken.trim()) {
    return { status: 401, error: "Authentication required", isMock: false };
  }

  try {
    const response = await fetch("/api/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${idToken.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const { body, safeError } = await extractResponseBody(response);
    if (!response.ok) {
      let errorMsg = safeError || `Request failed with status ${response.status}`;
      if (body && typeof body === "object" && "error" in body && typeof body.error === "string") {
        errorMsg = body.error;
      }
      return { status: response.status, error: errorMsg, isMock: false };
    }

    return {
      status: response.status,
      data: body as { sessionId: string; state: string },
      isMock: false,
    };
  } catch (err) {
    return {
      status: 503,
      error: err instanceof Error ? err.message : "Failed to create session",
      isMock: false,
    };
  }
}

/**
 * Submit roll-call attendance marks for every enrolled student in a scheduled session.
 */
export async function submitAttendance(
  sessionId: string,
  payload: AttendanceSubmissionPayload,
  idToken?: string
): Promise<ApiResponse<{ sessionId: string; state: string; recorded: number }>> {
  if (isMockModeEnabled()) {
    const sess = mutableLecturerDashboard.sessions.find((s) => s.id === sessionId);
    const detail = mutableSessionDetails[sessionId] ?? SYNTHETIC_SESSION_DETAILS[sessionId];

    if (!sess && !detail) {
      return { status: 404, error: "Session not found.", isMock: true };
    }

    if ((sess && sess.state !== "scheduled") || (detail && detail.session.state !== "scheduled")) {
      return { status: 400, error: "This session is already completed or cancelled.", isMock: true };
    }

    const marks: Array<{ studentUid: string; mark: AttendanceMark }> =
      payload.marks ??
      (payload.records?.map((r) => ({ studentUid: r.studentUid, mark: r.status })) ?? []);

    if (!marks.length || marks.length < SYNTHETIC_STUDENT_ROSTER.length) {
      return {
        status: 400,
        error: "Submission must include attendance marks for all enrolled students.",
        isMock: true,
      };
    }

    let presentCount = 0;
    let absentCount = 0;
    for (const m of marks) {
      if (m.mark === "present") presentCount++;
      else if (m.mark === "absent") absentCount++;
    }

    if (sess) {
      sess.state = "completed";
      sess.status = "completed";
      sess.presentCount = presentCount;
      sess.absentCount = absentCount;
      sess.totalCount = marks.length;
      sess.totalEligible = marks.length;
    }

    if (detail) {
      detail.session.state = "completed";
      detail.session.status = "completed";
      detail.session.completedAt = new Date().toISOString();
      detail.session.completedBy = "synthetic-lecturer-uid";
      detail.presentCount = presentCount;
      detail.absentCount = absentCount;
      detail.totalCount = marks.length;
      detail.roster = detail.roster.map((s) => {
        const found = marks.find((m) => m.studentUid === s.studentUid);
        return {
          ...s,
          status: found?.mark ?? "absent",
        };
      });
      detail.marks = marks.map((m) => {
        const student = SYNTHETIC_STUDENT_ROSTER.find((s) => s.studentUid === m.studentUid);
        return {
          studentUid: m.studentUid,
          rollNumber: student?.rollNumber ?? m.studentUid,
          name: student?.name ?? null,
          mark: m.mark,
          recordedAt: new Date().toISOString(),
        };
      });
      mutableSessionDetails[sessionId] = detail;
    }

    return {
      status: 200,
      data: { sessionId, state: "completed", recorded: marks.length },
      isMock: true,
    };
  }

  if (!idToken || !idToken.trim()) {
    return { status: 401, error: "Authentication required", isMock: false };
  }

  try {
    // If payload has records instead of marks, convert for backend
    const bodyPayload = payload.marks
      ? payload
      : {
          marks:
            payload.records?.map((r) => ({
              studentUid: r.studentUid,
              mark: r.status,
            })) ?? [],
        };

    const response = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}/attendance`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${idToken.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bodyPayload),
    });

    const { body, safeError } = await extractResponseBody(response);
    if (!response.ok) {
      let errorMsg = safeError || `Request failed with status ${response.status}`;
      if (body && typeof body === "object" && "error" in body && typeof body.error === "string") {
        errorMsg = body.error;
      }
      return { status: response.status, error: errorMsg, isMock: false };
    }

    return {
      status: response.status,
      data: body as { sessionId: string; state: string; recorded: number },
      isMock: false,
    };
  } catch (err) {
    return {
      status: 503,
      error: err instanceof Error ? err.message : "Failed to submit attendance",
      isMock: false,
    };
  }
}

/**
 * Cancel a scheduled class session with a reasoned explanation.
 */
export async function cancelSession(
  sessionId: string,
  payload: SessionCancelPayload,
  idToken?: string
): Promise<ApiResponse<{ sessionId: string; state: string }>> {
  if (isMockModeEnabled()) {
    const reason = (payload.reason ?? "").trim();
    if (reason.length < 5 || reason.length > 300) {
      return { status: 400, error: "Cancellation reason must be between 5 and 300 characters.", isMock: true };
    }

    const sess = mutableLecturerDashboard.sessions.find((s) => s.id === sessionId);
    if (sess) {
      sess.state = "cancelled";
      sess.status = "cancelled";
      sess.cancellationReason = reason;
    }

    const detail = mutableSessionDetails[sessionId] ?? SYNTHETIC_SESSION_DETAILS[sessionId];
    if (detail) {
      detail.session.state = "cancelled";
      detail.session.status = "cancelled";
      detail.session.cancellationReason = reason;
      detail.session.cancelledAt = new Date().toISOString();
      detail.session.cancelledBy = "synthetic-lecturer-uid";
      mutableSessionDetails[sessionId] = detail;
    }

    return {
      status: 200,
      data: { sessionId, state: "cancelled" },
      isMock: true,
    };
  }

  if (!idToken || !idToken.trim()) {
    return { status: 401, error: "Authentication required", isMock: false };
  }

  try {
    const response = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}/cancel`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${idToken.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const { body, safeError } = await extractResponseBody(response);
    if (!response.ok) {
      let errorMsg = safeError || `Request failed with status ${response.status}`;
      if (body && typeof body === "object" && "error" in body && typeof body.error === "string") {
        errorMsg = body.error;
      }
      return { status: response.status, error: errorMsg, isMock: false };
    }

    return {
      status: response.status,
      data: body as { sessionId: string; state: string },
      isMock: false,
    };
  } catch (err) {
    return {
      status: 503,
      error: err instanceof Error ? err.message : "Failed to cancel session",
      isMock: false,
    };
  }
}
