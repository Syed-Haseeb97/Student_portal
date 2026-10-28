"use client";

import React, { useState, useEffect } from "react";
import type { StudentSummary, StudentSessionRecord } from "@/lib/api/types";
import { getSubjectSessionHistory } from "@/lib/api/client";
import { calculateGuidance } from "@/lib/attendance/calc";
import { AttendanceProgress } from "@/components/ui/AttendanceProgress";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  X,
  BookOpen,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Info,
  CalendarCheck,
  CalendarX,
  FileText,
} from "lucide-react";

interface StudentSubjectDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: StudentSummary | null;
  idToken?: string;
}

export function StudentSubjectDetailModal({
  isOpen,
  onClose,
  summary,
  idToken,
}: StudentSubjectDetailModalProps) {
  const [sessions, setSessions] = useState<StudentSessionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "present" | "absent" | "scheduled">("all");

  const offeringId = summary?.offeringId;

  useEffect(() => {
    if (!isOpen || !offeringId) return;

    let active = true;

    (async () => {
      const res = await getSubjectSessionHistory(offeringId, idToken);
      if (!active) return;
      if (res.data) {
        setSessions(res.data);
      } else {
        setSessions([]);
      }
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [isOpen, offeringId, idToken]);

  if (!isOpen || !summary) return null;

  const threshold = summary.thresholdPercent ?? 75;
  const guidance = calculateGuidance(summary.attended, summary.total, threshold);
  const isCompliant = summary.status === "compliant";
  const isShortfall = summary.status === "shortfall";

  const filteredSessions = sessions.filter((s) => {
    if (filter === "all") return true;
    if (filter === "present") return s.status === "completed" && s.mark === "present";
    if (filter === "absent") return s.status === "completed" && s.mark === "absent";
    if (filter === "scheduled") return s.status === "scheduled";
    return true;
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="subject-detail-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl bg-surface border border-line shadow-2xl relative overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-line/60 bg-surface flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-[11px] font-bold uppercase tracking-wider text-accent px-2.5 py-0.5 rounded-full bg-accent/10 border border-accent/20">
                {summary.courseCode ?? summary.offeringId}
              </span>
              <span className="text-xs text-muted">Term: {summary.term ?? "Current Term"}</span>
              {isCompliant && (
                <Badge variant="compliant" size="sm">
                  <CheckCircle2 className="size-3" />
                  Compliant ({summary.percentage != null ? `${summary.percentage.toFixed(1)}%` : "—"})
                </Badge>
              )}
              {isShortfall && (
                <Badge variant="shortfall" size="sm">
                  <AlertTriangle className="size-3" />
                  Shortfall ({summary.percentage != null ? `${summary.percentage.toFixed(1)}%` : "—"})
                </Badge>
              )}
            </div>

            <h2 id="subject-detail-title" className="text-xl sm:text-2xl font-bold tracking-tight text-ink truncate">
              {summary.courseTitle}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full border border-line bg-canvas text-muted hover:text-ink hover:bg-raised transition-colors cursor-pointer shrink-0"
            aria-label="Close dialog"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Quick Metrics & Guidance Card */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Attendance Progress Card */}
            <div className="p-4 rounded-2xl bg-canvas border border-line flex items-center gap-4">
              <AttendanceProgress
                attended={summary.attended}
                total={summary.total}
                percentage={summary.percentage}
                thresholdPercent={threshold}
                variant="circular"
                size="md"
              />
              <div className="space-y-1 text-xs font-mono">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted">Total Classes:</span>
                  <strong className="text-ink font-semibold">{summary.total}</strong>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted">Attended:</span>
                  <strong className="text-accent font-semibold">{summary.attended}</strong>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted">Missed:</span>
                  <strong className={`font-semibold ${summary.missed > 0 ? "text-risk" : "text-muted"}`}>
                    {summary.missed}
                  </strong>
                </div>
                <div className="flex items-center justify-between gap-3 pt-0.5 border-t border-line/50 text-[10px]">
                  <span className="text-muted">Req. Policy:</span>
                  <span className="text-muted font-medium">{threshold}% minimum</span>
                </div>
              </div>
            </div>

            {/* Presnt Guidance & Bunk Margin Card */}
            <div className="p-4 rounded-2xl bg-canvas border border-line flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
                  <Sparkles className="size-3.5 text-accent" />
                  <span>Presnt Bunk Engine</span>
                </div>
                {isCompliant ? (
                  <div>
                    <h4 className="text-sm font-semibold text-accent">
                      {guidance.sessionsCanMiss > 0
                        ? `Safe Bunk Margin: ${guidance.sessionsCanMiss} ${guidance.sessionsCanMiss === 1 ? "Class" : "Classes"}`
                        : "Attendance Exactly at 75%"}
                    </h4>
                    <p className="mt-1 text-xs text-muted leading-relaxed">
                      {guidance.sessionsCanMiss > 0
                        ? `You can safely miss the next ${guidance.sessionsCanMiss} ${guidance.sessionsCanMiss === 1 ? "session" : "sessions"} without dipping below the required 75% mark.`
                        : "You are currently right at the 75% boundary. Any additional absence will trigger a shortfall."}
                    </p>
                  </div>
                ) : isShortfall ? (
                  <div>
                    <h4 className="text-sm font-semibold text-risk">
                      Recovery Target: {guidance.sessionsToRecover} Consecutive {guidance.sessionsToRecover === 1 ? "Class" : "Classes"}
                    </h4>
                    <p className="mt-1 text-xs text-muted leading-relaxed">
                      To reach examination eligibility (75%), attend the next{" "}
                      <strong>{guidance.sessionsToRecover}</strong> consecutive class sessions without absence.
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-muted">
                    No completed sessions recorded yet. Attendance margin will compute once sessions begin.
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1 text-[11px] text-muted/70 pt-2 border-t border-line/40 mt-2">
                <Info className="size-3 text-accent shrink-0" />
                <span>Computed per course independently.</span>
              </div>
            </div>
          </div>

          {/* Session Attendance Log (presnt parity) */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold tracking-tight text-ink flex items-center gap-1.5">
                  <Calendar className="size-4 text-accent" />
                  <span>Session Attendance History</span>
                </h3>
                <p className="text-xs text-muted">
                  Roll-call records submitted by faculty for this offering
                </p>
              </div>

              {/* Filter tabs */}
              <div className="flex items-center gap-1 bg-canvas p-1 rounded-full border border-line text-[10px] font-mono">
                {(["all", "present", "absent", "scheduled"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setFilter(tab)}
                    className={`px-3 py-1 rounded-full font-bold uppercase transition-colors cursor-pointer ${
                      filter === tab
                        ? "bg-[#283226] text-accent border border-accent/40 shadow-xs"
                        : "text-muted hover:text-ink"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="p-8 text-center text-muted text-xs flex items-center justify-center gap-2">
                <RotateCcw className="size-4 animate-spin text-accent" />
                <span>Loading session history...</span>
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dashed border-line bg-canvas/40">
                <BookOpen className="size-6 text-muted mx-auto mb-2 opacity-50" />
                <p className="text-xs text-muted font-medium">No sessions found matching this view.</p>
              </div>
            ) : (
              <div className="divide-y divide-line/60 rounded-2xl border border-line bg-canvas overflow-hidden">
                {filteredSessions.map((session) => {
                  const isPresent = session.status === "completed" && session.mark === "present";
                  const isAbsent = session.status === "completed" && session.mark === "absent";
                  const isCancelled = session.status === "cancelled";
                  const isScheduled = session.status === "scheduled";

                  return (
                    <div
                      key={session.id}
                      className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface/50 transition-colors"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap text-xs">
                          <span className="font-semibold text-ink flex items-center gap-1">
                            <Calendar className="size-3 text-muted" />
                            {session.sessionDate}
                          </span>
                          {session.startTime && (
                            <>
                              <span className="text-muted/40">•</span>
                              <span className="text-muted flex items-center gap-1">
                                <Clock className="size-3" />
                                {session.startTime} {session.endTime ? `– ${session.endTime}` : ""}
                              </span>
                            </>
                          )}
                          {session.room && (
                            <>
                              <span className="text-muted/40">•</span>
                              <span className="text-muted flex items-center gap-1">
                                <MapPin className="size-3" />
                                {session.room}
                              </span>
                            </>
                          )}
                        </div>

                        {session.topic && (
                          <p className="text-xs text-muted flex items-center gap-1.5 pt-0.5">
                            <FileText className="size-3 text-accent shrink-0" />
                            <span className="truncate">{session.topic}</span>
                          </p>
                        )}

                        {isCancelled && session.cancelReason && (
                          <p className="text-[11px] text-muted/80 italic pt-0.5">
                            Cancelled: {session.cancelReason}
                          </p>
                        )}
                      </div>

                      {/* Status Mark Badge */}
                      <div className="shrink-0 self-start sm:self-auto">
                        {isPresent && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                            <CalendarCheck className="size-3.5" />
                            Present
                          </span>
                        )}
                        {isAbsent && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/25">
                            <CalendarX className="size-3.5" />
                            Absent
                          </span>
                        )}
                        {isScheduled && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-sky-500/10 text-sky-400 border border-sky-500/25">
                            <Clock className="size-3.5" />
                            Scheduled
                          </span>
                        )}
                        {isCancelled && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-line text-muted border border-line">
                            Cancelled
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-line/60 bg-surface flex items-center justify-end">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
