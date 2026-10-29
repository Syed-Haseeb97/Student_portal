"use client";

import React, { useState } from "react";
import type { CreateNoticePayload, NoticeType, NoticePriority } from "@/lib/api/types";
import { createAcademicNotice } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import {
  X,
  Bookmark,
  FileText,
  Clock,
  Sparkles,
  Calendar,
  AlertTriangle,
  Send,
} from "lucide-react";

interface NoticeCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  idToken?: string;
  defaultCourseCode?: string;
}

const COURSES_OPTIONS = [
  { code: "CS1101", title: "Introduction to Computer Programming" },
  { code: "MA1103", title: "Differential Calculus and Matrices" },
  { code: "MA1101", title: "Mathematics-I" },
  { code: "PH1101", title: "Physics" },
  { code: "PH1102", title: "Physics Laboratory" },
  { code: "CS1102", title: "Introduction to Computer Programming Laboratory" },
  { code: "ME1101", title: "Engineering Graphics" },
  { code: "EC1103", title: "Introduction to Electronics Engineering" },
  { code: "EC1101", title: "Introduction of Electronics & Communication Engineering" },
  { code: "EC1102", title: "Electronics Laboratory" },
  { code: "ME2101", title: "Basics of Mechanical Engineering" },
  { code: "ME1102", title: "Engineering Practice" },
  { code: "HM1101", title: "English for Communication" },
  { code: "HM1102", title: "NSS / NCC / Emotional Intelligence and Well-Being" },
];

export function NoticeCreateModal({
  isOpen,
  onClose,
  onSuccess,
  idToken,
  defaultCourseCode,
}: NoticeCreateModalProps) {
  const [type, setType] = useState<NoticeType>("assignment");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [courseCode, setCourseCode] = useState(defaultCourseCode || "CS1101");
  const [targetBranch, setTargetBranch] = useState<"all" | "11" | "12" | "13" | "14">("all");
  const [priority, setPriority] = useState<NoticePriority>("normal");
  const [dueDate, setDueDate] = useState(() => {
    // Default 5 days in the future at 23:59
    const d = new Date(Date.now() + 86400000 * 5);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}T23:59`;
  });
  const [maxMarks, setMaxMarks] = useState<number>(50);
  const [submissionInfo, setSubmissionInfo] = useState("Submit via course portal / repository");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please provide a title.");
      return;
    }
    if (!content.trim()) {
      setError("Please enter the assignment or notice description.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const selectedCourseObj = COURSES_OPTIONS.find((c) => c.code === courseCode);

    const payload: CreateNoticePayload = {
      type,
      title: title.trim(),
      content: content.trim(),
      courseCode,
      courseTitle: selectedCourseObj?.title || courseCode,
      targetBranch,
      priority,
      dueDate: type === "assignment" ? dueDate : undefined,
      maxMarks: type === "assignment" ? Number(maxMarks) : undefined,
      submissionInfo: type === "assignment" ? submissionInfo.trim() : undefined,
    };

    const res = await createAcademicNotice(payload, idToken);
    setSubmitting(false);

    if (res.error) {
      setError(res.error);
    } else {
      onSuccess();
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-raised border border-line rounded-2xl p-6 shadow-2xl relative space-y-5 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-muted hover:text-ink hover:bg-canvas transition-colors"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>

        {/* Modal Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-accent/15 text-accent">
              <Sparkles className="size-4" />
            </span>
            <h3 className="text-base sm:text-lg font-bold font-mono uppercase tracking-tight text-ink">
              Create Notice or Allot Assignment
            </h3>
          </div>
          <p className="text-xs text-muted">
            Published announcements and deadlines will immediately appear on all student dashboards.
          </p>
        </div>

        {/* Type Toggle: Assignment vs Notice */}
        <div className="grid grid-cols-2 gap-2 bg-canvas p-1 rounded-xl border border-line text-xs font-mono">
          <button
            type="button"
            onClick={() => setType("assignment")}
            className={`py-2 px-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              type === "assignment"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs"
                : "text-muted hover:text-ink"
            }`}
          >
            <Bookmark className="size-3.5" />
            <span>Allot Assignment</span>
          </button>

          <button
            type="button"
            onClick={() => setType("notice")}
            className={`py-2 px-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              type === "notice"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-xs"
                : "text-muted hover:text-ink"
            }`}
          >
            <FileText className="size-3.5" />
            <span>Academic Notice / Circular</span>
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-risk/10 border border-risk/30 text-xs font-mono text-risk">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
          {/* Title */}
          <div className="space-y-1">
            <label className="text-muted uppercase text-[11px] font-bold">
              {type === "assignment" ? "Assignment Title" : "Notice Subject / Title"} *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={type === "assignment" ? "e.g. Assignment 2: Pointers and Arrays" : "e.g. Extra Lab Session for Batch 2026"}
              className="w-full px-3 py-2 rounded-xl bg-canvas border border-line text-ink placeholder:text-muted/50 focus:outline-accent"
            />
          </div>

          {/* Subject & Target Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-muted uppercase text-[11px] font-bold">Associated Course</label>
              <select
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-canvas border border-line text-ink focus:outline-accent cursor-pointer"
              >
                {COURSES_OPTIONS.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} - {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-muted uppercase text-[11px] font-bold">Target Audience</label>
              <select
                value={targetBranch}
                onChange={(e) => setTargetBranch(e.target.value as "all" | "11" | "12" | "13" | "14")}
                className="w-full px-3 py-2 rounded-xl bg-canvas border border-line text-ink focus:outline-accent cursor-pointer"
              >
                <option value="all">All 1st Year Students (All Branches)</option>
                <option value="11">CSE Core (Branch 11)</option>
                <option value="13">CSE AI & DS (Branch 13)</option>
                <option value="12">ECE Core (Branch 12)</option>
                <option value="14">ECE VLSI Design (Branch 14)</option>
              </select>
            </div>
          </div>

          {/* Assignment-specific Fields: Due Date, Marks, Submission info */}
          {type === "assignment" && (
            <div className="p-3.5 rounded-xl bg-amber-500/[0.04] border border-amber-500/20 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-amber-300 uppercase text-[11px] font-bold flex items-center gap-1.5">
                    <Clock className="size-3" />
                    <span>Submission Deadline *</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-canvas border border-line text-ink focus:outline-accent"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-amber-300 uppercase text-[11px] font-bold">Maximum Marks</label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={maxMarks}
                    onChange={(e) => setMaxMarks(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-xl bg-canvas border border-line text-ink focus:outline-accent"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-muted uppercase text-[11px]">Submission Mode / Instructions</label>
                <input
                  type="text"
                  value={submissionInfo}
                  onChange={(e) => setSubmissionInfo(e.target.value)}
                  placeholder="e.g. Upload PDF to Classroom or submit in Lab"
                  className="w-full px-3 py-1.5 rounded-xl bg-canvas border border-line text-ink focus:outline-accent"
                />
              </div>
            </div>
          )}

          {/* Priority */}
          <div className="space-y-1">
            <label className="text-muted uppercase text-[11px] font-bold">Priority Notice Level</label>
            <div className="flex items-center gap-2">
              {(["normal", "important", "urgent"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`px-3 py-1 rounded-lg border text-xs capitalize cursor-pointer transition-all ${
                    priority === p
                      ? p === "urgent"
                        ? "bg-rose-500/20 border-rose-500 text-rose-300 font-bold"
                        : p === "important"
                        ? "bg-amber-500/20 border-amber-500 text-amber-300 font-bold"
                        : "bg-surface border-accent text-accent font-bold"
                      : "bg-canvas border-line text-muted"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-muted uppercase text-[11px] font-bold">
              {type === "assignment" ? "Problem Statement & Details *" : "Notice Announcement Body *"}
            </label>
            <textarea
              required
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter full instructions, questions, references, or meeting venue..."
              className="w-full px-3 py-2 rounded-xl bg-canvas border border-line text-ink placeholder:text-muted/50 focus:outline-accent leading-relaxed"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-line">
            <Button variant="outline" size="sm" type="button" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" busy={submitting} className="gap-1.5">
              <Send className="size-3.5" />
              <span>{type === "assignment" ? "Allot Assignment" : "Publish Notice"}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
