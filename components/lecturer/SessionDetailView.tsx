"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import type { SessionDetailData } from "@/lib/api/types";
import { getSessionDetails } from "@/lib/api/client";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DashboardSkeleton, EmptyState, ErrorState } from "@/components/ui/StateFeedback";
import { SessionCancelModal } from "./SessionCancelModal";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  ArrowLeft,
  ShieldCheck,
  ClipboardCheck,
  RotateCcw,
  Sparkles,
  Check,
  X,
  FileText,
} from "lucide-react";

interface SessionDetailViewProps {
  sessionId: string;
  idToken?: string;
  isMockDefault?: boolean;
}

export function SessionDetailView({
  sessionId,
  idToken,
  isMockDefault = true,
}: SessionDetailViewProps) {
  const [data, setData] = useState<SessionDetailData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isMock, setIsMock] = useState<boolean>(isMockDefault);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [cancelModalOpen, setCancelModalOpen] = useState<boolean>(false);

  const loadSession = useCallback(async () => {
    setLoading(true);
    setError(null);

    const res = await getSessionDetails(sessionId, idToken);
    setIsMock(Boolean(res.isMock));

    if (res.data) {
      setData(res.data);
    } else {
      setError(res.error ?? "Failed to load session details.");
    }
    setLoading(false);
  }, [sessionId, idToken]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const filteredRoster = useMemo(() => {
    if (!data?.roster) return [];
    if (!searchQuery.trim()) return data.roster;

    const q = searchQuery.toLowerCase();
    return data.roster.filter(
      (s) =>
        (s.displayName ?? s.name ?? "").toLowerCase().includes(q) ||
        (s.rollNumber ?? "").toLowerCase().includes(q) ||
        Boolean(s.email?.toLowerCase().includes(q))
    );
  }, [data?.roster, searchQuery]);

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-32 bg-surface rounded animate-pulse" />
        <DashboardSkeleton />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="space-y-6">
        <Link
          href="/lecturer"
          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          <span>Back to Lecturer Console</span>
        </Link>
        <ErrorState
          title="Could not load session details"
          error={error}
          onRetry={loadSession}
        />
      </div>
    );
  }

  if (!data) return null;

  const { session, roster } = data;
  const sessionStatus = session.status ?? session.state;
  const isScheduled = sessionStatus === "scheduled";
  const isCompleted = sessionStatus === "completed";
  const isCancelled = sessionStatus === "cancelled";

  const totalStudents = roster.length;
  const presentCount =
    session.presentCount !== undefined
      ? session.presentCount
      : roster.filter((r) => r.status === "present").length;
  const absentCount =
    session.absentCount !== undefined
      ? session.absentCount
      : roster.filter((r) => r.status === "absent").length;

  const attendanceRate =
    totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Mock Mode Alert */}
      {isMock && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-surface border border-line text-xs">
          <div className="flex items-center gap-2 text-ink">
            <Sparkles className="size-4 text-accent shrink-0" />
            <span>
              <strong>Lecturer Preview Mode:</strong> Session details loaded from mock repository.
            </span>
          </div>
          <Badge variant="preview" size="sm">
            NEXT_PUBLIC_ENABLE_MOCK_API
          </Badge>
        </div>
      )}

      {/* Navigation & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-line/60">
        <div>
          <Link
            href="/lecturer"
            className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink transition-colors mb-2"
          >
            <ArrowLeft className="size-3.5" />
            <span>Back to Lecturer Console</span>
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="indigo" size="sm">
              {session.courseCode}
            </Badge>
            <h1 className="text-xl sm:text-2xl font-extrabold text-ink tracking-tight">
              {session.courseTitle}
            </h1>
            <Badge
              variant={
                isCompleted ? "compliant" : isCancelled ? "shortfall" : "warning"
              }
              size="sm"
            >
              {sessionStatus.toUpperCase()}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted mt-1.5">
            <span className="flex items-center gap-1 text-ink font-mono font-medium">
              <Calendar className="size-3.5 text-accent" />
              {session.sessionDate}
            </span>
            {(session.startTime || session.endTime) && (
              <span className="flex items-center gap-1">
                <Clock className="size-3.5 text-accent" />
                {session.startTime || "--"} – {session.endTime || "--"} IST
              </span>
            )}
            {session.room && (
              <span className="flex items-center gap-1">
                <MapPin className="size-3.5 text-accent" />
                {session.room}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Users className="size-3.5 text-accent" />
              {totalStudents} Enrolled
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-start md:self-center">
          <Button
            variant="outline"
            size="sm"
            onClick={loadSession}
            busy={loading}
          >
            <RotateCcw className="size-3.5" />
            <span>Reload</span>
          </Button>

          {isScheduled && (
            <>
              <Button
                href={`/lecturer/sessions/${sessionId}/attendance`}
                variant="primary"
                size="sm"
              >
                <ClipboardCheck className="size-4" />
                <span>Mark Attendance</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCancelModalOpen(true)}
                className="text-risk hover:border-risk/50 hover:text-risk"
              >
                Cancel Session
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Cancellation Banner */}
      {isCancelled && (
        <div className="p-4 rounded-xl bg-risk/10 border border-risk/30 text-ink text-sm flex items-start gap-3">
          <XCircle className="size-5 text-risk shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-risk">Session Cancelled</p>
            <p className="text-xs text-ink/90">
              Reason: &ldquo;{session.cancellationReason || "No cancellation reason logged."}&rdquo;
            </p>
            {session.cancelledAt && (
              <p className="text-[11px] text-muted">
                Audit record timestamp: {new Date(session.cancelledAt).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Completed Summary Cards */}
      {isCompleted && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 border-line bg-surface/70">
            <span className="text-xs text-muted uppercase tracking-wider font-medium">Total Enrolled</span>
            <p className="text-2xl font-bold text-ink mt-1">{totalStudents}</p>
            <p className="text-[11px] text-muted mt-0.5">Eligible Registered Students</p>
          </Card>

          <Card className="p-4 border-accent/40 bg-accent/5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-accent uppercase tracking-wider font-medium">Present</span>
              <Check className="size-4 text-accent" />
            </div>
            <p className="text-2xl font-bold text-accent mt-1">{presentCount}</p>
            <p className="text-[11px] text-muted mt-0.5">Attended Class</p>
          </Card>

          <Card className="p-4 border-risk/40 bg-risk/5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-risk uppercase tracking-wider font-medium">Absent</span>
              <X className="size-4 text-risk" />
            </div>
            <p className="text-2xl font-bold text-risk mt-1">{absentCount}</p>
            <p className="text-[11px] text-muted mt-0.5">Marked Absent</p>
          </Card>

          <Card className="p-4 border-line bg-surface/70">
            <span className="text-xs text-muted uppercase tracking-wider font-medium">Attendance Rate</span>
            <p className="text-2xl font-bold text-ink mt-1">{attendanceRate}%</p>
            <p className="text-[11px] text-muted mt-0.5">Classroom Turnout</p>
          </Card>
        </div>
      )}

      {/* Roster & Records Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-ink flex items-center gap-2">
              <Users className="size-4 text-accent" />
              <span>
                {isCompleted ? "Attendance Roster Record" : "Enrolled Class Roster"}
              </span>
            </h2>
            <p className="text-xs text-muted mt-0.5">
              {isCompleted
                ? "Official verified attendance marks for this session"
                : "Active registered students scheduled for this offering"}
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="size-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search roll no or name..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-line bg-surface text-ink placeholder:text-muted/60 focus:outline-hidden focus:border-accent"
            />
          </div>
        </div>

        {/* Students Table */}
        <div className="rounded-xl border border-line bg-surface overflow-hidden">
          <div className="px-4 py-3 border-b border-line/60 bg-raised/40 flex items-center justify-between text-xs">
            <span className="font-semibold text-ink uppercase tracking-wider text-[11px]">
              Students ({filteredRoster.length})
            </span>
            <span className="text-muted text-[11px]">
              Status
            </span>
          </div>

          {filteredRoster.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted">
              No students match your search query &ldquo;{searchQuery}&rdquo;.
            </div>
          ) : (
            <div className="divide-y divide-line/60">
              {filteredRoster.map((student, idx) => {
                const isMarkedPresent = student.status === "present";
                const isMarkedAbsent = student.status === "absent";

                return (
                  <div
                    key={student.studentUid}
                    className="p-3.5 sm:px-4 sm:py-3 flex items-center justify-between gap-3 hover:bg-raised/20 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-muted/70 w-6 text-right select-none">
                        {idx + 1}.
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-ink text-sm font-mono">
                            {student.rollNumber ?? "N/A"}
                          </span>
                          <span className="font-medium text-ink text-sm">
                            {student.displayName ?? student.name ?? "Enrolled Student"}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted mt-0.5">
                          {student.program ?? "B.Tech"} · Sem {student.semester ?? "6"} · Batch {student.batch ?? "2023-2027"}
                        </p>
                      </div>
                    </div>

                    <div>
                      {isCompleted ? (
                        isMarkedPresent ? (
                          <Badge variant="compliant" size="sm">
                            <Check className="size-3" />
                            Present
                          </Badge>
                        ) : (
                          <Badge variant="shortfall" size="sm">
                            <X className="size-3" />
                            Absent
                          </Badge>
                        )
                      ) : isScheduled ? (
                        <Badge variant="warning" size="sm">
                          Pending Roll-Call
                        </Badge>
                      ) : (
                        <Badge variant="neutral" size="sm">
                          Cancelled
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Institutional Audit Notice */}
        <div className="p-4 rounded-xl border border-line bg-surface/50 text-xs text-muted flex items-start gap-3">
          <ShieldCheck className="size-4 text-accent shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-ink">Institutional Attendance Audit Notice</p>
            <p className="mt-0.5">
              Attendance records are permanently timestamped in Asia/Kolkata (IST). In compliance with IIIT Tiruchirappalli Academic Regulations § 4.2, once marked completed, attendance records are locked against unauthenticated mutation. Corrections must be approved by the Department Head or Academic Administrator.
            </p>
          </div>
        </div>
      </div>

      {/* Cancel Modal */}
      {cancelModalOpen && (
        <SessionCancelModal
          isOpen={cancelModalOpen}
          onClose={() => setCancelModalOpen(false)}
          sessionId={sessionId}
          courseTitle={session.courseTitle ?? "Course Session"}
          sessionDate={session.sessionDate}
          idToken={idToken}
          onSuccess={() => {
            loadSession();
          }}
        />
      )}
    </div>
  );
}
