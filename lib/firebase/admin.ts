import "server-only";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

/** Privileged server SDK. Never import this module from a Client Component. */
function getAdminApp() {
  const existing = getApps().find((app) => app.name === "[DEFAULT]");
  if (existing) return existing;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_JSON server secret.");
  let serviceAccount: { project_id?: string; client_email?: string; private_key?: string };
  try {
    serviceAccount = JSON.parse(raw) as typeof serviceAccount;
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON must contain valid service-account JSON.");
  }
  if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
    throw new Error("Firebase service-account JSON is missing project_id, client_email, or private_key.");
  }
  const expectedProject = process.env.FIREBASE_ADMIN_PROJECT_ID;
  if (expectedProject && expectedProject !== serviceAccount.project_id) {
    throw new Error("Firebase Admin project ID does not match the configured portal project.");
  }
  return initializeApp({ credential: cert({
    projectId: serviceAccount.project_id,
    clientEmail: serviceAccount.client_email,
    privateKey: serviceAccount.private_key.replace(/\\n/g, "\n"),
  }) });
}

export function getFirebaseAdmin() {
  const app = getAdminApp();
  return { app, auth: getAuth(app), db: getFirestore(app) };
}
