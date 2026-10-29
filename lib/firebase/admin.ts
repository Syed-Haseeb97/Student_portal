import "server-only";
import fs from "node:fs";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

/** Privileged server SDK. Never import this module from a Client Component. */
function getAdminApp() {
  const existing = getApps().find((app) => app.name === "[DEFAULT]");
  if (existing) return existing;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_JSON server secret.");

  let jsonString = raw.trim();

  // Strip accidental duplicated variable name if pasted with prefix (e.g. FIREBASE_SERVICE_ACCOUNT_JSON=...)
  if (jsonString.startsWith("FIREBASE_SERVICE_ACCOUNT_JSON=")) {
    jsonString = jsonString.slice("FIREBASE_SERVICE_ACCOUNT_JSON=".length).trim();
  }

  // Strip wrapping quotes if preserved literally by the environment loader
  if (
    (jsonString.startsWith("'") && jsonString.endsWith("'")) ||
    (jsonString.startsWith('"') && jsonString.endsWith('"'))
  ) {
    jsonString = jsonString.slice(1, -1).trim();
  }

  // If raw value is a path to a JSON file on disk, read it directly
  if (!jsonString.startsWith("{") && fs.existsSync(jsonString)) {
    try {
      jsonString = fs.readFileSync(jsonString, "utf-8").trim();
    } catch {
      // Fall through to JSON.parse
    }
  }

  // If base64-encoded JSON was provided
  if (!jsonString.startsWith("{")) {
    try {
      const decoded = Buffer.from(jsonString, "base64").toString("utf-8").trim();
      if (decoded.startsWith("{")) {
        jsonString = decoded;
      }
    } catch {
      // Not base64
    }
  }

  let serviceAccount: { project_id?: string; client_email?: string; private_key?: string };
  try {
    serviceAccount = JSON.parse(jsonString) as typeof serviceAccount;
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON must contain valid service-account JSON.");
  }

  if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
    throw new Error("Firebase service-account JSON is missing project_id, client_email, or private_key.");
  }

  const expectedProject = process.env.FIREBASE_ADMIN_PROJECT_ID;
  if (!expectedProject) {
    throw new Error("Missing FIREBASE_ADMIN_PROJECT_ID; refusing to initialize privileged Firebase access without an explicit project guard.");
  }

  if (
    expectedProject !== serviceAccount.project_id ||
    (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== expectedProject)
  ) {
    throw new Error("Firebase Admin project ID does not match the configured portal project.");
  }

  return initializeApp({
    credential: cert({
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
      privateKey: serviceAccount.private_key.replace(/\\n/g, "\n"),
    }),
  });
}

export function getFirebaseAdmin() {
  const app = getAdminApp();
  return { app, auth: getAuth(app), db: getFirestore(app) };
}
