"use client";

import React, { useState } from "react";
import Link from "next/link";
import { completeInstitutionalSignIn } from "@/lib/firebase/email-link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Mail, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";

export default function FinishSignInPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(
    "Enter the same institutional email address that received the one-time sign-in link."
  );
  const [success, setSuccess] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await completeInstitutionalSignIn(email);
      setSuccess(true);
      setMessage(
        "Email verified and roster access confirmed. Your portal identity is ready; attendance dashboard wiring is still in development."
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Sign-in could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-12 sm:px-8 flex flex-col justify-center items-center bg-canvas">
      <div className="w-full max-w-md space-y-4">
        <div className="flex items-center justify-between">
          <Link
            href="/sign-in"
            className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            Request another link
          </Link>
          <Badge variant="preview" size="sm">
            Verification
          </Badge>
        </div>

        <Card variant="raised" className="border-line/80">
          <CardHeader>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-[.2em] text-accent">
                IIITT Attendance
              </span>
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">
              Complete sign-in
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              For security, confirm the email that received the one-time link. If you opened it on a
              different device, enter the same institutional address again.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-0">
            <form onSubmit={submit} className="space-y-4">
              <Input
                id="email"
                type="email"
                label="Institutional Email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="rollnumber@iiitt.ac.in"
                leftIcon={<Mail className="size-4" />}
                disabled={success}
              />

              <Button
                type="submit"
                variant="primary"
                size="md"
                busy={busy}
                disabled={success}
                className="w-full"
              >
                {busy ? "Verifying..." : success ? "Verified" : "Verify and Continue"}
              </Button>
            </form>

            <div
              role="status"
              aria-live="polite"
              className={`rounded-xl border p-3.5 text-xs sm:text-sm leading-relaxed flex items-start gap-2.5 ${
                success
                  ? "border-accent/40 bg-accent/10 text-accent"
                  : message.includes("not") || message.includes("error") || message.includes("requires")
                  ? "border-risk/40 bg-risk/10 text-risk"
                  : "border-line bg-surface text-muted"
              }`}
            >
              {success ? (
                <CheckCircle2 className="size-4 shrink-0 mt-0.5 text-accent" />
              ) : (
                <AlertCircle className="size-4 shrink-0 mt-0.5 text-muted" />
              )}
              <span>{message}</span>
            </div>

            <div className="pt-2 text-center">
              <Link
                href="/"
                className="text-xs text-muted hover:text-accent transition-colors underline underline-offset-4"
              >
                Return to home preview
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
