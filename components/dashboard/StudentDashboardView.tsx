"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { StudentDashboardData, NormalizedAttendanceStatus } from "@/lib/api/types";
import { normalizeAttendanceStatus } from "@/lib/api/types";
import { getStudentDashboard, type MockScenario } from "@/lib/api/client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { AttendanceProgress } from "@/components/ui/AttendanceProgress";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui/StateFeedback";
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
      // Async fetch to prevent synchronous setState during effect mount
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
  const summaries = data?.summaries ?? [];
  const compliantCourses = summaries.filter(
    (s) => normalizeAttendanceStatus(s.status) === "compliant"
  );
  const shortfallCourses = summaries.filter(
    (s) => normalizeAttendanceStatus(s.status) === "shortfall"
  );
  const noDataCourses = summaries.filter(
    (s) => normalizeAttendanceStatus(s.status) === "no_data"
  );

  const filteredSummaries = summaries.filter((course) => {
    if (activeFilter === "all") return true;
    return normalizeAttendanceStatus(course.status) === activeFilter;
  });

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
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
                  mockScenario === scenario
                    ? "bg-accent/15 border-accent text-accent"
                    : "bg-canvas border-line text-muted hover:text-ink hover:border-line/80"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Roster-Linked Student Identity Header */}
      {data?.student && (
        <section aria-label="Student Information">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-line pb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold uppercase tracking-[.2em] text-accent">
                  Student Attendance Dashboard
                </span>
                <span className="text-muted/40">•</span>
                <span className="text-xs text-muted">
                  Approved Roster Identity
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink flex items-center gap-3">
                <span>{data.student.name ?? "Enrolled Student"}</span>
              </h1>
              <p className="mt-1.5 text-xs sm:text-sm text-muted">
                Official Roster Record:{" "}
                <strong className="text-ink font-semibold">
                  Roll {data.student.rollNumber ?? "Unassigned"}
                </strong>{" "}
                · Batch {data.student.batch ?? "—"} · Programme {data.student.programme ?? "—"}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => loadDashboard()}
                disabled={loading}
                className="gap-2"
              >
                <RotateCcw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Loading State */}
      {loading && (
        <LoadingState
          title="Retrieving student attendance..."
          description="Fetching verified course registrations, completed sessions, and compliance percentages."
        />
      )}

      {/* Unauthorized State (401 / 403) */}
      {!loading && (statusCode === 401 || statusCode === 403) && (
        <Card variant="raised" className="border-risk/30 bg-risk/5 p-6 sm:p-8 text-center">
          <div className="mx-auto size-12 rounded-2xl bg-risk/10 border border-risk/20 grid place-items-center text-risk mb-4">
            <ShieldAlert className="size-6" />
          </div>
          <CardTitle className="text-xl font-bold text-ink">
            {statusCode === 401 ? "Authentication Required" : "Approved Roster Match Required"}
          </CardTitle>
          <p className="mt-2 text-sm text-muted max-w-lg mx-auto leading-relaxed">
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
          <section className="grid gap-4 md:grid-cols-4">
            <Card variant="raised" className="md:col-span-2 relative overflow-hidden">
              <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 size-32 bg-accent/5 rounded-full blur-2xl pointer-events-none" />
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                    Attendance Policy
                  </span>
                  <Badge variant="indigo" size="sm">
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
                  <strong className="text-ink">{data.policy.thresholdPercent}% attendance</strong> in each
                  course separately. Scheduled and cancelled sessions are excluded.
                </p>
                <div className="flex items-center gap-1.5 text-[11px] text-muted/80 pt-1">
                  <Info className="size-3.5 text-accent shrink-0" />
                  <span>A surplus in one subject cannot offset a shortfall in another.</span>
                </div>
              </CardContent>
            </Card>

            {/* KPI: Compliant Courses */}
            <Card className="flex flex-col justify-between">
              <CardHeader className="pb-1">
                <span className="text-xs font-medium text-muted">On Track (≥ 75%)</span>
                <p className="mt-2 text-3xl font-bold text-accent">
                  {compliantCourses.length}
                </p>
              </CardHeader>
              <CardFooter className="pt-2 text-[11px] text-muted">
                {compliantCourses.length === summaries.length
                  ? "All enrolled courses compliant"
                  : `${compliantCourses.length} of ${summaries.length} courses safe`}
              </CardFooter>
            </Card>

            {/* KPI: Shortfall Courses */}
            <Card className="flex flex-col justify-between">
              <CardHeader className="pb-1">
                <span className="text-xs font-medium text-muted">Action Needed (&lt; 75%)</span>
                <p className={`mt-2 text-3xl font-bold ${shortfallCourses.length > 0 ? "text-risk" : "text-muted"}`}>
                  {shortfallCourses.length}
                </p>
              </CardHeader>
              <CardFooter className="pt-2 text-[11px]">
                {shortfallCourses.length > 0 ? (
                  <span className="text-risk font-medium">Requires immediate attendance</span>
                ) : (
                  <span className="text-muted">No attendance deficits</span>
                )}
              </CardFooter>
            </Card>
          </section>

          {/* Enrolled Courses Section with Interactive Filter Tabs */}
          <section aria-labelledby="enrolled-courses-heading" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line/60 pb-4">
              <div>
                <h2 id="enrolled-courses-heading" className="text-xl font-bold tracking-tight text-ink">
                  Enrolled Subjects & Attendance
                </h2>
                <p className="mt-0.5 text-xs text-muted">
                  Showing {filteredSummaries.length} of {summaries.length} courses
                </p>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 bg-surface p-1 rounded-xl border border-line text-xs">
                <button
                  type="button"
                  onClick={() => setActiveFilter("all")}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                    activeFilter === "all"
                      ? "bg-raised text-ink border border-line"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  All ({summaries.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter("compliant")}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                    activeFilter === "compliant"
                      ? "bg-accent/15 text-accent border border-accent/30"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  On Track ({compliantCourses.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter("shortfall")}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                    activeFilter === "shortfall"
                      ? "bg-risk/15 text-risk border border-risk/30"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  Action Needed ({shortfallCourses.length})
                </button>
                {noDataCourses.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveFilter("no_data")}
                    className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                      activeFilter === "no_data"
                        ? "bg-raised text-muted border border-line"
                        : "text-muted hover:text-ink"
                    }`}
                  >
                    Pending ({noDataCourses.length})
                  </button>
                )}
              </div>
            </div>

            {/* Course Cards Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredSummaries.map((course) => {
                const normStatus = normalizeAttendanceStatus(course.status);
                const isCompliant = normStatus === "compliant";
                const isShortfall = normStatus === "shortfall";
                const isNoData = normStatus === "no_data";

                return (
                  <Card
                    key={course.offeringId}
                    className="flex flex-col justify-between hover:border-line/90 transition-all"
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
                            <CardTitle className="mt-1.5 text-base sm:text-lg leading-snug truncate">
                              {course.courseTitle}
                            </CardTitle>
                          </div>

                          {/* Status Badge */}
                          {isCompliant && (
                            <Badge variant="compliant" size="sm" className="shrink-0">
                              <CheckCircle2 className="size-3" />
                              Compliant
                            </Badge>
                          )}
                          {isShortfall && (
                            <Badge variant="shortfall" size="sm" className="shrink-0">
                              <AlertTriangle className="size-3" />
                              Shortfall
                            </Badge>
                          )}
                          {isNoData && (
                            <Badge variant="neutral" size="sm" className="shrink-0">
                              No Sessions
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="text-xs">
                          Offering: {course.term ?? "Current Term"}
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="pt-2">
                        <div className="flex items-center gap-4">
                          <AttendanceProgress
                            attended={course.attended}
                            total={course.total}
                            thresholdPercent={data.policy.thresholdPercent}
                            variant="circular"
                            size="md"
                          />

                          <div className="space-y-1 text-xs">
                            <div className="flex items-center gap-1.5">
                              <span className="text-muted">Attended:</span>
                              <span className="font-semibold text-ink">
                                {course.attended}{" "}
                                <span className="text-muted font-normal">/ {course.total}</span>
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-muted">Missed:</span>
                              <span
                                className={`font-medium ${
                                  course.missed > 0 ? "text-risk" : "text-muted"
                                }`}
                              >
                                {course.missed} sessions
                              </span>
                            </div>
                            {course.latestSessionDate && (
                              <div className="text-[11px] text-muted/70 pt-0.5">
                                Last class: {course.latestSessionDate}
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
