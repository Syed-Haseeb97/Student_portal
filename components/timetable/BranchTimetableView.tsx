"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  BRANCH_TIMETABLES,
  PERIOD_SLOTS,
  COLOR_THEMES,
  resolveSlotCourse,
  resolveBranchFromRollOrEmail,
  type DayOfWeek,
  type CourseDetail,
  type BranchTimetable,
} from "@/lib/timetable/first-year-data";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  Calendar,
  Clock,
  User,
  Mail,
  Phone,
  Sparkles,
  BookOpen,
  X,
  ExternalLink,
  ChevronRight,
  LayoutGrid,
  ListFilter,
  CheckCircle2,
} from "lucide-react";

interface BranchTimetableViewProps {
  userRollOrEmail?: string;
  defaultBranch?: "11" | "12" | "13" | "14";
  className?: string;
  allowBranchSwitching?: boolean;
}

const DAYS: DayOfWeek[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export function BranchTimetableView({
  userRollOrEmail,
  defaultBranch,
  className = "",
  allowBranchSwitching = false,
}: BranchTimetableViewProps) {
  // Infer student's department branch
  const inferredBranch = useMemo(() => {
    if (defaultBranch) return defaultBranch;
    return resolveBranchFromRollOrEmail(userRollOrEmail);
  }, [defaultBranch, userRollOrEmail]);

  const [userSelectedBranch, setUserSelectedBranch] = useState<"11" | "12" | "13" | "14">(inferredBranch);
  const selectedBranch = allowBranchSwitching ? userSelectedBranch : inferredBranch;
  const [viewMode, setViewMode] = useState<"grid" | "day">(() => {
    if (typeof window !== "undefined" && window.innerWidth < 640) return "day";
    return "grid";
  });
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(() => {
    const dayIndex = new Date().getDay(); // 0 is Sunday, 1 is Monday ... 5 is Friday
    if (dayIndex >= 1 && dayIndex <= 5) {
      return DAYS[dayIndex - 1];
    }
    return "Monday";
  });
  const [activeCourseModal, setActiveCourseModal] = useState<{
    course: CourseDetail;
    slotCode: string;
    day: DayOfWeek;
    periodIndex: number;
  } | null>(null);

  const timetable: BranchTimetable = BRANCH_TIMETABLES[selectedBranch] || BRANCH_TIMETABLES["11"];

  // Determine current day of week to highlight
  const currentDayName = useMemo(() => {
    const dayIndex = new Date().getDay();
    if (dayIndex >= 1 && dayIndex <= 5) {
      return DAYS[dayIndex - 1];
    }
    return null;
  }, []);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header and Branch Selection */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-surface p-4 sm:p-5 rounded-2xl border border-line">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-accent/10 text-accent">
              <Calendar className="size-4" />
            </span>
            <h3 className="text-base sm:text-lg font-bold font-mono tracking-tight text-ink uppercase">
              1st Year Academic Timetable (2026–27)
            </h3>
            <Badge variant="neutral" size="sm" className="hidden sm:inline-flex text-[10px] font-mono border-accent/40 text-accent">
              Odd Semester I
            </Badge>
          </div>
          <p className="text-xs text-muted">
            Official slot timetable, faculty contacts, and laboratory sessions for B.Tech Semester I.
          </p>
        </div>

        {/* Branch Display: Enrolled Department or Switcher Tabs */}
        {allowBranchSwitching ? (
          <div className="flex flex-wrap items-center gap-1.5 bg-canvas p-1 rounded-xl border border-line">
            {(
              [
                ["11", "CSE Core", "11"],
                ["13", "CSE AI & DS", "13"],
                ["12", "ECE Core", "12"],
                ["14", "VLSI Design", "14"],
              ] as const
            ).map(([code, name, id]) => {
              const isSelected = selectedBranch === code;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setUserSelectedBranch(code)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all relative cursor-pointer ${
                    isSelected
                      ? "bg-[#283226] text-accent border border-accent/50 shadow-xs"
                      : "text-muted hover:text-ink hover:bg-surface"
                  }`}
                >
                  <span>{name}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center gap-2.5 bg-canvas px-4 py-2.5 rounded-xl border border-line font-mono text-xs">
            <span className="text-muted text-[11px] uppercase font-bold">Your Department:</span>
            <strong className="text-accent font-bold tracking-wide">{timetable.shortName}</strong>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/15 text-accent font-bold border border-accent/30">
              Branch Code {timetable.branchCode}
            </span>
          </div>
        )}
      </div>

      {/* View Options & Today Ticker Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <Badge variant="neutral" size="sm" className="font-mono text-[11px]">
            {timetable.shortName} · Code {timetable.branchCode}
          </Badge>
          {currentDayName && (
            <span className="text-xs text-muted font-mono flex items-center gap-1">
              <span>Today is</span>
              <strong className="text-accent underline underline-offset-2">{currentDayName}</strong>
            </span>
          )}
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-surface p-1 rounded-xl border border-line self-start sm:self-auto text-xs font-mono">
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={`flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-lg transition-all touch-manipulation cursor-pointer ${
              viewMode === "grid" ? "bg-raised text-ink font-bold shadow-xs border border-line" : "text-muted hover:text-ink"
            }`}
          >
            <LayoutGrid className="size-3.5" />
            <span>Weekly Grid</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("day")}
            className={`flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-lg transition-all touch-manipulation cursor-pointer ${
              viewMode === "day" ? "bg-raised text-ink font-bold shadow-xs border border-line" : "text-muted hover:text-ink"
            }`}
          >
            <ListFilter className="size-3.5" />
            <span>Day View</span>
          </button>
        </div>
      </div>

      {/* VIEW MODE 1: WEEKLY GRID */}
      {viewMode === "grid" && (
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface shadow-xs">
          <table className="w-full min-w-[900px] border-collapse text-left font-mono">
            {/* Table Header: Periods & Timings */}
            <thead>
              <tr className="border-b border-line bg-canvas/80 text-[11px] text-muted">
                <th className="py-3 px-4 w-28 font-bold uppercase tracking-wider text-ink sticky left-0 bg-canvas/90 backdrop-blur-xs z-10 border-r border-line">
                  Day / Period
                </th>
                {PERIOD_SLOTS.map((slot) => (
                  <th
                    key={slot.id}
                    className={`py-3 px-2 text-center border-r border-line/60 last:border-r-0 ${
                      slot.isBreak ? "bg-canvas/40 w-16 text-[10px]" : "w-32"
                    }`}
                  >
                    <div className="font-bold text-ink uppercase">{slot.label}</div>
                    <div className="text-[10px] text-muted/80">{slot.startTime}–{slot.endTime}</div>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Table Body: Days */}
            <tbody className="divide-y divide-line/60 text-xs">
              {DAYS.map((day) => {
                const daySlots = timetable.schedule[day];
                const isToday = currentDayName === day;

                return (
                  <tr
                    key={day}
                    className={`transition-colors ${
                      isToday ? "bg-accent/[0.03] hover:bg-accent/[0.06]" : "hover:bg-canvas/50"
                    }`}
                  >
                    {/* Day Column */}
                    <td className={`py-4 px-4 font-bold text-xs sticky left-0 z-10 border-r border-line ${
                      isToday ? "bg-surface text-accent" : "bg-surface text-ink"
                    }`}>
                      <div className="flex items-center gap-1.5">
                        <span>{day}</span>
                        {isToday && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent/20 text-accent font-bold">
                            TODAY
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Periods for this Day */}
                    {PERIOD_SLOTS.map((slot, periodIdx) => {
                      if (slot.isBreak) {
                        return (
                          <td
                            key={slot.id}
                            className="p-1 text-center border-r border-line/40 bg-canvas/30 text-muted/40 font-mono text-[9px] select-none writing-mode-vertical"
                          >
                            <span className="tracking-widest uppercase opacity-60">
                              {slot.id === "LUNCH" ? "LUNCH" : "TEA"}
                            </span>
                          </td>
                        );
                      }

                      const slotCode = daySlots[periodIdx];
                      if (!slotCode) {
                        return (
                          <td key={slot.id} className="p-2 border-r border-line/40 text-center">
                            <span className="text-muted/30 text-xs font-mono">—</span>
                          </td>
                        );
                      }

                      const course = resolveSlotCourse(timetable, slotCode);
                      const isLab = slotCode.length > 2 && (slotCode.startsWith("F") || slotCode.startsWith("G") || slotCode.startsWith("H") || slotCode.startsWith("D"));
                      const isNSS = slotCode.toUpperCase() === "NSS";

                      return (
                        <td key={slot.id} className="p-1.5 border-r border-line/40 align-top">
                          <button
                            type="button"
                            onClick={() => {
                              if (course) {
                                setActiveCourseModal({
                                  course,
                                  slotCode,
                                  day,
                                  periodIndex: periodIdx,
                                });
                              }
                            }}
                            className={`w-full h-full text-left p-2 rounded-xl border transition-all cursor-pointer group ${
                              course ? `${course.theme.bg} ${course.theme.border}` : "bg-canvas border-line"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                course ? `${course.theme.badgeBg} ${course.theme.badgeText}` : "bg-canvas text-ink"
                              }`}>
                                {slotCode}
                              </span>
                              {isLab && (
                                <span className="text-[9px] font-mono text-muted/80 uppercase">Lab</span>
                              )}
                              {isNSS && (
                                <span className="text-[9px] font-mono text-purple-300 uppercase">Act</span>
                              )}
                            </div>

                            <p className="mt-1 font-semibold text-[11px] leading-tight text-ink line-clamp-2">
                              {course ? course.name : slotCode}
                            </p>

                            {course && (
                              <p className="mt-1 text-[10px] text-muted truncate group-hover:text-ink">
                                {course.facultyName}
                              </p>
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* VIEW MODE 2: DAY-BY-DAY LIST */}
      {viewMode === "day" && (
        <div className="space-y-4">
          {/* Day selection tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {DAYS.map((d) => {
              const isToday = currentDayName === d;
              const isSel = selectedDay === d;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSelectedDay(d)}
                  className={`min-h-[40px] px-3.5 py-2 rounded-xl font-mono text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 touch-manipulation active:scale-[0.98] ${
                    isSel
                      ? "bg-accent text-canvas font-bold shadow-xs"
                      : "bg-surface border border-line text-muted hover:text-ink hover:bg-raised"
                  }`}
                >
                  <span className="hidden sm:inline">{d}</span>
                  <span className="sm:hidden">{d.slice(0, 3)}</span>
                  {isToday && (
                    <span className={`size-1.5 rounded-full ${isSel ? "bg-canvas" : "bg-accent"}`} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Cards for selected day */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {PERIOD_SLOTS.map((slot, periodIdx) => {
              if (slot.isBreak) {
                return (
                  <div
                    key={slot.id}
                    className="col-span-full py-2 px-4 rounded-xl border border-dashed border-line/60 bg-canvas/40 flex items-center justify-between text-xs font-mono text-muted"
                  >
                    <span className="flex items-center gap-2">
                      <Clock className="size-3.5" />
                      <strong>{slot.label}</strong>
                    </span>
                    <span>{slot.startTime} – {slot.endTime}</span>
                  </div>
                );
              }

              const slotCode = timetable.schedule[selectedDay][periodIdx];
              if (!slotCode) {
                return (
                  <div
                    key={slot.id}
                    className="p-3.5 rounded-xl border border-line bg-canvas/30 text-xs font-mono text-muted/50 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-muted/70">{slot.label}</span>
                      <p className="text-[10px]">{slot.startTime} – {slot.endTime}</p>
                    </div>
                    <span>No scheduled lecture</span>
                  </div>
                );
              }

              const course = resolveSlotCourse(timetable, slotCode);

              return (
                <Card
                  key={slot.id}
                  onClick={() => {
                    if (course) {
                      setActiveCourseModal({
                        course,
                        slotCode,
                        day: selectedDay,
                        periodIndex: periodIdx,
                      });
                    }
                  }}
                  className={`p-4 transition-all cursor-pointer hover:border-accent/50 ${
                    course ? `${course.theme.bg} ${course.theme.border}` : "bg-surface border-line"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-ink">{slot.label}</span>
                    <span className="text-[10px] text-muted">{slot.startTime}–{slot.endTime}</span>
                  </div>

                  <div className="mt-2.5 flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono ${
                      course ? `${course.theme.badgeBg} ${course.theme.badgeText}` : "bg-canvas text-ink"
                    }`}>
                      {slotCode}
                    </span>
                    {course?.code && (
                      <span className="text-[11px] font-mono text-muted font-bold">
                        {course.code}
                      </span>
                    )}
                  </div>

                  <h4 className="mt-2 text-sm font-bold text-ink line-clamp-2">
                    {course ? course.name : slotCode}
                  </h4>

                  {course && (
                    <div className="mt-3 pt-2.5 border-t border-line/60 flex items-center justify-between text-xs">
                      <span className="text-muted truncate">{course.facultyName}</span>
                      <ChevronRight className="size-3.5 text-muted shrink-0" />
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Master Course & Faculty Contacts Directory for This Branch */}
      <div className="rounded-2xl border border-line bg-surface p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line pb-3">
          <div>
            <h4 className="text-sm font-bold font-mono uppercase text-ink flex items-center gap-2">
              <BookOpen className="size-4 text-accent" />
              <span>{timetable.shortName} Course Faculty & Contacts</span>
            </h4>
            <p className="text-xs text-muted">
              Official faculty roster and designated slots for {timetable.branchName}.
            </p>
          </div>
          <Badge variant="neutral" size="sm" className="font-mono text-[10px] self-start sm:self-auto">
            {Object.keys(timetable.courses).length} Subjects
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {Object.entries(timetable.courses).map(([slotKey, course]) => (
            <div
              key={slotKey}
              className={`p-3.5 rounded-xl border text-xs space-y-2 transition-all ${course.theme.bg} ${course.theme.border}`}
            >
              <div className="flex items-center justify-between">
                <span className={`px-1.5 py-0.5 rounded font-mono font-bold text-[10px] ${course.theme.badgeBg} ${course.theme.badgeText}`}>
                  Slot {slotKey}
                </span>
                <span className="font-mono text-[10px] text-muted">
                  {course.code || "GIR"} · {course.credits} Credits
                </span>
              </div>

              <div>
                <p className="font-bold text-ink leading-snug line-clamp-2">{course.name}</p>
                <p className="mt-1 font-medium text-ink/80 text-[11px]">{course.facultyName}</p>
              </div>

              <div className="pt-2 border-t border-line/40 space-y-1 text-[10px] font-mono text-muted">
                <a
                  href={`mailto:${course.facultyEmail}`}
                  className="flex items-center gap-1.5 hover:text-accent truncate transition-colors"
                >
                  <Mail className="size-3 shrink-0" />
                  <span className="truncate">{course.facultyEmail}</span>
                </a>
                <a
                  href={`tel:${course.facultyPhone.replace(/\s+/g, "")}`}
                  className="flex items-center gap-1.5 hover:text-accent transition-colors"
                >
                  <Phone className="size-3 shrink-0" />
                  <span>{course.facultyPhone}</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Detail Modal on Cell Click */}
      {activeCourseModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setActiveCourseModal(null)}
        >
          <div
            className="w-full max-w-md bg-raised border border-line rounded-2xl p-6 shadow-2xl relative space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActiveCourseModal(null)}
              className="absolute top-4 right-4 min-w-[38px] min-h-[38px] flex items-center justify-center rounded-xl text-muted hover:text-ink hover:bg-canvas transition-colors touch-manipulation cursor-pointer"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>

            {/* Modal Header */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${activeCourseModal.course.theme.badgeBg} ${activeCourseModal.course.theme.badgeText}`}>
                  Slot {activeCourseModal.slotCode}
                </span>
                <Badge variant="neutral" size="sm" className="font-mono text-[10px]">
                  {activeCourseModal.course.code}
                </Badge>
                <Badge variant="neutral" size="sm" className="font-mono text-[10px] text-accent border-accent/40">
                  {activeCourseModal.course.credits} Credits
                </Badge>
              </div>
              <h3 className="text-lg font-bold text-ink">
                {activeCourseModal.course.name}
              </h3>
            </div>

            {/* Schedule Slot Details */}
            <div className="p-3 rounded-xl bg-canvas border border-line space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-muted">Day:</span>
                <span className="font-bold text-ink">{activeCourseModal.day}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">Period:</span>
                <span className="text-ink">
                  {PERIOD_SLOTS[activeCourseModal.periodIndex]?.label} (
                  {PERIOD_SLOTS[activeCourseModal.periodIndex]?.startTime} – {PERIOD_SLOTS[activeCourseModal.periodIndex]?.endTime})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">Course Type:</span>
                <span className="text-ink">{activeCourseModal.course.type}</span>
              </div>
            </div>

            {/* Faculty Details */}
            <div className="space-y-3 pt-2 border-t border-line">
              <h4 className="text-xs font-mono uppercase font-bold text-muted">
                Course Faculty Details
              </h4>

              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center text-accent">
                  <User className="size-5" />
                </div>
                <div>
                  <p className="font-bold text-ink text-sm">{activeCourseModal.course.facultyName}</p>
                  <p className="text-xs text-muted">Faculty Instructor · IIIT Tiruchirappalli</p>
                </div>
              </div>

              <div className="space-y-2 pt-1 font-mono text-xs">
                <a
                  href={`mailto:${activeCourseModal.course.facultyEmail}`}
                  className="flex items-center gap-2 p-2 rounded-lg bg-canvas hover:bg-surface border border-line text-ink hover:text-accent transition-colors"
                >
                  <Mail className="size-4 text-accent shrink-0" />
                  <span className="truncate">{activeCourseModal.course.facultyEmail}</span>
                  <ExternalLink className="size-3 text-muted ml-auto shrink-0" />
                </a>

                <a
                  href={`tel:${activeCourseModal.course.facultyPhone.replace(/\s+/g, "")}`}
                  className="flex items-center gap-2 p-2 rounded-lg bg-canvas hover:bg-surface border border-line text-ink hover:text-accent transition-colors"
                >
                  <Phone className="size-4 text-accent shrink-0" />
                  <span>{activeCourseModal.course.facultyPhone}</span>
                  <ExternalLink className="size-3 text-muted ml-auto shrink-0" />
                </a>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveCourseModal(null)}
              className="w-full py-2 rounded-xl bg-accent hover:bg-accent/90 text-canvas font-mono font-bold text-xs transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
