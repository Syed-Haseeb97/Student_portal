import nodemailer, { type Transporter } from "nodemailer";
import { Resend } from "resend";

export type EmailProvider = "gmail" | "resend";

let customTransport: Transporter | null = null;

/**
 * For automated testing: override the nodemailer transport with a mock.
 */
export function setCustomMailTransportForTesting(transport: Transporter | null): void {
  customTransport = transport;
}

/**
 * Extracts raw email address from header formats like 'Name <email@domain.com>' or 'email@domain.com'.
 */
export function extractAddress(fromHeader: string): string {
  if (!fromHeader) return "";
  const match = fromHeader.match(/<([^>]+)>/);
  if (match) return match[1].trim().toLowerCase();
  const emailMatch = fromHeader.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (emailMatch) return emailMatch[1].trim().toLowerCase();
  return fromHeader.trim().toLowerCase();
}

/**
 * Determines active outbound email provider based on environment configuration.
 */
export function getEmailProvider(): EmailProvider {
  const explicit = process.env.EMAIL_PROVIDER?.trim().toLowerCase();
  if (explicit === "gmail" || explicit === "resend") {
    return explicit;
  }
  if (process.env.GMAIL_USER || process.env.GMAIL_APP_PASSWORD) {
    return "gmail";
  }
  return "resend";
}

/**
 * Checks whether the active email provider has all required credentials populated.
 */
export function isProviderConfigured(provider: EmailProvider = getEmailProvider()): boolean {
  if (provider === "gmail") {
    return Boolean(process.env.GMAIL_USER?.trim() && process.env.GMAIL_APP_PASSWORD?.trim());
  }
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

/**
 * Validates the email provider configuration and consistency.
 */
export function validateEmailConfig(): { valid: boolean; error?: string } {
  const provider = getEmailProvider();

  if (provider === "gmail") {
    const user = process.env.GMAIL_USER?.trim();
    const pass = process.env.GMAIL_APP_PASSWORD?.trim();
    const from = process.env.EMAIL_FROM?.trim();

    if (!user) {
      return { valid: false, error: "GMAIL_USER is required when EMAIL_PROVIDER=gmail." };
    }
    if (!pass) {
      return { valid: false, error: "GMAIL_APP_PASSWORD is required when EMAIL_PROVIDER=gmail." };
    }
    if (!from) {
      return { valid: false, error: "EMAIL_FROM is required when EMAIL_PROVIDER=gmail and must match GMAIL_USER." };
    }

    const fromAddress = extractAddress(from);
    const userAddress = user.toLowerCase();

    if (fromAddress !== userAddress) {
      return {
        valid: false,
        error: `EMAIL_FROM address mismatch: "${fromAddress}" does not match GMAIL_USER "${userAddress}". When EMAIL_PROVIDER=gmail, EMAIL_FROM must use the authenticated Gmail address.`,
      };
    }

    return { valid: true };
  }

  // Resend provider validation
  const key = process.env.RESEND_API_KEY?.trim();
  if (process.env.NODE_ENV === "production" && !key) {
    return { valid: false, error: "RESEND_API_KEY is required in production when EMAIL_PROVIDER=resend." };
  }

  return { valid: true };
}

/**
 * Sanitizes an error message by scrubbing sensitive credentials (passwords, keys, tokens).
 */
export function sanitizeErrorMessage(err: unknown): string {
  if (!err) return "Unknown email transport error";
  let msg = err instanceof Error ? err.message : String(err);

  const sensitive = [
    process.env.GMAIL_APP_PASSWORD,
    process.env.RESEND_API_KEY,
  ].filter((s): s is string => Boolean(s && s.length > 3));

  for (const secret of sensitive) {
    msg = msg.replaceAll(secret, "[REDACTED]");
  }

  // Redact potential password/credential patterns in error traces
  msg = msg.replace(/(pass(?:word)?|auth|key|secret|token)\s*[:=]\s*['"]?[^\s'"]+/gi, "$1: [REDACTED]");

  return msg;
}

export interface SendPortalEmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
  from?: string;
}

/**
 * Sends an email using either Gmail SMTP or Resend based on active provider configuration.
 */
export async function sendPortalEmail({
  to,
  subject,
  html,
  text,
  from,
}: SendPortalEmailOptions): Promise<{ success: boolean; messageId?: string }> {
  const provider = getEmailProvider();
  const validation = validateEmailConfig();

  if (!validation.valid) {
    throw new Error(`Email configuration error: ${validation.error}`);
  }

  const emailFrom = from || process.env.EMAIL_FROM || (provider === "gmail" ? process.env.GMAIL_USER : "IIITT Portal <attendance@iiitt.ac.in>");

  if (provider === "gmail") {
    const createTransporter = (port = 465, secure = true) =>
      customTransport ||
      nodemailer.createTransport({
        host: "smtp.gmail.com",
        port,
        secure,
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
        connectionTimeout: 30000,
        greetingTimeout: 30000,
        socketTimeout: 45000,
      });

    try {
      const transporter = createTransporter(465, true);
      const info = await transporter.sendMail({
        from: emailFrom,
        to,
        subject,
        html,
        text,
      });
      return { success: true, messageId: info.messageId };
    } catch (firstErr) {
      if (customTransport) {
        const sanitized = sanitizeErrorMessage(firstErr);
        console.error(`[SMTP ERROR] Gmail delivery failed: ${sanitized}`);
        throw new Error(sanitized);
      }

      console.warn(`[SMTP RETRY] Port 465 failed (${(firstErr as Error)?.message}), retrying via STARTTLS port 587...`);
      try {
        const fallbackTransporter = createTransporter(587, false);
        const retryInfo = await fallbackTransporter.sendMail({
          from: emailFrom,
          to,
          subject,
          html,
          text,
        });
        return { success: true, messageId: retryInfo.messageId };
      } catch (retryErr) {
        const sanitized = sanitizeErrorMessage(retryErr);
        console.error(`[SMTP ERROR] Gmail delivery failed on retry: ${sanitized}`);
        throw new Error(sanitized);
      }
    }
  }

  // Resend provider
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  try {
    const resend = new Resend(resendKey);
    const result = await resend.emails.send({
      from: emailFrom!,
      to,
      subject,
      html,
      text,
    });

    if (result.error) {
      const sanitized = sanitizeErrorMessage(result.error);
      console.error(`[RESEND ERROR] Delivery failed: ${sanitized}`);
      throw new Error(sanitized);
    }

    return { success: true, messageId: result.data?.id };
  } catch (err) {
    const sanitized = sanitizeErrorMessage(err);
    console.error(`[RESEND ERROR] Delivery failed: ${sanitized}`);
    throw new Error(sanitized);
  }
}
