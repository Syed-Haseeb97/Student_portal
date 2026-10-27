"use client";

import React, { useState } from "react";
import type { LecturerOffering, SessionCreatePayload } from "@/lib/api/types";
import { createSession } from "@/lib/api/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Calendar, Clock, MapPin, X, BookOpen, AlertCircle } from "lucide-react";

interface SessionCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  offerings: LecturerOffering[];
  initialOfferingId?: string;
  idToken?: string;
  onSuccess: (sessionId: string) => void;
}

export function SessionCreateModal({
  isOpen,
  onClose,
  offerings,
  initialOfferingId,
  idToken,
  onSuccess,
}: SessionCreateModalProps) {
  const { getIdToken } = useAuth();
  const todayKolkata = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const [offeringId, setOfferingId] = useState(
    initialOfferingId ?? (offerings[0]?.id || "")
  );
  const [sessionDate, setSessionDate] = useState(todayKolkata);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [room, setRoom] = useState("LH-101");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!offeringId) {
      setError("Please select a course offering.");
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(sessionDate)) {
      setError("Please provide a valid session date (YYYY-MM-DD).");
      return;
    }

    if (startTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime)) {
      setError("Start time must use 24-hour HH:MM format.");
      return;
    }

    if (endTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime)) {
      setError("End time must use 24-hour HH:MM format.");
      return;
    }

    if (startTime && endTime && endTime <= startTime) {
      setError("End time must be later than start time.");
      return;
    }

    if (room && room.trim().length > 80) {
      setError("Room name cannot exceed 80 characters.");
      return;
    }

    setBusy(true);

    const payload: SessionCreatePayload = {
      offeringId,
      sessionDate,
      ...(startTime ? { startTime } : {}),
      ...(endTime ? { endTime } : {}),
      ...(room.trim() ? { room: room.trim() } : {}),
    };

    const token = idToken || (await getIdToken()) || undefined;
    const res = await createSession(payload, token);
    setBusy(false);

    if (res.data) {
      onSuccess(res.data.sessionId);
      onClose();
    } else {
      setError(res.error ?? "Failed to create class session. Please check details.");
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-session-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="w-full max-w-lg rounded-3xl bg-surface border border-line p-6 sm:p-7 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-line/60">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-accent mb-1">
              <Calendar className="size-3.5" />
              <span>Campus Timetable</span>
            </div>
            <h3 id="create-session-title" className="text-xl font-bold tracking-tight text-ink">
              Schedule Class Session
            </h3>
            <p className="text-xs text-muted mt-0.5">
              Create an official attendance roll-call session for your course.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl border border-line bg-canvas text-muted hover:text-ink hover:bg-raised transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div
            role="alert"
            className="mt-4 p-3 rounded-xl bg-risk/10 border border-risk/30 text-risk text-xs flex items-start gap-2"
          >
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Offering Selection */}
          <div className="space-y-1.5">
            <label
              htmlFor="offering-select"
              className="block text-xs font-semibold uppercase tracking-wider text-muted"
            >
              Assigned Course Offering <span className="text-risk">*</span>
            </label>
            <div className="relative">
              <select
                id="offering-select"
                value={offeringId}
                onChange={(e) => setOfferingId(e.target.value)}
                required
                className="w-full rounded-xl border border-line bg-canvas text-sm text-ink px-3.5 py-2.5 outline-none focus:border-accent appearance-none cursor-pointer"
              >
                {offerings.map((off) => (
                  <option key={off.id} value={off.id} className="bg-surface text-ink">
                    {off.courseCode ?? off.id} — {off.courseTitle} ({off.term ?? "Current Term"})
                  </option>
                ))}
              </select>
              <BookOpen className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 size-4 text-muted" />
            </div>
          </div>

          {/* Date & Room */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              id="session-date"
              type="date"
              label="Session Date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              required
              leftIcon={<Calendar className="size-4" />}
            />

            <Input
              id="session-room"
              type="text"
              label="Classroom / Hall"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="e.g. LH-101 or Lab 2"
              leftIcon={<MapPin className="size-4" />}
            />
          </div>

          {/* Time Fields */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              id="start-time"
              type="time"
              label="Start Time (24h)"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              leftIcon={<Clock className="size-4" />}
            />

            <Input
              id="end-time"
              type="time"
              label="End Time (24h)"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              leftIcon={<Clock className="size-4" />}
            />
          </div>

          <div className="p-3 rounded-xl bg-canvas border border-line/60 text-[11px] text-muted space-y-1">
            <p>
              • Sessions are recorded in campus wall-clock time (Asia/Kolkata).
            </p>
            <p>
              • Real-time conflict engine warns against double booking rooms across faculty offerings.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-line/60">
            <Button type="button" variant="secondary" size="md" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              busy={busy}
            >
              {busy ? "Scheduling..." : "Create Session"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
