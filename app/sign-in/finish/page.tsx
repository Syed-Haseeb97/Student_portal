"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { completeInstitutionalSignIn, isInstitutionalSignInLink } from "@/lib/firebase/email-link";
import { isMockModeEnabled } from "@/lib/api/client";
import { setStoredUser } from "@/lib/auth/client-auth";
import { useAuth, type UserRole } from "@/components/auth/AuthProvider";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Mail, CheckCircle2, AlertCircle, ArrowLeft, ArrowRight, ShieldCheck, Loader2 } from "lucide-react";

export default function FinishSignInPage() {
  const router = useRouter();
  const { refreshProfile } = useAuth();
  const [email, setEmail] = useState(() => {
    if (typeof window !== "undefined") {
      return window.localStorage.getItem("emailForSignIn") ?? "";
    }
    return "";
  });
  const [status, setStatus] = useState<"idle" | "verifying" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [resolvedRole, setResolvedRole] = useState<UserRole>("student");
  const [redirectTarget, setRedirectTarget] = useState<string>("/dashboard");
  const [isMock] = useState(() => isMockModeEnabled());

  const executeSignIn = useCallback(
    async (targetEmail: string) => {
      const trimmedEmail = targetEmail.trim().toLowerCase();
      if (!trimmedEmail || !trimmedEmail.endsWith("@iiitt.ac.in")) {
        setStatus("error");
        setErrorMessage("Please enter a valid institutional @iiitt.ac.in email address.");
        return;
      }

      setStatus("verifying");
      setErrorMessage("");

      try {
        if (isMock) {
          // Mock mode completion
          await new Promise((r) => setTimeout(r, 600));
          let role: UserRole = "student";
          if (trimmedEmail.startsWith("admin") || trimmedEmail.includes("admin")) {
            role = "admin";
          } else if (trimmedEmail.startsWith("fac") || trimmedEmail.includes("faculty")) {
            role = "lecturer";
          }
          const roll = trimmedEmail.split("@")[0].toUpperCase();
          setStoredUser({
            uid: `mock-${role}-${roll}`,
            email: trimmedEmail,
            role,
            rollNumber: roll,
            name: role === "student" ? "Syed Haseeb" : role === "admin" ? "System Admin" : "Faculty Member",
            verifiedAt: new Date().toISOString(),
          });
          setResolvedRole(role);
          const target = role === "admin" ? "/admin" : role === "lecturer" ? "/lecturer" : "/dashboard";
          setRedirectTarget(target);
          setStatus("success");
          setSuccessMessage("Authentication confirmed and roster access verified.");
          if (typeof window !== "undefined") {
            window.localStorage.removeItem("emailForSignIn");
          }
          await refreshProfile();
          setTimeout(() => router.push(target), 1200);
          return;
        }

        // Live mode completion
        const result = await completeInstitutionalSignIn(trimmedEmail);
        const role = result.role;
        setResolvedRole(role);
        const target = role === "admin" ? "/admin" : role === "lecturer" ? "/lecturer" : "/dashboard";
        setRedirectTarget(target);
        setStatus("success");
        setSuccessMessage("Institutional identity verified and access granted.");
        if (typeof window !== "undefined") {
          window.localStorage.removeItem("emailForSignIn");
        }
        await refreshProfile();
        setTimeout(() => router.push(target), 1200);
      } catch (err) {
        setStatus("error");
        setErrorMessage(
          err instanceof Error
            ? err.message
            : "Could not complete sign-in. Link may be invalid or expired."
        );
      }
    },
    [isMock, refreshProfile, router]
  );

  // Auto-complete if valid link and saved email exists
  useEffect(() => {
    if (typeof window === "undefined") return;

    let timer: NodeJS.Timeout | undefined;

    if (isMock) {
      const urlParams = new URLSearchParams(window.location.search);
      const mockEmail = urlParams.get("mockEmail");
      if (mockEmail) {
        timer = setTimeout(() => {
          setEmail(mockEmail);
          void executeSignIn(mockEmail);
        }, 0);
        return () => {
          if (timer) clearTimeout(timer);
        };
      }
    }

    const savedEmail = window.localStorage.getItem("emailForSignIn");
    const currentUrl = window.location.href;

    if (savedEmail && isInstitutionalSignInLink(currentUrl)) {
      timer = setTimeout(() => {
        void executeSignIn(savedEmail);
      }, 0);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isMock, executeSignIn]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void executeSignIn(email);
  }

  const roleLabels: Record<UserRole, string> = {
    student: "Student Dashboard",
    lecturer: "Faculty Portal",
    admin: "Administrative Console",
  };

  return (
    <main className="min-h-screen px-4 py-12 sm:px-8 flex flex-col justify-center items-center bg-canvas">
      <div className="w-full max-w-md space-y-4">
        <div className="flex items-center justify-between">
          <Link
            href="/sign-in"
            className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink transition-colors font-mono"
          >
            <ArrowLeft className="size-3.5" />
            REQUEST NEW LINK
          </Link>
          <Badge variant={isMock ? "preview" : "compliant"} size="sm">
            {isMock ? "Mock Preview" : "Institutional Verification"}
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
              Complete Sign-In
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm text-muted leading-relaxed">
              Confirm your institutional email to complete authentication and synchronize
              your authorized permissions.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-0">
            {status !== "success" ? (
              <form onSubmit={handleSubmit} className="space-y-4">
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
                  disabled={status === "verifying"}
                  hint="Only approved institutional @iiitt.ac.in accounts are accepted."
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  busy={status === "verifying"}
                  className="w-full"
                >
                  {status === "verifying" ? "Verifying Credentials..." : "Verify & Continue"}
                </Button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="rounded-[3px] border border-accent/40 bg-accent/10 p-4 text-xs text-ink space-y-2">
                  <div className="flex items-center gap-2 text-accent font-semibold font-mono text-xs">
                    <CheckCircle2 className="size-4 shrink-0" />
                    AUTHENTICATION VERIFIED
                  </div>
                  <p className="text-muted text-xs leading-relaxed">{successMessage}</p>
                </div>

                <Button
                  href={redirectTarget}
                  variant="primary"
                  size="md"
                  className="w-full gap-2 font-mono uppercase text-xs tracking-wider"
                >
                  <span>Open {roleLabels[resolvedRole]}</span>
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            )}

            {status === "error" && (
              <div
                role="alert"
                className="rounded-[3px] border border-risk/40 bg-risk/10 p-3.5 text-xs leading-relaxed flex items-start gap-2.5 text-risk"
              >
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {status === "idle" && (
              <div
                role="status"
                className="rounded-[3px] border border-line bg-surface p-3 text-xs leading-relaxed flex items-start gap-2.5 text-muted"
              >
                <ShieldCheck className="size-4 shrink-0 mt-0.5 text-accent" />
                <span>
                  If you opened this link on the same device where you requested it,
                  sign-in completes automatically.
                </span>
              </div>
            )}

            {status === "verifying" && (
              <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted font-mono">
                <Loader2 className="size-3.5 animate-spin text-accent" />
                <span>Validating cryptographically signed token...</span>
              </div>
            )}

            <div className="pt-2 text-center flex items-center justify-between text-xs text-muted font-mono">
              <Link href="/" className="hover:text-accent transition-colors">
                &larr; Portal Home
              </Link>
              <Link href="/sign-in" className="hover:text-accent transition-colors">
                Request Link &rarr;
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
