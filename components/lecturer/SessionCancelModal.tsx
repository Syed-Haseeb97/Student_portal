"use client";

import React, { useState } from "react";
import { cancelSession } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { AlertTriangle, X, AlertCircle } from "lucide-react";

interface SessionCancelModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  courseTitle: string;
  sessionDate: string;
  idToken?: string;
  onSuccess: () => void;
}

export function SessionCancelModal({
  isOpen,
  onClose,
  sessionId,
  courseTitle,
  sessionDate,
  idToken,
  onSuccess,
}: SessionCancelModalProps) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleCancel(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmed = reason.trim();
    if (trimmed.length < 5 || trimmed.length > 300) {
      setError("Cancellation reason must be between 5 and 300 characters.");
      return;
    }

    setBusy(true);
    const res = await cancelSession(sessionId, { reason: trimmed }, idToken);
    setBusy(false);

    if (res.data) {
      onSuccess();
      onClose();
    } else {
      setError(res.error ?? "Could not cancel session. Please retry.");
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-session-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="w-full max-w-md rounded-3xl bg-surface border border-risk/40 p-6 sm:p-7 shadow-2xl relative">
        <div className="flex items-start justify-between pb-4 border-b border-line/60">
          <div className="flex items-center gap-2.5">
            <div className="size-10 rounded-xl bg-risk/10 border border-risk/20 grid place-items-center text-risk shrink-0">
              <AlertTriangle className="size-5" />
            </div>
            <div>
              <h3 id="cancel-session-title" className="text-lg font-bold text-ink">
                Cancel Class Session
              </h3>
              <p className="text-xs text-muted truncate max-w-[240px]">
                {courseTitle} ({sessionDate})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl border border-line bg-canvas text-muted hover:text-ink transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="size-4" />
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-4 p-3 rounded-xl bg-risk/10 border border-risk/30 text-risk text-xs flex items-start gap-2"
          >
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleCancel} className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="cancel-reason"
              className="block text-xs font-semibold uppercase tracking-wider text-muted"
            >
              Audited Reason for Cancellation <span className="text-risk">*</span>
            </label>
            <textarea
              id="cancel-reason"
              rows={3}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Faculty medical emergency, or departmental symposium conflict"
              className="w-full rounded-xl border border-line bg-canvas p-3 text-sm text-ink placeholder:text-muted/60 outline-none focus:border-risk transition-colors resize-none"
            />
            <div className="flex justify-between text-[11px] text-muted">
              <span>Required for official institutional audit log.</span>
              <span className={reason.trim().length < 5 || reason.trim().length > 300 ? "text-risk" : ""}>
                {reason.trim().length} / 300
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-line/60">
            <Button type="button" variant="secondary" size="md" onClick={onClose} disabled={busy}>
              Keep Session
            </Button>
            <Button
              type="submit"
              variant="outline"
              size="md"
              busy={busy}
              className="border-risk/40 text-risk hover:bg-risk/10 hover:border-risk"
            >
              {busy ? "Cancelling..." : "Confirm Cancellation"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
