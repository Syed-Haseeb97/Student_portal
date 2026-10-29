"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { AcademicNotice } from "@/lib/api/types";
import { getAcademicNotices, deleteAcademicNotice } from "@/lib/api/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { NoticeCreateModal } from "./NoticeCreateModal";
import {
  Bell,
  Bookmark,
  FileText,
  Clock,
  PlusCircle,
  Trash2,
  RotateCcw,
  Sparkles,
  AlertTriangle,
} from "lucide-react";

interface LecturerNoticesManagerProps {
  idToken?: string;
  className?: string;
}

export function LecturerNoticesManager({ idToken, className = "" }: LecturerNoticesManagerProps) {
  const [notices, setNotices] = useState<AcademicNotice[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { getIdToken } = useAuth();

  const loadNotices = useCallback(async () => {
    setLoading(true);
    const token = idToken ?? (await getIdToken()) ?? undefined;
    const res = await getAcademicNotices("all", token);
    if (res.data) {
      setNotices(res.data);
    }
    setLoading(false);
  }, [idToken, getIdToken]);

  useEffect(() => {
    void loadNotices();
  }, [loadNotices]);

  const handleDelete = async (noticeId: string) => {
    if (!confirm("Are you sure you want to remove this notice/assignment?")) return;
    setDeletingId(noticeId);
    const token = idToken ?? (await getIdToken()) ?? undefined;
    await deleteAcademicNotice(noticeId, token);
    setDeletingId(null);
    void loadNotices();
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-surface border border-line">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-accent/15 text-accent">
              <Bell className="size-4" />
            </span>
            <h3 className="text-base sm:text-lg font-bold font-mono tracking-tight text-ink uppercase">
              Notice Board & Assignment Publisher
            </h3>
          </div>
          <p className="text-xs text-muted">
            Allot homework, publish official announcements, and broadcast assignment deadlines directly to all 1st-year students.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" onClick={() => loadNotices()} busy={loading}>
            <RotateCcw className="size-3.5" />
            <span>Refresh</span>
          </Button>

          <Button variant="primary" size="sm" onClick={() => setCreateModalOpen(true)}>
            <PlusCircle className="size-4" />
            <span>Allot Assignment / Post Notice</span>
          </Button>
        </div>
      </div>

      {/* Notices List */}
      {loading && notices.length === 0 && (
        <div className="p-8 text-center text-xs font-mono text-muted bg-surface rounded-2xl border border-line animate-pulse">
          Loading published notices and active assignments...
        </div>
      )}

      {!loading && notices.length === 0 && (
        <div className="p-10 text-center bg-surface/40 rounded-2xl border border-dashed border-line space-y-3">
          <p className="text-xs font-mono text-muted">
            No notices or assignments have been published yet.
          </p>
          <Button variant="primary" size="sm" onClick={() => setCreateModalOpen(true)}>
            <PlusCircle className="size-4" />
            <span>Publish Your First Notice</span>
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {notices.map((notice) => {
          const isAssignment = notice.type === "assignment";
          return (
            <Card
              key={notice.id}
              className={`p-5 space-y-3.5 transition-all ${
                isAssignment ? "border-amber-500/30 bg-amber-500/[0.02]" : "border-line bg-surface"
              }`}
            >
              <div className="flex items-center justify-between gap-2 flex-wrap text-[11px] font-mono">
                <div className="flex items-center gap-2">
                  {isAssignment ? (
                    <span className="px-2.5 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                      <Bookmark className="size-3" />
                      ASSIGNMENT
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1">
                      <FileText className="size-3" />
                      CIRCULAR
                    </span>
                  )}

                  {notice.courseCode && (
                    <span className="px-2 py-0.5 rounded-md font-bold bg-canvas border border-line text-ink">
                      {notice.courseCode}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(notice.id)}
                  disabled={deletingId === notice.id}
                  className="p-1.5 rounded-lg text-muted hover:text-risk hover:bg-risk/10 transition-colors cursor-pointer"
                  title="Delete notice"
                  aria-label="Delete notice"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>

              <div>
                <h4 className="font-bold text-ink text-sm sm:text-base leading-snug">
                  {notice.title}
                </h4>
                {notice.courseTitle && (
                  <p className="text-[11px] text-muted font-mono mt-0.5">{notice.courseTitle}</p>
                )}
              </div>

              <p className="text-xs text-muted/90 line-clamp-3 leading-relaxed">
                {notice.content}
              </p>

              {isAssignment && notice.dueDate && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs font-mono text-amber-200 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Clock className="size-3.5" />
                    <span>Due: {new Date(notice.dueDate).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}</span>
                  </div>
                  {notice.maxMarks && <span>Max: {notice.maxMarks} Marks</span>}
                </div>
              )}

              <div className="pt-2.5 border-t border-line/60 flex items-center justify-between text-[11px] text-muted font-mono">
                <span>By {notice.postedByName}</span>
                <span>{new Date(notice.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}</span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Modal */}
      <NoticeCreateModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => void loadNotices()}
        idToken={idToken}
      />
    </div>
  );
}
