"use client";

import React from "react";
import Link from "next/link";
import { useAuth, type UserRole } from "@/components/auth/AuthProvider";
import {
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  GraduationCap,
  Briefcase,
  LogOut,
  Users,
  UserCheck,
  BookOpen,
} from "lucide-react";

export function LandingAccessCard() {
  const { user, role, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-line space-y-6 animate-pulse">
        <div className="h-5 w-28 bg-raised rounded-full" />
        <div className="space-y-2">
          <div className="h-7 w-48 bg-raised rounded-lg" />
          <div className="h-4 w-full bg-raised rounded" />
        </div>
        <div className="h-12 w-full bg-raised rounded-full" />
      </div>
    );
  }

  // When logged in: Show active authorized session with one-click portal entry
  if (user) {
    const roleHome =
      role === "admin"
        ? "/admin"
        : role === "lecturer"
        ? "/lecturer"
        : "/dashboard";

    const roleTitle =
      role === "admin"
        ? "Admin Console"
        : role === "lecturer"
        ? "Faculty Portal"
        : "Student Dashboard";

    const roleBadge =
      role === "admin"
        ? "SYSTEM ADMINISTRATOR"
        : role === "lecturer"
        ? "FACULTY MEMBER"
        : "VERIFIED STUDENT";

    const displayName =
      user.name || user.rollNumber || user.staffId || user.email.split("@")[0];

    return (
      <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-line space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-widest text-accent font-bold px-3 py-1 rounded-full bg-accent/10 border border-accent/25 inline-flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-accent animate-ping" />
              ACTIVE SESSION · {role?.toUpperCase()}
            </span>
            <button
              type="button"
              onClick={() => signOut()}
              className="text-xs text-muted hover:text-risk transition-colors flex items-center gap-1 font-mono cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="size-3" />
              <span>Sign Out</span>
            </button>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold uppercase text-ink tracking-tight flex items-center gap-2">
            <span>Welcome, {displayName}</span>
          </h2>

          <p className="text-xs text-muted leading-relaxed">
            Authenticated via <span className="text-ink font-mono font-medium">{user.email}</span> with authorized{" "}
            <span className="text-accent font-mono font-bold">{roleBadge}</span> privileges.
          </p>
        </div>

        {/* Primary Action: Go to Authorized Area */}
        <div className="pt-1">
          <Link
            href={roleHome}
            className="flex items-center justify-center gap-2 w-full py-3.5 px-6 rounded-full bg-accent text-[#171915] font-bold text-xs uppercase tracking-wide font-mono hover:bg-[#cbf046] transition-all cursor-pointer shadow-sm group"
          >
            <span>Open {roleTitle}</span>
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {/* Role-Specific Quick Shortcuts */}
        {role === "admin" && (
          <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-[10px]">
            <Link
              href="/admin/roster"
              className="p-2.5 rounded-2xl bg-canvas border border-line hover:border-accent/50 text-center flex flex-col items-center gap-1 text-muted hover:text-ink transition-colors"
            >
              <Users className="size-3.5 text-accent" />
              <span>Roster</span>
            </Link>
            <Link
              href="/admin/staff"
              className="p-2.5 rounded-2xl bg-canvas border border-line hover:border-accent/50 text-center flex flex-col items-center gap-1 text-muted hover:text-ink transition-colors"
            >
              <UserCheck className="size-3.5 text-accent" />
              <span>Staff</span>
            </Link>
            <Link
              href="/admin/academic"
              className="p-2.5 rounded-2xl bg-canvas border border-line hover:border-accent/50 text-center flex flex-col items-center gap-1 text-muted hover:text-ink transition-colors"
            >
              <BookOpen className="size-3.5 text-accent" />
              <span>Catalog</span>
            </Link>
          </div>
        )}

        {role === "student" && (
          <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[10px]">
            <Link
              href="/dashboard"
              className="p-2.5 rounded-2xl bg-canvas border border-line hover:border-accent/50 text-center flex items-center justify-center gap-1.5 text-muted hover:text-ink transition-colors"
            >
              <GraduationCap className="size-3.5 text-accent" />
              <span>My Attendance</span>
            </Link>
            <Link
              href="/dashboard/profile"
              className="p-2.5 rounded-2xl bg-canvas border border-line hover:border-accent/50 text-center flex items-center justify-center gap-1.5 text-muted hover:text-ink transition-colors"
            >
              <span>Student Profile</span>
            </Link>
          </div>
        )}

        {role === "lecturer" && (
          <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[10px]">
            <Link
              href="/lecturer"
              className="p-2.5 rounded-2xl bg-canvas border border-line hover:border-accent/50 text-center flex items-center justify-center gap-1.5 text-muted hover:text-ink transition-colors"
            >
              <Briefcase className="size-3.5 text-accent" />
              <span>Mark Attendance</span>
            </Link>
            <Link
              href="/lecturer"
              className="p-2.5 rounded-2xl bg-canvas border border-line hover:border-accent/50 text-center flex items-center justify-center gap-1.5 text-muted hover:text-ink transition-colors"
            >
              <span>Class Timetable</span>
            </Link>
          </div>
        )}

        <div className="border-t border-line pt-4 space-y-2 text-[11px] text-muted font-mono">
          <div className="flex items-center justify-between">
            <span>Security Status</span>
            <span className="text-accent flex items-center gap-1">
              <ShieldCheck className="size-3" />
              Verified @iiitt.ac.in
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Assigned Role</span>
            <span className="text-ink font-bold uppercase">{role}</span>
          </div>
        </div>
      </div>
    );
  }

  // When not logged in: Show Institutional Sign In card
  return (
    <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-line space-y-6">
      <div className="space-y-2">
        <span className="text-[10px] font-mono uppercase tracking-widest text-accent font-bold px-3 py-1 rounded-full bg-accent/10 border border-accent/25 inline-block">
          INSTITUTIONAL ACCESS
        </span>
        <h2 className="text-xl sm:text-2xl font-bold uppercase text-ink tracking-tight">
          Sign In to Portal
        </h2>
        <p className="text-xs text-muted leading-relaxed">
          Authentication is strictly restricted to verified{" "}
          <span className="text-ink font-mono font-medium">@iiitt.ac.in</span> institutional email accounts linked to the
          official institute roster.
        </p>
      </div>

      <div className="pt-2">
        <Link
          href="/sign-in"
          className="flex items-center justify-center gap-2 w-full py-3.5 px-6 rounded-full bg-accent text-[#171915] font-bold text-xs uppercase tracking-wide font-mono hover:bg-[#cbf046] transition-all cursor-pointer shadow-sm"
        >
          <span>Sign In with @iiitt.ac.in</span>
          <ArrowRight className="size-4" />
        </Link>
      </div>

      <div className="border-t border-line pt-4 space-y-2 text-[11px] text-muted font-mono">
        <div className="flex items-center justify-between">
          <span>Authentication Method</span>
          <span className="text-ink">Passwordless Email Link</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Authorized Domain</span>
          <span className="text-accent">@iiitt.ac.in</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Statutory Rule</span>
          <span className="text-ink">75% Attendance Policy</span>
        </div>
      </div>
    </div>
  );
}
