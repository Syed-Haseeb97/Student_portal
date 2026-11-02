"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import type { StudentDashboardData, StudentSummary, AcademicNotice } from "@/lib/api/types";
import { normalizeAttendanceStatus } from "@/lib/api/types";
import { getStudentDashboard, getAcademicNotices } from "@/lib/api/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { calculateGuidance } from "@/lib/attendance/calc";
import { DashboardSkeleton, EmptyState, ErrorState } from "@/components/ui/StateFeedback";
import { StudentSubjectDetailModal } from "./StudentSubjectDetailModal";
import { BranchTimetableView, getCourseClassType, getCourseDisplayTitle } from "@/components/timetable/BranchTimetableView";
import { StudentNoticesView } from "@/components/notices/StudentNoticesView";
import { resolveBranchFromRollOrEmail, resolveSlotCourse, BRANCH_TIMETABLES, PERIOD_SLOTS, type DayOfWeek } from "@/lib/timetable/first-year-data";
import { inferStudentFromRollOrEmail } from "@/lib/roster/validate";
import { useStudentNav, type StudentNavView } from "@/components/layout/StudentAppShell";
import { AttendanceBar, PageHeader, Percent, StatusPill } from "@/components/ui/PortalUI";
import {
  ArrowUpRight,
  ChevronRight,
  Clock,
  MapPin,
  Pin,
  TriangleAlert,
  Search,
  CheckCircle2,
  RotateCcw,
  GraduationCap,
} from "lucide-react";

interface StudentDashboardViewProps {
  initialData?: StudentDashboardData;
  idToken?: string;
  isMockDefault?: boolean;
}

const SCALE_MIN = 60;

// Deterministic attendance history helper for visual parity with portal_ui
function buildCourseHistory(attended: number, total: number, seed: number): ("present" | "absent")[] {
  if (total <= 0) return Array.from({ length: 12 }, () => "present");
  const marks: ("present" | "absent")[] = Array.from({ length: total }, () => "present");
  const missing = Math.max(0, Math.min(total, total - attended));
  for (let k = 0; k < missing; k++) {
    let index = (Math.floor(((k + 0.5) * total) / Math.max(missing, 1)) + seed) % total;
    while (marks[index] === "absent") index = (index + 1) % total;
    marks[index] = "absent";
  }
  return marks;
}

function DistributionScale({
  summaries,
  threshold = 75,
}: {
  summaries: StudentSummary[];
  threshold?: number;
}) {
  if (summaries.length === 0) return null;
  const sorted = [...summaries].sort((a, b) => (a.percentage ?? 0) - (b.percentage ?? 0));
  const position = (value: number) =>
    `${((Math.max(Math.min(value, 100), SCALE_MIN) - SCALE_MIN) / (100 - SCALE_MIN)) * 100}%`;

  return (
    <div className="mt-auto pt-8">
      <div className="relative h-14">
        <div className="absolute inset-x-0 top-1/2 h-px bg-line" />
        <div className="absolute top-1/2 h-px bg-risk/40" style={{ left: 0, width: position(threshold) }} />
        <div className="absolute top-1 bottom-1 w-px bg-ink z-10" style={{ left: position(threshold) }} />
        {sorted.map((c, i) => {
          const value = c.percentage ?? (c.total > 0 ? (c.attended / c.total) * 100 : 0);
          const safe = value >= threshold;
          const short = c.courseCode || c.courseTitle.split(" ").slice(0, 2).map((w) => w[0]).join("");
          return (
            <div key={c.offeringId} className="absolute top-1/2 -translate-x-1/2" style={{ left: position(value) }}>
              <span
                className={`block size-3 -translate-y-1/2 rounded-full ring-2 ring-surface ${
                  safe ? "bg-safe" : "bg-risk"
                }`}
                title={`${c.courseTitle} · ${value.toFixed(1)}%`}
              />
              <span
                className={`absolute left-1/2 -translate-x-1/2 text-[11px] font-medium font-mono whitespace-nowrap ${
                  safe ? "text-muted" : "text-risk font-bold"
                } ${i % 2 ? "top-3" : "-top-8"}`}
              >
                {short}
              </span>
            </div>
          );
        })}
      </div>
      <div className="relative mt-2 h-4 font-mono text-[11px] text-muted">
        <span className="absolute left-0">{SCALE_MIN}%</span>
        <span className="absolute -translate-x-1/2 font-semibold text-ink" style={{ left: position(threshold) }}>
          {threshold}% required
        </span>
        <span className="absolute right-0">100%</span>
      </div>
    </div>
  );
}

export function StudentDashboardView({
  initialData,
  idToken,
  isMockDefault: _isMockDefault = true,
}: StudentDashboardViewProps) {
  const [data, setData] = useState<StudentDashboardData | null>(initialData ?? null);
  const [loading, setLoading] = useState<boolean>(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<StudentSummary | null>(null);
  const [notices, setNotices] = useState<AcademicNotice[]>([]);

  // Attendance tab specific states
  const [attendanceFilter, setAttendanceFilter] = useState<"all" | "safe" | "risk">("all");
  const [attendanceSort, setAttendanceSort] = useState<"lowest" | "highest" | "name">("lowest");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const { user, getIdToken } = useAuth();

  // Connect to student navigation context if present
  const navContext = useStudentNav();

  const [localView, setLocalView] = useState<StudentNavView>("overview");
  const view = navContext?.view ?? localView;
  const setView = navContext?.setView ?? setLocalView;
  const setUnreadNoticesCount = navContext?.setUnreadNoticesCount;

  const loadDashboard = useCallback(
    async () => {
      setLoading(true);
      setError(null);

      const token = idToken ?? (await getIdToken()) ?? undefined;
      const res = await getStudentDashboard(token, {
        mockScenario: "normal",
      });

      if (res.data) {
        setData(res.data);
      } else {
        setData(null);
        setError(res.error ?? "Failed to load dashboard data.");
      }
      setLoading(false);
    },
    [idToken, getIdToken]
  );

  useEffect(() => {
    let active = true;

    if (!initialData) {
      (async () => {
        const token = idToken ?? (await getIdToken()) ?? undefined;
        const res = await getStudentDashboard(token, {
          mockScenario: "normal",
        });

        if (!active) return;

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
  }, [initialData, idToken, getIdToken]);

  // Calculations for summary metrics
  const summaries = useMemo(() => data?.summaries ?? [], [data?.summaries]);
  const threshold = data?.policy?.thresholdPercent ?? 75;

  const compliantCourses = useMemo(
    () => summaries.filter((s) => normalizeAttendanceStatus(s.status) === "compliant"),
    [summaries]
  );
  const shortfallCourses = useMemo(
    () => summaries.filter((s) => normalizeAttendanceStatus(s.status) === "shortfall"),
    [summaries]
  );

  const attendedTotal = useMemo(
    () => summaries.reduce((sum, c) => sum + c.attended, 0),
    [summaries]
  );
  const classesTotal = useMemo(
    () => summaries.reduce((sum, c) => sum + c.total, 0),
    [summaries]
  );
  const overallPercentage = useMemo(
    () => (classesTotal > 0 ? (attendedTotal / classesTotal) * 100 : 0),
    [attendedTotal, classesTotal]
  );

  // Authoritative branch and department resolution (11: CSE, 12: ECE, 13: AI&DS, 14: VLSI)
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

  const studentRoll = useMemo(() => {
    return user?.rollNumber || data?.student?.rollNumber || (user?.email ? user.email.split("@")[0].toUpperCase() : "261161");
  }, [user?.rollNumber, data?.student?.rollNumber, user?.email]);

  const branchLabel = useMemo(() => {
    if (studentBranch === "11") return "CSE Core";
    if (studentBranch === "12") return "ECE Core";
    if (studentBranch === "13") return "CSE AI & DS";
    if (studentBranch === "14") return "VLSI Design";
    return "CSE Department";
  }, [studentBranch]);

  const isSuperAdmin = useMemo(() => {
    const roll = user?.rollNumber || data?.student?.rollNumber || "";
    const email = (user?.email || data?.student?.email || "").toLowerCase();
    return (
      user?.role === "admin" ||
      roll === "261161" ||
      email.includes("261161") ||
      email === "syed424892@gmail.com"
    );
  }, [user?.role, user?.rollNumber, user?.email, data?.student?.rollNumber, data?.student?.email]);

  // Load notices for feed preview
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const token = idToken ?? (await getIdToken()) ?? undefined;
        const res = await getAcademicNotices(studentBranch, token);
        if (!active) return;
        if (res.data) {
          setNotices(res.data);
          if (setUnreadNoticesCount) {
            setUnreadNoticesCount(res.data.length);
          }
        }
      } catch {
        // Ignored
      }
    })();
    return () => {
      active = false;
    };
  }, [studentBranch, idToken, getIdToken, setUnreadNoticesCount]);

  // Today's schedule resolution from authoritative hardcoded branch timetable
  const { todaySessions, upNextSession } = useMemo(() => {
    const timetable =
      BRANCH_TIMETABLES[studentBranch] ||
      BRANCH_TIMETABLES["11"];

    const now = new Date();
    const dayIndex = now.getDay();
    const dayMap: Record<number, DayOfWeek> = {
      1: "Monday",
      2: "Tuesday",
      3: "Wednesday",
      4: "Thursday",
      5: "Friday",
    };
    const effectiveDay: DayOfWeek = dayMap[dayIndex] ?? "Monday";
    const slotCodes = timetable.schedule[effectiveDay] || [];

    const sessionsList: {
      slotId: string;
      start: string;
      end: string;
      code: string;
      title: string;
      type: string;
      faculty: string;
      room: string;
      isNext?: boolean;
      isPast?: boolean;
    }[] = [];

    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    slotCodes.forEach((slotCode: string | null, idx: number) => {
      if (!slotCode || slotCode === "BREAK" || slotCode === "LUNCH") return;
      const period = PERIOD_SLOTS[idx];
      if (!period || period.isBreak) return;

      const course = resolveSlotCourse(timetable, slotCode);
      if (!course) return;

      const [startH, startM] = period.startTime.split(":").map(Number);
      const [endH, endM] = period.endTime.split(":").map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;
      const classType = getCourseClassType(course);
      const displayTitle = getCourseDisplayTitle(course);

      sessionsList.push({
        slotId: period.id,
        start: period.startTime,
        end: period.endTime,
        code: course.code,
        title: displayTitle,
        type: `${classType} · ${slotCode}`,
        faculty: course.facultyName,
        room: classType === "Lab" ? "Computer Lab 1 / ECE Lab" : "Lecture Theatre 102",
        isPast: currentMinutes > endMinutes,
        isNext: currentMinutes >= startMinutes && currentMinutes <= endMinutes,
      });
    });

    const next =
      sessionsList.find((s) => !s.isPast) ||
      sessionsList[0] || {
        slotId: "P1",
        start: "09:20",
        end: "10:10",
        code: "CS1101",
        title: "Intro to Computer Programming",
        type: "Lecture · C1",
        faculty: "Dr. Anoop Jacob Thomas",
        room: "Lecture Theatre 102",
      };

    return { todaySessions: sessionsList, upNextSession: next };
  }, [studentBranch]);

  // Formatted date and greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = (user?.name || data?.student?.name || "Student").trim().split(" ")[0];
  const formattedDate = new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  // Filtered courses for Attendance tab
  const visibleAttendanceCourses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return summaries
      .filter((c) => {
        const norm = normalizeAttendanceStatus(c.status);
        if (attendanceFilter === "safe") return norm === "compliant";
        if (attendanceFilter === "risk") return norm === "shortfall";
        return true;
      })
      .filter((c) => {
        if (!q) return true;
        return (
          c.courseTitle.toLowerCase().includes(q) ||
          (c.courseCode ?? "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (attendanceSort === "name") return a.courseTitle.localeCompare(b.courseTitle);
        const aVal = a.percentage ?? (a.total > 0 ? (a.attended / a.total) * 100 : 0);
        const bVal = b.percentage ?? (b.total > 0 ? (b.attended / b.total) * 100 : 0);
        return attendanceSort === "lowest" ? aVal - bVal : bVal - aVal;
      });
  }, [summaries, attendanceFilter, attendanceSort, searchQuery]);

  const handleOpenNotice = (noticeId: string) => {
    if (navContext?.setSelectedNoticeId) {
      navContext.setSelectedNoticeId(noticeId);
    }
    setView("notices");
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* VIEW 1: OVERVIEW (Direct reproduction of portal_ui Overview.tsx) */}
      {view === "overview" && (
        <div className="space-y-8 view-enter">
          <PageHeader eyebrow={formattedDate} title={`${greeting}, ${firstName}`}>
            <div className="flex items-center gap-3 rounded-full border border-line bg-surface px-4 py-2 text-sm shadow-xs">
              <span className="text-muted font-mono text-xs">
                {branchLabel} · {studentRoll}
              </span>
              <span className="h-4 w-px bg-line" />
              <span className="font-medium text-ink font-mono text-xs">
                Batch {studentBatch} · Week 9 of 16
              </span>
              <button
                type="button"
                onClick={() => loadDashboard()}
                disabled={loading}
                title="Refresh live attendance records"
                className="ml-1 text-muted hover:text-ink transition-colors cursor-pointer"
              >
                <RotateCcw className={`size-3.5 ${loading ? "animate-spin text-safe" : ""}`} />
              </button>
            </div>
          </PageHeader>

          {/* Sync status alert if error occurs */}
          {!loading && error && (
            <div className="rounded-2xl border border-warn/30 bg-warn-soft p-4 text-xs font-mono text-warn flex items-center justify-between gap-3">
              <span>Attendance sync offline ({error}). Cached records displayed.</span>
              <button
                type="button"
                onClick={() => loadDashboard()}
                className="underline hover:text-ink font-bold cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {/* Upper 2-Column Grid: Overall Attendance & Up Next / Needs Attention */}
          <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
            {/* Overall Attendance Card */}
            <section className="card flex flex-col p-6 sm:p-8 shadow-xs">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-muted">Overall attendance</p>
                  <Percent value={overallPercentage} className="mt-3 block text-7xl text-ink sm:text-8xl" />
                </div>
                <button
                  type="button"
                  onClick={() => setView("attendance")}
                  className="flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-ink/30 hover:text-ink cursor-pointer"
                >
                  All subjects <ArrowUpRight className="size-3.5" />
                </button>
              </div>

              <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">
                <span className="font-medium text-ink">
                  {compliantCourses.length} of {summaries.length} subjects
                </span>{" "}
                are above the {threshold}% requirement. Each subject is counted separately, so a surplus in
                one can’t cover another.
              </p>

              <dl className="mt-8 grid grid-cols-3 divide-x divide-line border-y border-line py-4 text-center">
                {[
                  ["Attended", attendedTotal],
                  ["Missed", classesTotal - attendedTotal],
                  ["Held", classesTotal],
                ].map(([label, n]) => (
                  <div key={label}>
                    <dd className="font-serif text-3xl text-ink">{n}</dd>
                    <dt className="mt-1 text-xs text-muted">{label}</dt>
                  </div>
                ))}
              </dl>

              <DistributionScale summaries={summaries} threshold={threshold} />
            </section>

            {/* Right Column: Up Next & Needs Attention */}
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-1">
              {/* Up Next Dark Hero Card */}
              <section className="relative overflow-hidden rounded-2xl bg-hero p-6 text-on-hero shadow-xs">
                <div className="absolute -top-20 -right-20 size-56 rounded-full border-[28px] border-on-hero/5 pointer-events-none" />
                <div className="relative flex items-center justify-between">
                  <p className="text-sm text-on-hero/60">Up next</p>
                  <span className="flex items-center gap-1.5 rounded-full bg-on-hero/10 px-2.5 py-1 text-xs font-medium font-mono">
                    <span className="size-1.5 animate-pulse rounded-full bg-[#7ee2b8]" /> Upcoming class
                  </span>
                </div>
                <h2 className="relative mt-6 font-serif text-3xl leading-tight">
                  {upNextSession.title}
                </h2>
                <p className="relative mt-1 text-sm text-on-hero/60">
                  {upNextSession.type} · {upNextSession.faculty}
                </p>
                <div className="relative mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-on-hero/80 font-mono">
                  <span className="flex items-center gap-2">
                    <Clock className="size-4 text-on-hero/50" /> {upNextSession.start} – {upNextSession.end}
                  </span>
                  <span className="flex items-center gap-2">
                    <MapPin className="size-4 text-on-hero/50" /> {upNextSession.room}
                  </span>
                </div>
              </section>

              {/* Needs Attention Shortfall Panel */}
              <section className="rounded-2xl border border-risk/20 bg-risk-soft p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-risk">
                    <TriangleAlert className="size-4" /> Needs attention
                  </div>
                  <div className="mt-4 space-y-3">
                    {shortfallCourses.length > 0 ? (
                      shortfallCourses.slice(0, 3).map((c) => {
                        const val = c.percentage ?? (c.total > 0 ? (c.attended / c.total) * 100 : 0);
                        const g = calculateGuidance(c.attended, c.total, threshold);
                        return (
                          <button
                            key={c.offeringId}
                            type="button"
                            onClick={() => setSelectedCourse(c)}
                            className="group flex w-full items-center gap-3 rounded-xl bg-surface/70 p-3 text-left transition-colors hover:bg-surface cursor-pointer"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-ink">{c.courseTitle}</p>
                              <p className="mt-0.5 text-xs text-muted font-mono">
                                Attend next{" "}
                                <span className="font-semibold text-risk">
                                  {g.sessionsToRecover} classes
                                </span>{" "}
                                to recover
                              </p>
                            </div>
                            <Percent value={val} className="text-2xl text-risk" />
                            <ChevronRight className="size-4 text-muted transition-transform group-hover:translate-x-0.5" />
                          </button>
                        );
                      })
                    ) : (
                      <div className="rounded-xl bg-surface/70 p-4 text-xs text-muted flex items-center gap-2.5">
                        <CheckCircle2 className="size-4 text-safe shrink-0" />
                        <span>All enrolled courses are compliant (≥ {threshold}%). Excellent record.</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-risk/15 text-xs text-muted flex items-center justify-between font-mono">
                  <span>Minimum ordinance</span>
                  <span className="font-semibold text-ink">{threshold}.0% required</span>
                </div>
              </section>
            </div>
          </div>

          {/* Lower 2-Column Grid: Subjects List & Today's Schedule & Latest Notices */}
          <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
            {/* Subjects Compact List */}
            <section className="card shadow-xs">
              <div className="flex items-center justify-between px-6 pt-6 pb-2">
                <h2 className="font-serif text-2xl text-ink">Subjects</h2>
                <span className="text-xs text-muted">Tap a subject for history and bunk planner</span>
              </div>
              <ul className="divide-y divide-line px-2 pb-2">
                {summaries.map((c) => {
                  const val = c.percentage ?? (c.total > 0 ? (c.attended / c.total) * 100 : 0);
                  return (
                    <li key={c.offeringId}>
                      <button
                        type="button"
                        onClick={() => setSelectedCourse(c)}
                        className="group grid w-full grid-cols-[1fr_auto] items-center gap-x-5 gap-y-3 rounded-xl px-4 py-4 text-left transition-colors hover:bg-raised cursor-pointer sm:grid-cols-[minmax(0,1fr)_140px_72px_16px]"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-ink">{c.courseTitle}</p>
                          <p className="mt-0.5 font-mono text-xs text-muted">
                            {c.courseCode ?? c.offeringId} · {c.attended}/{c.total}
                          </p>
                        </div>
                        <AttendanceBar
                          value={val}
                          threshold={threshold}
                          className="col-span-2 row-start-2 sm:col-span-1 sm:row-start-auto"
                        />
                        <Percent
                          value={val}
                          className={`col-start-2 row-start-1 text-right text-2xl sm:col-start-auto sm:row-start-auto ${
                            val >= threshold ? "text-ink" : "text-risk"
                          }`}
                        />
                        <ChevronRight className="hidden size-4 text-muted transition-transform group-hover:translate-x-0.5 sm:block" />
                      </button>
                    </li>
                  );
                })}
                {summaries.length === 0 && (
                  <li className="p-8 text-center text-xs text-muted font-mono">
                    Attendance records pending from course instructors.
                  </li>
                )}
              </ul>
            </section>

            {/* Right Column: Today's Schedule & Latest Notices */}
            <div className="space-y-5">
              {/* Today's Schedule Card */}
              <section className="card p-6 shadow-xs">
                <div className="flex items-center justify-between">
                  <h2 className="font-serif text-2xl text-ink">Today</h2>
                  <button
                    type="button"
                    onClick={() => setView("timetable")}
                    className="text-xs font-medium text-safe hover:underline cursor-pointer font-mono"
                  >
                    Full week &rarr;
                  </button>
                </div>
                <ol className="mt-5 space-y-1">
                  {todaySessions.map((s, idx) => {
                    return (
                      <li
                        key={`${s.slotId}-${idx}`}
                        className={`flex items-center gap-4 rounded-xl px-3 py-2.5 ${
                          s.isNext ? "bg-raised" : ""
                        }`}
                      >
                        <span className={`w-11 font-mono text-xs ${s.isPast ? "text-muted" : "text-ink"}`}>
                          {s.start}
                        </span>
                        <span
                          className={`size-2 shrink-0 rounded-full ${
                            s.isPast
                              ? "bg-line"
                              : s.isNext
                              ? "bg-safe ring-4 ring-safe-soft"
                              : "border border-muted/50"
                          }`}
                        />
                        <div className={`min-w-0 flex-1 ${s.isPast ? "opacity-50" : ""}`}>
                          <p
                            className={`truncate text-sm ${
                              s.isPast ? "text-muted line-through decoration-line" : "font-medium text-ink"
                            }`}
                          >
                            {s.title}
                          </p>
                          <p className="text-xs text-muted">
                            {s.type} · {s.room}
                          </p>
                        </div>
                        {s.isNext && <span className="text-xs font-medium text-safe font-mono">Next</span>}
                      </li>
                    );
                  })}
                </ol>
              </section>

              {/* Latest Notices Card */}
              <section className="card p-6 shadow-xs">
                <div className="flex items-center justify-between">
                  <h2 className="font-serif text-2xl text-ink">Latest notices</h2>
                  <button
                    type="button"
                    onClick={() => setView("notices")}
                    className="text-xs font-medium text-muted hover:text-ink cursor-pointer font-mono"
                  >
                    View all
                  </button>
                </div>
                <ul className="mt-4 divide-y divide-line">
                  {notices.slice(0, 3).map((n) => {
                    return (
                      <li key={n.id}>
                        <button
                          type="button"
                          onClick={() => handleOpenNotice(n.id)}
                          className="flex w-full items-start gap-3 py-3 text-left cursor-pointer hover:opacity-85 transition-opacity"
                        >
                          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-risk" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm leading-snug font-medium text-ink">{n.title}</p>
                            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted font-mono">
                              {n.priority === "urgent" && <Pin className="size-3 text-risk" />}
                              <span>{n.type === "assignment" ? "Assignment" : "Circular"}</span>
                              <span>·</span>
                              <span>
                                {new Date(n.createdAt).toLocaleDateString("en-IN", {
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                            </p>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                  {notices.length === 0 && (
                    <li className="py-4 text-center text-xs text-muted font-mono">
                      No active circulars at this moment.
                    </li>
                  )}
                </ul>
              </section>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: ATTENDANCE & MARGINS (Exact visual reproduction of portal_ui AttendanceView.tsx) */}
      {view === "attendance" && (
        <div className="space-y-8 view-enter">
          <PageHeader eyebrow={`${threshold}% minimum in every subject`} title="Attendance" />

          {/* Loading State */}
          {loading && <DashboardSkeleton />}

          {/* Error State */}
          {!loading && error && (
            <ErrorState title="Could not load attendance data" error={error} onRetry={() => loadDashboard()} />
          )}

          {/* Empty State */}
          {!loading && !error && data && summaries.length === 0 && (
            <EmptyState
              icon={GraduationCap}
              title="No Course Enrollments Found"
              description="Your profile is recognized on the approved roster, but you have no active course registrations for this term. If this is unexpected, contact your department office."
              actionLabel="Refresh Records"
              onAction={() => loadDashboard()}
            />
          )}

          {/* Attendance Cards Grid */}
          {!loading && !error && summaries.length > 0 && (
            <div className="space-y-8">
              {/* Filter and Search Bar */}
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <div className="flex rounded-full border border-line bg-surface p-1" role="tablist">
                  {(
                    [
                      ["all", "All", summaries.length],
                      ["safe", "On track", compliantCourses.length],
                      ["risk", "At risk", shortfallCourses.length],
                    ] as const
                  ).map(([id, label, count]) => (
                    <button
                      key={id}
                      role="tab"
                      aria-selected={attendanceFilter === id}
                      onClick={() => setAttendanceFilter(id)}
                      className={`flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors cursor-pointer md:flex-none ${
                        attendanceFilter === id ? "bg-solid text-on-solid" : "text-muted hover:text-ink"
                      }`}
                    >
                      {label}
                      <span
                        className={`text-xs ${
                          attendanceFilter === id ? "text-on-solid/70" : "text-muted/70"
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  ))}
                </div>

                <label className="relative flex-1 md:ml-auto md:max-w-xs">
                  <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search subject, code or faculty"
                    className="h-11 w-full rounded-full border border-line bg-surface pr-4 pl-11 text-sm text-ink outline-none placeholder:text-muted/70 focus:border-ink/40 font-mono"
                  />
                </label>

                <select
                  value={attendanceSort}
                  onChange={(e) => setAttendanceSort(e.target.value as "lowest" | "highest" | "name")}
                  className="h-11 rounded-full border border-line bg-surface px-4 text-sm text-ink outline-none focus:border-ink/40 cursor-pointer font-mono"
                  aria-label="Sort subjects"
                >
                  <option value="lowest">Lowest first</option>
                  <option value="highest">Highest first</option>
                  <option value="name">By name</option>
                </select>
              </div>

              {/* Cards Grid */}
              {visibleAttendanceCourses.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-line py-20 text-center text-sm text-muted font-mono">
                  No subjects match your search.
                </div>
              ) : (
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {visibleAttendanceCourses.map((c, courseIdx) => {
                    const val = c.percentage ?? (c.total > 0 ? (c.attended / c.total) * 100 : 0);
                    const safe = val >= threshold;
                    const guidance = calculateGuidance(c.attended, c.total, threshold);
                    const history = buildCourseHistory(c.attended, c.total, courseIdx * 3 + 5);

                    return (
                      <button
                        key={c.offeringId}
                        type="button"
                        onClick={() => setSelectedCourse(c)}
                        className="card group flex flex-col p-6 text-left transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_40px_-12px_rgba(22,24,29,0.18)] cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs text-muted">
                            {c.courseCode ?? c.offeringId} · 3 credits
                          </span>
                          <StatusPill safe={safe} />
                        </div>
                        <h3 className="mt-5 text-lg leading-snug font-semibold text-ink">{c.courseTitle}</h3>
                        <p className="mt-1 text-sm text-muted">Course Faculty · IIIT Trichy</p>

                        <div className="mt-8 flex items-end justify-between">
                          <Percent value={val} className={`text-6xl ${safe ? "text-ink" : "text-risk"}`} />
                          <div className="text-right text-xs text-muted font-mono">
                            <p>
                              <span className="font-semibold text-ink">{c.attended}</span> of {c.total} attended
                            </p>
                            <p className={`mt-1 font-medium ${safe ? "text-safe" : "text-risk"}`}>
                              {safe
                                ? guidance.sessionsCanMiss > 0
                                  ? `Can skip ${guidance.sessionsCanMiss}`
                                  : "On track"
                                : `Attend next ${guidance.sessionsToRecover}`}
                            </p>
                          </div>
                        </div>

                        <AttendanceBar value={val} threshold={threshold} className="mt-5" />

                        {/* Last 12 History Mini-Bars (Exact signature of portal_ui) */}
                        <div className="mt-6 flex items-center gap-1 border-t border-line pt-4">
                          <span className="mr-2 text-xs text-muted font-mono">Last 12</span>
                          {history.slice(-12).map((mark, i) => (
                            <span
                              key={i}
                              className={`h-4 flex-1 rounded-xs transition-opacity ${
                                mark === "present" ? "bg-safe/80" : "bg-risk"
                              }`}
                              title={`Session ${i + 1}: ${mark}`}
                            />
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: TIMETABLE (Direct reproduction of portal_ui TimetableView.tsx with branch switcher & zero DB reads) */}
      {view === "timetable" && (
        <div className="space-y-6 view-enter">
          <PageHeader
            eyebrow={`Semester I · Batch ${studentBatch} · IIIT Tiruchirappalli`}
            title="Timetable"
          />

          <BranchTimetableView
            userRollOrEmail={
              user?.rollNumber || user?.email || data?.student?.rollNumber || data?.student?.email || undefined
            }
            defaultBranch={studentBranch}
            batch={studentBatch}
            allowBranchSwitching={isSuperAdmin}
          />
        </div>
      )}

      {/* VIEW 4: NOTICES (Direct reproduction of portal_ui NoticesView.tsx) */}
      {view === "notices" && (
        <div className="space-y-6 view-enter">
          <StudentNoticesView
            branchCode={studentBranch}
            idToken={idToken}
            selectedId={navContext?.selectedNoticeId}
            onSelect={navContext?.setSelectedNoticeId}
          />
        </div>
      )}

      {/* Course Detail Drawer / Modal (portal_ui CourseDrawer) */}
      <StudentSubjectDetailModal
        isOpen={Boolean(selectedCourse)}
        onClose={() => setSelectedCourse(null)}
        summary={selectedCourse}
        idToken={idToken}
      />
    </div>
  );
}
