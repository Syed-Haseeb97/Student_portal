/**
 * IIIT Tiruchirappalli Student Portal
 * Typed API Client & Service Abstraction
 *
 * Provides a clean interface between the UI and backend routes.
 * When real Firebase credentials / backend are not configured, or when
 * NEXT_PUBLIC_ENABLE_MOCK_API is enabled, it returns clearly identified synthetic data.
 * When mock mode is disabled, it strictly enforces authentication and surfaces real API errors.
 */

import type { ApiResponse, StudentDashboardData } from "./types";
import { SYNTHETIC_STUDENT } from "./mock-data";

export function isMockModeEnabled(): boolean {
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_ENABLE_MOCK_API === "false") {
    return false;
  }
  // If Firebase API key is not configured, fall back to mock mode safely
  const hasFirebaseConfig = Boolean(
    typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  );
  return !hasFirebaseConfig || process.env.NEXT_PUBLIC_ENABLE_MOCK_API === "true";
}

/**
 * Fetch student dashboard attendance and policy data.
 * - When mock mode is active, returns synthetic student data marked with isMock: true.
 * - When in real API mode, requires a valid ID token and calls GET /api/student/dashboard.
 *   Does NOT fall back to synthetic data on failure, preserving error fidelity.
 */
export async function getStudentDashboard(
  idToken?: string
): Promise<ApiResponse<StudentDashboardData>> {
  if (isMockModeEnabled()) {
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
      const errorMsg =
        body && typeof body === "object" && "error" in body && typeof body.error === "string"
          ? body.error
          : `Request failed with HTTP status ${response.status}`;
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

    return {
      status: 200,
      data: parsed as StudentDashboardData,
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
