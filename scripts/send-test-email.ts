import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { sendPortalEmail, getEmailProvider, sanitizeErrorMessage, validateEmailConfig } from "../lib/email/mailer";
import { normalizeEmail, INSTITUTIONAL_EMAIL_PATTERN } from "../lib/roster/validate";

// Auto-load .env.local if not already populated in the process environment
function loadEnvLocal(): void {
  const envPath = resolve(process.cwd(), ".env.local");
  if (existsSync(envPath)) {
    try {
      if (typeof (process as unknown as { loadEnvFile?: (path: string) => void }).loadEnvFile === "function") {
        (process as unknown as { loadEnvFile: (path: string) => void }).loadEnvFile(envPath);
      } else {
        const content = readFileSync(envPath, "utf8");
        for (const line of content.split("\n")) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith("#")) continue;
          const eqIdx = trimmed.indexOf("=");
          if (eqIdx > 0) {
            const key = trimmed.slice(0, eqIdx).trim();
            let val = trimmed.slice(eqIdx + 1).trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
              val = val.slice(1, -1);
            }
            if (!process.env[key]) {
              process.env[key] = val;
            }
          }
        }
      }
    } catch {
      // Ignore reading error
    }
  }
}

async function main() {
  loadEnvLocal();

  const recipientArg = process.argv[2];
  if (!recipientArg) {
    console.error("Usage: npx tsx scripts/send-test-email.ts <recipient@iiitt.ac.in>");
    process.exit(1);
  }

  const recipient = normalizeEmail(recipientArg);
  if (!recipient || !INSTITUTIONAL_EMAIL_PATTERN.test(recipient)) {
    console.error(`[ERROR] Invalid recipient: "${recipientArg}". Must be a valid institutional @iiitt.ac.in address.`);
    process.exit(1);
  }

  const provider = getEmailProvider();
  const validation = validateEmailConfig();
  if (!validation.valid) {
    console.error(`[CONFIG ERROR] ${validation.error}`);
    process.exit(1);
  }

  const timestamp = new Date().toISOString();
  console.log(`Dispatching test verification email to ${recipient} via ${provider.toUpperCase()}...`);

  try {
    const result = await sendPortalEmail({
      to: recipient,
      subject: "IIIT Trichy Attendance Portal — SMTP Diagnostic Test",
      html: `
        <div style="font-family: sans-serif; max-width: 500px; padding: 24px; background: #171915; color: #f5f6ed; border-radius: 4px;">
          <h2 style="color: #d9fa58; margin-top: 0;">IIIT Trichy Attendance Portal</h2>
          <p>This is an automated SMTP diagnostic test verifying outbound email delivery from the institutional attendance portal.</p>
          <p style="font-size: 12px; color: #a5b09d;">Provider: <strong>${provider.toUpperCase()}</strong><br>Timestamp: <strong>${timestamp}</strong></p>
          <hr style="border: 0; border-top: 1px solid #2d382b; margin: 16px 0;">
          <p style="font-size: 11px; color: #717d69;">Indian Institute of Information Technology, Tiruchirappalli</p>
        </div>
      `,
      text: `IIIT Trichy Attendance Portal - SMTP Diagnostic Test\n\nThis is an automated diagnostic test verifying outbound email delivery.\nProvider: ${provider.toUpperCase()}\nTimestamp: ${timestamp}`,
    });

    console.log(`[SUCCESS] Test email successfully dispatched to ${recipient} via ${provider.toUpperCase()}.${result.messageId ? ` Message ID: ${result.messageId}` : ""}`);
    process.exit(0);
  } catch (error) {
    const sanitized = sanitizeErrorMessage(error);
    console.error(`[FAILURE] Email dispatch failed: ${sanitized}`);
    process.exit(1);
  }
}

main();
