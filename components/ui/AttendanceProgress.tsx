import React from "react";
import { formatPercent } from "@/lib/attendance/calc";

export interface AttendanceProgressProps {
  attended: number;
  total: number;
  percentage?: number | null; // Authoritative percentage from backend or calculation
  thresholdPercent?: number; // default 75
  variant?: "circular" | "linear";
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  showMarkerBadge?: boolean;
  className?: string;
}

export function AttendanceProgress({
  attended,
  total,
  percentage: propPercentage,
  thresholdPercent = 75,
  variant = "circular",
  size = "md",
  showLabel = true,
  showMarkerBadge = false,
  className = "",
}: AttendanceProgressProps) {
  const hasData = total > 0;
  // Use authoritative percentage if provided, otherwise compute if total > 0
  const percentage =
    propPercentage !== undefined
      ? propPercentage
      : hasData
      ? (attended / total) * 100
      : null;

  const isCompliant = percentage !== null && percentage >= thresholdPercent;
  const isNoData = !hasData || percentage === null;

  const colorClass = isNoData
    ? "text-muted"
    : isCompliant
    ? "text-[#d9fa58] font-bold font-mono"
    : "text-rose-400 font-bold font-mono";

  const strokeColor = isNoData
    ? "#3a4537"
    : isCompliant
    ? "#d9fa58"
    : "#ef4444";

  if (variant === "linear") {
    const fillPercent = percentage !== null ? Math.min(100, Math.max(0, percentage)) : 0;
    return (
      <div className={`w-full space-y-1.5 ${className}`}>
        {showLabel && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted flex items-center gap-1.5 font-mono text-[11px]">
              <span>Attendance</span>
              {showMarkerBadge && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-canvas border border-line text-muted">
                  Target: {thresholdPercent}%
                </span>
              )}
            </span>
            <span className={`tabular-nums ${colorClass}`}>
              {formatPercent(percentage)}
            </span>
          </div>
        )}
        <div className="relative h-2 w-full rounded-full bg-canvas border border-line overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isNoData
                ? "bg-muted/40"
                : isCompliant
                ? "bg-[#d9fa58]"
                : "bg-rose-500"
            }`}
            style={{ width: `${fillPercent}%` }}
          />
          {/* Statutory Threshold Marker */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white z-10"
            style={{ left: `${thresholdPercent}%` }}
            title={`Required threshold: ${thresholdPercent}%`}
          />
        </div>
      </div>
    );
  }

  // Circular progress (gauge ring)
  const sizeMap = {
    sm: { dim: 56, radius: 22, strokeWidth: 4, textSize: "text-xs font-semibold" },
    md: { dim: 80, radius: 32, strokeWidth: 6, textSize: "text-sm font-bold" },
    lg: { dim: 110, radius: 44, strokeWidth: 8, textSize: "text-lg font-extrabold" },
  };

  const { dim, radius, strokeWidth, textSize } = sizeMap[size];
  const circumference = 2 * Math.PI * radius;
  const fillPercent = percentage !== null ? Math.min(100, Math.max(0, percentage)) : 0;
  const strokeDashoffset = circumference - (fillPercent / 100) * circumference;

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${className}`}
      role="progressbar"
      aria-valuenow={percentage !== null ? Math.round(percentage) : 0}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Attendance progress: ${formatPercent(percentage)}`}
    >
      <svg
        width={dim}
        height={dim}
        viewBox={`0 0 ${dim} ${dim}`}
        className="transform -rotate-90"
        aria-hidden="true"
      >
        {/* Background track circle */}
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={radius}
          stroke="#283226"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Animated progress arc */}
        {isNoData ? (
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={radius}
            stroke="#374151"
            strokeWidth={strokeWidth}
            strokeDasharray="4 4"
            fill="none"
          />
        ) : (
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={radius}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="none"
            className="transition-all duration-500 ease-out"
          />
        )}
      </svg>
      <div className={`absolute inset-0 flex flex-col items-center justify-center ${textSize} tabular-nums ${colorClass}`}>
        <span>{formatPercent(percentage)}</span>
      </div>
    </div>
  );
}
