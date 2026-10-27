interface StoredOtp {
  code: string;
  expiresAt: number;
  role: "student" | "lecturer" | "admin";
  attempts: number;
}

// In-memory server store for one-time verification codes
const otpStore = new Map<string, StoredOtp>();

export function saveOtp(
  email: string,
  code: string,
  role: "student" | "lecturer" | "admin" = "student"
) {
  const normalized = email.trim().toLowerCase();
  otpStore.set(normalized, {
    code,
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    role,
    attempts: 0,
  });
}

export function getOtp(email: string): StoredOtp | null {
  const normalized = email.trim().toLowerCase();
  const entry = otpStore.get(normalized);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    otpStore.delete(normalized);
    return null;
  }
  return entry;
}

export function incrementOtpAttempts(email: string): number {
  const normalized = email.trim().toLowerCase();
  const entry = otpStore.get(normalized);
  if (!entry) return 0;
  entry.attempts++;
  if (entry.attempts >= 5) {
    otpStore.delete(normalized);
    return 5;
  }
  return entry.attempts;
}

export function deleteOtp(email: string) {
  otpStore.delete(email.trim().toLowerCase());
}
