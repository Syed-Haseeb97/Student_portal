import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";

// Set synthetic emulator configuration for admin SDK initialization
const projectId = "demo-iiitt-portal";
const { privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});
process.env.FIREBASE_ADMIN_PROJECT_ID = projectId;
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = projectId;
process.env.FIREBASE_SERVICE_ACCOUNT_JSON = JSON.stringify({
  project_id: projectId,
  client_email: "synthetic-admin@demo-iiitt-portal.iam.gserviceaccount.com",
  private_key: privateKey,
});
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= "127.0.0.1:9099";
process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";
process.env.GCLOUD_PROJECT = projectId;

import { GET as getStaff } from "../app/api/admin/staff/route";
import { GET as getRoster } from "../app/api/admin/roster/route";
import { POST as importRoster } from "../app/api/admin/roster/import/route";
import { GET as getAcademic } from "../app/api/admin/academic-data/route";
import { GET as getAudit } from "../app/api/admin/audit-events/route";
import { POST as postCorrection } from "../app/api/admin/attendance/[attendanceId]/correction/route";

test("admin endpoints reject unauthenticated requests with 401 when mock mode is off", async () => {
  process.env.NEXT_PUBLIC_ENABLE_MOCK_API = "false";

  const req = new Request("http://localhost/api/admin/staff");
  const res = await getStaff(req);
  assert.equal(res.status, 401);

  const rosterReq = new Request("http://localhost/api/admin/roster");
  const rosterRes = await getRoster(rosterReq);
  assert.equal(rosterRes.status, 401);

  const importReq = new Request("http://localhost/api/admin/roster/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify([]),
  });
  const importRes = await importRoster(importReq);
  assert.equal(importRes.status, 401);

  const academicReq = new Request("http://localhost/api/admin/academic-data");
  const academicRes = await getAcademic(academicReq);
  assert.equal(academicRes.status, 401);

  const auditReq = new Request("http://localhost/api/admin/audit-events");
  const auditRes = await getAudit(auditReq);
  assert.equal(auditRes.status, 401);

  const correctionReq = new Request("http://localhost/api/admin/attendance/dummy_id/correction", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mark: "present", reason: "Valid reason for audit" }),
  });
  const correctionRes = await postCorrection(correctionReq, { params: Promise.resolve({ attendanceId: "dummy_id" }) });
  assert.equal(correctionRes.status, 401);
});

test("admin endpoints reject non-admin/invalid tokens with 401 or 403", async () => {
  process.env.NEXT_PUBLIC_ENABLE_MOCK_API = "false";
  const fakeTokenHeader = { Authorization: "Bearer invalid.fake.token" };

  const req = new Request("http://localhost/api/admin/staff", { headers: fakeTokenHeader });
  const res = await getStaff(req);
  assert.ok(res.status === 401 || res.status === 403);

  const rosterReq = new Request("http://localhost/api/admin/roster", { headers: fakeTokenHeader });
  const rosterRes = await getRoster(rosterReq);
  assert.ok(rosterRes.status === 401 || rosterRes.status === 403);
});
