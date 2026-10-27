"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { calculateGuidance } from "@/lib/attendance/calc";
import { Sparkles, TrendingUp, TrendingDown, Info, BookOpen } from "lucide-react";

export interface AttendanceCalculatorCourse {
  courseCode?: string | null;
  courseTitle: string;
  attended: number;
  total: number;
  percentage?: number | null;
}

interface AttendanceCalculatorWidgetProps {
  initialAttended?: number;
  initialTotal?: number;
  courses?: AttendanceCalculatorCourse[];
}

export function AttendanceCalculatorWidget({
  initialAttended = 14,
  initialTotal = 20,
  courses,
}: AttendanceCalculatorWidgetProps) {
  const [attended, setAttended] = useState<number>(initialAttended);
  const [total, setTotal] = useState<number>(initialTotal);
  const [selectedCourseTitle, setSelectedCourseTitle] = useState<string | null>(null);

  const safeTotal = Math.max(1, total);
  const safeAttended = Math.max(0, Math.min(attended, safeTotal));
  const percentage = Math.round((safeAttended / safeTotal) * 1000) / 10;
  const isCompliant = percentage >= 75;
  const guidance = calculateGuidance(safeAttended, safeTotal, 75);

  const applyPreset = (presetAttended: number, presetTotal: number) => {
    setSelectedCourseTitle(null);
    setAttended(presetAttended);
    setTotal(presetTotal);
  };

  const selectCourse = (course: AttendanceCalculatorCourse) => {
    setSelectedCourseTitle(course.courseTitle);
    setAttended(course.attended);
    setTotal(course.total);
  };

  return (
    <div id="calculator" className="glass-panel p-5 sm:p-6 rounded-[3px] border border-line relative overflow-hidden transition-all">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-line">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-accent flex items-center gap-1.5">
              <Sparkles className="size-3" />
              <span>Ordinance Margin Engine</span>
            </span>
            <span className="text-muted/40">•</span>
            <span className="text-[10px] font-mono text-muted uppercase">75% Independent Subject Rule</span>
          </div>
          <h3 className="text-lg sm:text-xl font-bold tracking-tight text-ink uppercase">
            75% Bunk Margin & Eligibility Calculator
          </h3>
        </div>

        <Badge variant={isCompliant ? "compliant" : "shortfall"} size="sm" className="self-start sm:self-auto font-bold font-mono">
          {isCompliant ? "Compliant (≥ 75%)" : "Debar Shortfall (< 75%)"}
        </Badge>
      </div>

      <div className="mt-4 space-y-4">
        {/* Enrolled Courses Quick Selector (if courses provided in dashboard) */}
        {courses && courses.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[11px] font-mono font-bold uppercase text-muted flex items-center gap-1.5">
              <BookOpen className="size-3.5 text-accent" />
              <span>Load your registered subjects:</span>
            </span>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              {courses.map((c) => {
                const isSelected = selectedCourseTitle === c.courseTitle;
                const isCourseSafe = c.total > 0 && (c.attended / c.total) >= 0.75;
                return (
                  <button
                    key={c.courseTitle}
                    type="button"
                    onClick={() => selectCourse(c)}
                    className={`px-2.5 py-1.5 rounded-[2px] border text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                      isSelected
                        ? "bg-[#d9fa58]/15 border-accent text-accent shadow-xs"
                        : "bg-canvas hover:bg-raised border-line text-muted hover:text-ink"
                    }`}
                  >
                    <span>{c.courseCode || c.courseTitle.slice(0, 15)}</span>
                    <span className={`font-mono text-[10px] ${isCourseSafe ? "text-accent" : "text-risk"}`}>
                      {c.attended}/{c.total}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick Presets */}
        <div className="flex items-center gap-2 overflow-x-auto text-xs">
          <span className="text-[10px] font-mono uppercase text-muted font-bold whitespace-nowrap">Presets:</span>
          <button
            type="button"
            onClick={() => applyPreset(18, 20)}
            className="px-2.5 py-1 rounded-[2px] bg-canvas hover:bg-raised border border-line text-ink transition-colors cursor-pointer text-[11px] font-mono"
          >
            Safe (18/20 · 90%)
          </button>
          <button
            type="button"
            onClick={() => applyPreset(15, 20)}
            className="px-2.5 py-1 rounded-[2px] bg-canvas hover:bg-raised border border-line text-ink transition-colors cursor-pointer text-[11px] font-mono"
          >
            Boundary (15/20 · 75%)
          </button>
          <button
            type="button"
            onClick={() => applyPreset(13, 20)}
            className="px-2.5 py-1 rounded-[2px] bg-canvas hover:bg-raised border border-line text-ink transition-colors cursor-pointer text-[11px] font-mono"
          >
            Shortfall (13/20 · 65%)
          </button>
        </div>

        {/* Inputs & Sliders */}
        <div className="grid gap-3 sm:grid-cols-2">
          {/* Attended Classes */}
          <div className="p-3.5 rounded-[3px] bg-canvas border border-line space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="classes-attended" className="text-[11px] font-mono uppercase font-bold text-muted">
                Classes Attended
              </label>
              <span className="font-mono font-black text-accent text-sm">{safeAttended}</span>
            </div>
            <input
              id="classes-attended"
              type="range"
              min="0"
              max={safeTotal}
              value={safeAttended}
              onChange={(e) => {
                setSelectedCourseTitle(null);
                setAttended(parseInt(e.target.value) || 0);
              }}
              className="w-full accent-[#d9fa58] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-muted font-mono">
              <span>0</span>
              <span>{safeTotal} classes</span>
            </div>
          </div>

          {/* Total Classes */}
          <div className="p-3.5 rounded-[3px] bg-canvas border border-line space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="total-conducted" className="text-[11px] font-mono uppercase font-bold text-muted">
                Total Conducted
              </label>
              <span className="font-mono font-black text-ink text-sm">{safeTotal}</span>
            </div>
            <input
              id="total-conducted"
              type="range"
              min="1"
              max="60"
              value={safeTotal}
              onChange={(e) => {
                setSelectedCourseTitle(null);
                setTotal(parseInt(e.target.value) || 1);
              }}
              className="w-full accent-[#819a35] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-muted font-mono">
              <span>1</span>
              <span>60 classes</span>
            </div>
          </div>
        </div>

        {/* Visual Progress Bar with 75% Threshold Marker */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted font-mono text-[11px] uppercase font-bold">
              {selectedCourseTitle ? `Attendance: ${selectedCourseTitle}` : "Semester Attendance Meter"}
            </span>
            <div className="flex items-center gap-1 font-mono font-bold text-sm">
              <span className={isCompliant ? "text-accent" : "text-risk"}>
                {percentage.toFixed(1)}%
              </span>
              <span className="text-muted/60 text-xs font-normal">/ 100%</span>
            </div>
          </div>

          <div className="relative h-2.5 w-full rounded-[2px] bg-canvas border border-line overflow-hidden">
            <div
              className={`h-full rounded-[2px] transition-all duration-300 ${
                isCompliant ? "bg-[#d9fa58]" : "bg-rose-500"
              }`}
              style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
            />
            {/* 75% Requirement Pin */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white z-10"
              style={{ left: "75%" }}
              title="75% Statutory Threshold"
            />
          </div>
          <div className="flex justify-between text-[10px] font-mono text-muted">
            <span>0%</span>
            <span className="text-white font-bold">75% Mandatory Cut-off</span>
            <span>100%</span>
          </div>
        </div>

        {/* Dynamic Calculation Result Box */}
        <div
          className={`p-4 rounded-[3px] border transition-all ${
            isCompliant
              ? "bg-[#d9fa58]/10 border-accent/35"
              : "bg-risk/10 border-risk/35"
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`size-9 rounded-[2px] grid place-items-center shrink-0 ${
                isCompliant ? "bg-accent/20 text-accent" : "bg-risk/20 text-risk"
              }`}
            >
              {isCompliant ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
            </div>

            <div className="space-y-1 min-w-0">
              <h4 className="text-sm font-bold text-ink uppercase tracking-tight">
                {isCompliant ? (
                  guidance.sessionsCanMiss > 0 ? (
                    <span className="text-accent font-mono">
                      Safe Bunk Margin: {guidance.sessionsCanMiss} {guidance.sessionsCanMiss === 1 ? "Class" : "Classes"}
                    </span>
                  ) : (
                    <span className="text-accent font-mono">Boundary Status: Exactly at 75%</span>
                  )
                ) : (
                  <span className="text-risk font-mono">
                    Debar Risk! Required: Attend next {guidance.sessionsToRecover} {guidance.sessionsToRecover === 1 ? "Class" : "Classes"}
                  </span>
                )}
              </h4>

              <p className="text-xs text-muted leading-relaxed">
                {isCompliant ? (
                  guidance.sessionsCanMiss > 0 ? (
                    <>
                      You can safely skip up to <strong className="text-white">{guidance.sessionsCanMiss}</strong> upcoming sessions for this subject while maintaining your examination eligibility above 75%.
                    </>
                  ) : (
                    <>
                      You are right on the 75% threshold boundary. Any single absence will immediately trigger examination shortfall.
                    </>
                  )
                ) : (
                  <>
                    To regain examination eligibility, you must attend the next <strong className="text-white">{guidance.sessionsToRecover}</strong> consecutive lectures without a single absence.
                  </>
                )}
              </p>

              <div className="pt-1.5 text-[10px] font-mono text-muted/80 flex items-center gap-1.5">
                <Info className="size-3 text-accent shrink-0" />
                <span>Statutory Rule: A surplus in one subject cannot offset a shortfall in another.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
