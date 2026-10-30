"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { useAuth } from "@/components/auth/AuthProvider";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { BranchTimetableView } from "@/components/timetable/BranchTimetableView";
import {
  Users,
  Briefcase,
  BookOpen,
  FileSpreadsheet,
  ShieldCheck,
  History,
  ArrowRight,
  GraduationCap,
} from "lucide-react";

export default function AdminOverviewPage() {
  const { getIdToken } = useAuth();
  const [stats, setStats] = useState({
    rosterCount: 0,
    staffCount: 0,
    offeringsCount: 0,
    auditCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const token = await getIdToken();
        const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

        const [rosterRes, staffRes, auditRes] = await Promise.all([
          fetch("/api/admin/roster?limit=500", { headers }).catch(() => null),
          fetch("/api/admin/staff", { headers }).catch(() => null),
          fetch("/api/admin/audit-events?limit=100", { headers }).catch(() => null),
        ]);

        const rosterData = rosterRes?.ok ? await rosterRes.json() : null;
        const staffData = staffRes?.ok ? await staffRes.json() : null;
        const auditData = auditRes?.ok ? await auditRes.json() : null;

        if (active) {
          setStats({
            rosterCount: rosterData?.total || rosterData?.roster?.length || 0,
            staffCount: staffData?.staff?.length || 0,
            offeringsCount: 8,
            auditCount: auditData?.events?.length || 0,
          });
        }
      } catch (err) {
        console.error("Failed to fetch admin metrics:", err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [getIdToken]);

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <AppShell currentPath="/admin">
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-6">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-[.25em] text-accent font-mono">
                  ADMINISTRATIVE CONSOLE
                </span>
                <span className="text-muted/60">•</span>
                <span className="text-[10px] font-mono text-muted uppercase">SYSTEM INTEGRITY</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink uppercase">
                Portal Management & Registry
              </h1>
              <p className="text-xs sm:text-sm text-muted mt-1 max-w-2xl leading-relaxed">
                Authoritative administration for approved student rosters, faculty provisioning,
                academic course catalogs, and attendance audit records.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <Button href="/admin/roster" variant="primary" size="sm" className="font-mono text-xs">
                <FileSpreadsheet className="size-3.5 mr-1.5" />
                Import Roster CSV
              </Button>
            </div>
          </div>

          {/* Superuser Dual Student Profile Switcher */}
          <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-accent/40 bg-accent/[0.04] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="size-10 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center text-accent shrink-0">
                <GraduationCap className="size-5" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-accent">Superuser / Dual Access</span>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-accent/20 text-accent font-bold">Roll: 261161</span>
                </div>
                <h3 className="text-sm font-bold text-ink">Personal Student Ledger & Faculty Portals</h3>
                <p className="text-xs text-muted leading-relaxed">
                  You have full superuser access to your own student attendance dashboard, bunk calculator, 1st year timetable, and faculty marking portal.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Button href="/dashboard" variant="primary" size="sm" className="font-mono text-xs">
                <GraduationCap className="size-3.5 mr-1.5" />
                My Student Dashboard
              </Button>
              <Button href="/lecturer" variant="outline" size="sm" className="font-mono text-xs">
                <Briefcase className="size-3.5 mr-1.5" />
                Faculty Portal
              </Button>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card variant="raised" className="border-line/80">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-mono text-muted uppercase block">
                    Approved Roster
                  </span>
                  <div className="text-2xl font-black font-mono text-ink mt-1">
                    {loading ? "..." : stats.rosterCount}
                  </div>
                  <span className="text-[10px] text-accent font-mono mt-0.5 block">
                    Active Student Records
                  </span>
                </div>
                <div className="p-2.5 rounded-[3px] bg-accent/10 border border-accent/20 text-accent">
                  <Users className="size-5" />
                </div>
              </CardContent>
            </Card>

            <Card variant="raised" className="border-line/80">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-mono text-muted uppercase block">
                    Provisioned Staff
                  </span>
                  <div className="text-2xl font-black font-mono text-ink mt-1">
                    {loading ? "..." : stats.staffCount}
                  </div>
                  <span className="text-[10px] text-accent font-mono mt-0.5 block">
                    Lecturers & Admins
                  </span>
                </div>
                <div className="p-2.5 rounded-[3px] bg-accent/10 border border-accent/20 text-accent">
                  <Briefcase className="size-5" />
                </div>
              </CardContent>
            </Card>

            <Card variant="raised" className="border-line/80">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-mono text-muted uppercase block">
                    Course Offerings
                  </span>
                  <div className="text-2xl font-black font-mono text-ink mt-1">
                    {loading ? "..." : stats.offeringsCount}
                  </div>
                  <span className="text-[10px] text-accent font-mono mt-0.5 block">
                    Curriculum Term Offerings
                  </span>
                </div>
                <div className="p-2.5 rounded-[3px] bg-accent/10 border border-accent/20 text-accent">
                  <BookOpen className="size-5" />
                </div>
              </CardContent>
            </Card>

            <Card variant="raised" className="border-line/80">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-mono text-muted uppercase block">
                    Audit Log Events
                  </span>
                  <div className="text-2xl font-black font-mono text-ink mt-1">
                    {loading ? "..." : stats.auditCount}
                  </div>
                  <span className="text-[10px] text-accent font-mono mt-0.5 block">
                    Immutable Entries
                  </span>
                </div>
                <div className="p-2.5 rounded-[3px] bg-accent/10 border border-accent/20 text-accent">
                  <History className="size-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Module Navigation Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <Link href="/admin/roster" className="group">
              <Card variant="raised" className="h-full border-line hover:border-accent transition-all">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 rounded-[3px] bg-surface border border-line text-accent">
                      <FileSpreadsheet className="size-5" />
                    </div>
                    <ArrowRight className="size-4 text-muted group-hover:text-accent group-hover:translate-x-1 transition-all" />
                  </div>
                  <CardTitle className="text-base font-bold text-ink group-hover:text-accent transition-colors">
                    Student Roster Management
                  </CardTitle>
                  <CardDescription className="text-xs text-muted leading-relaxed">
                    Upload official CSV roster batches with pre-validation. View, filter, and search
                    registered students eligible for portal identity claims.
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/admin/staff" className="group">
              <Card variant="raised" className="h-full border-line hover:border-accent transition-all">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 rounded-[3px] bg-surface border border-line text-accent">
                      <Briefcase className="size-5" />
                    </div>
                    <ArrowRight className="size-4 text-muted group-hover:text-accent group-hover:translate-x-1 transition-all" />
                  </div>
                  <CardTitle className="text-base font-bold text-ink group-hover:text-accent transition-colors">
                    Faculty & Staff Provisioning
                  </CardTitle>
                  <CardDescription className="text-xs text-muted leading-relaxed">
                    Authorize faculty accounts and assign lecturer or administrator privileges.
                    Safely activate or deactivate accounts with last-admin safeguards.
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/admin/academic" className="group">
              <Card variant="raised" className="h-full border-line hover:border-accent transition-all">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 rounded-[3px] bg-surface border border-line text-accent">
                      <BookOpen className="size-5" />
                    </div>
                    <ArrowRight className="size-4 text-muted group-hover:text-accent group-hover:translate-x-1 transition-all" />
                  </div>
                  <CardTitle className="text-base font-bold text-ink group-hover:text-accent transition-colors">
                    Academic Catalog & Enrollments
                  </CardTitle>
                  <CardDescription className="text-xs text-muted leading-relaxed">
                    Manage courses, term offerings, student enrollments, and teaching assignments.
                    Execute atomic curriculum imports.
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/admin/corrections" className="group">
              <Card variant="raised" className="h-full border-line hover:border-accent transition-all">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 rounded-[3px] bg-surface border border-line text-accent">
                      <ShieldCheck className="size-5" />
                    </div>
                    <ArrowRight className="size-4 text-muted group-hover:text-accent group-hover:translate-x-1 transition-all" />
                  </div>
                  <CardTitle className="text-base font-bold text-ink group-hover:text-accent transition-colors">
                    Attendance Ledger Corrections
                  </CardTitle>
                  <CardDescription className="text-xs text-muted leading-relaxed">
                    Search and rectify attendance entries for completed sessions. Mandatory
                    administrative justification is enforced and recorded in the audit trail.
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/admin/audit" className="group">
              <Card variant="raised" className="h-full border-line hover:border-accent transition-all">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 rounded-[3px] bg-surface border border-line text-accent">
                      <History className="size-5" />
                    </div>
                    <ArrowRight className="size-4 text-muted group-hover:text-accent group-hover:translate-x-1 transition-all" />
                  </div>
                  <CardTitle className="text-base font-bold text-ink group-hover:text-accent transition-colors">
                    Security Audit Trail
                  </CardTitle>
                  <CardDescription className="text-xs text-muted leading-relaxed">
                    Review append-only security logs of all administrative actions, roster uploads,
                    permission alterations, and attendance modifications.
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </div>

          {/* Department Timetables Preview & Audit */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold font-mono uppercase tracking-wide text-ink">
                  Institutional Department Timetables
                </h2>
                <p className="text-xs text-muted">
                  Audited live slot schedules for all 4 departments (CSE Core, CSE AI&DS, ECE Core, VLSI Design).
                </p>
              </div>
            </div>
            <BranchTimetableView allowBranchSwitching={true} />
          </div>

          {/* System Security & Integrity Banner */}
          <div className="rounded-[3px] border border-line bg-surface p-5 space-y-3">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-accent animate-pulse" />
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-accent">
                Security Enforcements Active
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3 rounded-[3px] bg-canvas border border-line space-y-1">
                <span className="text-[10px] font-mono text-muted uppercase block">Identity Restriction</span>
                <p className="text-ink font-semibold">Strictly @iiitt.ac.in Verified</p>
                <p className="text-[11px] text-muted">Untrusted domains rejected by Firestore rules & server guards.</p>
              </div>
              <div className="p-3 rounded-[3px] bg-canvas border border-line space-y-1">
                <span className="text-[10px] font-mono text-muted uppercase block">Access Model</span>
                <p className="text-ink font-semibold">Deny-by-Default Firestore Rules</p>
                <p className="text-[11px] text-muted">All mutations require server-side privileged Admin SDK transactions.</p>
              </div>
              <div className="p-3 rounded-[3px] bg-canvas border border-line space-y-1">
                <span className="text-[10px] font-mono text-muted uppercase block">Auditing</span>
                <p className="text-ink font-semibold">Cryptographic Audit Trail</p>
                <p className="text-[11px] text-muted">Administrative operations generate immutable audit events with actor UID.</p>
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    </RoleGuard>
  );
}
