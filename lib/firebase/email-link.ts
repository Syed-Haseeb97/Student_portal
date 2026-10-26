"use client";

import {
  isSignInWithEmailLink,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  type UserCredential,
} from "firebase/auth";
import { getFirebaseClient } from "@/lib/firebase/client";
import type { ApiErrorResponse } from "@/lib/api/types";

const EMAIL_DOMAIN = "@iiitt.ac.in";

export function normalizeInstitutionalEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isInstitutionalEmail(value: string) {
  return /^[^\s@]+@iiitt\.ac\.in$/i.test(value.trim());
}

export async function sendInstitutionalSignInLink(emailInput: string) {
  const email = normalizeInstitutionalEmail(emailInput);
  if (!isInstitutionalEmail(email) || !email.endsWith(EMAIL_DOMAIN)) {
    throw new Error("Use your institutional @iiitt.ac.in email address.");
  }
  const redirectUrl = process.env.NEXT_PUBLIC_FIREBASE_EMAIL_LINK_REDIRECT_URL;
  if (!redirectUrl) throw new Error("Missing NEXT_PUBLIC_FIREBASE_EMAIL_LINK_REDIRECT_URL.");
  const { auth } = getFirebaseClient();
  await sendSignInLinkToEmail(auth, email, { url: redirectUrl, handleCodeInApp: true });
}

export function isInstitutionalSignInLink(url: string) {
  return isSignInWithEmailLink(getFirebaseClient().auth, url);
}

export async function completeInstitutionalSignIn(
  emailInput: string,
  url = window.location.href,
): Promise<UserCredential> {
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
    const body = await response.json().catch(() => null) as Partial<ApiErrorResponse> | null;
    throw new Error(body?.error ?? "Your account could not be matched to the approved student roster.");
  }
  return credential;
}

