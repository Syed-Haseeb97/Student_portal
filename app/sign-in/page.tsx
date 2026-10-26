"use client";

import React, { useState } from "react";
import Link from "next/link";
import { sendInstitutionalSignInLink } from "@/lib/firebase/email-link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Mail, ArrowLeft, ShieldAlert, CheckCircle2 } from "lucide-react";

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
      setStatus({
        kind: "success",
        message:
          "Sign-in link sent. Open it on this device, or enter the same email on the link completion page if using another device.",
      });
    } catch (error) {
      setStatus({
        kind: "error",
        message: error instanceof Error ? error.message : "Could not send the sign-in link. Please retry.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-12 sm:px-8 flex flex-col justify-center items-center bg-canvas">
      <div className="w-full max-w-md space-y-4">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            Back to portal overview
          </Link>
          <Badge variant="preview" size="sm">
            Institutional Access
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
              Sign in with your institute email
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              We will send you a secure, one-time sign-in link. Access is granted only when the
              verified email matches an active entry on the approved institutional roster.
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
                hint="Only @iiitt.ac.in domains are accepted."
              />

              <Button
                type="submit"
                variant="primary"
                size="md"
                busy={busy}
                className="w-full"
              >
                {busy ? "Sending Link..." : "Email me a sign-in link"}
              </Button>
            </form>

            {status && (
              <div
                role="status"
                className={`rounded-xl border p-3.5 text-xs sm:text-sm leading-relaxed flex items-start gap-2.5 ${
                  status.kind === "error"
                    ? "border-risk/40 bg-risk/10 text-risk"
                    : "border-accent/40 bg-accent/10 text-accent"
                }`}
              >
                {status.kind === "error" ? (
                  <ShieldAlert className="size-4 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
                )}
                <span>{status.message}</span>
              </div>
            )}

            <div className="pt-3 border-t border-line/60">
              <p className="text-[11px] leading-relaxed text-muted">
                Preview implementation. Do not use real student accounts until the separate
                Firebase project, authorized domains, roster import, and security tests are configured.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
