import { test } from "node:test";
import assert from "node:assert/strict";
import { POST } from "../app/api/auth/send-link/route";

test("send-link rejects malformed or oversized bodies", async () => {
  const req = new Request("http://localhost/api/auth/send-link", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "invalid-json",
  });
  const res = await POST(req);
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /Malformed or oversized/i);
});

test("send-link rejects non-institutional emails", async () => {
  const req = new Request("http://localhost/api/auth/send-link", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "student@gmail.com" }),
  });
  const res = await POST(req);
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /@iiitt\.ac\.in/i);
});

test("send-link returns generic anti-enumeration response for institutional emails in mock or dev mode", async () => {
  process.env.NEXT_PUBLIC_ENABLE_MOCK_API = "true";
  const req = new Request("http://localhost/api/auth/send-link", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "261161@iiitt.ac.in" }),
  });
  const res = await POST(req);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.ok, true);
  assert.match(data.message, /If your email is registered/i);
});

test("send-link enforces rate limits on excessive attempts", async () => {
  const targetEmail = `ratelimit-${Date.now()}@iiitt.ac.in`;
  const send = () =>
    POST(
      new Request("http://localhost/api/auth/send-link", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": "192.168.1.99" },
        body: JSON.stringify({ email: targetEmail }),
      })
    );

  // Send 3 requests (max limit is 3 per email)
  const r1 = await send();
  const r2 = await send();
  const r3 = await send();
  assert.equal(r1.status, 200);
  assert.equal(r2.status, 200);
  assert.equal(r3.status, 200);

  // 4th request must be rate limited (429)
  const r4 = await send();
  assert.equal(r4.status, 429);
  assert.ok(r4.headers.get("Retry-After"));
  const data = await r4.json();
  assert.match(data.error, /Too many/i);
});

test("send-link returns 503 in production when RESEND_API_KEY is missing and emulator is inactive", async () => {
  const origNodeEnv = process.env.NODE_ENV;
  const origResendKey = process.env.RESEND_API_KEY;
  const origMock = process.env.NEXT_PUBLIC_ENABLE_MOCK_API;
  const origEmulator = process.env.FIREBASE_AUTH_EMULATOR_HOST;

  try {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    delete process.env.RESEND_API_KEY;
    process.env.NEXT_PUBLIC_ENABLE_MOCK_API = "false";
    delete process.env.FIREBASE_AUTH_EMULATOR_HOST;

    const req = new Request("http://localhost/api/auth/send-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: `prod-unconfigured-${Date.now()}@iiitt.ac.in` }),
    });
    const res = await POST(req);
    assert.equal(res.status, 503);
    const data = await res.json();
    assert.match(data.error, /Email delivery service is currently unavailable/i);
  } finally {
    (process.env as Record<string, string | undefined>).NODE_ENV = origNodeEnv;
    if (origResendKey !== undefined) process.env.RESEND_API_KEY = origResendKey;
    if (origMock !== undefined) process.env.NEXT_PUBLIC_ENABLE_MOCK_API = origMock;
    if (origEmulator !== undefined) process.env.FIREBASE_AUTH_EMULATOR_HOST = origEmulator;
  }
});
