"use client";

import React, { useState, useEffect, useMemo } from "react";
import type { TimetableSlot, DayOfWeek, StudentSummary } from "@/lib/api/types";
import { getStudentTimetable } from "@/lib/api/client";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  RotateCcw,
  Sparkles,
  ChevronRight,
} from "lucide-react";

const DAYS: DayOfWeek[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

interface StudentTimetableViewProps {
  idToken?: string;
  summaries?: StudentSummary[];
  onSelectCourse?: (summary: StudentSummary) => void;
}

export function StudentTimetableView({
  idToken,
  summaries = [],
  onSelectCourse,
}: StudentTimetableViewProps) {
  // Determine current day in Asia/Kolkata
  const todayDayName = useMemo(() => {
    try {
      const day = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Kolkata",
        weekday: "long",
      }).format(new Date());
      return DAYS.includes(day as DayOfWeek) ? (day as DayOfWeek) : "Monday";
    } catch {
      return "Monday";
    }
  }, []);

  const [activeDay, setActiveDay] = useState<DayOfWeek>(todayDayName);
  const [timetable, setTimetable] = useState<TimetableSlot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    (async () => {
      const res = await getStudentTimetable(idToken);
      if (!active) return;
      if (res.data) {
        setTimetable(res.data);
      }
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [idToken]);

  const slotsForDay = useMemo(() => {
    return timetable
      .filter((slot) => slot.dayOfWeek === activeDay)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [timetable, activeDay]);

  return (
    <div className="space-y-6">
      {/* Timetable Header & Day Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line/60 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-accent flex items-center gap-1.5">
              <Calendar className="size-3.5" />
              <span>Campus Timetable</span>
            </span>
            <span className="text-muted/40">•</span>
            <Badge variant="neutral" size="sm" className="text-[10px]">
              Asia/Kolkata Wall-Clock
            </Badge>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">
            Weekly Class Schedule
          </h2>
          <p className="mt-0.5 text-xs text-muted">
            Presnt-synced timetable slots for Semester 1 (2026 Batch)
          </p>
        </div>

        {/* Day Selector Pills */}
        <div className="flex items-center gap-1 bg-surface p-1 rounded-[2px] border border-line text-xs overflow-x-auto self-start sm:self-auto font-mono">
          {DAYS.map((day) => {
            const isToday = day === todayDayName;
            const count = timetable.filter((s) => s.dayOfWeek === day).length;
            const isSelected = activeDay === day;

            return (
              <button
                key={day}
                type="button"
                onClick={() => setActiveDay(day)}
                className={`px-3 py-1.5 rounded-[2px] font-bold uppercase transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-[#283226] text-accent border border-accent/40 shadow-xs"
                    : "text-muted hover:text-ink"
                }`}
              >
                <span>{day.slice(0, 3)}</span>
                {isToday && (
                  <span className="size-1.5 rounded-full bg-accent animate-pulse" title="Today" />
                )}
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-[2px] ${
                    isSelected ? "bg-accent/20 text-accent font-bold" : "bg-canvas text-muted"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Slots List */}
      {loading ? (
        <div className="p-12 text-center text-muted text-xs flex items-center justify-center gap-2">
          <RotateCcw className="size-4 animate-spin text-accent" />
          <span>Loading weekly schedule...</span>
        </div>
      ) : slotsForDay.length === 0 ? (
        <div className="p-10 text-center rounded-2xl border border-dashed border-line bg-surface/30">
          <Calendar className="size-8 text-muted mx-auto mb-2 opacity-50" />
          <h4 className="text-sm font-semibold text-ink">No Classes Scheduled</h4>
          <p className="mt-1 text-xs text-muted">
            There are no lecture or lab periods assigned for {activeDay}. Enjoy your academic preparation time!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {slotsForDay.map((slot) => {
            // Find linked course summary to show attendance preview
            const linkedSummary = summaries.find(
              (s) => s.offeringId === slot.offeringId || s.courseCode === slot.courseCode
            );

            return (
              <Card
                key={slot.id}
                className="transition-all duration-200 hover:border-line/90 hover:shadow-md"
              >
                <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start sm:items-center gap-4 min-w-0">
                    {/* Time slot badge */}
                    <div className="size-13 sm:size-15 rounded-[2px] bg-canvas border border-line flex flex-col items-center justify-center text-center shrink-0 font-mono">
                      <Clock className="size-3.5 text-accent mb-0.5" />
                      <span className="text-xs font-bold text-ink leading-tight">
                        {slot.startTime}
                      </span>
                      <span className="text-[9px] text-muted">{slot.endTime}</span>
                    </div>

                    {/* Details */}
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-bold text-accent px-2 py-0.5 rounded-[2px] bg-canvas border border-line">
                          {slot.courseCode}
                        </span>
                        <Badge
                          variant={slot.type === "Lab" ? "indigo" : slot.type === "Tutorial" ? "neutral" : "preview"}
                          size="sm"
                        >
                          {slot.type}
                        </Badge>
                        <span className="text-xs text-muted flex items-center gap-1">
                          <MapPin className="size-3 text-muted/70" />
                          <strong className="text-ink font-semibold">{slot.room}</strong>
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-ink truncate">
                        {slot.courseTitle}
                      </h3>

                      <div className="flex items-center gap-2 text-xs text-muted flex-wrap">
                        <span className="flex items-center gap-1">
                          <User className="size-3 text-muted/70" />
                          <span>{slot.facultyName}</span>
                        </span>
                        {linkedSummary && (
                          <>
                            <span className="text-muted/40">•</span>
                            <span className="flex items-center gap-1">
                              <Sparkles className="size-3 text-accent" />
                              <span>
                                Attendance:{" "}
                                <strong
                                  className={`font-semibold ${
                                    linkedSummary.status === "shortfall" ? "text-risk" : "text-accent"
                                  }`}
                                >
                                  {linkedSummary.percentage != null
                                    ? `${linkedSummary.percentage.toFixed(0)}%`
                                    : "Pending"}
                                </strong>{" "}
                                ({linkedSummary.attended}/{linkedSummary.total})
                              </span>
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action */}
                  {linkedSummary && onSelectCourse && (
                    <div className="self-end md:self-auto shrink-0">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onSelectCourse(linkedSummary)}
                        className="gap-1.5 text-xs"
                      >
                        <span>Subject Details</span>
                        <ChevronRight className="size-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
