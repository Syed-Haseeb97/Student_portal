import { createHash } from "node:crypto";
import { getFirebaseAdmin } from "@/lib/firebase/admin";

interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

interface MemoryBucket {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, MemoryBucket>();

function cleanupExpiredMemory(): void {
  const now = Date.now();
  for (const [key, bucket] of memoryStore.entries()) {
    if (bucket.resetAt <= now) {
      memoryStore.delete(key);
    }
  }
}

function sanitizeKey(prefix: string, raw: string): string {
  const hash = createHash("sha256").update(raw.trim().toLowerCase()).digest("hex").slice(0, 32);
  return `${prefix}_${hash}`;
}

/**
 * Enforces rate limiting per window (e.g., max 3 attempts per 15 minutes = 900 seconds).
 * Uses in-memory tracking with Firestore persistence fallback when admin SDK is initialized.
 */
export async function enforceRateLimit(
  prefix: string,
  rawKey: string,
  maxAttempts = 3,
  windowSeconds = 900
): Promise<RateLimitResult> {
  cleanupExpiredMemory();
  const key = sanitizeKey(prefix, rawKey);
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  // 1. Check in-memory first
  const bucket = memoryStore.get(key);
  if (bucket) {
    if (bucket.resetAt > now) {
      if (bucket.count >= maxAttempts) {
        return {
          allowed: false,
          retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
        };
      }
      bucket.count += 1;
    } else {
      bucket.count = 1;
      bucket.resetAt = now + windowMs;
    }
  } else {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs });
  }

  // 2. Optional Firestore sync when live (only if configured and not mock)
  if (
    process.env.NEXT_PUBLIC_ENABLE_MOCK_API !== "true" &&
    (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
  ) {
    try {
      const { db } = getFirebaseAdmin();
    const docRef = db.collection("rateLimits").doc(key);
    const snap = await docRef.get();
    if (snap.exists) {
      const data = snap.data();
      const expiresAt = typeof data?.expiresAt === "number" ? data.expiresAt : 0;
      const count = typeof data?.count === "number" ? data.count : 0;
      if (expiresAt > now && count >= maxAttempts) {
        return {
          allowed: false,
          retryAfterSeconds: Math.ceil((expiresAt - now) / 1000),
        };
      }
      if (expiresAt <= now) {
        await docRef.set({ count: 1, expiresAt: now + windowMs });
      } else {
        await docRef.set({ count: count + 1, expiresAt }, { merge: true });
      }
    } else {
      await docRef.set({ count: 1, expiresAt: now + windowMs });
    }
    } catch {
      // If Firestore is unavailable or admin is not configured, in-memory rate limiting remains effective
    }
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

/**
 * Releases (decrements) a consumed rate limit attempt if a downstream operation fails.
 */
export async function releaseRateLimit(prefix: string, rawKey: string): Promise<void> {
  cleanupExpiredMemory();
  const key = sanitizeKey(prefix, rawKey);
  const bucket = memoryStore.get(key);
  if (bucket) {
    if (bucket.count <= 1) {
      memoryStore.delete(key);
    } else {
      bucket.count -= 1;
    }
  }

  if (
    process.env.NEXT_PUBLIC_ENABLE_MOCK_API !== "true" &&
    (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
  ) {
    try {
      const { db } = getFirebaseAdmin();
      const docRef = db.collection("rateLimits").doc(key);
      const snap = await docRef.get();
      if (snap.exists) {
        const data = snap.data();
        const count = typeof data?.count === "number" ? data.count : 0;
        if (count <= 1) {
          await docRef.delete();
        } else {
          await docRef.update({ count: count - 1 });
        }
      }
    } catch {
      // Ignore cleanup error
    }
  }
}
