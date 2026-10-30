import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebase/admin";
import { readBoundedJson } from "@/lib/http/read-bounded-json";
import { normalizeEmail, INSTITUTIONAL_EMAIL_PATTERN, isAuthorizedPortalEmail } from "@/lib/roster/validate";
import { enforceRateLimit, releaseRateLimit } from "@/lib/auth/rate-limit";
import {
  getEmailProvider,
  isProviderConfigured,
  sendPortalEmail,
  sanitizeErrorMessage,
} from "@/lib/email/mailer";

const GENERIC_RESPONSE = {
  ok: true,
  message: "If your email is registered, a sign-in link has been sent to your institutional inbox.",
};

function buildEmailHtml(signInLink: string, recipientEmail: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>IIIT Trichy Attendance Portal Sign-In</title>
</head>
<body style="margin: 0; padding: 32px 16px; background-color: #171915; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f5f6ed;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 540px; background-color: #20261f; border: 1px solid #2d382b; border-radius: 4px; overflow: hidden; padding: 32px;">
    <tr>
      <td>
        <div style="font-family: monospace; font-size: 11px; letter-spacing: 0.15em; color: #d9fa58; text-transform: uppercase; margin-bottom: 8px;">
          INDIAN INSTITUTE OF INFORMATION TECHNOLOGY TIRUCHIRAPPALLI
        </div>
        <h1 style="font-size: 20px; font-weight: 700; color: #f5f6ed; margin: 0 0 16px 0; letter-spacing: -0.01em;">
          Sign-in to Academic Attendance Portal
        </h1>
        <p style="font-size: 14px; line-height: 1.6; color: #a5b09d; margin: 0 0 24px 0;">
          A sign-in request was initiated for <strong style="color: #f5f6ed;">${recipientEmail}</strong>. Click the button below to complete authentication. This one-time link is valid for 15 minutes.
        </p>
        <div style="margin: 28px 0;">
          <a href="${signInLink}" style="display: inline-block; background-color: #d9fa58; color: #171915; font-weight: 700; font-size: 13px; text-decoration: none; padding: 12px 24px; border-radius: 3px; letter-spacing: 0.02em;">
            COMPLETE INSTANT SIGN-IN &rarr;
          </a>
        </div>
        <p style="font-size: 12px; line-height: 1.5; color: #a5b09d; margin: 24px 0 0 0; border-top: 1px solid #2d382b; padding-top: 16px;">
          If the button above does not work, copy and paste this link into your browser:<br>
          <a href="${signInLink}" style="color: #d9fa58; word-break: break-all; font-size: 11px; font-family: monospace;">${signInLink}</a>
        </p>
        <p style="font-size: 11px; color: #717d69; margin: 20px 0 0 0;">
          If you did not request this link, you can safely ignore this email. Access is strictly restricted to verified @iiitt.ac.in institutional accounts.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export const runtime = "nodejs";
export const maxDuration = 15;

export async function POST(request: Request) {
  try {
  // 1. Enforce payload size limit (max 1KB for email payload)
  const jsonResult = await readBoundedJson(request, 1024);
  if (!jsonResult.ok) {
    return NextResponse.json(
      { error: "Malformed or oversized request body." },
      { status: 400 }
    );
  }

  const body = jsonResult.value as Record<string, unknown>;
  const rawEmail = typeof body?.email === "string" ? body.email : "";
  const email = normalizeEmail(rawEmail);

  // 2. Validate email domain pattern or official faculty roster
  if (!email || !isAuthorizedPortalEmail(email)) {
    return NextResponse.json(
      { error: "A valid institutional @iiitt.ac.in or authorized faculty email address is required." },
      { status: 400 }
    );
  }

  // 3. Extract IP for rate limiting
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : (request.headers.get("x-real-ip") || "127.0.0.1");

  // 4. Rate limiting: max 3 requests per 15 minutes per email, 5 per IP
  const emailLimit = await enforceRateLimit("email", email, 3, 900);
  const ipLimit = await enforceRateLimit("ip", ip, 5, 900);

  if (!emailLimit.allowed || !ipLimit.allowed) {
    const retryAfter = Math.max(emailLimit.retryAfterSeconds, ipLimit.retryAfterSeconds);
    return NextResponse.json(
      {
        error: "Too many sign-in link requests. Please wait before trying again.",
        retryAfter,
      },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfter) },
      }
    );
  }

  // 5. Handle mock mode
  const isMock = process.env.NEXT_PUBLIC_ENABLE_MOCK_API === "true";
  if (isMock) {
    console.log(`[MOCK MODE] Sign-in link requested for ${email}. Simulating successful delivery.`);
    return NextResponse.json(GENERIC_RESPONSE, { status: 200 });
  }

  const provider = getEmailProvider();
  const isConfigured = isProviderConfigured(provider);
  const isEmulator = Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST);
  const isProduction = process.env.NODE_ENV === "production";

  // In production without an active emulator, unconfigured provider is a fatal 503.
  // Never log the sign-in link or credentials in production.
  if (!isConfigured && !isEmulator && isProduction) {
    console.error(`[FATAL] ${provider.toUpperCase()} email provider is not configured in production environment.`);
    return NextResponse.json(
      { error: "Email delivery service is currently unavailable. Please contact the administrator." },
      { status: 503 }
    );
  }

  // 6. Generate action link with Firebase Admin SDK
  let link: string;
  try {
    const proto = request.headers.get("x-forwarded-proto") || "https";
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
    const detectedUrl = host ? `${proto}://${host}` : undefined;
    const configuredUrl = process.env.APP_URL && !process.env.APP_URL.includes("localhost")
      ? process.env.APP_URL
      : process.env.NEXT_PUBLIC_FIREBASE_EMAIL_LINK_REDIRECT_URL && !process.env.NEXT_PUBLIC_FIREBASE_EMAIL_LINK_REDIRECT_URL.includes("localhost")
      ? process.env.NEXT_PUBLIC_FIREBASE_EMAIL_LINK_REDIRECT_URL
      : undefined;

    const baseUrl = configuredUrl || detectedUrl || process.env.APP_URL || "http://localhost:3000";
    const redirectBase = baseUrl.endsWith("/sign-in/finish")
      ? baseUrl
      : `${baseUrl.replace(/\/$/, "")}/sign-in/finish`;

    const redirectUrl = redirectBase.includes("?")
      ? `${redirectBase}&email=${encodeURIComponent(email)}`
      : `${redirectBase}?email=${encodeURIComponent(email)}`;

    const { auth } = getFirebaseAdmin();
    link = await auth.generateSignInWithEmailLink(email, {
      url: redirectUrl,
      handleCodeInApp: true,
    });
  } catch (authError) {
    await releaseRateLimit("email", email);
    await releaseRateLimit("ip", ip);
    const sanitized = sanitizeErrorMessage(authError);
    console.error("Firebase Admin failed to generate sign-in link:", sanitized);
    if (!isProduction) {
      return NextResponse.json({ error: sanitized }, { status: 500 });
    }
    return NextResponse.json(GENERIC_RESPONSE, { status: 200 });
  }

  // 7. Non-production / emulator fallback: log link to server console
  if (!isConfigured || isEmulator) {
    console.log("\n=======================================================");
    console.log(" [DEV / EMULATOR SIGN-IN LINK]");
    console.log(` Recipient: ${email}`);
    console.log(` Action URL: ${link}`);
    console.log(" Open the URL above in your browser to complete sign-in.");
    console.log("=======================================================\n");
    return NextResponse.json(GENERIC_RESPONSE, { status: 200 });
  }

  // 8. Live mode: dispatch email via configured provider
  try {
    await sendPortalEmail({
      to: email,
      subject: "IIIT Trichy Attendance Portal — Sign-In Link",
      html: buildEmailHtml(link, email),
      text: `Sign in to IIIT Trichy Academic Attendance Portal\n\nClick the link below to sign in:\n${link}\n\nThis link expires in 15 minutes. Restricted to verified @iiitt.ac.in accounts.`,
    });

    return NextResponse.json(GENERIC_RESPONSE, { status: 200 });
  } catch (dispatchError) {
    // On dispatch failure, do not consume rate limit attempt
    await releaseRateLimit("email", email);
    await releaseRateLimit("ip", ip);

    const sanitized = sanitizeErrorMessage(dispatchError);
    console.error(`[EMAIL DELIVERY FAILURE] Failed to send sign-in link to ${email}: ${sanitized}`);

    if (process.env.NODE_ENV === "development") {
      return NextResponse.json({ error: sanitized }, { status: 500 });
    }

    // Generic response in production to maintain anti-enumeration and user privacy
    return NextResponse.json(GENERIC_RESPONSE, { status: 200 });
  }
  } catch (outerErr) {
    const sanitized = sanitizeErrorMessage(outerErr);
    console.error("[CRITICAL SEND-LINK ERROR]", sanitized);
    return NextResponse.json(
      { error: process.env.NODE_ENV === "development" ? sanitized : "Authentication service encountered an unexpected error. Please verify server configuration." },
      { status: 500 }
    );
  }
}