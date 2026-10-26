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
 *   Does NOT fall back to synthetic data on failure, preserving error fidelity.
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
          error: "Malformed JSON response received from portal server",
          isMock: false,
        };
      }
    } else {
      const text = await response.text().catch(() => "");
      return {
        status: response.status || 502,
        error: text || `Server returned non-JSON response with HTTP status ${response.status}`,
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

    // Validate expected shape: { student, policy, summaries }
    const parsed = body as Partial<StudentDashboardData>;
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !parsed.student ||
      !parsed.policy ||
      !Array.isArray(parsed.summaries)
    ) {
      return {
        status: 502,
        error: "Malformed dashboard response: missing student, policy, or summaries fields",
        isMock: false,
      };
    }

    // Normalize each summary's status to ensure compatibility with backend (which might emit "below_threshold")
    const normalizedSummaries: CourseSummary[] = parsed.summaries.map((s) => ({
      ...s,
      status: normalizeAttendanceStatus(s.status),
    }));

    return {
      status: 200,
      data: {
        ...parsed,
        summaries: normalizedSummaries,
      } as StudentDashboardData,
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
