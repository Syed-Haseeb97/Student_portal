"use client";

import React, { useState, useEffect } from "react";
import type { StudentSummary, StudentSessionRecord } from "@/lib/api/types";
import { getSubjectSessionHistory } from "@/lib/api/client";
import { calculateGuidance } from "@/lib/attendance/calc";
import { AttendanceBar, Percent, StatusPill } from "@/components/ui/PortalUI";
import { X, Minus, Plus } from "lucide-react";

interface StudentSubjectDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: StudentSummary | null;
  idToken?: string;
}

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-muted">{label}</span>
      <div className="flex items-center gap-1 rounded-full border border-line bg-surface p-1">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="grid size-8 place-items-center rounded-full text-ink hover:bg-raised disabled:opacity-30 cursor-pointer"
          aria-label={`Decrease ${label}`}
        >
          <Minus className="size-4" />
        </button>
        <span className="w-8 text-center font-mono text-sm font-semibold text-ink">{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="grid size-8 place-items-center rounded-full text-ink hover:bg-raised disabled:opacity-30 cursor-pointer"
          aria-label={`Increase ${label}`}
        >
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  );
}

export function StudentSubjectDetailModal({
  isOpen,
  onClose,
  summary,
  idToken,
}: StudentSubjectDetailModalProps) {
  const [sessions, setSessions] = useState<StudentSessionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [upcoming, setUpcoming] = useState(10);
  const [skip, setSkip] = useState(2);

  const offeringId = summary?.offeringId;

  useEffect(() => {
    if (!isOpen || !offeringId) return;
    setUpcoming(10);
    setSkip(2);
    let active = true;

    (async () => {
      setLoading(true);
      const res = await getSubjectSessionHistory(offeringId, idToken);
      if (!active) return;
      if (res.data) {
        setSessions(res.data);
      } else {
        setSessions([]);
      }
      setLoading(false);
    })();

    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";

    return () => {
      active = false;
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, offeringId, idToken, onClose]);

  if (!isOpen || !summary) return null;

  const threshold = summary.thresholdPercent ?? 75;
  const value = summary.percentage ?? (summary.total > 0 ? (summary.attended / summary.total) * 100 : 0);
  const safe = value >= threshold;
  const missed = summary.total - summary.attended;
  const guidance = calculateGuidance(summary.attended, summary.total, threshold);

  // Bunk planner projection
  const projectedTotal = summary.total + upcoming;
  const projectedAttended = summary.attended + Math.max(0, upcoming - skip);
  const projected = projectedTotal > 0 ? (projectedAttended / projectedTotal) * 100 : 0;
  const projectedSafe = projected >= threshold;

  // History marks representation
  const completedSessions = sessions.filter((s) => s.status === "completed");
  const historyList = completedSessions.length > 0
    ? completedSessions.map((s) => s.mark === "present")
    : Array.from({ length: summary.total }, (_, i) => i < summary.attended);

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={summary.courseTitle}>
      {/* Backdrop */}
      <button
        type="button"
        className="drawer-fade absolute inset-0 bg-black/60 cursor-pointer"
        onClick={onClose}
        aria-label="Close"
      />

      {/* Slide-out Drawer */}
      <aside className="drawer-slide absolute inset-y-0 right-0 flex w-full max-w-lg flex-col overflow-y-auto bg-paper shadow-2xl border-l border-line transform-gpu will-change-transform">
        {/* Drawer Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-paper/95 px-6 py-4 backdrop-blur-md">
          <span className="font-mono text-xs text-muted">
            {summary.courseCode ?? summary.offeringId} · {summary.term ?? "Active Term"}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 place-items-center rounded-full border border-line text-muted hover:text-ink hover:bg-raised transition-colors cursor-pointer"
            aria-label="Close details"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="space-y-8 p-6">
          <div>
            <StatusPill safe={safe} />
            <h2 className="mt-4 font-serif text-3xl sm:text-4xl leading-tight text-ink">
              {summary.courseTitle}
            </h2>
            {summary.term && (
              <p className="mt-1 text-sm text-muted">Term: {summary.term}</p>
            )}
          </div>

          {/* Stats Card */}
          <div className="card p-6">
            <Percent value={value} className={`text-6xl sm:text-7xl ${safe ? "text-ink" : "text-risk"}`} />
            <AttendanceBar value={value} threshold={threshold} className="mt-6" />

            <div className="mt-6 grid grid-cols-3 divide-x divide-line text-center border-t border-line/60 pt-4">
              {[
                ["Attended", summary.attended],
                ["Missed", missed],
                ["Held", summary.total],
              ].map(([label, n]) => (
                <div key={label}>
                  <p className="font-serif text-3xl text-ink">{n}</p>
                  <p className="mt-1 text-xs text-muted">{label}</p>
                </div>
              ))}
            </div>

            <p
              className={`mt-6 rounded-xl px-4 py-3 text-sm leading-relaxed ${
                safe ? "bg-safe-soft text-safe" : "bg-risk-soft text-risk"
              }`}
            >
              {safe
                ? guidance.sessionsCanMiss > 0
                  ? `You can skip up to ${guidance.sessionsCanMiss} classes and stay above the ${threshold}% requirement.`
                  : `You are on track (≥ ${threshold}%), but cannot afford to miss the next session.`
                : guidance.sessionsToRecover > 0
                ? `Attend the next ${guidance.sessionsToRecover} classes in a row to get back to ${threshold}%.`
                : `Currently below the ${threshold}% statutory attendance requirement.`}
            </p>
          </div>

          {/* Bunk Planner Section */}
          <section>
            <h3 className="font-serif text-2xl text-ink">Bunk planner</h3>
            <p className="mt-1 text-sm text-muted">
              Simulate upcoming attendance before deciding whether to take leave.
            </p>
            <div className="card mt-4 space-y-4 p-5">
              <Stepper
                label="Upcoming classes"
                value={upcoming}
                min={1}
                max={30}
                onChange={(v) => {
                  setUpcoming(v);
                  setSkip((s) => Math.min(s, v));
                }}
              />
              <Stepper
                label="Classes I’ll skip"
                value={skip}
                min={0}
                max={upcoming}
                onChange={setSkip}
              />

              <div className="flex items-end justify-between border-t border-line pt-4">
                <div>
                  <p className="text-xs text-muted">Projected attendance</p>
                  <Percent
                    value={projected}
                    className={`mt-2 block text-5xl ${projectedSafe ? "text-safe" : "text-risk"}`}
                  />
                </div>
                <p
                  className={`max-w-[11rem] text-right text-xs leading-relaxed ${
                    projectedSafe ? "text-safe" : "text-risk"
                  }`}
                >
                  {projectedSafe
                    ? "Safe — you stay above the 75% requirement."
                    : "This would put you below the 75% requirement."}
                </p>
              </div>

              <AttendanceBar value={projected} threshold={threshold} />
            </div>
          </section>

          {/* Session History */}
          <section>
            <div className="flex items-end justify-between">
              <h3 className="font-serif text-2xl text-ink">Session history</h3>
              <div className="flex gap-4 text-xs text-muted font-mono">
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-sm bg-safe" /> Present
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-sm bg-risk" /> Absent
                </span>
              </div>
            </div>

            {loading ? (
              <div className="mt-4 rounded-xl border border-line p-6 text-center text-xs text-muted">
                Loading session logs...
              </div>
            ) : (
              <>
                <div className="mt-4 grid grid-cols-12 gap-1.5">
                  {historyList.map((isPresent, i) => (
                    <span
                      key={i}
                      title={`Session ${i + 1} · ${isPresent ? "Present" : "Absent"}`}
                      className={`aspect-square rounded-[4px] ${
                        isPresent ? "bg-safe" : "bg-risk"
                      }`}
                    />
                  ))}
                </div>

                {completedSessions.length > 0 && (
                  <div className="mt-4 divide-y divide-line rounded-xl border border-line bg-surface max-h-48 overflow-y-auto">
                    {completedSessions.slice(-6).reverse().map((s) => (
                      <div key={s.id} className="flex items-center justify-between p-3 text-xs">
                        <div className="min-w-0">
                          <p className="font-medium text-ink font-mono">{s.sessionDate}</p>
                          <p className="text-muted text-[11px]">{s.room ? `Room ${s.room}` : s.topic || "Lecture Session"}</p>
                        </div>
                        <span
                          className={`font-mono font-semibold px-2 py-0.5 rounded-full text-[10px] ${
                            s.mark === "present"
                              ? "bg-safe-soft text-safe"
                              : "bg-risk-soft text-risk"
                          }`}
                        >
                          {s.mark?.toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            <p className="mt-4 text-xs leading-relaxed text-muted">
              Records are verified by the course instructor. Contact them within 48 hours if a
              session is marked incorrectly.
            </p>
          </section>
        </div>
      </aside>
    </div>
  );
}
