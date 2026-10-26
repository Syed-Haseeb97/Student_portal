"use client";

import { useState } from "react";
import { completeInstitutionalSignIn } from "@/lib/firebase/email-link";

export default function FinishSignInPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Enter the same institutional email address that received the one-time sign-in link.");
  const [success, setSuccess] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await completeInstitutionalSignIn(email);
      setSuccess(true);
      setMessage("Email verified and roster access confirmed. Your portal identity is ready; attendance dashboard wiring is still in development.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Sign-in could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="min-h-screen px-4 py-12 sm:px-8">
    <section className="mx-auto max-w-md rounded-3xl border border-line bg-surface p-6 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[.22em] text-accent">IIITT Portal</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Complete sign-in</h1>
      <p className="mt-3 text-sm leading-6 text-muted">For security, confirm the email that received the one-time link. If you opened it on a different device, enter the same address again.</p>
      <form className="mt-7 space-y-4" onSubmit={submit}>
        <label className="block text-sm font-medium" htmlFor="email">Institutional email</label>
        <input id="email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)}
          placeholder="you@iiitt.ac.in" className="w-full rounded-xl border border-line bg-canvas px-4 py-3 text-sm outline-none focus:border-accent" />
        <button type="submit" disabled={busy || success} className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-canvas disabled:opacity-60">
          {busy ? "Verifying…" : success ? "Verified" : "Verify and continue"}
        </button>
      </form>
      <p role="status" aria-live="polite" className={`mt-4 rounded-xl border p-3 text-sm leading-6 ${success ? "border-accent/40 text-accent" : "border-line text-muted"}`}>{message}</p>
      <a href="/sign-in" className="mt-5 inline-block text-sm text-accent underline underline-offset-4">Request another link</a>
    </section>
  </main>;
}
