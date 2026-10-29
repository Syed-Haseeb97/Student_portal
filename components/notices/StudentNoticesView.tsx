"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import type { AcademicNotice } from "@/lib/api/types";
import { getAcademicNotices } from "@/lib/api/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Bell,
  Calendar,
  Clock,
  User,
  AlertTriangle,
  FileText,
  Bookmark,
  ChevronRight,
  RotateCcw,
  Sparkles,
  X,
  Mail,
  GraduationCap,
  CheckCircle2,
} from "lucide-react";

interface StudentNoticesViewProps {
  branchCode?: string;
  idToken?: string;
  className?: string;
}

export function StudentNoticesView({
  branchCode = "all",
  idToken,
  className = "",
}: StudentNoticesViewProps) {
  const [notices, setNotices] = useState<AcademicNotice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "assignment" | "notice">("all");
  const [selectedNotice, setSelectedNotice] = useState<AcademicNotice | null>(null);

  const { getIdToken } = useAuth();

  const loadNotices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = idToken ?? (await getIdToken()) ?? undefined;
      const res = await getAcademicNotices(branchCode, token);
      if (res.data) {
        setNotices(res.data);
      } else {
        setError(res.error || "Failed to load notices.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading notices");
    } finally {
      setLoading(false);
    }
  }, [branchCode, idToken, getIdToken]);

  useEffect(() => {
    void loadNotices();
  }, [loadNotices]);

  const filteredNotices = useMemo(() => {
    if (filter === "all") return notices;
    return notices.filter((n) => n.type === filter);
  }, [notices, filter]);

  const assignmentsCount = useMemo(() => notices.filter((n) => n.type === "assignment").length, [notices]);
  const circularsCount = useMemo(() => notices.filter((n) => n.type === "notice").length, [notices]);

  // Helper to format due date and calculate remaining days
  const getDueInfo = (dueDateStr?: string | null) => {
    if (!dueDateStr) return null;
    const due = new Date(dueDateStr);
    const now = new Date();
    const diffMs = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    const formatted = due.toLocaleDateString("en-IN", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    return {
      formatted,
      isOverdue: diffMs < 0,
      diffDays,
      urgent: diffDays <= 2 && diffMs > 0,
    };
  };

  return (
    <div className={`space-y-5 ${className}`}>
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-4 sm:p-5 rounded-2xl border border-line">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-accent/10 text-accent">
              <Bell className="size-4" />
            </span>
            <h3 className="text-base sm:text-lg font-bold font-mono tracking-tight text-ink uppercase">
              Notice Board & Assignment Deadlines
            </h3>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/30">
              Live Feed
            </span>
          </div>
          <p className="text-xs text-muted">
            Official announcements, assignment briefs, and critical submission deadlines posted by your faculty.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-canvas p-1 rounded-xl border border-line text-xs font-mono overflow-x-auto scrollbar-none self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`min-h-[38px] px-3.5 py-2 rounded-lg transition-all cursor-pointer touch-manipulation active:scale-[0.98] ${
              filter === "all" ? "bg-raised text-accent font-bold shadow-xs border border-accent/40" : "text-muted hover:text-ink"
            }`}
          >
            All ({notices.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("assignment")}
            className={`min-h-[38px] px-3.5 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 touch-manipulation active:scale-[0.98] ${
              filter === "assignment" ? "bg-raised text-amber-300 font-bold shadow-xs border border-amber-500/40" : "text-muted hover:text-ink"
            }`}
          >
            <span>Assignments</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono">
              {assignmentsCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setFilter("notice")}
            className={`min-h-[38px] px-3.5 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 touch-manipulation active:scale-[0.98] ${
              filter === "notice" ? "bg-raised text-cyan-300 font-bold shadow-xs border border-cyan-500/40" : "text-muted hover:text-ink"
            }`}
          >
            <span>Notices</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono">
              {circularsCount}
            </span>
          </button>
        </div>
      </div>

      {/* Loading state */}
      {loading && notices.length === 0 && (
        <div className="p-8 text-center text-xs font-mono text-muted bg-surface rounded-2xl border border-line animate-pulse">
          Loading latest faculty announcements and deadlines...
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredNotices.length === 0 && (
        <div className="p-8 text-center bg-surface/50 rounded-2xl border border-dashed border-line text-xs font-mono space-y-2">
          <p className="text-muted">No notices or active assignments match the selected filter.</p>
          <Button variant="outline" size="sm" onClick={() => loadNotices()}>
            <RotateCcw className="size-3 mr-1.5" />
            Refresh Feed
          </Button>
        </div>
      )}

      {/* Notice Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredNotices.map((notice) => {
          const isAssignment = notice.type === "assignment";
          const dueInfo = getDueInfo(notice.dueDate);

          return (
            <Card
              key={notice.id}
              onClick={() => setSelectedNotice(notice)}
              className={`p-4 sm:p-5 transition-all cursor-pointer hover:border-accent/60 relative overflow-hidden flex flex-col justify-between ${
                isAssignment
                  ? "bg-amber-500/[0.03] border-amber-500/30 hover:border-amber-500/60"
                  : "bg-surface border-line hover:border-line/90"
              }`}
            >
              <div className="space-y-3">
                {/* Header Tag Row */}
                <div className="flex items-center justify-between gap-2 flex-wrap text-[11px] font-mono">
                  <div className="flex items-center gap-1.5">
                    {isAssignment ? (
                      <span className="px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                        <Bookmark className="size-3" />
                        ASSIGNMENT
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1">
                        <FileText className="size-3" />
                        CIRCULAR
                      </span>
                    )}

                    {notice.courseCode && (
                      <span className="px-2 py-0.5 rounded-full font-bold bg-canvas border border-line text-ink">
                        {notice.courseCode}
                      </span>
                    )}
                  </div>

                  {/* Priority / Target */}
                  {notice.priority === "urgent" && (
                    <span className="px-2 py-0.5 rounded-full font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                      <AlertTriangle className="size-3" />
                      URGENT
                    </span>
                  )}
                  {notice.priority === "important" && (
                    <span className="px-2 py-0.5 rounded-full font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      IMPORTANT
                    </span>
                  )}
                </div>

                {/* Title */}
                <div>
                  <h4 className="font-bold text-ink text-sm sm:text-base leading-snug line-clamp-2">
                    {notice.title}
                  </h4>
                  {notice.courseTitle && (
                    <p className="text-[11px] text-muted font-mono mt-0.5 truncate">
                      {notice.courseTitle}
                    </p>
                  )}
                </div>

                {/* Content preview */}
                <p className="text-xs text-muted/90 line-clamp-3 leading-relaxed">
                  {notice.content}
                </p>

                {/* Assignment Deadline Pill Callout */}
                {isAssignment && dueInfo && (
                  <div
                    className={`p-2.5 rounded-xl border text-xs font-mono flex items-center justify-between ${
                      dueInfo.isOverdue
                        ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                        : dueInfo.urgent
                        ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                        : "bg-surface border-line text-ink"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="size-3.5 shrink-0" />
                      <span>Due: <strong>{dueInfo.formatted}</strong></span>
                    </div>
                    <span className="text-[10px] font-bold uppercase">
                      {dueInfo.isOverdue
                        ? "Past Due"
                        : dueInfo.diffDays === 0
                        ? "Due Today"
                        : `${dueInfo.diffDays}d remaining`}
                    </span>
                  </div>
                )}
              </div>

              {/* Card Footer: Instructor Info & Date */}
              <div className="mt-4 pt-3 border-t border-line/60 flex items-center justify-between text-xs text-muted font-mono">
                <div className="flex items-center gap-2 truncate">
                  <div className="size-6 rounded-full bg-accent/15 text-accent flex items-center justify-center shrink-0 text-[10px] font-bold">
                    {notice.postedByName.charAt(0) || "F"}
                  </div>
                  <span className="truncate text-ink font-medium">{notice.postedByName}</span>
                </div>

                <div className="flex items-center gap-1 text-[11px] shrink-0 text-muted/80">
                  <span>{new Date(notice.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}</span>
                  <ChevronRight className="size-3.5 text-muted ml-1" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Detail Modal */}
      {selectedNotice && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setSelectedNotice(null)}
        >
          <div
            className="w-full max-w-lg bg-raised border border-line rounded-2xl p-6 shadow-2xl relative space-y-5 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedNotice(null)}
              className="absolute top-4 right-4 min-w-[38px] min-h-[38px] flex items-center justify-center rounded-xl text-muted hover:text-ink hover:bg-canvas transition-colors touch-manipulation cursor-pointer"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>

            {/* Header */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
                {selectedNotice.type === "assignment" ? (
                  <span className="px-2.5 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    ASSIGNMENT
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    ACADEMIC CIRCULAR
                  </span>
                )}
                {selectedNotice.courseCode && (
                  <Badge variant="neutral" size="sm">
                    {selectedNotice.courseCode}
                  </Badge>
                )}
                {selectedNotice.maxMarks && (
                  <span className="px-2 py-0.5 rounded-full font-bold bg-accent/20 text-accent font-mono text-[10px]">
                    {selectedNotice.maxMarks} Marks
                  </span>
                )}
              </div>

              <h3 className="text-lg font-bold text-ink leading-snug">
                {selectedNotice.title}
              </h3>
              {selectedNotice.courseTitle && (
                <p className="text-xs text-muted font-mono">{selectedNotice.courseTitle}</p>
              )}
            </div>

            {/* Deadline Block (if assignment) */}
            {selectedNotice.dueDate && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs font-mono space-y-1 text-amber-200">
                <div className="flex items-center justify-between">
                  <span className="text-muted">Submission Deadline:</span>
                  <strong className="text-amber-300">
                    {new Date(selectedNotice.dueDate).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </strong>
                </div>
                {selectedNotice.submissionInfo && (
                  <div className="pt-1.5 border-t border-amber-500/20 text-[11px] text-amber-300/90">
                    <strong>Submission Method:</strong> {selectedNotice.submissionInfo}
                  </div>
                )}
              </div>
            )}

            {/* Full Content */}
            <div className="space-y-2 text-sm leading-relaxed text-ink/90 whitespace-pre-wrap bg-surface p-4 rounded-xl border border-line">
              <p>{selectedNotice.content}</p>
            </div>

            {/* Faculty Issuer Info */}
            <div className="pt-3 border-t border-line space-y-2 text-xs font-mono">
              <span className="text-[10px] uppercase font-bold text-muted">Issued By:</span>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-ink text-sm">{selectedNotice.postedByName}</p>
                  <p className="text-muted text-[11px]">{selectedNotice.postedByDepartment || "Course Faculty"}</p>
                </div>
                {selectedNotice.postedByEmail && (
                  <a
                    href={`mailto:${selectedNotice.postedByEmail}`}
                    className="flex items-center gap-1.5 p-2 rounded-lg bg-canvas hover:bg-surface border border-line text-accent text-xs"
                  >
                    <Mail className="size-3.5" />
                    <span>Contact</span>
                  </a>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedNotice(null)}
              className="w-full py-2.5 rounded-xl bg-accent hover:bg-accent/90 text-canvas font-mono font-bold text-xs transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
