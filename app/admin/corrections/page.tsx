"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { useAuth } from "@/components/auth/AuthProvider";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  ShieldAlert,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export default function AdminCorrectionsPage() {
  const { getIdToken } = useAuth();
  const [attendanceId, setAttendanceId] = useState("");
  const [newMark, setNewMark] = useState<"present" | "absent">("present");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function handleCorrection(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);

    const trimmedId = attendanceId.trim();
    const trimmedReason = reason.trim();

    if (!trimmedId) {
      setResult({ ok: false, message: "Attendance record identifier is required." });
      setSubmitting(false);
      return;
    }

    if (trimmedReason.length < 5) {
      setResult({ ok: false, message: "A formal administrative justification of at least 5 characters is required." });
      setSubmitting(false);
      return;
    }

    try {
      const token = await getIdToken();
      const res = await fetch(`/api/admin/attendance/${encodeURIComponent(trimmedId)}/correction`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          mark: newMark,
          reason: trimmedReason,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setResult({ ok: false, message: data.error || "Failed to apply correction." });
      } else {
        setResult({
          ok: true,
          message: `Correction committed! Attendance ${trimmedId} mark changed to "${newMark.toUpperCase()}". An immutable security audit entry has been logged.`,
        });
        setAttendanceId("");
        setReason("");
      }
    } catch (err) {
      setResult({
        ok: false,
        message: err instanceof Error ? err.message : "Network error applying correction.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <AppShell currentPath="/admin/corrections">
        <div className="space-y-6 animate-in fade-in duration-300 max-w-3xl">
          {/* Header */}
          <div className="border-b border-line pb-6">
            <div className="flex items-center gap-2 mb-1.5">
              <Link
                href="/admin"
                className="text-muted hover:text-ink transition-colors font-mono text-[10px] uppercase flex items-center gap-1"
              >
                <ArrowLeft className="size-3" /> ADMIN CONSOLE
              </Link>
              <span className="text-muted/60">•</span>
              <span className="text-[10px] font-mono text-accent uppercase font-bold">
                LEDGER INTEGRITY
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink uppercase">
              Attendance Mark Correction
            </h1>
            <p className="text-xs sm:text-sm text-muted mt-1 max-w-2xl leading-relaxed">
              Legally compliant attendance rectifications for completed sessions. A mandatory written
              justification is required and permanently attached to the security audit trail.
            </p>
          </div>

          <Card variant="raised" className="border-line/80">
            <CardHeader>
              <CardTitle className="text-base font-bold text-ink flex items-center gap-2">
                <ShieldAlert className="size-4 text-warning" />
                Administrative Correction Form
              </CardTitle>
              <CardDescription className="text-xs text-muted">
                Document ID format: <code className="text-accent font-mono">[sessionId]_[studentUid]</code>.
                Corrections are only permissible against finalized, completed sessions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCorrection} className="space-y-4">
                <Input
                  id="attendance-id"
                  label="Attendance Document ID"
                  required
                  placeholder="e.g. session-cs201-01_student-261161"
                  value={attendanceId}
                  onChange={(e) => setAttendanceId(e.target.value)}
                  hint="Compound identifier of the completed session and student profile."
                />

                <div className="space-y-1">
                  <label className="text-xs font-mono font-semibold text-ink uppercase block">
                    Corrected Mark Designation
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setNewMark("present")}
                      className={`p-3 rounded-[3px] border font-mono text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        newMark === "present"
                          ? "border-accent bg-accent/15 text-accent shadow-xs"
                          : "border-line bg-surface text-muted hover:text-ink"
                      }`}
                    >
                      <CheckCircle2 className="size-4" />
                      Mark Present
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewMark("absent")}
                      className={`p-3 rounded-[3px] border font-mono text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        newMark === "absent"
                          ? "border-risk bg-risk/15 text-risk shadow-xs"
                          : "border-line bg-surface text-muted hover:text-ink"
                      }`}
                    >
                      <AlertCircle className="size-4" />
                      Mark Absent
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-mono font-semibold text-ink uppercase block">
                    Mandatory Administrative Reason (5–300 chars)
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Approved medical certificate submitted to HoD office on 2026-10-25 (Ref #MC-884)"
                    className="w-full bg-canvas border border-line text-ink font-sans text-xs rounded-[3px] p-3 focus:outline-none focus:border-accent leading-relaxed"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-muted">
                    <span>Institute ordinance compliance requirement</span>
                    <span>{reason.length}/300</span>
                  </div>
                </div>

                {result && (
                  <div
                    className={`rounded-[3px] border p-3.5 text-xs font-mono flex items-center gap-2 ${
                      result.ok
                        ? "border-accent/40 bg-accent/10 text-accent"
                        : "border-risk/40 bg-risk/10 text-risk"
                    }`}
                  >
                    {result.ok ? (
                      <CheckCircle2 className="size-4 shrink-0" />
                    ) : (
                      <AlertCircle className="size-4 shrink-0" />
                    )}
                    <span>{result.message}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  busy={submitting}
                  className="w-full font-mono text-xs uppercase"
                >
                  {submitting ? "Committing Correction..." : "Apply & Audit Correction"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    </RoleGuard>
  );
}
