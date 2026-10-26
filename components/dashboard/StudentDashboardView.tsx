"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import type { StudentDashboardData, NormalizedAttendanceStatus } from "@/lib/api/types";
import { normalizeAttendanceStatus } from "@/lib/api/types";
import { getStudentDashboard, type MockScenario } from "@/lib/api/client";
import { calculateGuidance } from "@/lib/attendance/calc";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { AttendanceProgress } from "@/components/ui/AttendanceProgress";
import { DashboardSkeleton, EmptyState, ErrorState } from "@/components/ui/StateFeedback";
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
  const [mockScenario, setMockScenario] = useState<MockScenario>("normal");

  const loadDashboard = useCallback(
    async (scenario?: MockScenario) => {
      setLoading(true);
      setError(null);
      setStatusCode(null);

      const res = await getStudentDashboard(idToken, {
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
    [idToken, mockScenario]
  );

  useEffect(() => {
    let active = true;

    if (!initialData) {
      (async () => {
        const res = await getStudentDashboard(idToken, {
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
  }, [initialData, idToken, mockScenario]);

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
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner: Mode Indicator & Simulator Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-surface/70 border border-line text-xs">
        <div className="flex items-center gap-2.5">
          <Badge variant={isMock ? "preview" : "compliant"} size="sm">
            {isMock ? (
              <>
                <Sparkles className="size-3 text-accent" />
                Synthetic Preview Mode
              </>
            ) : (
              <>
                <ShieldCheck className="size-3 text-accent" />
                Live Institute Data
              </>
            )}
          </Badge>
          <span className="text-muted hidden md:inline">
            {isMock
              ? "All student records and course offerings below are synthetic simulations."
              : "Connected to authenticated IIIT Trichy attendance backend."}
          </span>
        </div>

        {/* State Simulator Switcher (Visible in Mock Mode for verifying all UI states) */}
        {isMock && (
          <div className="flex items-center gap-1.5 self-start sm:self-auto overflow-x-auto">
            <span className="text-[11px] text-muted whitespace-nowrap">Preview state:</span>
            {(
              [
                ["normal", "Standard Data"],
                ["empty", "Empty Enrolments"],
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
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ${
                  mockScenario === scenario
                    ? "bg-accent/15 border-accent text-accent shadow-xs"
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
          <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-surface via-surface to-raised border border-line/80 relative overflow-hidden">
            <div className="absolute top-0 right-0 transform translate-x-12 -translate-y-12 size-48 bg-accent/5 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
              <div className="flex items-start sm:items-center gap-4">
                {/* Student Avatar Monogram */}
                <div className="size-14 sm:size-16 rounded-2xl bg-gradient-to-br from-raised to-canvas border border-line flex items-center justify-center text-accent font-bold text-lg sm:text-xl shadow-inner shrink-0">
                  <GraduationCap className="size-7 text-accent" />
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-[11px] font-semibold uppercase tracking-[.18em] text-accent">
                      IIIT Trichy
                    </span>
                    <span className="text-muted/40">•</span>
                    <Badge variant="neutral" size="sm" className="text-[10px] py-0 px-2 bg-canvas/80 border-line">
                      Verified Roster Entry
                    </Badge>
                  </div>

                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink flex items-center gap-3">
                    <span>{data.student.name ?? "Enrolled Student"}</span>
                  </h1>

                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="text-muted/70">Roll:</span>
                      <strong className="text-ink font-semibold tracking-wide">
                        {data.student.rollNumber ?? "Unassigned"}
                      </strong>
                    </span>
                    <span className="text-muted/40 hidden sm:inline">•</span>
                    <span>
                      Batch <strong className="text-ink font-medium">{data.student.batch ?? "—"}</strong>
                    </span>
                    <span className="text-muted/40 hidden sm:inline">•</span>
                    <span>
                      Programme <strong className="text-ink font-medium">{data.student.programme ?? "—"}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Refresh Action */}
              <div className="flex items-center gap-3 self-start md:self-auto shrink-0">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => loadDashboard()}
                  disabled={loading}
                  className="gap-2 text-xs shadow-xs"
                >
                  <RotateCcw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}

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

      {/* Active Success State */}
      {!loading && !error && data && summaries.length > 0 && (
        <>
          {/* Statutory Policy Card & Summary KPIs */}
          <section aria-label="Attendance Summary and Policy" className="grid gap-4 md:grid-cols-4">
            {/* Policy Card */}
            <Card variant="raised" className="md:col-span-2 relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 size-32 bg-accent/5 rounded-full blur-2xl pointer-events-none" />
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                    Attendance Policy
                  </span>
                  <Badge variant="indigo" size="sm" className="font-semibold">
                    {data.policy.thresholdPercent}% Required
                  </Badge>
                </div>
                <CardTitle className="mt-2 text-xl font-bold text-ink">
                  Independent Subject Requirement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs sm:text-sm text-muted leading-relaxed">
                <p>
                  To be eligible for semester examinations, you must maintain at least{" "}
                  <strong className="text-ink font-semibold">{data.policy.thresholdPercent}% attendance</strong> in each
                  course separately. Scheduled and cancelled sessions are excluded.
                </p>
                <div className="flex items-center gap-1.5 text-[11px] text-muted/80 pt-1">
                  <Info className="size-3.5 text-accent shrink-0" />
                  <span>A surplus in one subject cannot offset a shortfall in another.</span>
                </div>
              </CardContent>
            </Card>

            {/* KPI: Compliant Courses */}
            <Card className="flex flex-col justify-between hover:border-accent/40 transition-colors">
              <CardHeader className="pb-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted">On Track (≥ {data.policy.thresholdPercent}%)</span>
                  <CheckCircle2 className="size-4 text-accent" />
                </div>
                <p className="mt-2 text-3xl sm:text-4xl font-extrabold text-accent tabular-nums">
                  {compliantCourses.length}
                </p>
              </CardHeader>
              <CardFooter className="pt-2 text-[11px] text-muted">
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
                  <span className="text-xs font-medium text-muted">Action Needed (&lt; {data.policy.thresholdPercent}%)</span>
                  <AlertTriangle className={`size-4 ${shortfallCourses.length > 0 ? "text-risk" : "text-muted"}`} />
                </div>
                <p className={`mt-2 text-3xl sm:text-4xl font-extrabold tabular-nums ${
                  shortfallCourses.length > 0 ? "text-risk" : "text-muted"
                }`}>
                  {shortfallCourses.length}
                </p>
              </CardHeader>
              <CardFooter className="pt-2 text-[11px]">
                {shortfallCourses.length > 0 ? (
                  <span className="text-risk font-semibold">Immediate attendance recovery needed</span>
                ) : (
                  <span className="text-muted">No attendance deficits</span>
                )}
              </CardFooter>
            </Card>
          </section>

          {/* Enrolled Courses Section with Interactive Search and Filter Tabs */}
          <section aria-labelledby="enrolled-courses-heading" className="space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-line/60 pb-4">
              <div>
                <h2 id="enrolled-courses-heading" className="text-xl sm:text-2xl font-bold tracking-tight text-ink">
                  Enrolled Subjects & Attendance
                </h2>
                <p className="mt-0.5 text-xs text-muted">
                  Showing {filteredSummaries.length} of {summaries.length} registered subjects
                </p>
              </div>

              {/* Controls: Search and Filter Tabs */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* Search Input */}
                <div className="relative">
                  <Search className="size-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search subject or code..."
                    className="w-full sm:w-48 pl-8 pr-3 py-1.5 text-xs rounded-xl bg-surface border border-line text-ink placeholder:text-muted/60 focus-visible:outline-2 focus-visible:outline-accent"
                    aria-label="Filter subjects by code or title"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink text-xs"
                      aria-label="Clear search"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-1 bg-surface p-1 rounded-xl border border-line text-xs overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setActiveFilter("all")}
                    className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ${
                      activeFilter === "all"
                        ? "bg-raised text-ink border border-line shadow-xs font-semibold"
                        : "text-muted hover:text-ink"
                    }`}
                  >
                    All ({summaries.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFilter("compliant")}
                    className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ${
                      activeFilter === "compliant"
                        ? "bg-accent/15 text-accent border border-accent/30 font-semibold"
                        : "text-muted hover:text-ink"
                    }`}
                  >
                    On Track ({compliantCourses.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFilter("shortfall")}
                    className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ${
                      activeFilter === "shortfall"
                        ? "bg-risk/15 text-risk border border-risk/30 font-semibold"
                        : "text-muted hover:text-ink"
                    }`}
                  >
                    Action Needed ({shortfallCourses.length})
                  </button>
                  {noDataCourses.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveFilter("no_data")}
                      className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ${
                        activeFilter === "no_data"
                          ? "bg-raised text-muted border border-line font-semibold"
                          : "text-muted hover:text-ink"
                      }`}
                    >
                      Pending ({noDataCourses.length})
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Filter-Specific Empty State */}
            {filteredSummaries.length === 0 && (
              <div className="p-8 sm:p-12 text-center rounded-2xl border border-dashed border-line bg-surface/30">
                <div className="size-12 rounded-2xl bg-raised border border-line grid place-items-center mx-auto mb-3 text-muted">
                  <Check className="size-6 text-accent" />
                </div>
                <h4 className="text-sm font-semibold text-ink">
                  {activeFilter === "shortfall"
                    ? "No attendance shortfall found"
                    : activeFilter === "compliant"
                    ? "No compliant subjects in this view"
                    : "No matching subjects found"}
                </h4>
                <p className="mt-1 text-xs text-muted max-w-sm mx-auto leading-relaxed">
                  {activeFilter === "shortfall"
                    ? "Great job! All your enrolled courses are currently meeting or exceeding the 75% attendance requirement."
                    : searchQuery
                    ? `No subjects match the filter "${searchQuery}".`
                    : "There are no subjects in this category."}
                </p>
                {(activeFilter !== "all" || searchQuery) && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setActiveFilter("all");
                      setSearchQuery("");
                    }}
                    className="mt-4 text-xs"
                  >
                    View All Subjects
                  </Button>
                )}
              </div>
            )}

            {/* Subject Cards Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredSummaries.map((course) => {
                const normStatus = normalizeAttendanceStatus(course.status);
                const isCompliant = normStatus === "compliant";
                const isShortfall = normStatus === "shortfall";
                const isNoData = normStatus === "no_data";

                // Compute real guidance (sessions to recover or safe absences)
                const guidance = calculateGuidance(
                  course.attended,
                  course.total,
                  data.policy.thresholdPercent
                );

                return (
                  <Card
                    key={course.offeringId}
                    className={`flex flex-col justify-between transition-all duration-200 hover:border-line/90 hover:shadow-lg ${
                      isShortfall ? "border-risk/30 hover:border-risk/50" : ""
                    }`}
                  >
                    <div>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-muted">
                              <BookOpen className="size-3.5 text-accent shrink-0" />
                              <span className="truncate">
                                {course.courseCode ?? course.offeringId}
                              </span>
                            </div>
                            <CardTitle className="mt-1.5 text-base sm:text-lg leading-snug line-clamp-2">
                              {course.courseTitle}
                            </CardTitle>
                          </div>

                          {/* Status Badge */}
                          {isCompliant && (
                            <Badge variant="compliant" size="sm" className="shrink-0 font-medium">
                              <CheckCircle2 className="size-3" />
                              Compliant
                            </Badge>
                          )}
                          {isShortfall && (
                            <Badge variant="shortfall" size="sm" className="shrink-0 font-medium">
                              <AlertTriangle className="size-3" />
                              Shortfall
                            </Badge>
                          )}
                          {isNoData && (
                            <Badge variant="neutral" size="sm" className="shrink-0 font-medium">
                              Pending
                            </Badge>
                          )}
                        </div>

                        <CardDescription className="text-xs flex items-center gap-2 mt-1">
                          <span>Term: {course.term ?? "Current Term"}</span>
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="pt-1">
                        <div className="flex items-center gap-4">
                          <AttendanceProgress
                            attended={course.attended}
                            total={course.total}
                            percentage={course.percentage}
                            thresholdPercent={data.policy.thresholdPercent}
                            variant="circular"
                            size="md"
                          />

                          <div className="space-y-1.5 text-xs flex-1 min-w-0">
                            {course.total === 0 ? (
                              <p className="text-muted text-[11px] italic py-1 leading-relaxed">
                                No completed sessions recorded yet for this subject.
                              </p>
                            ) : (
                              <>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-muted">Attended:</span>
                                  <span className="font-semibold text-ink tabular-nums">
                                    {course.attended}{" "}
                                    <span className="text-muted font-normal">/ {course.total}</span>
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-muted">Missed:</span>
                                  <span
                                    className={`font-medium tabular-nums ${
                                      course.missed > 0 ? "text-risk" : "text-muted"
                                    }`}
                                  >
                                    {course.missed} {course.missed === 1 ? "session" : "sessions"}
                                  </span>
                                </div>
                              </>
                            )}

                            {/* Practical Guidance Callout */}
                            {isShortfall && guidance.sessionsToRecover > 0 && (
                              <div className="p-1.5 rounded-lg bg-risk/10 border border-risk/20 text-[11px] text-risk leading-tight">
                                Attend next <strong>{guidance.sessionsToRecover}</strong> {guidance.sessionsToRecover === 1 ? "class" : "classes"} for 75%
                              </div>
                            )}
                            {isCompliant && (
                              <div className="p-1.5 rounded-lg bg-accent/10 border border-accent/20 text-[11px] text-accent leading-tight">
                                {guidance.sessionsCanMiss > 0 ? (
                                  <>Can miss <strong>{guidance.sessionsCanMiss}</strong> {guidance.sessionsCanMiss === 1 ? "class" : "classes"} safely</>
                                ) : (
                                  <>At requirement (75%)</>
                                )}
                              </div>
                            )}

                            {course.latestSessionDate && (
                              <div className="flex items-center gap-1 text-[11px] text-muted/70 pt-0.5">
                                <Calendar className="size-3 shrink-0" />
                                <span className="truncate">Last: {course.latestSessionDate}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </div>

                    <div className="px-5 sm:px-6 pb-4 pt-1">
                      <AttendanceProgress
                        attended={course.attended}
                        total={course.total}
                        percentage={course.percentage}
                        thresholdPercent={data.policy.thresholdPercent}
                        variant="linear"
                        showLabel={false}
                      />
                    </div>
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
    </div>
  );
}
