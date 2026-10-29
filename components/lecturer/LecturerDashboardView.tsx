"use client";

import Image from "next/image";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import type {
  LecturerDashboardData,
  LecturerSessionSummary,
  SessionStatus,
} from "@/lib/api/types";
import { getLecturerDashboard } from "@/lib/api/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DashboardSkeleton, EmptyState, ErrorState } from "@/components/ui/StateFeedback";
import { SessionCreateModal } from "./SessionCreateModal";
import { SessionCancelModal } from "./SessionCancelModal";
import { BranchTimetableView } from "@/components/timetable/BranchTimetableView";
import { LecturerNoticesManager } from "@/components/notices/LecturerNoticesManager";
import {
  Calendar,
  Bell,
  Clock,
  MapPin,
  Users,
  PlusCircle,
  CheckCircle2,
  XCircle,
  Search,
  RotateCcw,
  Sparkles,
  BookOpen,
  ClipboardCheck,
  ChevronRight,
} from "lucide-react";

interface LecturerDashboardViewProps {
  initialData?: LecturerDashboardData;
  idToken?: string;
  isMockDefault?: boolean;
}

export function LecturerDashboardView({
  initialData,
  idToken,
  isMockDefault = true,
}: LecturerDashboardViewProps) {
  const [data, setData] = useState<LecturerDashboardData | null>(initialData ?? null);
  const [loading, setLoading] = useState<boolean>(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [isMock, setIsMock] = useState<boolean>(isMockDefault);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState<"all" | SessionStatus>("all");
  const [offeringFilter, setOfferingFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewTab, setViewTab] = useState<"classes" | "timetable" | "notices">("classes");

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [cancelModalSession, setCancelModalSession] = useState<LecturerSessionSummary | null>(null);

  const { getIdToken } = useAuth();

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    const token = idToken ?? (await getIdToken()) ?? undefined;
    const res = await getLecturerDashboard(token);
    setIsMock(Boolean(res.isMock));

    if (res.data) {
      setData(res.data);
    } else {
      setData(null);
      setError(res.error ?? "Failed to load lecturer dashboard.");
    }
    setLoading(false);
  }, [idToken, getIdToken]);

  useEffect(() => {
    if (initialData) return;
    let active = true;
    async function fetchDashboard() {
      const token = idToken ?? (await getIdToken()) ?? undefined;
      const res = await getLecturerDashboard(token);
      if (!active) return;
      setIsMock(Boolean(res.isMock));
      if (res.data) {
        setData(res.data);
      } else {
        setData(null);
        setError(res.error ?? "Failed to load lecturer dashboard.");
      }
      setLoading(false);
    }
    void fetchDashboard();
    return () => {
      active = false;
    };
  }, [initialData, idToken, getIdToken]);

  // Filtered Sessions
  const sessions = data?.sessions;
  const filteredSessions = useMemo(() => {
    if (!sessions) return [];

    return sessions.filter((session) => {
      // Status filter
      if (statusFilter !== "all" && session.status !== statusFilter) {
        return false;
      }
      // Offering filter
      if (offeringFilter !== "all" && session.offeringId !== offeringFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesCourse =
          session.courseTitle.toLowerCase().includes(q) ||
          Boolean(session.courseCode?.toLowerCase().includes(q));
        const matchesDate = session.sessionDate.includes(q);
        const matchesRoom = session.room?.toLowerCase().includes(q);
        return matchesCourse || matchesDate || matchesRoom;
      }
      return true;
    });
  }, [sessions, statusFilter, offeringFilter, searchQuery]);

  // Aggregate stats
  const scheduledCount = useMemo(
    () => sessions?.filter((s) => s.status === "scheduled").length ?? 0,
    [sessions]
  );
  const completedCount = useMemo(
    () => sessions?.filter((s) => s.status === "completed").length ?? 0,
    [sessions]
  );
  const cancelledCount = useMemo(
    () => sessions?.filter((s) => s.status === "cancelled").length ?? 0,
    [sessions]
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner: Synthetic Mode Notice */}
      {isMock && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-surface border border-line text-xs">
          <div className="flex items-center gap-2 text-ink">
            <Sparkles className="size-4 text-accent shrink-0" />
            <span>
              <strong>Lecturer Preview Mode:</strong> Interactive mock store is active. Class scheduling and roll-call marks update in-memory.
            </span>
          </div>
          <Badge variant="preview" size="sm" className="self-start sm:self-auto shrink-0">
            NEXT_PUBLIC_ENABLE_MOCK_API
          </Badge>
        </div>
      )}

      {/* Header Profile & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-line/60">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="size-14 rounded-2xl bg-surface border border-line p-2 flex items-center justify-center shrink-0 shadow-inner">
            <Image
              src="/images/iiitt-seal.png"
              alt="IIITT Faculty Emblem"
              width={42}
              height={42}
              className="object-contain"
            />
          </div>
          <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-widest text-accent font-semibold">
              Faculty Attendance Console
            </span>
            <Badge variant="neutral" size="sm">
              IIITT Academic Portal
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight mt-1">
            {data?.lecturer.displayName ?? "Lecturer Portal"}
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-0.5">
            {data?.lecturer.designation ?? "Faculty Member"} · {data?.lecturer.department ?? "Department of CSE & ECE"} · Emp ID:{" "}
            <span className="text-ink font-mono">{data?.lecturer.employeeId ?? "FAC-01"}</span>
          </p>
        </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadDashboard()}
            busy={loading}
            aria-label="Refresh lecturer dashboard"
          >
            <RotateCcw className="size-3.5" />
            <span>Refresh</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setCreateModalOpen(true)}
            disabled={loading || !data?.offerings?.length}
          >
            <PlusCircle className="size-4" />
            <span>Schedule Class</span>
          </Button>
        </div>
      </div>

      {/* View Switcher: Classes & Roll-Call vs Master Timetable */}
      <div className="flex items-center gap-2 border-b border-line pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setViewTab("classes")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            viewTab === "classes"
              ? "bg-[#283226] text-accent border border-accent/40 shadow-xs"
              : "bg-surface border border-line text-muted hover:text-ink hover:border-line/80"
          }`}
        >
          <ClipboardCheck className="size-4" />
          <span>Classes & Fast Roll-Call</span>
        </button>

        <button
          type="button"
          onClick={() => setViewTab("timetable")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            viewTab === "timetable"
              ? "bg-[#283226] text-accent border border-accent/40 shadow-xs"
              : "bg-surface border border-line text-muted hover:text-ink hover:border-line/80"
          }`}
        >
          <Calendar className="size-4" />
          <span>1st Year Master Timetable</span>
        </button>

        <button
          type="button"
          onClick={() => setViewTab("notices")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            viewTab === "notices"
              ? "bg-[#283226] text-accent border border-accent/40 shadow-xs"
              : "bg-surface border border-line text-muted hover:text-ink hover:border-line/80"
          }`}
        >
          <Bell className="size-4 text-amber-300" />
          <span>Post Notices & Assignments</span>
          <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" />
        </button>
      </div>

      {viewTab === "timetable" ? (
        <BranchTimetableView allowBranchSwitching={true} />
      ) : viewTab === "notices" ? (
        <LecturerNoticesManager idToken={idToken} />
      ) : (
        <>
      {/* Loading State */}
      {loading && !data && (
        <DashboardSkeleton />
      )}

      {/* Error State */}
      {error && !loading && (
        <ErrorState
          title="Could not load lecturer console"
          error={error}
          onRetry={loadDashboard}
        />
      )}

      {/* Main Content */}
      {data && !loading && (
        <>
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 border-line bg-surface/70">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted uppercase tracking-wider font-medium">Assigned Courses</span>
                <BookOpen className="size-4 text-accent" />
              </div>
              <p className="text-2xl font-bold text-ink mt-2">{data.offerings.length}</p>
              <p className="text-[11px] text-muted mt-0.5">Active Teaching Offerings</p>
            </Card>

            <Card className="p-4 border-line bg-surface/70">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted uppercase tracking-wider font-medium">Scheduled</span>
                <Calendar className="size-4 text-indigo" />
              </div>
              <p className="text-2xl font-bold text-ink mt-2">{scheduledCount}</p>
              <p className="text-[11px] text-muted mt-0.5">Pending Roll-Call</p>
            </Card>

            <Card className="p-4 border-line bg-surface/70">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted uppercase tracking-wider font-medium">Completed</span>
                <CheckCircle2 className="size-4 text-accent" />
              </div>
              <p className="text-2xl font-bold text-ink mt-2">{completedCount}</p>
              <p className="text-[11px] text-muted mt-0.5">Attendance Recorded</p>
            </Card>

            <Card className="p-4 border-line bg-surface/70">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted uppercase tracking-wider font-medium">Cancelled</span>
                <XCircle className="size-4 text-risk" />
              </div>
              <p className="text-2xl font-bold text-ink mt-2">{cancelledCount}</p>
              <p className="text-[11px] text-muted mt-0.5">Audited Cancellations</p>
            </Card>
          </div>

          {/* Assigned Course Offerings */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-bold text-ink flex items-center gap-2">
                <BookOpen className="size-4 text-accent" />
                <span>Assigned Course Offerings</span>
              </h2>
              <span className="text-xs text-muted">{data.offerings.length} Offerings</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.offerings.map((offering) => (
                <div
                  key={offering.id}
                  className="rounded-xl border border-line bg-surface p-4 hover:border-line/90 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="indigo" size="sm">
                          {offering.courseCode}
                        </Badge>
                        <span className="text-xs text-muted">{offering.term}</span>
                      </div>
                      <h3 className="font-semibold text-ink text-sm sm:text-base mt-1.5">
                        {offering.courseTitle}
                      </h3>
                      <p className="text-xs text-muted mt-0.5">{offering.department}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-1.5 text-xs text-ink font-semibold">
                        <Users className="size-3.5 text-accent" />
                        <span>{offering.enrolledStudentsCount}</span>
                        <span className="text-muted font-normal text-[11px]">students</span>
                      </div>
                      <p className="text-[11px] text-muted mt-1">{offering.sessionCount} sessions</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-line/60 flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setOfferingFilter(offering.id);
                      }}
                      className="text-accent hover:underline inline-flex items-center gap-1 font-medium"
                    >
                      <span>Filter Sessions</span>
                      <ChevronRight className="size-3" />
                    </button>
                    <span className="text-muted text-[11px]">75% Institute Policy Enforced</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Class Sessions Section */}
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-ink flex items-center gap-2">
                  <Calendar className="size-4 text-accent" />
                  <span>Class Sessions & Roll-Call</span>
                </h2>
                <p className="text-xs text-muted mt-0.5">
                  Schedule classes, mark attendance per session, and review audited records
                </p>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface border border-line overflow-x-auto">
                {(
                  [
                    { key: "all", label: "All" },
                    { key: "scheduled", label: `Scheduled (${scheduledCount})` },
                    { key: "completed", label: `Completed (${completedCount})` },
                    { key: "cancelled", label: `Cancelled (${cancelledCount})` },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setStatusFilter(tab.key)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                      statusFilter === tab.key
                        ? "bg-raised text-ink border border-line/80 shadow-xs"
                        : "text-muted hover:text-ink"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Search and Secondary Filter Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="size-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by course code, title, room, or YYYY-MM-DD..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-line bg-surface text-ink placeholder:text-muted/60 focus:outline-hidden focus:border-accent"
                />
              </div>

              {offeringFilter !== "all" && (
                <div className="flex items-center gap-2 text-xs bg-surface border border-line px-3 py-1.5 rounded-xl text-ink">
                  <span>Filtered: {data.offerings.find((o) => o.id === offeringFilter)?.courseCode}</span>
                  <button
                    type="button"
                    onClick={() => setOfferingFilter("all")}
                    className="text-muted hover:text-ink"
                    title="Clear offering filter"
                  >
                    <XCircle className="size-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Sessions List */}
            {filteredSessions.length === 0 ? (
              <EmptyState
                title="No class sessions found"
                description={
                  searchQuery || statusFilter !== "all" || offeringFilter !== "all"
                    ? "No sessions match your active filters or search terms."
                    : "No class sessions have been scheduled yet. Click 'Schedule Class' to create your first session."
                }
                actionLabel={
                  searchQuery || statusFilter !== "all" || offeringFilter !== "all"
                    ? "Reset Filters"
                    : "Schedule Class"
                }
                onAction={
                  searchQuery || statusFilter !== "all" || offeringFilter !== "all"
                    ? () => {
                        setStatusFilter("all");
                        setOfferingFilter("all");
                        setSearchQuery("");
                      }
                    : () => setCreateModalOpen(true)
                }
              />
            ) : (
              <div className="space-y-3">
                {filteredSessions.map((session) => {
                  const currentStatus = session.status ?? session.state;
                  const isScheduled = currentStatus === "scheduled";
                  const isCompleted = currentStatus === "completed";
                  const isCancelled = currentStatus === "cancelled";

                  const rate =
                    session.totalEligible &&
                    session.totalEligible > 0 &&
                    typeof session.presentCount === "number"
                      ? Math.round((session.presentCount / session.totalEligible) * 100)
                      : null;

                  return (
                    <div
                      key={session.id}
                      className="rounded-xl border border-line bg-surface p-4 sm:p-5 hover:border-line/90 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="indigo" size="sm">
                            {session.courseCode}
                          </Badge>
                          <span className="font-semibold text-ink text-sm sm:text-base">
                            {session.courseTitle}
                          </span>

                          {isScheduled && (
                            <Badge variant="warning" size="sm">
                              Scheduled
                            </Badge>
                          )}
                          {isCompleted && (
                            <Badge variant="compliant" size="sm">
                              <CheckCircle2 className="size-3" />
                              Completed
                            </Badge>
                          )}
                          {isCancelled && (
                            <Badge variant="shortfall" size="sm">
                              <XCircle className="size-3" />
                              Cancelled
                            </Badge>
                          )}
                        </div>

                        {/* Session Metadata */}
                        <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-muted">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="size-3.5 text-accent" />
                            <strong className="text-ink font-mono">{session.sessionDate}</strong>
                          </span>

                          {(session.startTime || session.endTime) && (
                            <span className="flex items-center gap-1.5">
                              <Clock className="size-3.5 text-accent" />
                              <span>
                                {session.startTime || "--"} – {session.endTime || "--"} IST
                              </span>
                            </span>
                          )}

                          {session.room && (
                            <span className="flex items-center gap-1.5">
                              <MapPin className="size-3.5 text-accent" />
                              <span>{session.room}</span>
                            </span>
                          )}

                          <span className="flex items-center gap-1.5">
                            <Users className="size-3.5 text-accent" />
                            <span>{session.totalEligible} enrolled</span>
                          </span>
                        </div>

                        {/* Completion / Cancellation note */}
                        {isCompleted && typeof session.presentCount === "number" && typeof session.absentCount === "number" && (
                          <div className="text-xs text-muted flex items-center gap-3 pt-1">
                            <span className="text-ink font-medium">
                              Attendance: <span className="text-accent">{session.presentCount} Present</span> /{" "}
                              <span className="text-risk">{session.absentCount} Absent</span>
                            </span>
                            {rate !== null && (
                              <span className="text-muted border-l border-line/60 pl-3">
                                Turnout Rate: <strong className="text-ink">{rate}%</strong>
                              </span>
                            )}
                          </div>
                        )}

                        {isCancelled && session.cancellationReason && (
                          <p className="text-xs text-risk/90 italic pt-1">
                            Reason: &ldquo;{session.cancellationReason}&rdquo;
                          </p>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                        {isScheduled && (
                          <>
                            <Button
                              href={`/lecturer/sessions/${session.id}/attendance`}
                              variant="primary"
                              size="sm"
                              className="font-medium"
                            >
                              <ClipboardCheck className="size-4" />
                              <span>Roll-Call</span>
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCancelModalSession(session)}
                              className="text-risk hover:border-risk/50 hover:text-risk"
                            >
                              Cancel
                            </Button>
                          </>
                        )}

                        {isCompleted && (
                          <Button
                            href={`/lecturer/sessions/${session.id}`}
                            variant="secondary"
                            size="sm"
                          >
                            <span>View Records</span>
                            <ChevronRight className="size-3.5" />
                          </Button>
                        )}

                        {isCancelled && (
                          <Button
                            href={`/lecturer/sessions/${session.id}`}
                            variant="ghost"
                            size="sm"
                          >
                            <span>View Details</span>
                            <ChevronRight className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}

        </>
      )}

      {/* Schedule Class Modal */}
      {data && (
        <SessionCreateModal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          offerings={data.offerings}
          initialOfferingId={offeringFilter !== "all" ? offeringFilter : undefined}
          idToken={idToken}
          onSuccess={() => {
            void loadDashboard();
          }}
        />
      )}

      {/* Cancel Session Modal */}
      {cancelModalSession && (
        <SessionCancelModal
          isOpen={Boolean(cancelModalSession)}
          onClose={() => setCancelModalSession(null)}
          sessionId={cancelModalSession.id}
          courseTitle={cancelModalSession.courseTitle}
          sessionDate={cancelModalSession.sessionDate}
          idToken={idToken}
          onSuccess={() => {
            loadDashboard();
          }}
        />
      )}
    </div>
  );
}
