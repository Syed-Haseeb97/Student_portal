"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { SignOutConfirmModal } from "@/components/auth/SignOutConfirmModal";
import {
  ArrowRight,
  ShieldCheck,
  GraduationCap,
  Briefcase,
  LogOut,
  Users,
  UserCheck,
  BookOpen,
} from "lucide-react";

export function LandingAccessCard() {
  const { user, role, loading, signOut } = useAuth();
  const [showSignOutModal, setShowSignOutModal] = useState(false);

  if (loading) {
    return (
      <div className="card p-6 sm:p-8 space-y-6 animate-pulse">
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
      <div className="card p-6 sm:p-8 space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono tracking-wider text-safe font-semibold px-3 py-1 rounded-full bg-safe-soft border border-safe/25 inline-flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-safe animate-pulse" />
              ACTIVE SESSION · {role?.toUpperCase()}
            </span>
            <button
              type="button"
              onClick={() => setShowSignOutModal(true)}
              className="text-xs text-muted hover:text-risk transition-colors flex items-center gap-1 font-mono cursor-pointer touch-manipulation"
              title="Sign Out"
            >
              <LogOut className="size-3.5" />
              <span>Sign Out</span>
            </button>
          </div>

          <h2 className="font-serif text-3xl leading-tight text-ink">
            Welcome, {displayName}
          </h2>

          <p className="text-xs text-muted leading-relaxed">
            Authenticated via <span className="text-ink font-mono font-medium">{user.email}</span> with authorized{" "}
            <span className="text-safe font-mono font-semibold">{roleBadge}</span> privileges.
          </p>
        </div>

        {/* Primary Action: Go to Authorized Area */}
        <div className="pt-1">
          <Link
            href={roleHome}
            className="flex items-center justify-center gap-2 w-full py-3.5 px-6 rounded-full bg-solid text-on-solid font-medium text-sm hover:opacity-90 transition-all cursor-pointer shadow-sm group touch-manipulation min-h-[44px]"
          >
            <span>Open {roleTitle}</span>
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {/* Role-Specific Quick Shortcuts */}
        {role === "admin" && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
              <Link
                href="/dashboard"
                className="p-2.5 rounded-xl bg-surface border border-line hover:border-ink/40 text-center flex items-center justify-center gap-1.5 text-ink font-medium transition-colors touch-manipulation min-h-[40px]"
              >
                <GraduationCap className="size-3.5 text-safe" />
                <span>My Student Dashboard</span>
              </Link>
              <Link
                href="/lecturer"
                className="p-2.5 rounded-xl bg-surface border border-line hover:border-ink/40 text-center flex items-center justify-center gap-1.5 text-muted hover:text-ink transition-colors touch-manipulation min-h-[40px]"
              >
                <Briefcase className="size-3.5 text-safe" />
                <span>Faculty Portal</span>
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-2 font-mono text-[10px]">
              <Link
                href="/admin/roster"
                className="p-2 rounded-xl bg-surface border border-line hover:border-ink/40 text-center flex flex-col items-center gap-1 text-muted hover:text-ink transition-colors touch-manipulation"
              >
                <Users className="size-3.5 text-safe" />
                <span>Roster</span>
              </Link>
              <Link
                href="/admin/staff"
                className="p-2 rounded-xl bg-surface border border-line hover:border-ink/40 text-center flex flex-col items-center gap-1 text-muted hover:text-ink transition-colors touch-manipulation"
              >
                <UserCheck className="size-3.5 text-safe" />
                <span>Staff</span>
              </Link>
              <Link
                href="/admin/academic"
                className="p-2 rounded-xl bg-surface border border-line hover:border-ink/40 text-center flex flex-col items-center gap-1 text-muted hover:text-ink transition-colors touch-manipulation"
              >
                <BookOpen className="size-3.5 text-safe" />
                <span>Catalog</span>
              </Link>
            </div>
          </div>
        )}

        {role === "student" && (
          <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
            <Link
              href="/dashboard"
              className="p-2.5 rounded-xl bg-surface border border-line hover:border-ink/40 text-center flex items-center justify-center gap-1.5 text-muted hover:text-ink transition-colors"
            >
              <GraduationCap className="size-3.5 text-safe" />
              <span>My Attendance</span>
            </Link>
            <Link
              href="/dashboard/profile"
              className="p-2.5 rounded-xl bg-surface border border-line hover:border-ink/40 text-center flex items-center justify-center gap-1.5 text-muted hover:text-ink transition-colors"
            >
              <span>Student Profile</span>
            </Link>
          </div>
        )}

        {role === "lecturer" && (
          <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
            <Link
              href="/lecturer"
              className="p-2.5 rounded-xl bg-surface border border-line hover:border-ink/40 text-center flex items-center justify-center gap-1.5 text-muted hover:text-ink transition-colors"
            >
              <Briefcase className="size-3.5 text-safe" />
              <span>Mark Attendance</span>
            </Link>
            <Link
              href="/lecturer"
              className="p-2.5 rounded-xl bg-surface border border-line hover:border-ink/40 text-center flex items-center justify-center gap-1.5 text-muted hover:text-ink transition-colors"
            >
              <span>Class Timetable</span>
            </Link>
          </div>
        )}

        <div className="border-t border-line pt-4 space-y-2 text-xs text-muted font-mono">
          <div className="flex items-center justify-between">
            <span>Security Status</span>
            <span className="text-safe flex items-center gap-1">
              <ShieldCheck className="size-3.5" />
              Verified @iiitt.ac.in
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Assigned Role</span>
            <span className="text-ink font-semibold uppercase">{role}</span>
          </div>
        </div>

        <SignOutConfirmModal
          isOpen={showSignOutModal}
          onClose={() => setShowSignOutModal(false)}
          onConfirm={signOut}
          userEmail={user?.email}
        />
      </div>
    );
  }

  // When not logged in: Show Institutional Sign In card
  return (
    <div className="card p-6 sm:p-8 space-y-6">
      <div className="space-y-3">
        <span className="text-[11px] font-mono tracking-wider text-safe font-semibold px-3 py-1 rounded-full bg-safe-soft border border-safe/25 inline-block">
          INSTITUTIONAL ACCESS
        </span>
        <h2 className="font-serif text-3xl leading-tight text-ink">
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
          className="flex items-center justify-center gap-2 w-full py-3.5 px-6 rounded-full bg-solid text-on-solid font-medium text-sm hover:opacity-90 transition-all cursor-pointer shadow-sm min-h-[44px]"
        >
          <span>Sign In with @iiitt.ac.in</span>
          <ArrowRight className="size-4" />
        </Link>
      </div>

      <div className="border-t border-line pt-4 space-y-2 text-xs text-muted font-mono">
        <div className="flex items-center justify-between">
          <span>Authentication</span>
          <span className="text-ink">Passwordless Email Link</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Authorized Domain</span>
          <span className="text-safe font-medium">@iiitt.ac.in</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Statutory Ordinance</span>
          <span className="text-ink font-medium">75% Attendance Rule</span>
        </div>
      </div>
    </div>
  );
}
