"use client";

import { useState } from "react";
import { sendInstitutionalSignInLink } from "@/lib/firebase/email-link";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<{ kind: "error" | "success"; message: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setStatus(null);
    try {
      await sendInstitutionalSignInLink(email);
      setStatus({ kind: "success", message: "Sign-in link sent. Open it on this device, or enter the same email on the link completion page if using another device." });
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof Error ? error.message : "Could not send the sign-in link. Please retry." });
    } finally {
      setBusy(false);
    }
  }

  return <main className="min-h-screen px-4 py-12 sm:px-8">
    <section className="mx-auto max-w-md rounded-3xl border border-line bg-surface p-6 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[.22em] text-accent">IIITT Portal</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Sign in with your institute email</h1>
      <p className="mt-3 text-sm leading-6 text-muted">We’ll email you a secure, one-time sign-in link. Access is granted only when the verified email matches the approved student roster.</p>
      <form className="mt-7 space-y-4" onSubmit={submit}>
        <label className="block text-sm font-medium" htmlFor="email">Institutional email</label>
        <input id="email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)}
          placeholder="you@iiitt.ac.in" className="w-full rounded-xl border border-line bg-canvas px-4 py-3 text-sm outline-none focus:border-accent" />
        <button type="submit" disabled={busy} className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-canvas disabled:opacity-60">
          {busy ? "Sending link…" : "Email me a sign-in link"}
        </button>
      </form>
      {status && <p role="status" className={`mt-4 rounded-xl border p-3 text-sm leading-6 ${status.kind === "error" ? "border-risk/40 text-risk" : "border-accent/40 text-accent"}`}>{status.message}</p>}
      <p className="mt-6 text-xs leading-5 text-muted">Preview implementation. Do not use real student accounts until the separate Firebase project, authorized domains, roster import, and security tests are configured.</p>
    </section>
  </main>;
}
