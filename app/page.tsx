import React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { AttendanceProgress } from "@/components/ui/AttendanceProgress";
import { SYNTHETIC_STUDENT } from "@/lib/api/mock-data";
import { ArrowRight, BookOpen, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";

export default function HomePage() {
  const { student, policy, summaries } = SYNTHETIC_STUDENT;

  const compliantCount = summaries.filter((s) => s.status === "compliant").length;
  const shortfallCount = summaries.filter((s) => s.status === "shortfall").length;
  const pendingCount = summaries.filter((s) => s.status === "no_data").length;

  return (
    <AppShell
      currentPath="/"
      userRole="student"
      userRollNumber={student.rollNumber ?? "261161"}
    >
      {/* Hero Section */}
      <section className="grid gap-8 py-4 sm:py-8 lg:grid-cols-[1.2fr_.8fr] lg:items-end">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-semibold uppercase tracking-[.22em] text-accent">
              IIIT Tiruchirappalli
            </span>
            <span className="text-muted/40">•</span>
            <span className="text-xs text-muted">
              Batch {student.batch ?? "2026"} · {student.programme ?? "CSE"}
            </span>
          </div>

          <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl text-ink">
            Stay on top of{" "}
            <span className="text-accent underline decoration-accent/30 decoration-2 underline-offset-8">
              every subject.
            </span>
          </h1>

          <p className="mt-5 max-w-xl text-sm sm:text-base leading-7 text-muted">
            The dedicated academic portal for checking course-wise attendance percentages,
            tracking session history, and keeping every class requirement in clear view.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button href="/dashboard" variant="primary" size="md">
              Open Student Dashboard
              <ArrowRight className="size-4" />
            </Button>
            <Button href="/sign-in" variant="secondary" size="md">
              Sign in with Email
            </Button>
          </div>
        </div>

        {/* Policy Highlights Card */}
        <Card id="policy" variant="raised" className="relative overflow-hidden">
          <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2 size-28 bg-accent/5 rounded-full blur-2xl pointer-events-none" />
          <CardHeader>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-muted">
                Statutory Requirement
              </span>
              <Badge variant="indigo" size="sm">
                Ordinance Rule
              </Badge>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-4xl font-bold tracking-tight text-ink">
                {policy.thresholdPercent}%
              </span>
              <span className="text-sm font-normal text-muted">minimum per course</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <p className="text-xs sm:text-sm text-muted leading-relaxed">
              Each subject is assessed strictly independently. A surplus percentage in one course
              cannot offset a shortfall in another.
            </p>
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-line/60">
              <div className="p-2.5 rounded-xl bg-surface border border-line">
                <p className="text-[11px] text-muted">On Track</p>
                <p className="text-base sm:text-lg font-semibold text-accent">
                  {compliantCount} {compliantCount === 1 ? "Course" : "Courses"}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-surface border border-line">
                <p className="text-[11px] text-muted">Action Needed</p>
                <p className="text-base sm:text-lg font-semibold text-risk">
                  {shortfallCount} {shortfallCount === 1 ? "Course" : "Courses"}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-surface border border-line">
                <p className="text-[11px] text-muted">Pending</p>
                <p className="text-base sm:text-lg font-semibold text-muted">
                  {pendingCount} {pendingCount === 1 ? "Course" : "Courses"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Course Overview Section */}
      <section id="courses" aria-labelledby="courses-heading" className="mt-8 pt-8 border-t border-line/60">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
          <div>
            <h2 id="courses-heading" className="text-xl sm:text-2xl font-semibold tracking-tight text-ink">
              Subject Overview
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-muted">
              Synthetic preview simulating student enrolled courses in semester {student.batch ?? "2026"}-S1.
            </p>
          </div>
          <Badge variant="preview" size="sm" className="self-start sm:self-auto">
            Threshold: {policy.thresholdPercent}%
          </Badge>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {summaries.map((course) => {
            const isCompliant = course.status === "compliant";
            const isShortfall = course.status === "shortfall";
            const isNoData = course.status === "no_data";

            return (
              <Card
                key={course.offeringId}
                className="flex flex-col justify-between hover:border-line/90 transition-all"
              >
                <div>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-muted">
                          <BookOpen className="size-3.5 text-accent" />
                          <span>{course.courseCode ?? course.offeringId}</span>
                        </div>
                        <CardTitle className="mt-1.5 text-base sm:text-lg leading-snug">
                          {course.courseTitle}
                        </CardTitle>
                      </div>

                      {isCompliant && (
                        <Badge variant="compliant" size="sm">
                          <CheckCircle2 className="size-3" />
                          Compliant
                        </Badge>
                      )}
                      {isShortfall && (
                        <Badge variant="shortfall" size="sm">
                          <AlertTriangle className="size-3" />
                          Shortfall
                        </Badge>
                      )}
                      {isNoData && (
                        <Badge variant="neutral" size="sm">
                          Pending
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="text-xs">
                      Term: {course.term ?? "Current Term"}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="pt-2">
                    <div className="flex items-center gap-4">
                      <AttendanceProgress
                        attended={course.attended}
                        total={course.total}
                        thresholdPercent={policy.thresholdPercent}
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
                          <span className={`font-medium ${course.missed > 0 ? "text-risk" : "text-muted"}`}>
                            {course.missed} sessions
                          </span>
                        </div>
                        {course.latestSessionDate && (
                          <div className="text-[11px] text-muted/70 pt-0.5">
                            Last session: {course.latestSessionDate}
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
                    thresholdPercent={policy.thresholdPercent}
                    variant="linear"
                    showLabel={false}
                  />
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Safety Notice & System Status Banner */}
      <section className="mt-10 rounded-2xl border border-dashed border-line bg-surface/40 p-5 sm:p-6">
        <div className="flex items-start gap-3.5">
          <div className="size-9 rounded-xl bg-surface border border-line grid place-items-center shrink-0 text-accent">
            <ShieldCheck className="size-4.5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-ink">
              Development Scaffold & Boundary Notice
            </h4>
            <p className="mt-1 max-w-3xl text-xs sm:text-sm leading-relaxed text-muted">
              This preview operates entirely in synthetic mode. No live Firebase project, institutional credentials,
              or real student records are connected. All attendance figures shown above are illustrative
              test data aligned with the IIIT Trichy attendance calculation specifications.
            </p>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
