"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SessionDetailData } from "@/lib/api/types";
import { getSessionDetails, submitAttendance } from "@/lib/api/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DashboardSkeleton } from "@/components/ui/StateFeedback";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  AlertCircle,
  Search,
  ArrowLeft,
  ShieldAlert,
  ClipboardCheck,
  Check,
  X,
  RotateCcw,
  AlertTriangle,
  UserMinus,
  Sparkles,
} from "lucide-react";

interface AttendanceRollCallViewProps {
  sessionId: string;
  idToken?: string;
  isMockDefault?: boolean;
}

export function AttendanceRollCallView({
  sessionId,
  idToken,
  isMockDefault = true,
}: AttendanceRollCallViewProps) {
  const router = useRouter();

  const [data, setData] = useState<SessionDetailData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isMock, setIsMock] = useState<boolean>(isMockDefault);

  // Marks map: studentUid -> "present" | "absent"
  const [marks, setMarks] = useState<Record<string, "present" | "absent">>({});
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [absenteeInput, setAbsenteeInput] = useState<string>("");
  const [absenteeFeedback, setAbsenteeFeedback] = useState<string | null>(null);

  const [confirmModalOpen, setConfirmModalOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);

  const { getIdToken } = useAuth();

  const loadSession = useCallback(async () => {
    setLoading(true);
    setError(null);

    const token = idToken ?? (await getIdToken()) ?? undefined;
    const res = await getSessionDetails(sessionId, token);
    setIsMock(Boolean(res.isMock));

    if (res.data) {
      setData(res.data);
      const initialMarks: Record<string, "present" | "absent"> = {};
      res.data.roster.forEach((student) => {
        // Default all enrolled students to "present"; preserve recorded status if already completed
        initialMarks[student.studentUid] = student.status || "present";
      });
      setMarks(initialMarks);
    } else {
      setError(res.error ?? "Failed to load session details.");
    }
    setLoading(false);
  }, [sessionId, idToken, getIdToken]);

  useEffect(() => {
    let active = true;
    async function fetchSession() {
      const token = idToken ?? (await getIdToken()) ?? undefined;
      const res = await getSessionDetails(sessionId, token);
      if (!active) return;
      setIsMock(Boolean(res.isMock));
      if (res.data) {
        const initialMarks: Record<string, "present" | "absent"> = {};
        res.data.roster.forEach((student) => {
          // Default all enrolled students to "present"
          initialMarks[student.studentUid] = student.status || "present";
        });
        setData(res.data);
        setMarks(initialMarks);
      } else {
        setError(res.error ?? "Failed to load session details.");
      }
      setLoading(false);
    }
    void fetchSession();
    return () => {
      active = false;
    };
  }, [sessionId, idToken, getIdToken]);

  const toggleStatus = (studentUid: string, status: "present" | "absent") => {
    setMarks((prev) => ({
      ...prev,
      [studentUid]: status,
    }));
  };

  const markAll = (status: "present" | "absent") => {
    if (!data?.roster) return;
    const next: Record<string, "present" | "absent"> = {};
    data.roster.forEach((student) => {
      next[student.studentUid] = status;
    });
    setMarks(next);
  };

  /**
   * Fast Absentee Parser:
   * Teachers enter absentee roll numbers (e.g. "19, 42, 61" or full "261419").
   * Matches either exact roll number or suffix (e.g. "19" matches "261419").
   */
  const handleApplyAbsentees = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!data?.roster) return;

    const raw = absenteeInput.trim();
    if (!raw) {
      markAll("present");
      setAbsenteeFeedback("All students marked Present.");
      return;
    }

    const tokens = raw
      .split(/[\s,;]+/)
      .map((t) => t.trim().toUpperCase())
      .filter((t) => t.length > 0);

    const next: Record<string, "present" | "absent"> = {};
    const matchedStudents: { name: string; roll: string }[] = [];

    data.roster.forEach((student) => {
      const studentRoll = (student.rollNumber ?? "").toUpperCase();
      const isAbsent = tokens.some((token) => {
        if (studentRoll === token) return true;
        if (studentRoll.endsWith(token) && token.length >= 2) return true;
        return false;
      });

      if (isAbsent) {
        next[student.studentUid] = "absent";
        matchedStudents.push({
          name: student.displayName ?? student.name ?? "Student",
          roll: student.rollNumber ?? "N/A",
        });
      } else {
        next[student.studentUid] = "present";
      }
    });

    setMarks(next);
    setAbsenteeInput("");

    if (matchedStudents.length > 0) {
      setAbsenteeFeedback(
        `Marked ${matchedStudents.length} student(s) Absent (${matchedStudents.map((s) => s.roll).join(", ")}). Remaining ${data.roster.length - matchedStudents.length} students are marked Present.`
      );
    } else {
      setAbsenteeFeedback(`No enrolled students matched the entered tokens "${raw}".`);
    }
  };

  // Filtered Roster for manual inspection
  const roster = data?.roster;
  const filteredRoster = useMemo(() => {
    if (!roster) return [];
    if (!searchQuery.trim()) return roster;

    const q = searchQuery.toLowerCase();
    return roster.filter(
      (s) =>
        (s.displayName ?? s.name ?? "").toLowerCase().includes(q) ||
        (s.rollNumber ?? "").toLowerCase().includes(q) ||
        Boolean(s.email?.toLowerCase().includes(q))
    );
  }, [roster, searchQuery]);

  // Attendance metrics
  const totalStudents = data?.roster.length ?? 0;
  const presentCount = useMemo(
    () => Object.values(marks).filter((m) => m === "present").length,
    [marks]
  );
  const absentCount = useMemo(
    () => Object.values(marks).filter((m) => m === "absent").length,
    [marks]
  );
  const unmarkedCount = totalStudents - (presentCount + absentCount);
  const isAllMarked = totalStudents > 0 && unmarkedCount === 0;

  // List of currently absent students for quick-chip review
  const absentStudents = useMemo(() => {
    if (!data?.roster) return [];
    return data.roster.filter((s) => marks[s.studentUid] === "absent");
  }, [data?.roster, marks]);

  async function handleFinalSubmit() {
    if (!isAllMarked || !data) return;

    setSubmitting(true);
    setSubmitError(null);

    const payload = {
      marks: data.roster.map((student) => ({
        studentUid: student.studentUid,
        mark: marks[student.studentUid] || "absent",
      })),
    };

    const token = idToken || (await getIdToken()) || undefined;
    const res = await submitAttendance(sessionId, payload, token);
    setSubmitting(false);

    if (res.data) {
      setSubmitSuccess(true);
      setConfirmModalOpen(false);
    } else {
      setSubmitError(res.error ?? "Failed to submit attendance records.");
    }
  }

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
        <div className="p-6 rounded-2xl bg-surface border border-line text-center space-y-3">
          <AlertCircle className="size-8 text-risk mx-auto" />
          <p className="text-sm text-ink font-semibold">{error}</p>
          <Button variant="outline" size="sm" onClick={loadSession}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const sessionStatus = data.session.state;
  const isAlreadyCompleted = sessionStatus === "completed";
  const isCancelled = sessionStatus === "cancelled";

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {isMock && (
        <div className="flex items-center justify-between p-2.5 px-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs">
          <span>Simulation Active — Session marks update in synthetic memory</span>
          <Badge variant="preview" size="sm">
            Interactive Mock Store
          </Badge>
        </div>
      )}

      {/* Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line/60">
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
              {data.session.courseCode}
            </Badge>
            <h1 className="text-xl sm:text-2xl font-extrabold text-ink tracking-tight">
              Roll-Call: {data.session.courseTitle}
            </h1>
            <Badge
              variant={
                sessionStatus === "completed"
                  ? "compliant"
                  : sessionStatus === "cancelled"
                  ? "shortfall"
                  : "warning"
              }
              size="sm"
            >
              {sessionStatus.toUpperCase()}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted mt-1.5">
            <span className="flex items-center gap-1 text-ink font-mono font-medium">
              <Calendar className="size-3.5 text-accent" />
              {data.session.sessionDate}
            </span>
            {(data.session.startTime || data.session.endTime) && (
              <span className="flex items-center gap-1">
                <Clock className="size-3.5 text-accent" />
                {data.session.startTime || "--"} – {data.session.endTime || "--"} IST
              </span>
            )}
            {data.session.room && (
              <span className="flex items-center gap-1">
                <MapPin className="size-3.5 text-accent" />
                {data.session.room}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Users className="size-3.5 text-accent" />
              {totalStudents} Enrolled
            </span>
          </div>
        </div>

        {/* Action Header Button */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadSession}
            busy={loading}
          >
            <RotateCcw className="size-3.5" />
            <span>Reload</span>
          </Button>

          {isAlreadyCompleted && (
            <Button
              href={`/lecturer/sessions/${sessionId}`}
              variant="secondary"
              size="sm"
            >
              <span>View Submitted Record</span>
            </Button>
          )}
        </div>
      </div>

      {/* If already completed warning */}
      {isAlreadyCompleted && (
        <div className="p-4 rounded-xl bg-accent/10 border border-accent/30 text-ink text-sm flex items-start gap-3">
          <CheckCircle2 className="size-5 text-accent shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-accent">Attendance Already Submitted & Locked</p>
            <p className="text-xs text-muted">
              Attendance records for this class session have already been finalized. In accordance with institutional policy, modifications require department administrator audit approval.
            </p>
            <div className="pt-2">
              <Button href={`/lecturer/sessions/${sessionId}`} variant="primary" size="sm">
                View Official Attendance Records
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* If cancelled warning */}
      {isCancelled && (
        <div className="p-4 rounded-xl bg-risk/10 border border-risk/30 text-ink text-sm flex items-start gap-3">
          <AlertCircle className="size-5 text-risk shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-risk">Session Has Been Cancelled</p>
            <p className="text-xs text-muted mt-0.5">
              Reason: &ldquo;{data.session.cancellationReason || "No cancellation reason logged."}&rdquo;
            </p>
          </div>
        </div>
      )}

      {/* Success banner after submission */}
      {submitSuccess && (
        <div className="p-4 rounded-xl bg-accent/10 border border-accent/30 text-ink text-sm flex items-start gap-3 animate-in fade-in">
          <CheckCircle2 className="size-5 text-accent shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="font-semibold text-accent">Attendance Records Successfully Submitted!</p>
            <p className="text-xs text-muted">
              {presentCount} students marked Present, {absentCount} students marked Absent. Session status is now COMPLETED.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <Button href={`/lecturer/sessions/${sessionId}`} variant="primary" size="sm">
                View Final Records
              </Button>
              <Button href="/lecturer" variant="outline" size="sm">
                Return to Dashboard
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Roll-call interactive controls */}
      {!isAlreadyCompleted && !isCancelled && !submitSuccess && (
        <>
          {/* FAST ABSENTEE ENTRY BOX: TEACHER'S EASIEST MODE */}
          <div className="p-5 rounded-2xl bg-surface border-2 border-line hover:border-accent/40 transition-all space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-ink flex items-center gap-1.5 uppercase font-mono tracking-wide">
                  <UserMinus className="size-4 text-risk" />
                  Quick Absentee Mode (Easiest Way to Take Roll)
                </span>
                <p className="text-[11px] text-muted mt-0.5">
                  All {totalStudents} students default to <strong className="text-accent">PRESENT</strong>. Simply enter the roll numbers of the absentees below (comma or space separated, e.g. <span className="font-mono text-ink font-semibold">19, 42, 61</span> or <span className="font-mono text-ink font-semibold">261419</span>).
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => markAll("present")}
                  className="text-xs py-1.5"
                >
                  <Check className="size-3.5 text-accent mr-1" />
                  <span>Set All Present</span>
                </Button>
              </div>
            </div>

            <form onSubmit={handleApplyAbsentees} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
              <div className="relative flex-1">
                <UserMinus className="size-4 text-risk absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={absenteeInput}
                  onChange={(e) => setAbsenteeInput(e.target.value)}
                  placeholder="Enter absent roll numbers: e.g. 19, 42, 61"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-line bg-canvas text-ink placeholder:text-muted/60 focus:outline-hidden focus:border-accent font-mono"
                />
              </div>
              <Button type="submit" variant="danger" size="sm" className="font-mono text-xs uppercase px-4 py-2">
                <span>Mark Absentees</span>
              </Button>
            </form>

            {/* Absentee feedback banner */}
            {absenteeFeedback && (
              <p className="text-xs text-accent font-mono bg-accent/10 border border-accent/25 p-2 rounded-lg">
                {absenteeFeedback}
              </p>
            )}

            {/* Currently Marked Absentees Chips */}
            {absentStudents.length > 0 ? (
              <div className="pt-2 border-t border-line/60 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase font-mono text-risk font-bold flex items-center gap-1">
                    <span>Absentees for this class ({absentStudents.length}):</span>
                  </span>
                  <span className="text-[10px] text-muted font-mono">
                    Click ✕ on any student to switch them back to Present
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {absentStudents.map((s) => (
                    <span
                      key={s.studentUid}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-risk/15 border border-risk/35 text-risk text-xs font-mono font-bold"
                    >
                      <span>{s.rollNumber || s.displayName}</span>
                      <button
                        type="button"
                        onClick={() => toggleStatus(s.studentUid, "present")}
                        className="hover:text-ink cursor-pointer bg-risk/20 rounded-full p-0.5"
                        title="Mark back Present"
                        aria-label={`Mark ${s.rollNumber} as present`}
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-accent/80 font-mono pt-1">
                ✓ Currently, 0 students are marked absent. All {totalStudents} students are marked present.
              </p>
            )}
          </div>

          {/* Real-time counters card */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Card className="p-3.5 border-line bg-surface/70">
              <span className="text-[11px] uppercase tracking-wider text-muted font-medium">
                Total Enrolled
              </span>
              <p className="text-xl font-extrabold text-ink mt-1">{totalStudents}</p>
            </Card>

            <Card className="p-3.5 border-accent/40 bg-accent/5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider text-accent font-medium">
                  Marked Present
                </span>
                <Check className="size-3.5 text-accent" />
              </div>
              <p className="text-xl font-extrabold text-accent mt-1">{presentCount}</p>
            </Card>

            <Card className="p-3.5 border-risk/40 bg-risk/5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider text-risk font-medium">
                  Marked Absent
                </span>
                <X className="size-3.5 text-risk" />
              </div>
              <p className="text-xl font-extrabold text-risk mt-1">{absentCount}</p>
            </Card>
          </div>

          {/* Manual inspection and search bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl bg-surface border border-line">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted font-medium mr-1">Roster Controls:</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAll("present")}
                className="text-xs py-1 hover:border-accent hover:text-accent"
              >
                <Check className="size-3.5 text-accent" />
                <span>Mark All Present</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => markAll("absent")}
                className="text-xs py-1 hover:border-risk hover:text-risk"
              >
                <X className="size-3.5 text-risk" />
                <span>Mark All Absent</span>
              </Button>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="size-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search roll no or name..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-line bg-canvas text-ink placeholder:text-muted/60 focus:outline-hidden focus:border-accent"
              />
            </div>
          </div>

          {/* Student Roster Table */}
          <div className="rounded-xl border border-line bg-surface overflow-hidden">
            <div className="px-4 py-3 border-b border-line/60 bg-raised/40 flex items-center justify-between text-xs">
              <span className="font-semibold text-ink uppercase tracking-wider text-[11px]">
                Enrolled Students ({filteredRoster.length})
              </span>
              <span className="text-muted text-[11px]">
                Click Present or Absent for individual adjustments
              </span>
            </div>

            {filteredRoster.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted">
                No students match your search query &ldquo;{searchQuery}&rdquo;.
              </div>
            ) : (
              <div className="divide-y divide-line/60">
                {filteredRoster.map((student, idx) => {
                  const currentStatus = marks[student.studentUid];
                  const isPresent = currentStatus === "present";
                  const isAbsent = currentStatus === "absent";

                  return (
                    <div
                      key={student.studentUid}
                      className={`p-3.5 sm:px-4 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                        isPresent ? "bg-accent/5" : "bg-risk/5"
                      }`}
                    >
                      {/* Student details */}
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-muted/80 w-6 text-right select-none">
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
                            {isAbsent && (
                              <Badge variant="shortfall" size="sm" className="font-mono text-[9px] uppercase">
                                ABSENT
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-muted mt-0.5">
                            {student.program ?? "B.Tech"} · Sem {student.semester ?? "6"} · Batch {student.batch ?? "2023-2027"}
                          </p>
                        </div>
                      </div>

                      {/* Status Toggle Buttons */}
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => toggleStatus(student.studentUid, "present")}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                            isPresent
                              ? "bg-accent text-[#171915] font-bold border-accent shadow-xs"
                              : "bg-surface text-muted border-line hover:border-accent hover:text-ink"
                          }`}
                          aria-pressed={isPresent}
                        >
                          <Check className="size-3.5" />
                          <span>Present</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleStatus(student.studentUid, "absent")}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                            isAbsent
                              ? "bg-risk text-white font-bold border-risk shadow-xs"
                              : "bg-surface text-muted border-line hover:border-risk hover:text-ink"
                          }`}
                          aria-pressed={isAbsent}
                        >
                          <X className="size-3.5" />
                          <span>Absent</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Submission Bar */}
          <div className="sticky bottom-4 z-30 p-4 rounded-xl bg-canvas/95 backdrop-blur-md border border-line shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-accent font-medium">
                <CheckCircle2 className="size-4 text-accent" />
                <span>All {totalStudents} students ready: {presentCount} Present, {absentCount} Absent.</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/lecturer")}
              >
                Cancel
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={() => setConfirmModalOpen(true)}
                className="font-semibold shadow-xs"
              >
                <ClipboardCheck className="size-4" />
                <span>Submit Attendance ({presentCount} Present / {absentCount} Absent)</span>
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Confirmation Modal */}
      {confirmModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-attendance-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-2xl animate-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-start gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-accent/15 border border-accent/30 text-accent shrink-0">
                <ClipboardCheck className="size-5" />
              </div>
              <div>
                <h3 id="confirm-attendance-title" className="text-base font-bold text-ink">
                  Confirm Attendance Submission
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  Verify attendance counts before committing records
                </p>
              </div>
            </div>

            {submitError && (
              <div className="p-3 rounded-xl bg-risk/10 border border-risk/30 text-xs text-risk flex items-start gap-2">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <span>{submitError}</span>
              </div>
            )}

            <div className="p-3.5 rounded-xl bg-canvas border border-line space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted">Course:</span>
                <span className="font-semibold text-ink">
                  {data.session.courseCode} · {data.session.courseTitle}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Session Date:</span>
                <span className="font-mono text-ink">{data.session.sessionDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Time / Room:</span>
                <span className="text-ink">
                  {data.session.startTime} - {data.session.endTime} ({data.session.room})
                </span>
              </div>
              <div className="pt-2 border-t border-line/60 flex justify-between font-medium">
                <span className="text-accent">Present Count:</span>
                <span className="font-bold text-accent">{presentCount}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span className="text-risk">Absent Count:</span>
                <span className="font-bold text-risk">{absentCount}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span className="text-muted">Total Enrolled:</span>
                <span className="font-bold text-ink">{totalStudents}</span>
              </div>
            </div>

            {absentStudents.length > 0 && (
              <div className="p-3 rounded-xl bg-risk/10 border border-risk/20 text-xs text-risk space-y-1">
                <span className="font-bold uppercase font-mono text-[10px]">Absentees:</span>
                <p className="font-mono text-xs">{absentStudents.map((s) => s.rollNumber || s.displayName).join(", ")}</p>
              </div>
            )}

            <div className="p-3 rounded-xl bg-surface border border-line/80 text-[11px] text-muted flex items-start gap-2">
              <ShieldAlert className="size-4 text-warning shrink-0 mt-0.5" />
              <span>
                <strong>Audit Notice:</strong> Once submitted, the session is completed and locked. Subsequent corrections must be routed through the Department Administrator audit procedure.
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmModalOpen(false)}
                disabled={submitting}
              >
                Review Roster
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleFinalSubmit}
                busy={submitting}
              >
                Confirm & Submit Attendance
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
