import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getFirebaseAdmin } from "../lib/firebase/admin";
import { sendPortalEmail, getEmailProvider, validateEmailConfig } from "../lib/email/mailer";
import { normalizeEmail, INSTITUTIONAL_EMAIL_PATTERN } from "../lib/roster/validate";

function loadEnvLocal(): void {
  const envPath = resolve(process.cwd(), ".env.local");
  if (existsSync(envPath)) {
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
}

async function main() {
  loadEnvLocal();
  const recipient = normalizeEmail(process.argv[2] || "261161@iiitt.ac.in");
  if (!recipient || !INSTITUTIONAL_EMAIL_PATTERN.test(recipient)) {
    console.error(`Invalid recipient: ${recipient}`);
    process.exit(1);
  }

  const validation = validateEmailConfig();
  if (!validation.valid) {
    console.error(`Config error: ${validation.error}`);
    process.exit(1);
  }

  console.log(`Generating Firebase sign-in link for ${recipient}...`);
  const { auth } = getFirebaseAdmin();
  const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_FIREBASE_EMAIL_LINK_REDIRECT_URL || "http://localhost:3000";
  const redirectUrl = `${baseUrl.replace(/\/$/, "")}/sign-in/finish`;

  const link = await auth.generateSignInWithEmailLink(recipient, {
    url: redirectUrl,
    handleCodeInApp: true,
  });

  console.log(`Link generated successfully.`);
  console.log(`Dispatching sign-in email to ${recipient} via ${getEmailProvider().toUpperCase()}...`);

  const result = await sendPortalEmail({
    to: recipient,
    subject: "IIIT Trichy Attendance Portal — Sign-In Link",
    html: `
      <div style="font-family: sans-serif; max-width: 520px; padding: 28px; background: #171915; color: #f5f6ed; border-radius: 6px;">
        <h2 style="color: #d9fa58; margin-top: 0;">IIIT Trichy Attendance Portal</h2>
        <p>A sign-in link was requested for <strong>${recipient}</strong>.</p>
        <p style="margin: 24px 0;">
          <a href="${link}" style="background: #d9fa58; color: #171915; font-weight: bold; text-decoration: none; padding: 12px 24px; border-radius: 4px; display: inline-block;">
            SIGN IN TO PORTAL &rarr;
          </a>
        </p>
        <p style="font-size: 12px; color: #a5b09d;">If the button doesn't work, copy and paste this URL into your browser:</p>
        <p style="font-size: 11px; word-break: break-all; color: #d9fa58;">${link}</p>
        <hr style="border: 0; border-top: 1px solid #2d382b; margin: 20px 0;">
        <p style="font-size: 11px; color: #717d69;">Indian Institute of Information Technology, Tiruchirappalli</p>
      </div>
    `,
    text: `Sign in to IIIT Trichy Attendance Portal:\n\n${link}\n\nValid for 15 minutes.`,
  });

  console.log(`[SUCCESS] Sign-in link email dispatched! Message ID: ${result.messageId}`);
}

main().catch((err) => {
  console.error("Error dispatching sign-in email:", err);
  process.exit(1);
});
