import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

/** Browser SDK config is public by design; access is controlled by Auth and Firestore Rules. */
function getFirebaseConfig() {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  };
  const missing = Object.entries(config).filter(([, value]) => !value).map(([key]) => key);
  if (missing.length) throw new Error(`Missing Firebase browser configuration: ${missing.join(", ")}`);
  return config as { apiKey: string; authDomain: string; projectId: string; appId: string; messagingSenderId: string };
}

export function getFirebaseClient() {
  const app = getApps().length ? getApp() : initializeApp(getFirebaseConfig());
  return { app, auth: getAuth(app), db: getFirestore(app) };
}
