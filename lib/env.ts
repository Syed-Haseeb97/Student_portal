import { getEmailProvider, extractAddress } from "@/lib/email/mailer";

/**
 * Startup and runtime environment validation for IIIT Trichy Attendance Portal.
 * Provides clear, actionable error messages when required configuration is missing.
 */

interface EnvValidationResult {
  valid: boolean;
  missing: string[];
  warnings: string[];
}

export function validatePortalEnv(): EnvValidationResult {
  const isMock = process.env.NEXT_PUBLIC_ENABLE_MOCK_API === "true";
  const missing: string[] = [];
  const warnings: string[] = [];

  if (isMock) {
    return {
      valid: true,
      missing: [],
      warnings: ["Running in MOCK API preview mode. Live Firebase and outbound email services are bypassed."],
    };
  }

  // Server-side checks (when executed in server context)
  if (typeof window === "undefined") {
    const isEmulator = Boolean(
      process.env.FIREBASE_AUTH_EMULATOR_HOST || process.env.FIRESTORE_EMULATOR_HOST
    );

    if (!isEmulator) {
      if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        missing.push("FIREBASE_SERVICE_ACCOUNT_JSON (Required for Firebase Admin SDK live access)");
      }
      if (!process.env.FIREBASE_ADMIN_PROJECT_ID) {
        missing.push("FIREBASE_ADMIN_PROJECT_ID (Expected Firebase project identifier)");
      }
    }

    // Email provider checks
    const provider = getEmailProvider();
    if (provider === "gmail") {
      if (!process.env.GMAIL_USER) {
        missing.push("GMAIL_USER (Required when EMAIL_PROVIDER=gmail)");
      }
      if (!process.env.GMAIL_APP_PASSWORD) {
        missing.push("GMAIL_APP_PASSWORD (16-character App Password required when EMAIL_PROVIDER=gmail)");
      }
      if (!process.env.EMAIL_FROM) {
        missing.push("EMAIL_FROM (Required when EMAIL_PROVIDER=gmail and must match GMAIL_USER)");
      } else if (process.env.GMAIL_USER) {
        const fromAddr = extractAddress(process.env.EMAIL_FROM);
        const userAddr = process.env.GMAIL_USER.trim().toLowerCase();
        if (fromAddr !== userAddr) {
          missing.push(
            `EMAIL_FROM address mismatch: "${fromAddr}" does not match GMAIL_USER "${userAddr}". When EMAIL_PROVIDER=gmail, EMAIL_FROM must use the authenticated Gmail account address.`
          );
        }
      }
    } else {
      // Resend provider
      if (!process.env.RESEND_API_KEY) {
        warnings.push("RESEND_API_KEY is not configured. Outbound emails will fall back to server console logging.");
      }
      if (!process.env.EMAIL_FROM) {
        warnings.push("EMAIL_FROM is not configured. Defaulting to 'IIITT Portal <attendance@iiitt.ac.in>'");
      }
    }

    if (!process.env.APP_URL && !process.env.NEXT_PUBLIC_FIREBASE_EMAIL_LINK_REDIRECT_URL) {
      missing.push("APP_URL or NEXT_PUBLIC_FIREBASE_EMAIL_LINK_REDIRECT_URL (Required for auth email link redirects)");
    }
  }

  // Client-side checks
  const requiredClientVars = [
    "NEXT_PUBLIC_FIREBASE_API_KEY",
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    "NEXT_PUBLIC_FIREBASE_APP_ID",
    "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  ];

  for (const v of requiredClientVars) {
    if (!process.env[v]) {
      missing.push(v);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings,
  };
}

export function assertValidServerEnv(): void {
  const { valid, missing, warnings } = validatePortalEnv();
  for (const warn of warnings) {
    console.warn(`[PORTAL ENV WARNING] ${warn}`);
  }
  if (!valid) {
    const errorMsg = [
      "=================================================================",
      "CRITICAL CONFIGURATION ERROR: Missing required environment variables",
      "=================================================================",
      ...missing.map((m) => ` - ${m}`),
      "",
      "Please configure these variables in your .env.local file or server environment.",
      "See .env.example for documentation on each required variable.",
      "=================================================================",
    ].join("\n");
    throw new Error(errorMsg);
  }
}
