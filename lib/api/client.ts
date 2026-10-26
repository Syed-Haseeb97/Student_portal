/**
 * IIIT Tiruchirappalli Student Portal
 * Typed API Client & Service Abstraction
 *
 * Provides a clean interface between the UI and backend routes.
 * When real Firebase credentials / backend are not configured, or when
 * NEXT_PUBLIC_ENABLE_MOCK_API is enabled, it returns clearly identified synthetic data.
 * When mock mode is disabled, it strictly enforces authentication and surfaces real API errors.
 */

import type { ApiResponse, StudentDashboardData, CourseSummary } from "./types";
import { normalizeAttendanceStatus } from "./types";
import { SYNTHETIC_STUDENT, SYNTHETIC_EMPTY_STUDENT } from "./mock-data";

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

  const summaries: CourseSummary[] = [];
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
    summaries.push({ ...item, status } as CourseSummary);
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

/**
 * Fetch student dashboard attendance and policy data.
 * - When mock mode is active, returns synthetic student data marked with isMock: true.
 * - When in real API mode, requires a valid ID token and calls GET /api/student/dashboard.
 *   Does NOT fall back to synthetic data on failure, preserving error fidelity without leaking raw internals.
 */
export async function getStudentDashboard(
  idToken?: string,
  options?: { mockScenario?: MockScenario }
): Promise<ApiResponse<StudentDashboardData>> {
  if (isMockModeEnabled()) {
    const scenario = options?.mockScenario ?? "normal";
    if (scenario === "empty") {
      return {
        status: 200,
        data: SYNTHETIC_EMPTY_STUDENT,
        isMock: true,
      };
    }
    if (scenario === "unauthorized") {
      return {
        status: 403,
        error: "This email is not uniquely matched to an active approved student roster entry. Contact the portal administrator.",
        isMock: true,
      };
    }
    if (scenario === "error") {
      return {
        status: 503,
        error: "Unable to load attendance data right now. Please retry.",
        isMock: true,
      };
    }
    return {
      status: 200,
      data: SYNTHETIC_STUDENT,
      isMock: true,
    };
  }

  // Real API path requires an active Firebase ID token
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

    const contentType = response.headers.get("content-type") ?? "";
    let body: unknown = null;

    if (contentType.includes("application/json")) {
      try {
        body = await response.json();
      } catch {
        return {
          status: response.status || 502,
          error: "Malformed JSON response received from portal server.",
          isMock: false,
        };
      }
    } else {
      const text = await response.text().catch(() => "");
      const isHtml = text.trim().startsWith("<") || text.includes("<html");
      const safeError = isHtml || !text.trim()
        ? `Server returned an unexpected response (status ${response.status}).`
        : text.trim().slice(0, 200);

      return {
        status: response.status || 502,
        error: safeError,
        isMock: false,
      };
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
      return {
        status: response.status,
        error: errorMsg,
        isMock: false,
      };
    }

    const parsed = parseDashboardData(body);
    if (!parsed) {
      return {
        status: 502,
        error: "Malformed dashboard response: fields do not match the attendance API contract.",
        isMock: false,
      };
    }

    return {
      status: 200,
      data: parsed,
      isMock: false,
    };
  } catch (err) {
    return {
      status: 503,
      error: err instanceof Error ? err.message : "Network error contacting portal service",
      isMock: false,
    };
  }
}
