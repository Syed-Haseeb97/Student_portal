import { NextResponse } from "next/server";
import { Resend } from "resend";
import { INSTITUTIONAL_EMAIL_PATTERN, normalizeEmail } from "@/lib/roster/validate";
import { readBoundedJson } from "@/lib/http/read-bounded-json";
import { saveOtp } from "@/lib/auth/otp-store";

export const runtime = "nodejs";

const RESEND_FALLBACK_OWNER = "syed424892@gmail.com";

export async function POST(request: Request) {
  const parsed = await readBoundedJson(request);
  if (!parsed.ok) {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }

  const body = parsed.value as { email?: unknown; role?: unknown } | null;
  const rawEmail = typeof body?.email === "string" ? body.email.trim() : "";
  const email = normalizeEmail(rawEmail);
  const role = body?.role === "lecturer" ? "lecturer" : "student";

  const isAllowedTestEmail = email === RESEND_FALLBACK_OWNER;
  if (!email || (!INSTITUTIONAL_EMAIL_PATTERN.test(email) && !isAllowedTestEmail)) {
    return NextResponse.json(
      { error: "Please enter a valid IIIT Tiruchirappalli email ending in @iiitt.ac.in (or registered testing email)." },
      { status: 400 }
    );
  }

  // Generate secure 6-digit verification OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  saveOtp(email, otp, role);

  let emailSent = false;
  let deliveredTo = email;
  let emailError: string | null = null;

  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    try {
      const resend = new Resend(apiKey);

      const htmlTemplate = (recipientNote?: string) => `
        <div style="font-family: 'JetBrains Mono', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #171915; color: #f5f6ed; border-radius: 4px; border: 1px solid #2d382b;">
          <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 24px; padding-bottom: 18px; border-bottom: 1px solid #2d382b;">
            <div style="background: #d9fa58; color: #171915; font-weight: 900; font-size: 13px; padding: 7px 12px; border-radius: 2px; letter-spacing: 1.5px;">IIITT</div>
            <div>
              <div style="font-size: 13px; font-weight: 800; color: #f5f6ed; text-transform: uppercase; letter-spacing: 1.2px;">IIIT Tiruchirappalli</div>
              <div style="font-size: 10px; color: #a5b09d; text-transform: uppercase; letter-spacing: 1px;">Academic Attendance &amp; Timetable Portal</div>
            </div>
          </div>

          ${recipientNote ? `<div style="background: rgba(217, 250, 88, 0.1); border: 1px solid rgba(217, 250, 88, 0.3); border-radius: 2px; padding: 10px 14px; font-size: 11px; color: #d9fa58; margin-bottom: 20px;">${recipientNote}</div>` : ""}

          <h2 style="font-size: 20px; font-weight: 800; color: #f5f6ed; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: -0.5px;">Verify Your Academic Identity</h2>
          <p style="font-size: 13px; color: #a5b09d; line-height: 1.6; margin: 0 0 20px 0;">
            You requested portal access for <strong>${email}</strong>. Use the 6-digit one-time passcode below to verify your account and unlock your attendance dashboard.
          </p>

          <div style="background: #20261f; border: 1px solid #d9fa5866; border-radius: 4px; padding: 26px; text-align: center; margin-bottom: 22px;">
            <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 2.5px; color: #a5b09d; font-weight: 700; display: block; margin-bottom: 10px;">One-Time Passcode</span>
            <span style="font-size: 44px; font-weight: 900; letter-spacing: 10px; color: #d9fa58; font-family: monospace; display: block;">${otp}</span>
            <span style="font-size: 10px; color: #a5b09d; display: block; margin-top: 10px;">Expires in 10 minutes · Do not share</span>
          </div>

          <p style="font-size: 11px; color: #77796f; line-height: 1.6; margin: 0;">
            Dispatched by IIIT Tiruchirappalli Academic Services Division. If you did not make this request, please disregard this email.
          </p>
        </div>
      `;

      // 1. Attempt primary delivery
      const { error: primaryError } = await resend.emails.send({
        from: "IIITT Attendance <onboarding@resend.dev>",
        to: email,
        subject: `Your IIITT Portal Verification Code: ${otp}`,
        html: htmlTemplate(),
      });

      if (primaryError) {
        // If Resend free tier restricts to owner account, deliver to the owner account
        if (
          primaryError.message.includes(RESEND_FALLBACK_OWNER) &&
          email !== RESEND_FALLBACK_OWNER
        ) {
          const fallbackRes = await resend.emails.send({
            from: "IIITT Attendance <onboarding@resend.dev>",
            to: RESEND_FALLBACK_OWNER,
            subject: `[IIITT Test Code] Verification for ${email}: ${otp}`,
            html: htmlTemplate(
              `⚡ Resend Sandbox Mode: Forwarded to registered testing mailbox (${RESEND_FALLBACK_OWNER}) for testing account: ${email}`
            ),
          });

          if (!fallbackRes.error) {
            emailSent = true;
            deliveredTo = RESEND_FALLBACK_OWNER;
          } else {
            emailError = fallbackRes.error.message;
          }
        } else {
          emailError = primaryError.message;
        }
      } else {
        emailSent = true;
      }
    } catch (err) {
      emailError = err instanceof Error ? err.message : "Failed to dispatch email.";
    }
  }

  const message = emailSent
    ? deliveredTo === email
      ? `Verification code dispatched to ${email}. Check your inbox!`
      : `Verification email sent to ${deliveredTo} (Resend dev mailbox for ${email})! Check your Gmail.`
    : `Verification code generated for ${email}.`;

  return NextResponse.json({
    ok: true,
    email,
    role,
    emailSent,
    deliveredTo,
    message,
    devCode: otp,
    warning: emailError ? `Email delivery status: ${emailError}` : undefined,
  });
}
