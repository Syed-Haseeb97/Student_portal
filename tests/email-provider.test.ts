import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getEmailProvider,
  validateEmailConfig,
  extractAddress,
  sanitizeErrorMessage,
  setCustomMailTransportForTesting,
} from "../lib/email/mailer";
import { validatePortalEnv } from "../lib/env";
import { POST } from "../app/api/auth/send-link/route";
import type { Transporter } from "nodemailer";

test("Email provider selection: supports EMAIL_PROVIDER=gmail and EMAIL_PROVIDER=resend", () => {
  const origProvider = process.env.EMAIL_PROVIDER;
  const origGmailUser = process.env.GMAIL_USER;
  const origGmailPass = process.env.GMAIL_APP_PASSWORD;

  try {
    delete process.env.GMAIL_USER;
    delete process.env.GMAIL_APP_PASSWORD;

    process.env.EMAIL_PROVIDER = "gmail";
    assert.equal(getEmailProvider(), "gmail");

    process.env.EMAIL_PROVIDER = "resend";
    assert.equal(getEmailProvider(), "resend");

    delete process.env.EMAIL_PROVIDER;
    assert.equal(getEmailProvider(), "resend");

    process.env.GMAIL_USER = "portal@gmail.com";
    assert.equal(getEmailProvider(), "gmail");
  } finally {
    if (origProvider !== undefined) process.env.EMAIL_PROVIDER = origProvider;
    else delete process.env.EMAIL_PROVIDER;
    if (origGmailUser !== undefined) process.env.GMAIL_USER = origGmailUser;
    else delete process.env.GMAIL_USER;
    if (origGmailPass !== undefined) process.env.GMAIL_APP_PASSWORD = origGmailPass;
    else delete process.env.GMAIL_APP_PASSWORD;
  }
});

test("Address extraction: parses raw addresses and formatted name headers", () => {
  assert.equal(extractAddress("attendance@iiitt.ac.in"), "attendance@iiitt.ac.in");
  assert.equal(extractAddress("IIITT Portal <attendance@iiitt.ac.in>"), "attendance@iiitt.ac.in");
  assert.equal(extractAddress('"Admin Section" <admin@gmail.com>'), "admin@gmail.com");
  assert.equal(extractAddress(""), "");
});

test("From-address mismatch: rejects mismatched EMAIL_FROM when provider is gmail", () => {
  const origProvider = process.env.EMAIL_PROVIDER;
  const origGmailUser = process.env.GMAIL_USER;
  const origGmailPass = process.env.GMAIL_APP_PASSWORD;
  const origEmailFrom = process.env.EMAIL_FROM;
  const origMock = process.env.NEXT_PUBLIC_ENABLE_MOCK_API;

  try {
    process.env.NEXT_PUBLIC_ENABLE_MOCK_API = "false";
    process.env.EMAIL_PROVIDER = "gmail";
    process.env.GMAIL_USER = "legitimate-admin@gmail.com";
    process.env.GMAIL_APP_PASSWORD = "abcd-efgh-ijkl-mnop";
    process.env.EMAIL_FROM = "IIITT Portal <spoofed-address@iiitt.ac.in>";

    // Email config validation should report failure
    const configResult = validateEmailConfig();
    assert.equal(configResult.valid, false);
    assert.match(configResult.error || "", /mismatch/i);

    // Startup env validation should also catch the mismatch
    const envResult = validatePortalEnv();
    assert.equal(envResult.valid, false);
    assert.ok(
      envResult.missing.some((m) => m.toLowerCase().includes("mismatch")),
      "Env validation must flag address mismatch"
    );

    // When aligned, validation succeeds
    process.env.EMAIL_FROM = "IIIT Trichy <legitimate-admin@gmail.com>";
    assert.equal(validateEmailConfig().valid, true);
  } finally {
    if (origProvider !== undefined) process.env.EMAIL_PROVIDER = origProvider;
    else delete process.env.EMAIL_PROVIDER;
    if (origGmailUser !== undefined) process.env.GMAIL_USER = origGmailUser;
    else delete process.env.GMAIL_USER;
    if (origGmailPass !== undefined) process.env.GMAIL_APP_PASSWORD = origGmailPass;
    else delete process.env.GMAIL_APP_PASSWORD;
    if (origEmailFrom !== undefined) process.env.EMAIL_FROM = origEmailFrom;
    else delete process.env.EMAIL_FROM;
    if (origMock !== undefined) process.env.NEXT_PUBLIC_ENABLE_MOCK_API = origMock;
  }
});

test("Production 503 when Gmail is selected but unconfigured", async () => {
  const origNodeEnv = process.env.NODE_ENV;
  const origProvider = process.env.EMAIL_PROVIDER;
  const origGmailUser = process.env.GMAIL_USER;
  const origGmailPass = process.env.GMAIL_APP_PASSWORD;
  const origMock = process.env.NEXT_PUBLIC_ENABLE_MOCK_API;
  const origEmulator = process.env.FIREBASE_AUTH_EMULATOR_HOST;

  try {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    process.env.EMAIL_PROVIDER = "gmail";
    delete process.env.GMAIL_USER;
    delete process.env.GMAIL_APP_PASSWORD;
    process.env.NEXT_PUBLIC_ENABLE_MOCK_API = "false";
    delete process.env.FIREBASE_AUTH_EMULATOR_HOST;

    const req = new Request("http://localhost/api/auth/send-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: `prod-gmail-unconf-${Date.now()}@iiitt.ac.in` }),
    });

    const res = await POST(req);
    assert.equal(res.status, 503);
    const data = await res.json();
    assert.match(data.error, /Email delivery service is currently unavailable/i);
  } finally {
    (process.env as Record<string, string | undefined>).NODE_ENV = origNodeEnv;
    if (origProvider !== undefined) process.env.EMAIL_PROVIDER = origProvider;
    else delete process.env.EMAIL_PROVIDER;
    if (origGmailUser !== undefined) process.env.GMAIL_USER = origGmailUser;
    else delete process.env.GMAIL_USER;
    if (origGmailPass !== undefined) process.env.GMAIL_APP_PASSWORD = origGmailPass;
    else delete process.env.GMAIL_APP_PASSWORD;
    if (origMock !== undefined) process.env.NEXT_PUBLIC_ENABLE_MOCK_API = origMock;
    if (origEmulator !== undefined) process.env.FIREBASE_AUTH_EMULATOR_HOST = origEmulator;
  }
});

test("SMTP error sanitization: scrubs credentials and passwords from logs and messages", () => {
  const secretPassword = "my-secret-app-password-1234";
  process.env.GMAIL_APP_PASSWORD = secretPassword;

  const rawError = new Error(`Connection to smtp.gmail.com failed with auth pass=${secretPassword}`);
  const sanitized = sanitizeErrorMessage(rawError);

  assert.ok(!sanitized.includes(secretPassword), "Sanitized message must not contain raw password");
  assert.ok(sanitized.includes("[REDACTED]"), "Sanitized message must replace password with [REDACTED]");
});

test("SMTP failure handling: mocks transport, sanitizes errors, and refunds rate limit on failure", async () => {
  const origProvider = process.env.EMAIL_PROVIDER;
  const origGmailUser = process.env.GMAIL_USER;
  const origGmailPass = process.env.GMAIL_APP_PASSWORD;
  const origEmailFrom = process.env.EMAIL_FROM;
  const origMock = process.env.NEXT_PUBLIC_ENABLE_MOCK_API;
  const origEmulator = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  const origNodeEnv = process.env.NODE_ENV;

  try {
    process.env.NEXT_PUBLIC_ENABLE_MOCK_API = "false";
    process.env.EMAIL_PROVIDER = "gmail";
    process.env.GMAIL_USER = "mocked-faculty@gmail.com";
    process.env.GMAIL_APP_PASSWORD = "secret-pass-word";
    process.env.EMAIL_FROM = "mocked-faculty@gmail.com";
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    delete process.env.FIREBASE_AUTH_EMULATOR_HOST;

    // Create a mock transport that fails with an SMTP error
    const failingTransport = {
      sendMail: async () => {
        throw new Error("Invalid login: 535-5.7.8 Username and Password not accepted secret-pass-word");
      },
    } as unknown as Transporter;

    setCustomMailTransportForTesting(failingTransport);

    const testEmail = `smtp-fail-${Date.now()}@iiitt.ac.in`;
    const send = () =>
      POST(
        new Request("http://localhost/api/auth/send-link", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-forwarded-for": "10.0.0.42" },
          body: JSON.stringify({ email: testEmail }),
        })
      );

    // Call 1: transport fails
    const res1 = await send();
    assert.equal(res1.status, 200, "In production, anti-enumeration returns 200 generic message");
    const data1 = await res1.json();
    assert.equal(data1.ok, true);

    // Because the send failed, rate limit should NOT be consumed.
    // Repeating 3 more times should NOT be immediately rate-limited at attempt 4:
    const res2 = await send();
    const res3 = await send();
    const res4 = await send();

    // Since every failure refunds the rate limit count, the user is never locked out due to transport failures:
    assert.equal(res2.status, 200);
    assert.equal(res3.status, 200);
    assert.equal(res4.status, 200);

    // Now test successful mock transport
    const successfulTransport = {
      sendMail: async () => ({ messageId: "mock-message-id-success" }),
    } as unknown as Transporter;

    setCustomMailTransportForTesting(successfulTransport);

    const successEmail = `smtp-success-${Date.now()}@iiitt.ac.in`;
    const resSuccess = await POST(
      new Request("http://localhost/api/auth/send-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: successEmail }),
      })
    );

    assert.equal(resSuccess.status, 200);
    const successData = await resSuccess.json();
    assert.equal(successData.ok, true);
  } finally {
    setCustomMailTransportForTesting(null);
    (process.env as Record<string, string | undefined>).NODE_ENV = origNodeEnv;
    if (origProvider !== undefined) process.env.EMAIL_PROVIDER = origProvider;
    else delete process.env.EMAIL_PROVIDER;
    if (origGmailUser !== undefined) process.env.GMAIL_USER = origGmailUser;
    else delete process.env.GMAIL_USER;
    if (origGmailPass !== undefined) process.env.GMAIL_APP_PASSWORD = origGmailPass;
    else delete process.env.GMAIL_APP_PASSWORD;
    if (origEmailFrom !== undefined) process.env.EMAIL_FROM = origEmailFrom;
    else delete process.env.EMAIL_FROM;
    if (origMock !== undefined) process.env.NEXT_PUBLIC_ENABLE_MOCK_API = origMock;
    if (origEmulator !== undefined) process.env.FIREBASE_AUTH_EMULATOR_HOST = origEmulator;
  }
});
