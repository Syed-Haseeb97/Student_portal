"use client";

import {
  isSignInWithEmailLink,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  type UserCredential,
} from "firebase/auth";
import { getFirebaseClient } from "@/lib/firebase/client";
import { isAuthorizedPortalEmail } from "@/lib/roster/validate";
import type { ApiErrorResponse } from "@/lib/api/types";

const EMAIL_DOMAIN = "@iiitt.ac.in";

export function normalizeInstitutionalEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isInstitutionalEmail(value: string) {
  return isAuthorizedPortalEmail(value.trim());
}

export async function sendInstitutionalSignInLink(emailInput: string) {
  const email = normalizeInstitutionalEmail(emailInput);
  if (!isInstitutionalEmail(email)) {
    throw new Error("Use your institutional @iiitt.ac.in email address.");
  }
  const redirectUrl = process.env.NEXT_PUBLIC_FIREBASE_EMAIL_LINK_REDIRECT_URL;
  if (!redirectUrl) throw new Error("Missing NEXT_PUBLIC_FIREBASE_EMAIL_LINK_REDIRECT_URL.");
  const { auth } = getFirebaseClient();
  await sendSignInLinkToEmail(auth, email, { url: redirectUrl, handleCodeInApp: true });
}

export function isInstitutionalSignInLink(url: string) {
  try {
    return isSignInWithEmailLink(getFirebaseClient().auth, url);
  } catch {
    return false;
  }
}

export async function completeInstitutionalSignIn(
  emailInput: string,
  url = typeof window !== "undefined" ? window.location.href : "",
): Promise<{ credential: UserCredential; role: "student" | "lecturer" | "admin" }> {
  const email = normalizeInstitutionalEmail(emailInput);
  if (!isInstitutionalEmail(email)) throw new Error("Enter the same institutional email used to request the link.");
  const { auth } = getFirebaseClient();
  if (!isSignInWithEmailLink(auth, url)) throw new Error("This is not a valid Firebase sign-in link.");
  
  const credential = await signInWithEmailLink(auth, email, url);
  if (!credential.user.emailVerified || !isInstitutionalEmail(credential.user.email ?? "")) {
    await auth.signOut();
    throw new Error("Sign-in requires a verified @iiitt.ac.in email address.");
  }

  const token = await credential.user.getIdToken();
  const response = await fetch("/api/roster/claim", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    await auth.signOut();
    const body = (await response.json().catch(() => null)) as Partial<ApiErrorResponse> | null;
    throw new Error(body?.error ?? "Your account could not be matched to the approved student roster or staff registry.");
  }

  const data = (await response.json().catch(() => null)) as { ok?: boolean; role?: "student" | "lecturer" | "admin" } | null;
  const role = data?.role || "student";
  return { credential, role };
}
