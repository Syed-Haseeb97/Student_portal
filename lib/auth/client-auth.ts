"use client";

export interface PortalUser {
  uid: string;
  email: string;
  role: "student" | "lecturer" | "admin";
  rollNumber: string;
  name: string;
  verifiedAt: string;
}

const STORAGE_KEY = "iiitt_portal_session";

export function getStoredUser(): PortalUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PortalUser;
  } catch {
    return null;
  }
}

export function setStoredUser(user: PortalUser): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } catch (err) {
    console.error("Failed to persist session:", err);
  }
}

export function clearStoredUser(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error("Failed to clear session:", err);
  }
}

export async function requestVerificationCode(
  email: string,
  role: "student" | "lecturer" = "student"
): Promise<{
  ok: boolean;
  message: string;
  devCode?: string;
  emailSent?: boolean;
  warning?: string;
  error?: string;
}> {
  try {
    const res = await fetch("/api/auth/send-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, message: data.error || "Failed to send verification code.", error: data.error };
    }
    return {
      ok: true,
      message: data.message,
      devCode: data.devCode,
      emailSent: data.emailSent,
      warning: data.warning,
    };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Network error requesting verification code.",
    };
  }
}

export async function submitVerificationCode(
  email: string,
  code: string
): Promise<{ ok: boolean; user?: PortalUser; redirectUrl?: string; error?: string }> {
  try {
    const res = await fetch("/api/auth/verify-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data.error || "Verification failed." };
    }
    if (data.user) {
      setStoredUser(data.user);
    }
    return {
      ok: true,
      user: data.user,
      redirectUrl: data.redirectUrl,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error during verification.",
    };
  }
}
