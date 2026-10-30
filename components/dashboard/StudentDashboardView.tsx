"use client";

import Image from "next/image";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import type { StudentDashboardData, NormalizedAttendanceStatus, StudentSummary } from "@/lib/api/types";
import { normalizeAttendanceStatus } from "@/lib/api/types";
import { getStudentDashboard, type MockScenario } from "@/lib/api/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { calculateGuidance } from "@/lib/attendance/calc";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { AttendanceProgress } from "@/components/ui/AttendanceProgress";
import { DashboardSkeleton, EmptyState, ErrorState } from "@/components/ui/StateFeedback";
import { StudentSubjectDetailModal } from "./StudentSubjectDetailModal";
import { BranchTimetableView } from "@/components/timetable/BranchTimetableView";
import { StudentNoticesView } from "@/components/notices/StudentNoticesView";
import { resolveBranchFromRollOrEmail } from "@/lib/timetable/first-year-data";
import { inferStudentFromRollOrEmail } from "@/lib/roster/validate";
import {
  GraduationCap,
  ShieldCheck,
  ShieldAlert,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Info,
  Search,
  Calendar,
  Check,
  ChevronRight,
  Bell,
  Clock,
} from "lucide-react";

interface StudentDashboardViewProps {
  initialData?: StudentDashboardData;
  idToken?: string;
  isMockDefault?: boolean;
}

export function StudentDashboardView({
  initialData,
  idToken,
  isMockDefault = true,
}: StudentDashboardViewProps) {
  const [data, setData] = useState<StudentDashboardData | null>(initialData ?? null);
  const [loading, setLoading] = useState<boolean>(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [statusCode, setStatusCode] = useState<number | null>(null);
  const [isMock, setIsMock] = useState<boolean>(isMockDefault);
  const [activeFilter, setActiveFilter] = useState<"all" | NormalizedAttendanceStatus>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCourse, setSelectedCourse] = useState<StudentSummary | null>(null);
  const [mockScenario, setMockScenario] = useState<MockScenario>("normal");
  const [activeTab, setActiveTab] = useState<"attendance" | "timetable" | "notices">("attendance");

  const { user, getIdToken } = useAuth();

  const loadDashboard = useCallback(
    async (scenario?: MockScenario) => {
      setLoading(true);
      setError(null);
      setStatusCode(null);

      const token = idToken ?? (await getIdToken()) ?? undefined;
      const res = await getStudentDashboard(token, {
        mockScenario: scenario ?? mockScenario,
      });

      setStatusCode(res.status);
      setIsMock(Boolean(res.isMock));

      if (res.data) {
        setData(res.data);
      } else {
        setData(null);
        setError(res.error ?? "Failed to load dashboard data.");
      }
      setLoading(false);
    },
    [idToken, getIdToken, mockScenario]
  );

  useEffect(() => {
    let active = true;

    if (!initialData) {
      (async () => {
        const token = idToken ?? (await getIdToken()) ?? undefined;
        const res = await getStudentDashboard(token, {
          mockScenario,
        });

        if (!active) return;

        setStatusCode(res.status);
        setIsMock(Boolean(res.isMock));

        if (res.data) {
          setData(res.data);
        } else {
          setData(null);
          setError(res.error ?? "Failed to load dashboard data.");
        }
        setLoading(false);
      })();
    }

    return () => {
      active = false;
    };
  }, [initialData, idToken, getIdToken, mockScenario]);

  // Calculations for summary metrics
  const summaries = useMemo(() => data?.summaries ?? [], [data?.summaries]);

  const compliantCourses = useMemo(
    () => summaries.filter((s) => normalizeAttendanceStatus(s.status) === "compliant"),
    [summaries]
  );
  const shortfallCourses = useMemo(
    () => summaries.filter((s) => normalizeAttendanceStatus(s.status) === "shortfall"),
    [summaries]
  );
  const noDataCourses = useMemo(
    () => summaries.filter((s) => normalizeAttendanceStatus(s.status) === "no_data"),
    [summaries]
  );

  // Authoritative branch and department resolution from roll number or institutional email:
  // 11 = CSE, 12 = ECE, 13 = CSE AI&DS, 14 = ECE VLSI
  const studentBranch = useMemo(() => {
    return resolveBranchFromRollOrEmail(
      user?.rollNumber || user?.email || data?.student?.rollNumber || data?.student?.email
    );
  }, [user?.rollNumber, user?.email, data?.student?.rollNumber, data?.student?.email]);

  const studentBatch = useMemo(() => {
    const identifier = user?.rollNumber || user?.email || data?.student?.rollNumber || data?.student?.email || "";
    const inferred = inferStudentFromRollOrEmail(identifier);
    if (inferred?.batch) return inferred.batch;
    if (data?.student?.batch) return data.student.batch;
    return "2026";
  }, [user?.rollNumber, user?.email, data?.student?.rollNumber, data?.student?.email, data?.student?.batch]);

  const departmentLabel = useMemo(() => {
    if (studentBranch === "11") return "Computer Science & Engineering";
    if (studentBranch === "12") return "Electronics & Communication Engineering";
    if (studentBranch === "13") return "Computer Science & Engineering (AI & DS)";
    if (studentBranch === "14") return "ECE (VLSI Design)";
    return "CSE Department";
  }, [studentBranch]);

  const programmeLabel = useMemo(() => {
    if (studentBranch === "11") return "B.Tech Computer Science & Engineering";
    if (studentBranch === "12") return "B.Tech Electronics & Communication Engineering";
    if (studentBranch === "13") return "B.Tech Computer Science & Engineering (AI & DS)";
    if (studentBranch === "14") return "B.Tech Electronics & Communication Engineering (VLSI Design)";
    return data?.student.programme ?? "—";
  }, [studentBranch, data?.student.programme]);

  // Filtered summaries based on tab and optional search query
  const filteredSummaries = useMemo(() => {
    return summaries.filter((course) => {
      const normStatus = normalizeAttendanceStatus(course.status);
      const matchesFilter = activeFilter === "all" || normStatus === activeFilter;
      if (!matchesFilter) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const code = (course.courseCode ?? "").toLowerCase();
      const title = (course.courseTitle ?? "").toLowerCase();
      const offering = (course.offeringId ?? "").toLowerCase();
      return code.includes(q) || title.includes(q) || offering.includes(q);
    });
  }, [summaries, activeFilter, searchQuery]);

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Top Banner: Mode Indicator & Simulator Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl sm:rounded-full bg-surface border border-line text-xs font-mono">
        <div className="flex items-center gap-2.5">
          <Badge variant={isMock ? "preview" : "compliant"} size="sm">
            {isMock ? (
              <>
                <Sparkles className="size-3 text-accent" />
                SYNTHETIC PREVIEW
              </>
            ) : (
              <>
                <ShieldCheck className="size-3 text-accent" />
                LIVE INSTITUTE DATA
              </>
            )}
          </Badge>
          <span className="text-muted hidden md:inline text-[11px]">
            {isMock
              ? "All student records and course offerings below are synthetic simulations."
              : "Connected to authenticated IIIT Trichy attendance backend."}
          </span>
        </div>

        {/* State Simulator Switcher (Visible only with explicit dev flag) */}
        {isMock && process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_SHOW_DEV_SCENARIOS === "true" && (
          <div className="flex items-center gap-1.5 self-start sm:self-auto overflow-x-auto">
            <span className="text-[10px] text-muted whitespace-nowrap uppercase">Preview:</span>
            {(
              [
                ["normal", "Standard"],
                ["empty", "Empty"],
                ["unauthorized", "403 Denied"],
                ["error", "503 Error"],
              ] as const
            ).map(([scenario, label]) => (
              <button
                key={scenario}
                type="button"
                onClick={() => {
                  setMockScenario(scenario);
                  loadDashboard(scenario);
                }}
                className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold border transition-colors cursor-pointer uppercase ${
                  mockScenario === scenario
                    ? "bg-[#283226] border-accent text-accent shadow-xs"
                    : "bg-canvas border-line text-muted hover:text-ink hover:border-line/80"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Roster-Linked Student Identity Banner */}
      {data?.student && (
        <section aria-label="Student Identity Information">
          <div className="p-4 sm:p-6 rounded-3xl bg-surface border border-line relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
              <div className="flex items-start sm:items-center gap-3.5">
                {/* Student Avatar Monogram */}
                <div className="size-11 sm:size-13 rounded-full bg-canvas border border-line p-2 flex items-center justify-center shrink-0">
                  <Image
                    src="/images/iiitt-seal.png"
                    alt="IIITT Official Crest"
                    width={44}
                    height={44}
                    className="w-full h-full object-contain"
                  />
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-accent">
                      IIIT Trichy · {departmentLabel}
                    </span>
                    <span className="text-muted/40">•</span>
                    <Badge variant="neutral" size="sm" className="text-[9px] py-0 px-1.5">
                      Verified Roster Entry
                    </Badge>
                  </div>

                  <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-ink flex items-center gap-2">
                    <span>{user?.name ?? data.student.name ?? "Enrolled Student"}</span>
                  </h1>

                  <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-muted font-mono">
                    <span className="inline-flex items-center gap-1.5 bg-canvas px-2.5 py-1 rounded-lg border border-line/70">
                      <span className="text-muted/70 text-[10px]">ROLL:</span>
                      <strong className="text-accent font-bold tracking-wide">
                        {user?.rollNumber ?? data.student.rollNumber ?? "Unassigned"}
                      </strong>
                    </span>
                    <span className="inline-flex items-center gap-1.5 bg-canvas px-2.5 py-1 rounded-lg border border-line/70">
                      <span className="text-muted/70 text-[10px]">BATCH:</span>
                      <strong className="text-ink font-medium">{data.student.batch ?? "—"}</strong>
                    </span>
                    <div className="w-full sm:w-auto mt-0.5 sm:mt-0 flex items-center gap-1.5 bg-canvas px-2.5 py-1 rounded-lg border border-line/70 text-[11px] sm:text-xs">
                      <span className="text-muted/70 text-[10px] uppercase font-bold shrink-0">PROG:</span>
                      <strong className="text-ink font-medium leading-tight">{programmeLabel}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Refresh Action */}
              <div className="flex items-center self-end sm:self-auto shrink-0">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => loadDashboard()}
                  disabled={loading}
                  className="gap-1.5 text-xs font-mono font-bold min-h-[38px] px-3.5 touch-manipulation active:scale-95"
                >
                  <RotateCcw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
                  REFRESH
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Primary View Switcher: Mobile Optimized Thumb Buttons */}
      <div className="flex items-center gap-1.5 sm:gap-2 border-b border-line pb-2 overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab("attendance")}
          className={`flex items-center gap-1.5 sm:gap-2 py-2.5 sm:py-2 px-3 sm:px-4 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer whitespace-nowrap min-h-[42px] touch-manipulation active:scale-[0.98] ${
            activeTab === "attendance"
              ? "bg-[#283226] text-accent border border-accent/40 shadow-xs"
              : "bg-surface border border-line text-muted hover:text-ink hover:border-line/80"
          }`}
        >
          <GraduationCap className="size-4 shrink-0" />
          <span className="sm:inline hidden">Attendance & Margins</span>
          <span className="sm:hidden inline">Attendance</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("timetable")}
          className={`flex items-center gap-1.5 sm:gap-2 py-2.5 sm:py-2 px-3 sm:px-4 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer whitespace-nowrap min-h-[42px] touch-manipulation active:scale-[0.98] ${
            activeTab === "timetable"
              ? "bg-[#283226] text-accent border border-accent/40 shadow-xs"
              : "bg-surface border border-line text-muted hover:text-ink hover:border-line/80"
          }`}
        >
          <Calendar className="size-4 shrink-0" />
          <span className="sm:inline hidden">{studentBatch === "2026" ? "1st Year Timetable" : "Weekly Timetable"}</span>
          <span className="sm:hidden inline">Timetable</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("notices")}
          className={`flex items-center gap-1.5 sm:gap-2 py-2.5 sm:py-2 px-3 sm:px-4 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer whitespace-nowrap min-h-[42px] touch-manipulation active:scale-[0.98] ${
            activeTab === "notices"
              ? "bg-[#283226] text-accent border border-accent/40 shadow-xs"
              : "bg-surface border border-line text-muted hover:text-ink hover:border-line/80"
          }`}
        >
          <Bell className="size-4 shrink-0 text-amber-300" />
          <span className="sm:inline hidden">Notices & Deadlines</span>
          <span className="sm:hidden inline">Notices</span>
          <span className="size-1.5 rounded-full bg-amber-400 animate-pulse ml-0.5" />
        </button>
      </div>

      {/* VIEW SELECTION */}
      {activeTab === "timetable" ? (
        <BranchTimetableView
          userRollOrEmail={user?.rollNumber || user?.email || data?.student?.rollNumber || data?.student?.email || undefined}
          defaultBranch={studentBranch}
          batch={studentBatch}
          allowBranchSwitching={true}
        />
      ) : activeTab === "notices" ? (
        <StudentNoticesView branchCode={studentBranch} idToken={idToken} />
      ) : (
        <>
          {/* Quick Notice Callout */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-surface to-surface border border-amber-500/30 text-xs font-mono">
            <div className="flex items-center gap-2.5">
              <span className="p-1 rounded-lg bg-amber-500/20 text-amber-300">
                <Bell className="size-3.5" />
              </span>
              <span className="text-ink">
                <strong>Academic Notice Board:</strong> New assignments and faculty circulars are active.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab("notices")}
              className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold border border-amber-500/40 transition-colors self-start sm:self-auto cursor-pointer flex items-center gap-1.5 min-h-[36px] touch-manipulation active:scale-95"
            >
              <span>View Notice Board</span>
              <ChevronRight className="size-3" />
            </button>
          </div>

          {/* Loading State: Realistic Skeleton */}
          {loading && <DashboardSkeleton />}

          {/* Unauthorized State (401 / 403) */}
          {!loading && (statusCode === 401 || statusCode === 403) && (
            <Card variant="raised" className="border-risk/30 bg-risk/5 p-6 sm:p-10 text-center">
              <div className="mx-auto size-14 rounded-2xl bg-risk/10 border border-risk/20 grid place-items-center text-risk mb-4 shadow-inner">
                <ShieldAlert className="size-7" />
              </div>
              <CardTitle className="text-xl sm:text-2xl font-bold text-ink">
                {statusCode === 401 ? "Authentication Required" : "Approved Roster Match Required"}
              </CardTitle>
              <p className="mt-2 text-xs sm:text-sm text-muted max-w-lg mx-auto leading-relaxed">
                {error ??
                  "Access is granted only when your verified @iiitt.ac.in account is matched to an active, approved student roster entry."}
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Button href="/sign-in" variant="primary" size="md">
                  Sign In with Institute Email
                </Button>
                {isMock && (
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => {
                      setMockScenario("normal");
                      loadDashboard("normal");
                    }}
                  >
                    Reset to Standard Preview
                  </Button>
                )}
              </div>
            </Card>
          )}

          {/* Generic Error State */}
          {!loading && error && statusCode !== 401 && statusCode !== 403 && (
            <ErrorState
              title="Could not load attendance data"
              error={error}
              onRetry={() => loadDashboard()}
            />
          )}

          {/* Empty State: Student exists, but 0 enrolled courses */}
          {!loading && !error && data && summaries.length === 0 && (
            <EmptyState
              icon={GraduationCap}
              title="No Course Enrollments Found"
              description="Your profile is recognized on the approved roster, but you have no active course registrations for this term. If this is unexpected, contact your department office."
              actionLabel="Refresh Records"
              onAction={() => loadDashboard()}
            />
          )}

          {/* Course Attendance List & Metrics */}
          {!loading && !error && data && summaries.length > 0 && (
            <>
              {/* Statutory Policy Card & Summary KPIs */}
              <section aria-label="Attendance Summary and Policy" className="grid gap-3 md:grid-cols-4">
                {/* Policy Card */}
                <Card variant="raised" className="md:col-span-2 relative overflow-hidden flex flex-col justify-between">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted">
                        Attendance Policy
                      </span>
                      <Badge variant="indigo" size="sm" className="font-bold font-mono">
                        {data.policy.thresholdPercent}% Required
                      </Badge>
                    </div>
                    <CardTitle className="mt-1 text-base sm:text-lg">Statutory Attendance Rule</CardTitle>
                    <CardDescription className="text-xs">
                      Mandatory ordinance minimum. Safe margins and deficits are strictly computed per individual course.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted/80 pt-1">
                      <Info className="size-3.5 text-accent shrink-0" />
                      <span>A surplus in one subject cannot offset a shortfall in another.</span>
                    </div>
                  </CardContent>
                </Card>

                {/* KPI: Compliant Courses */}
                <Card className="flex flex-col justify-between hover:border-accent/40 transition-colors">
                  <CardHeader className="pb-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase font-bold text-muted">On Track (≥ {data.policy.thresholdPercent}%)</span>
                      <CheckCircle2 className="size-4 text-accent" />
                    </div>
                    <p className="mt-2 text-3xl sm:text-4xl font-black font-mono text-accent tabular-nums">
                      {compliantCourses.length}
                    </p>
                  </CardHeader>
                  <CardFooter className="pt-2 text-[10px] font-mono text-muted">
                    {compliantCourses.length === summaries.length
                      ? "All enrolled courses compliant"
                      : `${compliantCourses.length} of ${summaries.length} subjects safe`}
                  </CardFooter>
                </Card>

                {/* KPI: Shortfall Courses */}
                <Card className={`flex flex-col justify-between transition-colors ${
                  shortfallCourses.length > 0 ? "border-risk/40 bg-risk/5" : "hover:border-line"
                }`}>
                  <CardHeader className="pb-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase font-bold text-muted">Deficit (&lt; {data.policy.thresholdPercent}%)</span>
                      <AlertTriangle className={`size-4 ${shortfallCourses.length > 0 ? "text-risk" : "text-muted"}`} />
                    </div>
                    <p className={`mt-2 text-3xl sm:text-4xl font-black font-mono tabular-nums ${
                      shortfallCourses.length > 0 ? "text-risk" : "text-muted"
                    }`}>
                      {shortfallCourses.length}
                    </p>
                  </CardHeader>
                  <CardFooter className="pt-2 text-[10px] font-mono">
                    {shortfallCourses.length > 0 ? (
                      <span className="text-risk font-bold">Action Needed</span>
                    ) : (
                      <span className="text-muted">No attendance deficits</span>
                    )}
                  </CardFooter>
                </Card>
              </section>

              {/* Enrolled Courses Section with Interactive Search and Filter Tabs */}
              <section aria-labelledby="enrolled-courses-heading" className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-line pb-3">
                  <div>
                    <h2 id="enrolled-courses-heading" className="text-lg sm:text-xl font-bold uppercase tracking-tight text-ink">
                      Enrolled Subjects & Attendance
                    </h2>
                    <p className="mt-0.5 text-xs text-muted font-mono">
                      Showing {filteredSummaries.length} of {summaries.length} registered subjects · Click any subject to view full session log
                    </p>
                  </div>

                  {/* Controls: Search and Filter Tabs */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                    {/* Search Input */}
                    <div className="relative">
                      <Search className="size-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search subject or code..."
                        className="w-full sm:w-48 pl-8 pr-4 py-2 sm:py-1.5 text-xs rounded-full bg-canvas border border-line text-ink placeholder:text-muted/60 font-mono focus-visible:outline-2 focus-visible:outline-accent min-h-[38px]"
                        aria-label="Filter subjects by code or title"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink text-xs p-1"
                          aria-label="Clear search"
                        >
                          ×
                        </button>
                      )}
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex items-center gap-1 bg-surface p-1 rounded-full border border-line text-xs overflow-x-auto scrollbar-none">
                      <button
                        type="button"
                        onClick={() => setActiveFilter("all")}
                        className={`px-3 py-1.5 rounded-full font-mono text-[11px] font-bold uppercase transition-colors cursor-pointer whitespace-nowrap min-h-[34px] touch-manipulation ${
                          activeFilter === "all"
                            ? "bg-[#283226] text-ink border border-line"
                            : "text-muted hover:text-ink"
                        }`}
                      >
                        All ({summaries.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveFilter("compliant")}
                        className={`px-3 py-1.5 rounded-full font-mono text-[11px] font-bold uppercase transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1 min-h-[34px] touch-manipulation ${
                          activeFilter === "compliant"
                            ? "bg-[#283226] text-accent border border-accent/40"
                            : "text-muted hover:text-ink"
                        }`}
                      >
                        <span className="size-1.5 rounded-full bg-accent" />
                        <span>Safe ({compliantCourses.length})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveFilter("shortfall")}
                        className={`px-3 py-1.5 rounded-full font-mono text-[11px] font-bold uppercase transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1 min-h-[34px] touch-manipulation ${
                          activeFilter === "shortfall"
                            ? "bg-risk/20 text-risk border border-risk/40"
                            : "text-muted hover:text-ink"
                        }`}
                      >
                        <span className="size-1.5 rounded-full bg-risk" />
                        <span>Deficit ({shortfallCourses.length})</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Course Grid Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredSummaries.map((course) => {
                    const normStatus = normalizeAttendanceStatus(course.status);
                    const guidance = calculateGuidance(
                      course.attended,
                      course.total,
                      data.policy.thresholdPercent
                    );
                    const isShortfall = normStatus === "shortfall";
                    const isCompliant = normStatus === "compliant";
                    const isNoData = normStatus === "no_data";

                    return (
                      <Card
                        key={course.offeringId}
                        variant="default"
                        className={`overflow-hidden transition-all flex flex-col justify-between hover:border-accent/40 ${
                          isShortfall
                            ? "border-risk/30 hover:border-risk/60"
                            : "hover:border-line/80"
                        }`}
                      >
                        <div>
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between gap-2">
                              <Badge
                                variant={
                                  isCompliant ? "compliant" : isShortfall ? "shortfall" : "neutral"
                                }
                                size="sm"
                              >
                                {isCompliant
                                  ? "Compliant"
                                  : isShortfall
                                  ? "Deficit"
                                  : "No Sessions"}
                              </Badge>

                              {course.courseCode && (
                                <span className="font-mono text-[11px] text-muted font-bold">
                                  {course.courseCode}
                                </span>
                              )}
                            </div>

                            <CardTitle className="mt-2 text-base font-bold text-ink line-clamp-2">
                              {course.courseTitle}
                            </CardTitle>
                            {course.term && (
                              <CardDescription className="text-xs font-mono">
                                Term: {course.term}
                              </CardDescription>
                            )}
                          </CardHeader>

                          <CardContent className="pt-0 space-y-3">
                            <div className="flex items-baseline justify-between">
                              <span className="text-3xl font-black font-mono tracking-tight text-ink">
                                {isNoData ? "—" : `${course.percentage?.toFixed(1)}%`}
                              </span>

                              <div className="text-right text-xs font-mono text-muted">
                                <div>
                                  <strong className="text-ink">{course.attended}</strong> / {course.total} classes
                                </div>
                                {isShortfall && guidance.sessionsToRecover > 0 && (
                                  <div className="text-risk font-bold text-[11px] mt-0.5">
                                    Need +{guidance.sessionsToRecover} classes
                                  </div>
                                )}
                                {isCompliant && guidance.sessionsCanMiss > 0 && (
                                  <div className="text-accent text-[11px] mt-0.5">
                                    Can miss {guidance.sessionsCanMiss}
                                  </div>
                                )}
                              </div>
                            </div>

                            <AttendanceProgress
                              attended={course.attended}
                              total={course.total}
                              percentage={course.percentage ?? 0}
                              thresholdPercent={data.policy.thresholdPercent}
                              showLabel={false}
                              variant="linear"
                            />
                          </CardContent>
                        </div>

                        <CardFooter className="pt-2 border-t border-line/60 bg-surface/30">
                          <button
                            type="button"
                            onClick={() => setSelectedCourse(course)}
                            className="w-full py-2.5 px-3 rounded-xl border border-line bg-canvas hover:bg-raised active:scale-[0.98] text-xs font-semibold text-ink flex items-center justify-center gap-1.5 transition-all min-h-[42px] touch-manipulation cursor-pointer"
                          >
                            <span>View History & Bunk Calculator</span>
                            <ChevronRight className="size-3 text-muted" />
                          </button>
                        </CardFooter>
                      </Card>
                    );
                  })}
                </div>
              </section>
            </>
          )}

          {/* Safety Notice Footer */}
          <section className="rounded-2xl border border-dashed border-line bg-surface/30 p-4 sm:p-5 text-xs text-muted flex items-start gap-3">
            <ShieldCheck className="size-4 text-accent shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Authorized attendance figures reflect completed sessions verified by course instructors.
              If you believe there is a discrepancy in recorded attendance, contact your course faculty
              or faculty advisor for an audited administrative correction.
            </p>
          </section>
        </>
      )}

      {/* Student Subject Detail Modal */}
      <StudentSubjectDetailModal
        isOpen={Boolean(selectedCourse)}
        onClose={() => setSelectedCourse(null)}
        summary={selectedCourse}
        idToken={idToken}
      />
    </div>
  );
}
