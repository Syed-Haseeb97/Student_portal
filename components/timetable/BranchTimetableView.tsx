"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  BRANCH_TIMETABLES,
  PERIOD_SLOTS,
  resolveSlotCourse,
  resolveBranchFromRollOrEmail,
  type DayOfWeek,
  type CourseDetail,
  type BranchTimetable,
  type PeriodSlot,
} from "@/lib/timetable/first-year-data";
import { inferStudentFromRollOrEmail } from "@/lib/roster/validate";
import {
  Clock,
  Mail,
  Phone,
  X,
  MapPin,
  ChevronRight,
  Sparkles,
} from "lucide-react";

interface BranchTimetableViewProps {
  userRollOrEmail?: string;
  defaultBranch?: "11" | "12" | "13" | "14";
  batch?: string;
  className?: string;
  allowBranchSwitching?: boolean;
}

const DAYS: DayOfWeek[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const typeStyle: Record<string, string> = {
  Lecture: "bg-surface border-line hover:border-ink/40",
  Lab: "bg-accent-soft border-safe/25 hover:border-safe/50",
  Tutorial: "bg-warn-soft border-warn/25 hover:border-warn/50",
  GIR: "bg-surface border-line hover:border-ink/40",
};

const typeDot: Record<string, string> = {
  Lecture: "bg-ink",
  Lab: "bg-safe",
  Tutorial: "bg-warn",
  GIR: "bg-ink",
};

export function BranchTimetableView({
  userRollOrEmail,
  defaultBranch,
  batch,
  className = "",
  allowBranchSwitching = true,
}: BranchTimetableViewProps) {
  // Infer student's department branch
  const inferredBranch = useMemo(() => {
    if (defaultBranch) return defaultBranch;
    return resolveBranchFromRollOrEmail(userRollOrEmail);
  }, [defaultBranch, userRollOrEmail]);

  // Determine intake batch (Batch 2026 is 1st Year; others are seniors)
  const studentBatch = useMemo(() => {
    if (batch) return batch;
    if (userRollOrEmail) {
      const info = inferStudentFromRollOrEmail(userRollOrEmail);
      if (info?.batch) return info.batch;
    }
    return "2026";
  }, [batch, userRollOrEmail]);

  const isSeniorBatch = studentBatch !== "2026";
  const [showReferenceTimetable, setShowReferenceTimetable] = useState(false);
  const [userSelectedBranch, setUserSelectedBranch] = useState<"11" | "12" | "13" | "14">(inferredBranch);

  useEffect(() => {
    setUserSelectedBranch(inferredBranch);
  }, [inferredBranch]);

  const selectedBranch = allowBranchSwitching ? userSelectedBranch : inferredBranch;
  const timetable: BranchTimetable = BRANCH_TIMETABLES[selectedBranch] || BRANCH_TIMETABLES["11"];

  // Today's day index (0 = Monday, 1 = Tuesday ... 4 = Friday)
  const todayIndex = useMemo(() => {
    const day = new Date().getDay(); // 0 is Sun, 1 is Mon, 5 is Fri
    if (day >= 1 && day <= 5) return day - 1;
    return 0; // Default to Monday on weekends
  }, []);

  const [mobileDay, setMobileDay] = useState<number>(todayIndex);

  // Selected course for detail modal
  const [selectedCourse, setSelectedCourse] = useState<{
    course: CourseDetail;
    slotCode: string;
    day: DayOfWeek;
    period: PeriodSlot;
  } | null>(null);

  // Current active period check
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const currentDayOfWeek = now.getDay() - 1; // 0 = Monday

  const isPeriodNow = (dayIndex: number, period: PeriodSlot) => {
    if (dayIndex !== currentDayOfWeek) return false;
    const [startH, startM] = period.startTime.split(":").map(Number);
    const [endH, endM] = period.endTime.split(":").map(Number);
    const startMin = startH * 60 + startM;
    const endMin = endH * 60 + endM;
    return currentMinutes >= startMin && currentMinutes <= endMin;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Top Header: Department selection & Info */}
      <div className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-serif text-2xl text-ink">
              {timetable.shortName}
            </h3>
            <span className="rounded-full bg-safe-soft px-2.5 py-0.5 font-mono text-[11px] font-semibold text-safe border border-safe/25">
              Code {timetable.branchCode}
            </span>
            <span className="hidden font-mono text-xs text-muted sm:inline">
              · Semester I (2026–27)
            </span>
          </div>
          <p className="mt-1 text-xs text-muted font-mono">
            Static in-memory schedule · 0 Firestore reads · Free tier preserved
          </p>
        </div>

        {/* Branch Switcher Tabs */}
        {allowBranchSwitching && (
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-line bg-paper p-1">
            {(
              [
                ["11", "CSE Core"],
                ["13", "CSE AI & DS"],
                ["12", "ECE Core"],
                ["14", "VLSI Design"],
              ] as const
            ).map(([code, label]) => {
              const active = selectedBranch === code;
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => setUserSelectedBranch(code)}
                  className={`rounded-lg px-3 py-1.5 font-mono text-xs font-medium transition-colors cursor-pointer ${
                    active
                      ? "bg-solid text-on-solid shadow-xs"
                      : "text-muted hover:bg-surface hover:text-ink"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Senior Batch Notice Banner */}
      {isSeniorBatch && !showReferenceTimetable && (
        <div className="card space-y-4 p-6 sm:p-8 text-center border-amber-500/30">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
            <Clock className="size-6 animate-pulse" />
          </div>
          <div className="space-y-1">
            <span className="inline-block rounded-full bg-amber-500/15 px-3 py-0.5 font-mono text-xs font-semibold text-amber-500 border border-amber-500/30">
              Batch {studentBatch} · Schedule Pending
            </span>
            <h4 className="font-serif text-2xl text-ink">
              Awaiting Batch {studentBatch} Timetable
            </h4>
            <p className="mx-auto max-w-lg text-xs leading-relaxed text-muted font-mono">
              The automated ledger is operating for 1st Year. If you have the Batch {studentBatch} schedule, please email it to{" "}
              <a
                href={`mailto:syed424892@gmail.com?subject=Timetable%20Contribution%20-%20Batch%20${studentBatch}`}
                className="font-semibold text-ink underline underline-offset-2"
              >
                syed424892@gmail.com
              </a>{" "}
              to have it integrated for all batchmates.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <a
              href={`mailto:syed424892@gmail.com?subject=Timetable%20Contribution%20-%20Batch%20${studentBatch}`}
              className="inline-flex items-center gap-2 rounded-full bg-solid px-5 py-2.5 font-mono text-xs font-medium text-on-solid hover:opacity-90"
            >
              <Mail className="size-3.5" />
              <span>Email Timetable (syed424892@gmail.com)</span>
            </a>
            <button
              type="button"
              onClick={() => setShowReferenceTimetable(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-4 py-2.5 font-mono text-xs text-muted hover:text-ink cursor-pointer"
            >
              <span>View 1st Year Reference</span>
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Timetable View (Shown for 1st Year or when reference is explicitly toggled) */}
      {(!isSeniorBatch || showReferenceTimetable) && (
        <div className="space-y-5">
          {/* Legend and Type Indicators */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
            <div className="flex flex-wrap items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-ink" /> Lecture
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-safe" /> Lab Session
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-warn" /> Tutorial / GIR
              </span>
            </div>
            <span className="font-mono text-[11px] text-muted">
              Tap any class for instructor contact & syllabus details
            </span>
          </div>

          {/* DESKTOP WEEK GRID (Directly modeled after portal_ui TimetableView) */}
          <div className="card hidden overflow-x-auto p-4 lg:block shadow-xs">
            <div
              className="grid min-w-[900px] gap-2"
              style={{
                gridTemplateColumns: "64px repeat(5, minmax(0, 1fr))",
                gridTemplateRows:
                  "auto 88px 88px 30px 88px 88px 36px 88px 88px 30px 88px",
              }}
            >
              {/* Empty top-left corner */}
              <div />

              {/* Day column headers */}
              {DAYS.map((d, i) => {
                const isToday = i === todayIndex;
                return (
                  <div
                    key={d}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isToday ? "bg-solid text-on-solid" : "text-muted"
                    }`}
                  >
                    <span>{d.slice(0, 3)}</span>
                    {isToday && (
                      <span className="ml-1 text-xs font-normal text-on-solid/70">
                        · Today
                      </span>
                    )}
                  </div>
                );
              })}

              {/* Period rows, break banners, and class blocks */}
              {PERIOD_SLOTS.map((slot, rowIndex) => {
                const gridRowNumber = rowIndex + 2;

                if (slot.id === "LUNCH") {
                  return (
                    <div
                      key={slot.id}
                      className="flex items-center gap-3 text-[11px] tracking-widest text-muted uppercase font-mono"
                      style={{ gridColumn: "1 / -1", gridRow: gridRowNumber }}
                    >
                      <span className="w-16 text-right font-mono normal-case tracking-normal text-muted">
                        {slot.startTime}
                      </span>
                      <span className="h-px flex-1 bg-line" />
                      <span>Lunch break (13:00 – 14:00)</span>
                      <span className="h-px flex-1 bg-line" />
                    </div>
                  );
                }

                if (slot.isBreak) {
                  return (
                    <div
                      key={slot.id}
                      className="flex items-center gap-3 text-[10px] tracking-widest text-muted/70 uppercase font-mono"
                      style={{ gridColumn: "1 / -1", gridRow: gridRowNumber }}
                    >
                      <span className="w-16 text-right font-mono normal-case tracking-normal text-muted/70">
                        {slot.startTime}
                      </span>
                      <span className="h-px flex-1 bg-line/60" />
                      <span>{slot.label} ({slot.startTime} – {slot.endTime})</span>
                      <span className="h-px flex-1 bg-line/60" />
                    </div>
                  );
                }

                // Regular teaching period: render left time label + 5 day slots
                return (
                  <React.Fragment key={slot.id}>
                    {/* Column 1: Time label */}
                    <div
                      className="pt-2 pr-2 text-right font-mono text-xs text-muted"
                      style={{ gridColumn: 1, gridRow: gridRowNumber }}
                    >
                      {slot.startTime}
                    </div>

                    {/* Columns 2-6: Five days */}
                    {DAYS.map((day, dayIndex) => {
                      const slotCode = timetable.schedule[day]?.[rowIndex];
                      const course = resolveSlotCourse(timetable, slotCode);
                      const isNext = isPeriodNow(dayIndex, slot);
                      const classType = course?.type || "Lecture";

                      if (!slotCode || !course) {
                        return (
                          <div
                            key={`${day}-${slot.id}`}
                            className={`rounded-xl border border-dashed border-line/60 ${
                              dayIndex === todayIndex ? "bg-raised/40" : ""
                            }`}
                            style={{
                              gridColumn: dayIndex + 2,
                              gridRow: gridRowNumber,
                            }}
                          />
                        );
                      }

                      return (
                        <div
                          key={`${day}-${slot.id}`}
                          className="z-10"
                          style={{
                            gridColumn: dayIndex + 2,
                            gridRow: gridRowNumber,
                          }}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedCourse({
                                course,
                                slotCode,
                                day,
                                period: slot,
                              })
                            }
                            className={`flex h-full w-full flex-col rounded-xl border p-2.5 text-left transition-all cursor-pointer ${
                              typeStyle[classType] || typeStyle.Lecture
                            } ${isNext ? "ring-2 ring-ink shadow-sm" : ""}`}
                          >
                            <div className="flex items-center justify-between gap-1 text-[11px] font-mono text-muted">
                              <span>
                                {slot.startTime}–{slot.endTime}
                              </span>
                              {isNext && (
                                <span className="rounded-full bg-solid px-2 py-0.5 text-[10px] font-medium text-on-solid">
                                  Next
                                </span>
                              )}
                            </div>
                            <p className="mt-1 font-semibold leading-snug text-ink text-xs line-clamp-2">
                              {course.name}
                            </p>
                            <div className="mt-auto flex items-center justify-between gap-1 pt-1.5 text-[10px] text-muted">
                              <span className="flex items-center gap-1">
                                <span
                                  className={`size-1.5 rounded-full ${
                                    typeDot[classType] || "bg-ink"
                                  }`}
                                />
                                <span className="font-mono">{slotCode}</span>
                                <span>·</span>
                                <span>{classType}</span>
                              </span>
                              <span className="truncate text-muted/70 font-mono">
                                {course.code}
                              </span>
                            </div>
                          </button>
                        </div>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* MOBILE / TABLET TIMELINE VIEW (Modeled directly after portal_ui TimetableView) */}
          <div className="lg:hidden space-y-4">
            {/* Day Selector Pills */}
            <div className="grid grid-cols-5 gap-1 rounded-2xl border border-line bg-surface p-1">
              {DAYS.map((d, i) => {
                const active = mobileDay === i;
                const isToday = i === todayIndex;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setMobileDay(i)}
                    className={`rounded-xl py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                      active ? "bg-solid text-on-solid" : "text-muted hover:text-ink"
                    }`}
                  >
                    <span>{d.slice(0, 3)}</span>
                    {isToday && (
                      <span
                        className={`mx-auto mt-1 block size-1 rounded-full ${
                          active ? "bg-on-solid" : "bg-ink"
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Sessions list for selected day */}
            <ol className="space-y-3">
              {PERIOD_SLOTS.map((slot, rowIndex) => {
                const selectedDayName = DAYS[mobileDay];
                const slotCode = timetable.schedule[selectedDayName]?.[rowIndex];
                const course = resolveSlotCourse(timetable, slotCode);
                const isNext = isPeriodNow(mobileDay, slot);

                if (slot.id === "LUNCH") {
                  return (
                    <li
                      key={slot.id}
                      className="flex items-center gap-3 py-2 text-[11px] tracking-widest text-muted uppercase font-mono"
                    >
                      <span className="font-mono text-xs normal-case">{slot.startTime}</span>
                      <span className="h-px flex-1 bg-line" />
                      <span>Lunch break (13:00–14:00)</span>
                      <span className="h-px flex-1 bg-line" />
                    </li>
                  );
                }

                if (slot.isBreak) {
                  return null; // Skip small tea breaks in mobile list for conciseness
                }

                if (!slotCode || !course) {
                  return null;
                }

                const classType = course.type || "Lecture";

                return (
                  <li key={slot.id} className="grid grid-cols-[52px_1fr] gap-3">
                    <span className="pt-3 font-mono text-xs text-muted">
                      {slot.startTime}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedCourse({
                          course,
                          slotCode,
                          day: selectedDayName,
                          period: slot,
                        })
                      }
                      className={`flex flex-col rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
                        typeStyle[classType] || typeStyle.Lecture
                      } ${isNext ? "ring-2 ring-ink shadow-sm" : ""}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[11px] text-muted">
                          {slot.startTime} – {slot.endTime}
                        </span>
                        {isNext && (
                          <span className="rounded-full bg-solid px-2 py-0.5 text-[10px] font-medium text-on-solid">
                            Next
                          </span>
                        )}
                      </div>
                      <p className="mt-1.5 font-medium leading-snug text-ink text-sm">
                        {course.name}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                        <span className="flex items-center gap-1.5">
                          <span
                            className={`size-1.5 rounded-full ${
                              typeDot[classType] || "bg-ink"
                            }`}
                          />
                          <span>{classType}</span>
                          <span>·</span>
                          <span className="font-mono">{slotCode}</span>
                        </span>
                        <span className="text-muted/80">{course.facultyName}</span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ol>

            <p className="mt-6 flex items-center gap-2 text-xs text-muted font-mono">
              <MapPin className="size-3.5" /> All lecture halls & laboratories are in the Academic Block.
            </p>
          </div>
        </div>
      )}

      {/* Course Details Modal */}
      {selectedCourse && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className="drawer-fade absolute inset-0 bg-black/60 backdrop-blur-[2px] cursor-pointer"
            onClick={() => setSelectedCourse(null)}
            aria-label="Close"
          />

          <div className="view-enter relative z-10 w-full max-w-lg rounded-2xl border border-line bg-paper p-6 sm:p-8 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="font-mono text-xs text-muted">
                  {selectedCourse.course.code} · {selectedCourse.course.credits} Credits · Slot {selectedCourse.slotCode}
                </span>
                <h3 className="mt-2 font-serif text-3xl leading-tight text-ink">
                  {selectedCourse.course.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCourse(null)}
                className="grid size-9 shrink-0 place-items-center rounded-full border border-line text-muted hover:text-ink hover:bg-raised transition-colors cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div className="card p-4 space-y-3">
                <div className="flex items-center justify-between text-xs text-muted">
                  <span>Schedule Slot</span>
                  <span className="font-mono text-ink font-semibold">
                    {selectedCourse.day} · {selectedCourse.period.startTime} – {selectedCourse.period.endTime}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted border-t border-line/60 pt-2">
                  <span>Course Type</span>
                  <span className="font-medium text-ink">
                    {selectedCourse.course.type || "Theory / Lecture"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted border-t border-line/60 pt-2">
                  <span>Room / Hall</span>
                  <span className="font-mono text-ink">
                    {selectedCourse.course.type === "Lab" ? "Computer Lab 1 / ECE Lab" : "Lecture Hall 102"}
                  </span>
                </div>
              </div>

              {/* Faculty Contact Card */}
              <div className="card p-4 space-y-3">
                <p className="text-xs font-mono uppercase tracking-wider text-muted">
                  Course Instructor
                </p>
                <p className="font-medium text-ink text-sm">
                  {selectedCourse.course.facultyName}
                </p>
                <div className="flex flex-col gap-2 pt-1 font-mono text-xs">
                  <a
                    href={`mailto:${selectedCourse.course.facultyEmail}`}
                    className="flex items-center gap-2 text-safe hover:underline truncate"
                  >
                    <Mail className="size-3.5 shrink-0" />
                    <span className="truncate">{selectedCourse.course.facultyEmail}</span>
                  </a>
                  {selectedCourse.course.facultyPhone && (
                    <a
                      href={`tel:${selectedCourse.course.facultyPhone}`}
                      className="flex items-center gap-2 text-muted hover:text-ink"
                    >
                      <Phone className="size-3.5 shrink-0" />
                      <span>{selectedCourse.course.facultyPhone}</span>
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-line flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedCourse(null)}
                className="rounded-full bg-solid px-5 py-2 text-xs font-medium text-on-solid hover:opacity-90 cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
