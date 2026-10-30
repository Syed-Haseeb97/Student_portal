"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SignOutConfirmModal } from "@/components/auth/SignOutConfirmModal";
import { Mail, ArrowLeft, ShieldAlert, CheckCircle2, RotateCcw, ArrowRight } from "lucide-react";

export default function SignInPage() {
  const { user, role, isMock, signOut } = useAuth();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "rate_limited" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [showSignOutModal, setShowSignOutModal] = useState(false);

  // Handle countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  if (user && role) {
    const roleTarget = role === "admin" ? "/admin" : role === "lecturer" ? "/lecturer" : "/dashboard";
    const roleLabel = role === "admin" ? "Admin Console" : role === "lecturer" ? "Faculty Portal" : "Student Dashboard";
    return (
      <main className="min-h-screen px-4 py-12 flex flex-col justify-center items-center bg-canvas">
        <div className="w-full max-w-md space-y-4">
          <Card variant="raised" className="text-center p-8 space-y-5 border-line">
            <div className="size-12 rounded-full bg-accent/10 border border-accent/30 text-accent grid place-items-center mx-auto">
              <CheckCircle2 className="size-6 text-accent" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-xl font-bold text-ink">Currently Authenticated</CardTitle>
              <p className="text-xs text-muted">
                You are signed in as <strong className="text-ink">{user.name || user.email}</strong> ({role.toUpperCase()}).
              </p>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <Button href={roleTarget} variant="primary" size="md">
                Continue to {roleLabel} &rarr;
              </Button>
              <Button
                type="button"
                onClick={() => setShowSignOutModal(true)}
                variant="outline"
                size="sm"
                className="touch-manipulation"
              >
                Sign Out & Switch Account
              </Button>
            </div>
          </Card>

          <SignOutConfirmModal
            isOpen={showSignOutModal}
            onClose={() => setShowSignOutModal(false)}
            onConfirm={signOut}
            userEmail={user.email}
          />
        </div>
      </main>
    );
  }

  async function handleSendLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (cooldown > 0) return;

    setStatus("sending");
    setErrorMessage("");

    try {
      const response = await fetch("/api/auth/send-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      let data: { error?: string; retryAfter?: number; ok?: boolean } | null = null;
      let rawText = "";
      try {
        rawText = (await response.text()).trim();
        if (rawText) {
          data = JSON.parse(rawText);
        }
      } catch {
        // Fallback for non-JSON or gateway responses
      }

      if (response.status === 429) {
        setStatus("rate_limited");
        setCooldown(data?.retryAfter || 60);
        setErrorMessage(data?.error || "Too many sign-in requests. Please wait.");
        return;
      }

      if (response.status === 504) {
        setStatus("error");
        setErrorMessage("Gateway Timeout: Mail server took too long to respond. Please check your Vercel email environment configuration.");
        return;
      }

      if (!response.ok) {
        setStatus("error");
        setErrorMessage(
          data?.error ||
          (rawText && !rawText.startsWith("<") && rawText.length < 250 ? rawText : null) ||
          (response.status === 500
            ? "Server configuration error (500). Please ensure Firebase and Gmail environment variables are saved in Vercel and redeployed."
            : `Unable to send sign-in link (HTTP ${response.status}).`)
        );
        return;
      }

      // Success: Save email to localStorage, sessionStorage, and cookie for seamless automatic completion
      if (typeof window !== "undefined") {
        const cleanEmail = email.trim().toLowerCase();
        window.localStorage.setItem("emailForSignIn", cleanEmail);
        window.sessionStorage.setItem("emailForSignIn", cleanEmail);
        document.cookie = `emailForSignIn=${encodeURIComponent(cleanEmail)}; path=/; max-age=3600; SameSite=Lax`;
      }
      setStatus("sent");
      setCooldown(60); // 60s cooldown for resend button
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Network error. Please try again.");
    }
  }

  return (
    <main className="min-h-screen px-4 py-12 sm:px-8 flex flex-col justify-center items-center bg-canvas">
      <div className="w-full max-w-md space-y-4">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink transition-colors font-mono"
          >
            <ArrowLeft className="size-3.5" />
            BACK TO PORTAL
          </Link>
          <Badge variant={isMock ? "preview" : "compliant"} size="sm">
            {isMock ? "Mock Preview" : "Institutional Access"}
          </Badge>
        </div>

        <Card variant="raised" className="border-line/80">
          <CardHeader>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-[.25em] text-accent font-mono">
                IIIT TIRUCHIRAPPALLI
              </span>
            </div>
            <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight text-ink">
              Sign in with Institute Email
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm text-muted leading-relaxed">
              We will send you an authentication link. Portal access is strictly granted to verified
              accounts on the approved institutional roster.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-0">
            {status !== "sent" ? (
              <form onSubmit={handleSendLink} className="space-y-4">
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
                  hint="Only institutional @iiitt.ac.in addresses are accepted."
                  disabled={status === "sending"}
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  busy={status === "sending"}
                  disabled={cooldown > 0}
                  className="w-full"
                >
                  {status === "sending"
                    ? "Dispatching link..."
                    : cooldown > 0
                    ? `Wait ${cooldown}s to retry`
                    : "Email me a sign-in link"}
                </Button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="rounded-2xl border border-accent/40 bg-accent/10 p-4 text-xs sm:text-sm text-ink space-y-2">
                  <div className="flex items-center gap-2 text-accent font-semibold font-mono text-xs">
                    <CheckCircle2 className="size-4 shrink-0" />
                    SIGN-IN LINK DISPATCHED
                  </div>
                  <p className="text-muted text-xs leading-relaxed">
                    A secure sign-in link has been sent to{" "}
                    <strong className="text-ink font-mono">{email}</strong>. Open the link on
                    this device to sign in instantly.
                  </p>
                </div>

                {isMock && (
                  <div className="rounded-2xl border border-line bg-surface p-3 text-xs space-y-2">
                    <div className="text-[11px] font-mono text-accent uppercase font-semibold">
                      Local Development Mock Mode
                    </div>
                    <p className="text-muted text-[11px]">
                      Since mock mode is enabled, you can simulate opening the sign-in link right now:
                    </p>
                    <Link
                      href={`/sign-in/finish?mockEmail=${encodeURIComponent(email)}`}
                      className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline font-mono font-semibold"
                    >
                      Complete mock sign-in <ArrowRight className="size-3" />
                    </Link>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={cooldown > 0}
                    onClick={() => {
                      setStatus("idle");
                    }}
                    className="gap-1.5 text-xs font-mono"
                  >
                    <RotateCcw className="size-3" />
                    {cooldown > 0 ? `Resend link (${cooldown}s)` : "Use different email"}
                  </Button>
                  <Link
                    href="/sign-in/finish"
                    className="text-xs text-accent hover:underline font-mono"
                  >
                    Have a link? Complete sign-in &rarr;
                  </Link>
                </div>
              </div>
            )}

            {(status === "error" || status === "rate_limited") && (
              <div
                role="alert"
                className="rounded-2xl border border-risk/40 bg-risk/10 p-3.5 text-xs leading-relaxed flex items-start gap-2.5 text-risk"
              >
                <ShieldAlert className="size-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="pt-3 border-t border-line/60">
              <p className="text-[11px] leading-relaxed text-muted">
                Authoritative institutional portal. All access events are cryptographically verified
                and logged in accordance with institute academic integrity policy.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
