"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import type { AcademicNotice } from "@/lib/api/types";
import { getAcademicNotices } from "@/lib/api/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { PageHeader } from "@/components/ui/PortalUI";
import {
  Bell,
  CalendarDays,
  Pin,
  ArrowLeft,
  Megaphone,
  Search,
  CheckCircle2,
  Clock,
  Sparkles,
  FileText,
  Mail,
} from "lucide-react";

interface StudentNoticesViewProps {
  branchCode?: string;
  idToken?: string;
  className?: string;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
}

const CATEGORIES = ["All", "Academic", "Assignments", "Exams", "Campus"] as const;
type Category = (typeof CATEGORIES)[number];

const READ_STORAGE_KEY = "student-portal-read-notices";

export function StudentNoticesView({
  branchCode = "all",
  idToken,
  className = "",
  selectedId: controlledSelectedId,
  onSelect: controlledOnSelect,
}: StudentNoticesViewProps) {
  const [notices, setNotices] = useState<AcademicNotice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<Category>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [localSelectedId, setLocalSelectedId] = useState<string | null>(null);
  const [readIds, setReadIds] = useState<string[]>([]);

  const { getIdToken } = useAuth();

  // Load read notices from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(READ_STORAGE_KEY);
      if (stored) {
        setReadIds(JSON.parse(stored));
      }
    } catch {
      // Ignore localStorage read failures
    }
  }, []);

  const saveReadIds = (nextIds: string[]) => {
    setReadIds(nextIds);
    try {
      localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(nextIds));
    } catch {
      // Ignore
    }
  };

  const selectedId = controlledSelectedId !== undefined ? controlledSelectedId : localSelectedId;

  const handleSelect = (id: string | null) => {
    if (controlledOnSelect) {
      controlledOnSelect(id);
    } else {
      setLocalSelectedId(id);
    }
    if (id && !readIds.includes(id)) {
      saveReadIds([...readIds, id]);
    }
  };

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

  // Notice category normalization
  const getNoticeCategory = (notice: AcademicNotice): Category => {
    if (notice.type === "assignment") return "Assignments";
    const lower = (notice.title + " " + notice.content).toLowerCase();
    if (lower.includes("exam") || lower.includes("mid-sem") || lower.includes("test")) return "Exams";
    if (lower.includes("hostel") || lower.includes("library") || lower.includes("campus") || lower.includes("sports")) return "Campus";
    return "Academic";
  };

  // Filtered list
  const filteredNotices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return notices
      .filter((n) => {
        if (category === "All") return true;
        return getNoticeCategory(n) === category;
      })
      .filter((n) => {
        if (!q) return true;
        return (
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q) ||
          (n.courseCode || "").toLowerCase().includes(q) ||
          n.postedByName.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [notices, category, searchQuery]);

  const selectedNotice = notices.find((n) => n.id === selectedId) ?? null;
  const unreadCount = notices.filter((n) => !readIds.includes(n.id)).length;

  const markAllRead = () => {
    const allIds = notices.map((n) => n.id);
    saveReadIds(allIds);
  };

  // Helper to calculate deadline status
  const getDeadlineMeta = (dueDateStr?: string | null) => {
    if (!dueDateStr) return null;
    const due = new Date(dueDateStr);
    const now = new Date();
    const diffMs = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    const formatted = due.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
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
    <div className={`space-y-8 ${className}`}>
      {/* Page Header with Unread Counter and Mark all read button */}
      <PageHeader
        eyebrow={unreadCount > 0 ? `${unreadCount} unread` : "You’re all caught up"}
        title="Notices"
      >
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-muted transition-colors hover:text-ink cursor-pointer"
          >
            Mark all as read
          </button>
        )}
      </PageHeader>

      {/* Split layout: List on Left, Sticky Reader on Right (portal_ui pattern) */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        {/* LEFT COLUMN: Filters, Search & Notice Cards */}
        <div className={selectedNotice ? "hidden lg:block space-y-4" : "space-y-4"}>
          {/* Category Pill Tabs */}
          <div className="-mx-2 flex gap-2 overflow-x-auto px-2 pb-1 scrollbar-none sm:mx-0 sm:px-0">
            {CATEGORIES.map((c) => {
              const active = category === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
                    active
                      ? "border-solid bg-solid text-on-solid shadow-xs"
                      : "border-line bg-surface text-muted hover:text-ink hover:bg-raised"
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <label className="relative block">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search circulars, assignments or instructors..."
              className="h-10 w-full rounded-full border border-line bg-surface pr-4 pl-10 text-xs sm:text-sm text-ink outline-none placeholder:text-muted/70 focus:border-ink/40 font-mono"
            />
          </label>

          {/* Loading State */}
          {loading && (
            <div className="card divide-y divide-line p-8 text-center text-sm text-muted">
              Loading notices...
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="card p-6 text-center text-sm text-risk bg-risk-soft/40 border-risk/30">
              <p>{error}</p>
              <button
                type="button"
                onClick={() => loadNotices()}
                className="mt-3 inline-block rounded-full border border-risk/40 px-4 py-1.5 text-xs font-semibold text-risk hover:bg-risk/10"
              >
                Retry
              </button>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && filteredNotices.length === 0 && (
            <div className="rounded-2xl border border-dashed border-line py-16 text-center text-sm text-muted font-mono">
              No notices match your filter.
            </div>
          )}

          {/* Notice Cards List */}
          {!loading && !error && filteredNotices.length > 0 && (
            <ul className="card divide-y divide-line overflow-hidden shadow-xs">
              {filteredNotices.map((n) => {
                const isUnread = !readIds.includes(n.id);
                const active = n.id === selectedId;
                const notifCategory = getNoticeCategory(n);
                const deadline = getDeadlineMeta(n.dueDate);
                const formattedDate = new Date(n.createdAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                });

                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(n.id)}
                      className={`flex w-full gap-4 p-5 text-left transition-colors cursor-pointer ${
                        active ? "bg-raised" : "hover:bg-raised/60"
                      }`}
                    >
                      {/* Unread Red Dot */}
                      <span
                        className={`mt-2 size-2 shrink-0 rounded-full ${
                          isUnread ? "bg-risk" : "bg-transparent"
                        }`}
                      />

                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex items-center gap-2 text-xs text-muted">
                          {n.priority === "urgent" && (
                            <span className="flex items-center gap-1 font-semibold text-risk">
                              <Pin className="size-3" /> Urgent
                            </span>
                          )}
                          <span>{notifCategory}</span>
                          <span>·</span>
                          <span className="font-mono">{formattedDate}</span>
                          {n.courseCode && (
                            <>
                              <span>·</span>
                              <span className="font-mono font-medium text-ink">{n.courseCode}</span>
                            </>
                          )}
                        </div>

                        <p
                          className={`leading-snug text-sm ${
                            isUnread ? "font-semibold text-ink" : "text-ink/80"
                          }`}
                        >
                          {n.title}
                        </p>

                        <p className="text-xs text-muted">
                          {n.postedByName}
                          {n.postedByDepartment ? ` · ${n.postedByDepartment}` : ""}
                        </p>

                        {deadline && (
                          <div className="pt-1">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-mono font-medium ${
                                deadline.urgent
                                  ? "bg-risk-soft text-risk font-semibold"
                                  : "bg-warn-soft text-warn"
                              }`}
                            >
                              <CalendarDays className="size-3" />
                              {deadline.isOverdue
                                ? `Overdue (${deadline.formatted})`
                                : `Due ${deadline.formatted}`}
                            </span>
                          </div>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* RIGHT COLUMN: Reading Pane (Sticky on Desktop) */}
        <div className={selectedNotice ? "block" : "hidden lg:block"}>
          {selectedNotice ? (
            <article className="card p-6 sm:p-8 lg:sticky lg:top-8 space-y-6 shadow-xs animate-in fade-in duration-200">
              {/* Back button on mobile */}
              <button
                type="button"
                onClick={() => handleSelect(null)}
                className="flex items-center gap-2 text-sm font-medium text-muted hover:text-ink lg:hidden cursor-pointer"
              >
                <ArrowLeft className="size-4" /> All notices
              </button>

              {/* Notice Metadata */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                {selectedNotice.priority === "urgent" ? (
                  <span className="flex items-center gap-1 rounded-full bg-risk px-2.5 py-0.5 font-semibold text-white">
                    <Pin className="size-3" /> Urgent
                  </span>
                ) : (
                  <span className="rounded-full bg-solid px-2.5 py-0.5 font-medium text-on-solid">
                    {getNoticeCategory(selectedNotice)}
                  </span>
                )}
                <span>·</span>
                <span className="font-mono">
                  {new Date(selectedNotice.createdAt).toLocaleDateString("en-IN", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
                {selectedNotice.courseCode && (
                  <>
                    <span>·</span>
                    <span className="font-mono font-semibold text-ink">
                      {selectedNotice.courseCode}
                    </span>
                  </>
                )}
              </div>

              {/* Title in Instrument Serif */}
              <h2 className="font-serif text-3xl sm:text-4xl leading-tight text-ink">
                {selectedNotice.title}
              </h2>

              {/* Author Attribution */}
              <div className="flex items-center gap-3 border-y border-line py-3 text-xs text-muted">
                <div className="min-w-0">
                  <p className="font-medium text-ink">
                    From {selectedNotice.postedByName}
                    {selectedNotice.postedByDepartment ? ` · ${selectedNotice.postedByDepartment}` : ""}
                  </p>
                  <p className="font-mono text-muted/80">{selectedNotice.postedByEmail}</p>
                </div>
              </div>

              {/* Assignment Deadline Box */}
              {selectedNotice.dueDate && (() => {
                const meta = getDeadlineMeta(selectedNotice.dueDate);
                return (
                  <div
                    className={`flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm font-mono ${
                      meta?.urgent
                        ? "bg-risk-soft text-risk border border-risk/30"
                        : "bg-warn-soft text-warn border border-warn/30"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <CalendarDays className="size-4 shrink-0" />
                      <span>
                        Submission Deadline: <strong>{meta?.formatted}</strong>
                      </span>
                    </div>
                    {meta?.urgent && (
                      <span className="rounded-full bg-risk px-2 py-0.5 text-[10px] font-bold text-white uppercase">
                        Action Required
                      </span>
                    )}
                  </div>
                );
              })()}

              {/* Assignment Specifics (Marks & Upload Info) */}
              {(selectedNotice.maxMarks || selectedNotice.submissionInfo) && (
                <div className="grid grid-cols-2 gap-3 rounded-xl border border-line bg-paper p-3 text-xs font-mono">
                  {selectedNotice.maxMarks && (
                    <div>
                      <span className="text-muted block text-[10px] uppercase">Maximum Marks</span>
                      <strong className="text-ink">{selectedNotice.maxMarks} Points</strong>
                    </div>
                  )}
                  {selectedNotice.submissionInfo && (
                    <div>
                      <span className="text-muted block text-[10px] uppercase">Mode</span>
                      <span className="text-ink truncate block">{selectedNotice.submissionInfo}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Notice Body Content */}
              <div className="space-y-4 pt-2 text-[15px] leading-relaxed text-ink/85">
                {selectedNotice.content.split("\n\n").map((paragraph, idx) => (
                  <p key={idx} className="leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>

              {/* Close / Action footer */}
              <div className="pt-4 border-t border-line flex items-center justify-between text-xs text-muted">
                <span className="font-mono">Notice ID: {selectedNotice.id}</span>
                <span className="font-mono">IIIT Tiruchirappalli</span>
              </div>
            </article>
          ) : (
            <div className="flex h-full min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-line p-8 text-center text-muted">
              <div className="size-12 rounded-2xl bg-surface border border-line grid place-items-center text-muted mb-3">
                <Megaphone className="size-6" strokeWidth={1.5} />
              </div>
              <p className="font-serif text-xl text-ink">Select a notice to read</p>
              <p className="mt-1 max-w-xs text-xs text-muted">
                Tap on any announcement from the feed to view the complete institutional circular or assignment brief.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
