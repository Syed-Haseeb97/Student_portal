"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  getStoredUser,
  setStoredUser,
  clearStoredUser,
  requestVerificationCode,
  submitVerificationCode,
  type PortalUser,
} from "@/lib/auth/client-auth";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Mail,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  GraduationCap,
  Briefcase,
  Check,
} from "lucide-react";

export function InstitutionalAuthGate() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<PortalUser | null>(() => getStoredUser());
  const [role, setRole] = useState<"student" | "lecturer">("student");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"EMAIL" | "OTP">("EMAIL");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState<boolean>(false);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    setDevCode(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError("Please enter your email.");
      return;
    }

    const isAllowedTest = cleanEmail === "syed424892@gmail.com";
    if (!cleanEmail.endsWith("@iiitt.ac.in") && !isAllowedTest) {
      setError("Please enter a valid @iiitt.ac.in email (or your registered Resend test email).");
      return;
    }

    setBusy(true);
    const res = await requestVerificationCode(cleanEmail, role);
    setBusy(false);

    if (res.ok) {
      setStep("OTP");
      setInfoMessage(res.message);
      setEmailSent(Boolean(res.emailSent));
      if (res.devCode) {
        setDevCode(res.devCode);
        setOtp(res.devCode);
      }
    } else {
      setError(res.error || res.message || "Could not dispatch verification code.");
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!otp || otp.trim().length !== 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    setBusy(true);
    const res = await submitVerificationCode(email, otp.trim());
    setBusy(false);

    if (res.ok && res.user) {
      setCurrentUser(res.user);
      router.push(res.redirectUrl || (res.user.role === "lecturer" ? "/lecturer" : "/dashboard"));
    } else {
      setError(res.error || "Verification failed. Check the code and retry.");
    }
  };

  const handleQuickDemo = (demoRole: "student" | "lecturer") => {
    const demoUser: PortalUser =
      demoRole === "student"
        ? {
            uid: "demo-student-261161",
            email: "261161@iiitt.ac.in",
            role: "student",
            rollNumber: "261161",
            name: "Syed Haseeb",
            verifiedAt: new Date().toISOString(),
          }
        : {
            uid: "demo-faculty-01",
            email: "faculty@iiitt.ac.in",
            role: "lecturer",
            rollNumber: "FAC-01",
            name: "Dr. K. Ramanathan",
            verifiedAt: new Date().toISOString(),
          };

    setStoredUser(demoUser);
    setCurrentUser(demoUser);
    router.push(demoRole === "student" ? "/dashboard" : "/lecturer");
  };

  const handleSignOut = () => {
    clearStoredUser();
    setCurrentUser(null);
    setStep("EMAIL");
    setEmail("");
    setOtp("");
    setDevCode(null);
  };

  if (currentUser) {
    return (
      <div id="login" className="glass-panel p-5 sm:p-6 rounded-[3px] border border-line relative overflow-hidden">
        <div className="flex items-center justify-between pb-3 border-b border-line">
          <Badge variant="compliant" size="sm">
            <ShieldCheck className="size-3" />
            Verified Active Session
          </Badge>
          <span className="text-[10px] font-mono font-bold text-accent tracking-widest uppercase">
            IIITT Student Portal
          </span>
        </div>

        <div className="mt-4 flex items-center gap-3.5">
          <div className="size-12 rounded-[2px] bg-canvas border border-line p-1.5 flex items-center justify-center shrink-0">
            <Image
              src="/images/iiitt-seal.png"
              alt="IIITT Seal"
              width={36}
              height={36}
              className="object-contain"
            />
          </div>
          <div>
            <h3 className="text-base font-bold text-ink">
              Welcome back, {currentUser.name || currentUser.email}
            </h3>
            <p className="text-xs text-muted font-mono mt-0.5">
              Role: <strong className="text-accent uppercase">{currentUser.role}</strong> · ID: <span className="text-ink font-bold">{currentUser.rollNumber}</span>
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <Button
            href={currentUser.role === "lecturer" ? "/lecturer" : "/dashboard"}
            variant="primary"
            size="md"
            className="flex-1 font-bold gap-2 text-xs uppercase tracking-wider"
          >
            <span>Open {currentUser.role === "lecturer" ? "Faculty" : "Student"} Dashboard</span>
            <ArrowRight className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={handleSignOut}
            className="text-xs font-mono"
          >
            Sign Out
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div id="login" className="glass-panel p-5 sm:p-6 rounded-[3px] border border-line relative overflow-hidden transition-all">
      {/* Header with Real Emblem */}
      <div className="flex items-start justify-between gap-3 pb-3.5 border-b border-line">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-[2px] bg-canvas border border-line p-1 shadow-sm shrink-0">
            <Image
              src="/images/iiitt-seal.png"
              alt="IIIT Trichy Emblem"
              width={32}
              height={32}
              className="w-full h-full object-contain"
              priority
            />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase font-bold tracking-widest text-accent block">
              Official Identity Gateway
            </span>
            <h3 className="text-lg font-black text-ink leading-tight uppercase tracking-tight">
              Sign In to IIITT Portal
            </h3>
          </div>
        </div>
        <Badge variant="indigo" size="sm" className="hidden sm:inline-flex">
          Session 2026
        </Badge>
      </div>

      {/* Role Toggle Selector */}
      <div className="mt-4 grid grid-cols-2 gap-1 p-1 rounded-[2px] bg-canvas border border-line">
        <button
          type="button"
          onClick={() => {
            setRole("student");
            setError(null);
          }}
          className={`py-1.5 text-xs font-bold rounded-[2px] transition-all flex items-center justify-center gap-2 cursor-pointer font-mono uppercase ${
            role === "student"
              ? "bg-[#283226] border border-accent/40 text-accent shadow-xs"
              : "text-muted hover:text-ink"
          }`}
        >
          <GraduationCap className="size-3.5" />
          <span>Student</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setRole("lecturer");
            setError(null);
          }}
          className={`py-1.5 text-xs font-bold rounded-[2px] transition-all flex items-center justify-center gap-2 cursor-pointer font-mono uppercase ${
            role === "lecturer"
              ? "bg-[#283226] border border-accent/40 text-accent shadow-xs"
              : "text-muted hover:text-ink"
          }`}
        >
          <Briefcase className="size-3.5" />
          <span>Faculty</span>
        </button>
      </div>

      <div className="mt-4 space-y-3.5">
        {/* Error Notification */}
        {error && (
          <div className="p-3 rounded-[2px] bg-risk/10 border border-risk/30 text-xs text-risk flex items-start gap-2 animate-in fade-in">
            <AlertTriangle className="size-4 shrink-0 mt-0.5" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        {/* Success / Delivery Notification */}
        {infoMessage && (
          <div className="p-3 rounded-[2px] bg-accent/10 border border-accent/30 text-xs text-accent flex items-start gap-2 animate-in fade-in">
            <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
            <span className="leading-snug">{infoMessage}</span>
          </div>
        )}

        {/* Live Code Banner with Instant Fill */}
        {step === "OTP" && devCode && (
          <div className="p-3.5 rounded-[2px] bg-surface border border-accent/40 text-xs space-y-2 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-ink flex items-center gap-2">
                <Sparkles className="size-3.5 text-accent" />
                <span className="font-mono text-[11px] uppercase">Verification Code:</span>
                <strong className="font-mono text-base font-black tracking-widest text-accent ml-1">
                  {devCode}
                </strong>
              </span>
              <span className="text-[9px] uppercase font-bold font-mono tracking-wider px-1.5 py-0.5 rounded-[2px] bg-accent text-[#171915]">
                Auto-Filled
              </span>
            </div>
            <div className="flex items-start gap-1.5 text-[11px] text-muted leading-relaxed pt-1.5 border-t border-line">
              <Check className="size-3 text-accent shrink-0 mt-0.5" />
              <span>
                {emailSent
                  ? `Real email dispatched via Resend. The 6-digit passcode is pre-filled above.`
                  : `Code is ready and pre-filled. Click below to verify and enter.`}
              </span>
            </div>
          </div>
        )}

        {step === "EMAIL" ? (
          <form onSubmit={handleSendCode} className="space-y-3">
            <div>
              <label htmlFor="portal-email" className="block text-[11px] font-mono uppercase font-bold text-muted mb-1">
                {role === "student" ? "Institute Email Address" : "Faculty Official Email"}
              </label>
              <div className="relative">
                <Mail className="size-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="portal-email"
                  type="email"
                  required
                  placeholder={role === "student" ? "rollnumber@iiitt.ac.in" : "faculty@iiitt.ac.in"}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-[3px] border border-line bg-canvas text-xs text-ink placeholder:text-muted/40 focus:outline-hidden focus:border-accent font-mono font-medium"
                />
              </div>
              <p className="text-[10px] font-mono text-muted mt-1 flex items-center justify-between">
                <span>Official Domain: <strong>@iiitt.ac.in</strong></span>
                <span className="text-accent">Resend Verified</span>
              </p>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              busy={busy}
              className="w-full font-extrabold uppercase tracking-wider py-2.5 text-xs rounded-[3px]"
            >
              {busy ? "Dispatching Passcode..." : "Send Verification Code"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="portal-otp" className="block text-[11px] font-mono uppercase font-bold text-muted">
                  6-Digit Passcode for <strong className="text-ink">{email}</strong>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setStep("EMAIL");
                    setError(null);
                  }}
                  className="text-[10px] font-mono uppercase text-accent font-bold hover:underline cursor-pointer"
                >
                  Change Email
                </button>
              </div>

              <div className="relative">
                <KeyRound className="size-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="portal-otp"
                  type="text"
                  maxLength={6}
                  autoFocus
                  required
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="w-full pl-9 pr-3 py-2.5 rounded-[3px] border border-line bg-canvas text-base font-mono font-black tracking-[0.25em] text-ink placeholder:text-muted/30 focus:outline-hidden focus:border-accent text-center"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              busy={busy}
              disabled={otp.length !== 6}
              className="w-full font-extrabold uppercase tracking-wider py-2.5 text-xs rounded-[3px]"
            >
              {busy ? "Verifying..." : "Verify & Enter Portal"}
            </Button>
          </form>
        )}

        {/* Quick Demo Switcher */}
        <div className="pt-3 border-t border-line">
          <div className="flex items-center justify-between text-[11px] font-mono text-muted mb-2">
            <span>DIRECT EVALUATION:</span>
            <span className="text-[10px] font-bold text-accent uppercase">1-Click</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => handleQuickDemo("student")}
              className="text-xs font-mono font-bold gap-1.5 py-1.5 rounded-[2px]"
            >
              <GraduationCap className="size-3.5 text-accent" />
              <span>Demo Student</span>
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => handleQuickDemo("lecturer")}
              className="text-xs font-mono font-bold gap-1.5 py-1.5 rounded-[2px]"
            >
              <Briefcase className="size-3.5 text-accent" />
              <span>Demo Faculty</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
