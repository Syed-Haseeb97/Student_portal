import { test } from "node:test";
import assert from "node:assert/strict";
import { GET } from "../app/api/me/route";

test("/api/me returns 401 when no token is provided in live mode", async () => {
  process.env.NEXT_PUBLIC_ENABLE_MOCK_API = "false";
  const req = new Request("http://localhost/api/me");
  const res = await GET(req);
  assert.equal(res.status, 401);
  const data = await res.json();
  assert.match(data.error, /Sign in first/i);
});

test("/api/me returns simulated session when mock mode is enabled", async () => {
  process.env.NEXT_PUBLIC_ENABLE_MOCK_API = "true";
  const req = new Request("http://localhost/api/me");
  const res = await GET(req);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.role, "student");
  assert.equal(data.email, "261161@iiitt.ac.in");
  assert.equal(data.active, true);
});
