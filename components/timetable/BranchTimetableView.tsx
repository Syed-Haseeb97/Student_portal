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
} from "lucide-react";

interface BranchTimetableViewProps {
  userRollOrEmail?: string;
  defaultBranch?: "11" | "12" | "13" | "14";
  batch?: string;
  className?: string;
  allowBranchSwitching?: boolean;
}

const DAYS: DayOfWeek[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export {
  getCourseClassType,
  getCourseDisplayTitle,
  getSlotLabBatch,
  inferLabBatchFromRoll,
  getSlotBadge,
  getISTDateParts,
  type AcademicClassType,
} from "@/lib/timetable/schedule-resolver";

import {
  getCourseClassType,
  getCourseDisplayTitle,
  getSlotLabBatch,
  inferLabBatchFromRoll,
  getSlotBadge,
  getISTDateParts,
  type AcademicClassType,
} from "@/lib/timetable/schedule-resolver";

const typeStyle: Record<AcademicClassType, string> = {
  Lecture:
    "bg-surface border-[#78716c] dark:border-[#52604e] text-ink hover:border-ink dark:hover:border-white hover:shadow-lg hover:shadow-black/10 dark:hover:shadow-black/60",
  Lab:
    "bg-safe-soft border-safe dark:border-safe/80 text-ink hover:border-safe hover:bg-safe-soft hover:shadow-lg hover:shadow-safe/30 dark:hover:shadow-safe/25",
  Tutorial:
    "bg-warn-soft border-warn dark:border-warn/80 text-ink hover:border-warn hover:bg-warn-soft hover:shadow-lg hover:shadow-warn/30 dark:hover:shadow-warn/25",
  Activity:
    "bg-surface border-[#78716c] dark:border-[#52604e] text-ink hover:border-ink dark:hover:border-white hover:shadow-lg hover:shadow-black/10 dark:hover:shadow-black/60",
};

const typeDot: Record<AcademicClassType, string> = {
  Lecture: "bg-ink",
  Lab: "bg-safe",
  Tutorial: "bg-warn",
  Activity: "bg-muted",
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

  // Infer student's lab batch from roll number (e.g. 261161 -> Batch 3)
  const inferredLabBatch = useMemo(() => inferLabBatchFromRoll(userRollOrEmail), [userRollOrEmail]);
  const [selectedLabBatch, setSelectedLabBatch] = useState<"all" | "1" | "2" | "3">(inferredLabBatch || "all");

  useEffect(() => {
    setUserSelectedBranch(inferredBranch);
  }, [inferredBranch]);

  useEffect(() => {
    if (inferredLabBatch) {
      setSelectedLabBatch(inferredLabBatch);
    }
  }, [inferredLabBatch]);

  const selectedBranch = allowBranchSwitching ? userSelectedBranch : inferredBranch;
  const timetable: BranchTimetable = BRANCH_TIMETABLES[selectedBranch] || BRANCH_TIMETABLES["11"];

  // Today's day index (0 = Monday, 1 = Tuesday ... 4 = Friday) in IST
  const todayIndex = useMemo(() => {
    const { dayIndex } = getISTDateParts(new Date());
    if (dayIndex >= 1 && dayIndex <= 5) return dayIndex - 1;
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

  // Live ticking clock so the current active slot updates dynamically
  const [liveNow, setLiveNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setLiveNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const { dayIndex: istDayIndex, currentMinutes } = useMemo(
    () => getISTDateParts(liveNow),
    [liveNow]
  );
  const currentDayOfWeek = istDayIndex >= 1 && istDayIndex <= 5 ? istDayIndex - 1 : -1;

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
      <div className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
              Authoritative in-memory schedule · 0 database quota used · Instant sync
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

        {/* Lab Practical Batch Filter Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-line/60">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-muted">Physics Lab Batch:</span>
            <div className="flex items-center gap-1 rounded-xl border border-line bg-paper p-1">
              {(
                [
                  ["all", "All Batches"],
                  ["1", "Batch 1 (Roll 1–22)"],
                  ["2", "Batch 2 (Roll 23–45)"],
                  ["3", "Batch 3 (Roll 46+)"],
                ] as const
              ).map(([batchKey, label]) => {
                const active = selectedLabBatch === batchKey;
                const isAssigned = inferredLabBatch === batchKey;
                return (
                  <button
                    key={batchKey}
                    type="button"
                    onClick={() => setSelectedLabBatch(batchKey)}
                    className={`rounded-lg px-2.5 py-1 font-mono text-xs font-medium transition-colors cursor-pointer ${
                      active
                        ? "bg-solid text-on-solid shadow-xs"
                        : "text-muted hover:bg-surface hover:text-ink"
                    }`}
                  >
                    <span>{label}</span>
                    {isAssigned && (
                      <span className="ml-1.5 inline-block size-1.5 rounded-full bg-safe align-middle" />
                    )}
                  </button>
                );
              })}
            </div>
            <span className="font-mono text-[11px] text-muted hidden sm:inline">
              · Programming & Graphics labs are common to all batches
            </span>
          </div>
          {inferredLabBatch && (
            <span className="font-mono text-xs text-muted">
              Assigned: <strong className="text-ink">Batch {inferredLabBatch}</strong> based on roll {userRollOrEmail?.split("@")[0]}
            </span>
          )}
        </div>
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

      {/* Main Timetable View */}
      {(!isSeniorBatch || showReferenceTimetable) && (
        <div className="space-y-5">
          {/* Legend and Type Indicators */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
            <div className="flex flex-wrap items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-ink" /> Lecture
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-safe" /> Laboratory
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-warn" /> Tutorial
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-muted" /> Activity / NSS
              </span>
            </div>
            <span className="font-mono text-[11px] text-muted">
              Click any class card for instructor contact & room details
            </span>
          </div>

          {/* DESKTOP WEEK GRID: Precision Height & Zero-Clipping Layout */}
          <div className="card hidden overflow-x-auto p-4 lg:block shadow-xs border-[#8c8577] dark:border-[#364033] bg-paper/60">
            <div
              className="grid min-w-[960px] gap-2.5"
              style={{
                gridTemplateColumns: "68px repeat(5, minmax(0, 1fr))",
                gridTemplateRows:
                  "auto 124px 124px 38px 124px 124px 44px 124px 124px 38px 124px",
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
                    className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                      isToday
                        ? "bg-solid text-on-solid shadow-xs"
                        : "text-muted bg-surface border border-[#78716c] dark:border-white/20 hover:border-ink dark:hover:border-white"
                    }`}
                  >
                    <span className="font-semibold">{d}</span>
                    {isToday && (
                      <span className="ml-1.5 text-xs font-normal text-on-solid/70 font-mono">
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
                      className="flex items-center gap-3 font-mono text-[11px] tracking-wider uppercase text-muted"
                      style={{ gridColumn: "1 / -1", gridRow: gridRowNumber }}
                    >
                      <span className="w-16 text-right font-mono normal-case tracking-normal text-muted font-medium">
                        {slot.startTime}
                      </span>
                      <span className="h-px flex-1 bg-[#8c8577]/50 dark:bg-white/20" />
                      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface border border-[#78716c] dark:border-white/25 text-xs font-semibold text-ink shadow-xs transition-transform duration-200 hover:scale-105">
                        <Clock className="size-3.5 text-safe" /> Lunch Break · 13:00 – 14:00
                      </span>
                      <span className="h-px flex-1 bg-[#8c8577]/50 dark:bg-white/20" />
                    </div>
                  );
                }

                if (slot.isBreak) {
                  return (
                    <div
                      key={slot.id}
                      className="flex items-center gap-3 font-mono text-[11px] tracking-wider uppercase text-muted"
                      style={{ gridColumn: "1 / -1", gridRow: gridRowNumber }}
                    >
                      <span className="w-16 text-right font-mono normal-case tracking-normal text-muted/70 font-medium">
                        {slot.startTime}
                      </span>
                      <span className="h-px flex-1 bg-[#8c8577]/40 dark:bg-white/15" />
                      <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface border border-[#78716c] dark:border-white/20 text-[11px] text-muted transition-transform duration-200 hover:scale-105">
                        <Clock className="size-3 text-muted" /> Tea Break · {slot.startTime} – {slot.endTime}
                      </span>
                      <span className="h-px flex-1 bg-[#8c8577]/40 dark:bg-white/15" />
                    </div>
                  );
                }

                // Regular teaching period: render left time label + 5 day slots
                return (
                  <React.Fragment key={slot.id}>
                    {/* Column 1: Time label */}
                    <div
                      className="pt-3 pr-2 text-right font-mono text-xs text-muted"
                      style={{ gridColumn: 1, gridRow: gridRowNumber }}
                    >
                      <span className="font-semibold text-ink/80 block">{slot.startTime}</span>
                      <span className="text-[10px] text-muted/60 block">{slot.endTime}</span>
                    </div>

                    {/* Columns 2-6: Five days */}
                    {DAYS.map((day, dayIndex) => {
                      const slotCode = timetable.schedule[day]?.[rowIndex];
                      const course = resolveSlotCourse(timetable, slotCode);
                      const isNext = isPeriodNow(dayIndex, slot);

                      if (!slotCode || !course) {
                        return (
                          <div
                            key={`${day}-${slot.id}`}
                            className={`rounded-xl border border-dashed border-[#a8a295] dark:border-[#404c3c] transition-all duration-200 hover:border-[#78716c] dark:hover:border-white/30 hover:bg-surface/30 ${
                              dayIndex === todayIndex ? "bg-raised/40" : "bg-transparent"
                            }`}
                            style={{
                              gridColumn: dayIndex + 2,
                              gridRow: gridRowNumber,
                            }}
                          />
                        );
                      }

                      const classType = getCourseClassType(course);
                      const slotLabBatch = getSlotLabBatch(slotCode);
                      const isOtherBatch =
                        selectedLabBatch !== "all" &&
                        slotLabBatch !== null &&
                        slotLabBatch !== selectedLabBatch;
                      const displayTitle = getCourseDisplayTitle(course, slotCode);
                      const slotBadge = getSlotBadge(slotCode, classType);

                      if (isOtherBatch) {
                        return (
                          <div
                            key={`${day}-${slot.id}`}
                            className="z-10"
                            style={{
                              gridColumn: dayIndex + 2,
                              gridRow: gridRowNumber,
                            }}
                          >
                            <div className="flex h-full w-full flex-col justify-between rounded-xl border border-dashed border-[#8c8577] dark:border-[#4d5c48] bg-surface/60 p-3 text-left opacity-75 hover:opacity-100 hover:border-[#645e54] dark:hover:border-white/50 hover:-translate-y-1 hover:shadow-md transition-all duration-200 cursor-default transform-gpu will-change-transform">
                              <div className="flex items-center justify-between text-[11px] font-mono text-muted leading-none">
                                <span>
                                  {slot.startTime}–{slot.endTime}
                                </span>
                                <span className="rounded-full bg-paper border border-[#8c8577]/60 dark:border-white/20 px-1.5 py-0.5 text-[9px] font-mono font-medium text-muted">
                                  Physics Lab · Batch {slotLabBatch}
                                </span>
                              </div>
                              <div className="my-auto">
                                <p className="font-medium text-muted text-xs line-clamp-1">
                                  {displayTitle}
                                </p>
                                <p className="text-[10px] text-muted/80 font-mono mt-0.5">
                                  Free for Batch {selectedLabBatch} (Lab held on {slotLabBatch === "1" ? "Mon" : slotLabBatch === "2" ? "Tue" : "Fri"})
                                </p>
                              </div>
                              <div className="flex items-center justify-between text-[10px] font-mono text-muted/60 leading-none">
                                <span>Batch {slotLabBatch} Session</span>
                                <span>{course.code}</span>
                              </div>
                            </div>
                          </div>
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
                            className={`group relative flex h-full w-full flex-col overflow-hidden rounded-xl border p-3 text-left transition-all duration-200 ease-out cursor-pointer hover:-translate-y-1.5 hover:scale-[1.015] active:scale-[0.99] transform-gpu will-change-transform shadow-xs ${
                              typeStyle[classType]
                            } ${isNext ? "ring-2 ring-safe shadow-sm shadow-safe/30" : ""}`}
                          >
                            {/* Animated top sheen highlight on cursor hover */}
                            <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-linear-to-b from-white/10 dark:from-white/15 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

                            {/* Top row: Time range & Active Badge */}
                            <div className="relative z-10 flex items-center justify-between gap-1 text-[11px] font-mono text-muted group-hover:text-ink leading-none transition-colors duration-150">
                              <span className="font-medium">
                                {slot.startTime}–{slot.endTime}
                              </span>
                              {isNext && (
                                <span className="rounded-full bg-safe text-on-solid px-2 py-0.5 text-[10px] font-semibold shadow-xs animate-pulse">
                                  Now
                                </span>
                              )}
                            </div>

                            {/* Middle row: Clean Title with comfortable line height and NO letter clipping */}
                            <p className="relative z-10 mt-1 font-semibold leading-snug text-ink text-xs line-clamp-2 select-none group-hover:text-ink transition-colors duration-150">
                              {displayTitle}
                            </p>

                            {/* Bottom row: Type dot + Slot part badge + Course Code */}
                            <div className="relative z-10 mt-auto flex items-center justify-between gap-1 pt-2 text-[10px] text-muted leading-none">
                              <span className="flex items-center gap-1.5 truncate">
                                <span
                                  className={`size-1.5 rounded-full shrink-0 transition-transform duration-200 ease-out group-hover:scale-135 ${
                                    typeDot[classType]
                                  }`}
                                />
                                <span className="font-mono truncate font-medium group-hover:text-ink transition-colors duration-150">
                                  {slotBadge}
                                </span>
                              </span>
                              <span className="font-mono text-muted/80 shrink-0 font-medium group-hover:text-ink transition-colors duration-150">
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

          {/* MOBILE / TABLET TIMELINE VIEW */}
          <div className="lg:hidden space-y-4">
            {/* Day Selector Pills */}
            <div className="grid grid-cols-5 gap-1 rounded-2xl border border-line bg-surface p-1 shadow-xs">
              {DAYS.map((d, i) => {
                const active = mobileDay === i;
                const isToday = i === todayIndex;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setMobileDay(i)}
                    className={`rounded-xl py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                      active ? "bg-solid text-on-solid shadow-xs" : "text-muted hover:text-ink"
                    }`}
                  >
                    <span>{d.slice(0, 3)}</span>
                    {isToday && (
                      <span
                        className={`mx-auto mt-1 block size-1 rounded-full ${
                          active ? "bg-on-solid" : "bg-safe"
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
                  return null;
                }

                if (!slotCode || !course) {
                  return null;
                }

                const classType = getCourseClassType(course);
                const slotLabBatch = getSlotLabBatch(slotCode);
                const isOtherBatch =
                  selectedLabBatch !== "all" &&
                  slotLabBatch !== null &&
                  slotLabBatch !== selectedLabBatch;
                const displayTitle = getCourseDisplayTitle(course, slotCode);
                const slotBadge = getSlotBadge(slotCode, classType);

                if (isOtherBatch) {
                  return (
                    <li key={slot.id} className="grid grid-cols-[52px_1fr] gap-3">
                      <span className="pt-3 font-mono text-xs text-muted">
                        {slot.startTime}
                      </span>
                      <div className="flex flex-col rounded-xl border border-dashed border-[#8c8577] dark:border-[#4d5c48] bg-surface/60 p-3.5 text-left opacity-75 hover:opacity-100 hover:border-[#645e54] transition-all duration-200">
                        <div className="flex items-center justify-between text-xs font-mono text-muted">
                          <span>{slot.startTime} – {slot.endTime}</span>
                          <span className="rounded-full bg-paper border border-[#8c8577]/60 dark:border-white/20 px-2 py-0.5 text-[10px]">
                            Physics Lab · Batch {slotLabBatch}
                          </span>
                        </div>
                        <p className="mt-1 font-medium text-muted text-xs">
                          {displayTitle}
                        </p>
                        <p className="mt-1 text-[11px] text-muted/80 font-mono">
                          Free for Batch {selectedLabBatch} (Lab held on {slotLabBatch === "1" ? "Mon" : slotLabBatch === "2" ? "Tue" : "Fri"})
                        </p>
                      </div>
                    </li>
                  );
                }

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
                      className={`group relative flex flex-col overflow-hidden rounded-xl border p-4 text-left transition-all duration-200 ease-out cursor-pointer shadow-xs hover:-translate-y-1 hover:shadow-md transform-gpu will-change-transform ${
                        typeStyle[classType]
                      } ${isNext ? "ring-2 ring-safe shadow-sm shadow-safe/30" : ""}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[11px] text-muted group-hover:text-ink transition-colors duration-150">
                          {slot.startTime} – {slot.endTime}
                        </span>
                        {isNext && (
                          <span className="rounded-full bg-safe text-on-solid px-2 py-0.5 text-[10px] font-semibold animate-pulse">
                            Now
                          </span>
                        )}
                      </div>
                      <p className="mt-1.5 font-medium leading-snug text-ink text-sm group-hover:text-ink transition-colors duration-150">
                        {displayTitle}
                      </p>
                      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                        <span className="flex items-center gap-1.5">
                          <span
                            className={`size-1.5 rounded-full transition-transform duration-200 group-hover:scale-135 ${
                              typeDot[classType]
                            }`}
                          />
                          <span className="font-mono font-medium group-hover:text-ink transition-colors duration-150">{slotBadge}</span>
                        </span>
                        <span className="text-muted/80 font-mono text-[11px]">
                          {course.code} · {course.facultyName}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ol>

            <p className="mt-6 flex items-center gap-2 text-xs text-muted font-mono">
              <MapPin className="size-3.5 text-safe" /> All lecture halls & laboratories are located in the Central Academic Block.
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
                    {getCourseClassType(selectedCourse.course)} Session
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted border-t border-line/60 pt-2">
                  <span>Room / Hall</span>
                  <span className="font-mono text-ink">
                    {getCourseClassType(selectedCourse.course) === "Lab"
                      ? "Computer Lab 1 / ECE Lab (Central Academic Block)"
                      : "Smart Lecture Theatre (LH-101 / LH-102)"}
                  </span>
                </div>
              </div>

              {/* Faculty Contact Card */}
              <div className="card p-4 space-y-3">
                <p className="text-xs font-mono uppercase tracking-wider text-muted">
                  Course Faculty
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
                className="rounded-full bg-solid px-6 py-2 text-xs font-medium text-on-solid hover:opacity-90 cursor-pointer shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
