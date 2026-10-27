"use client";

import React from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { useAuth } from "@/components/auth/AuthProvider";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  GraduationCap,
  Mail,
  Calendar,
  Building,
  ShieldCheck,
  ArrowLeft,
  BookOpen,
  Award,
} from "lucide-react";

export default function StudentProfilePage() {
  const { user } = useAuth();

  return (
    <RoleGuard allowedRoles={["student"]}>
      <AppShell currentPath="/dashboard/profile">
        <div className="space-y-6 animate-in fade-in duration-300 max-w-4xl">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-6">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Link
                  href="/dashboard"
                  className="text-muted hover:text-ink transition-colors font-mono text-[10px] uppercase flex items-center gap-1"
                >
                  <ArrowLeft className="size-3" /> STUDENT DASHBOARD
                </Link>
                <span className="text-muted/60">•</span>
                <span className="text-[10px] font-mono text-accent uppercase font-bold">
                  STUDENT RECORD
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink uppercase">
                Academic Profile & Credentials
              </h1>
              <p className="text-xs sm:text-sm text-muted mt-1 max-w-2xl leading-relaxed">
                Official student identity details synchronized with the approved institutional roster.
              </p>
            </div>

            <Button href="/dashboard" variant="outline" size="sm" className="font-mono text-xs shrink-0">
              Back to Attendance Ledger
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Card: Identity Card */}
            <Card variant="raised" className="border-line/80 md:col-span-1 p-6 text-center space-y-4">
              <div className="size-20 rounded-[3px] bg-accent/10 border border-accent/25 mx-auto flex items-center justify-center text-accent">
                <GraduationCap className="size-10" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-ink">{user?.name || "Student"}</h2>
                <span className="text-xs font-mono font-bold text-accent uppercase tracking-wider block mt-0.5">
                  {user?.rollNumber || "261161"}
                </span>
              </div>
              <div className="pt-2 border-t border-line/60">
                <Badge variant="compliant" size="sm" className="font-mono uppercase text-[10px]">
                  <ShieldCheck className="size-3 mr-1" />
                  Roster Verified
                </Badge>
              </div>
            </Card>

            {/* Right Card: Institutional Details */}
            <Card variant="raised" className="border-line/80 md:col-span-2">
              <CardHeader>
                <CardTitle className="text-base font-bold text-ink flex items-center gap-2">
                  <Award className="size-4 text-accent" />
                  Institutional Registration Records
                </CardTitle>
                <CardDescription className="text-xs text-muted">
                  Academic details maintained under the supervision of the Office of Academic Affairs.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 rounded-[3px] bg-surface border border-line space-y-1">
                    <span className="text-[10px] font-mono text-muted uppercase block">
                      Institutional Mailbox
                    </span>
                    <p className="font-mono text-ink font-semibold flex items-center gap-1.5 truncate">
                      <Mail className="size-3.5 text-accent shrink-0" />
                      {user?.email || "261161@iiitt.ac.in"}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-[3px] bg-surface border border-line space-y-1">
                    <span className="text-[10px] font-mono text-muted uppercase block">
                      Graduation Batch Year
                    </span>
                    <p className="font-mono text-ink font-semibold flex items-center gap-1.5">
                      <Calendar className="size-3.5 text-accent shrink-0" />
                      Class of {user?.batch || "2026"}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-[3px] bg-surface border border-line space-y-1 sm:col-span-2">
                    <span className="text-[10px] font-mono text-muted uppercase block">
                      Degree Programme & Branch
                    </span>
                    <p className="font-sans text-ink font-semibold flex items-center gap-1.5">
                      <BookOpen className="size-3.5 text-accent shrink-0" />
                      {user?.programme || "B.Tech in Computer Science and Engineering"}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-[3px] bg-surface border border-line space-y-1 sm:col-span-2">
                    <span className="text-[10px] font-mono text-muted uppercase block">
                      Permanent Institute Campus
                    </span>
                    <p className="font-sans text-muted leading-relaxed flex items-center gap-1.5">
                      <Building className="size-3.5 text-accent shrink-0" />
                      Indian Institute of Information Technology, Sethurappatti, Tiruchirappalli - 620012, Tamil Nadu.
                    </p>
                  </div>
                </div>

                <div className="rounded-[3px] border border-line bg-canvas p-3 text-[11px] text-muted space-y-1 font-mono">
                  <span className="text-accent uppercase font-bold block">75% Ordinance Compliance Notice</span>
                  <p className="leading-relaxed">
                    Under the Senate regulations of IIIT Tiruchirappalli, a minimum of 75% attendance
                    is mandatory in every registered theory and laboratory course offering to qualify
                    for the end-semester examinations.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </AppShell>
    </RoleGuard>
  );
}
