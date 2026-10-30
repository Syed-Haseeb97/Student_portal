import { NextResponse } from "next/server";
import { getEmailProvider, isProviderConfigured } from "@/lib/email/mailer";

export const runtime = "nodejs";

export async function GET() {
  const isMock = process.env.NEXT_PUBLIC_ENABLE_MOCK_API === "true";
  const hasServiceAccount = Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  const emailProvider = getEmailProvider();
  const emailConfigured = isProviderConfigured(emailProvider);

  let adminError: string | null = null;
  if (!isMock) {
    try {
      const { getFirebaseAdmin } = await import("@/lib/firebase/admin");
      getFirebaseAdmin();
    } catch (err) {
      adminError = err instanceof Error ? err.message : String(err);
    }
  }

  return NextResponse.json({
    status: "ok",
    node: process.version,
    mockMode: isMock,
    hasServiceAccount,
    emailProvider,
    emailConfigured,
    adminInitialized: !adminError,
    adminError: adminError ? adminError.slice(0, 100) : null,
  });
}
