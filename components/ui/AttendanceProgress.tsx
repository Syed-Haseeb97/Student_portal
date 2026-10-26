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
    ? "text-accent"
    : "text-risk";

  const strokeColor = isNoData
    ? "#4b5563"
    : isCompliant
    ? "#2dd4bf"
    : "#fb7185";

  if (variant === "linear") {
    const fillPercent = percentage !== null ? Math.min(100, Math.max(0, percentage)) : 0;
    return (
      <div className={`w-full space-y-1.5 ${className}`}>
        {showLabel && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted flex items-center gap-1.5">
              <span>Attendance</span>
              {showMarkerBadge && (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-surface border border-line text-muted/80">
                  Target: {thresholdPercent}%
                </span>
              )}
            </span>
            <span className={`font-semibold tabular-nums ${colorClass}`}>
              {formatPercent(percentage)}
            </span>
          </div>
        )}
        <div
          role="progressbar"
          aria-valuenow={percentage ?? 0}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Attendance progress: ${formatPercent(percentage)}`}
          className="relative h-2 w-full overflow-hidden rounded-full bg-raised border border-line/60"
        >
          <div
            className={`h-full transition-all duration-300 rounded-full ${
              isNoData
                ? "bg-muted/30"
                : isCompliant
                ? "bg-accent shadow-[0_0_8px_rgba(45,212,191,0.3)]"
                : "bg-risk shadow-[0_0_8px_rgba(251,113,133,0.3)]"
            }`}
            style={{ width: `${fillPercent}%` }}
          />
          {/* 75% Threshold Marker Notch */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-ink/50 z-10"
            style={{ left: `${thresholdPercent}%` }}
            title={`Required threshold: ${thresholdPercent}%`}
          />
        </div>
      </div>
    );
  }

  // Circular gauge variant
  const dimensions = {
    sm: { size: 52, strokeWidth: 4, textSize: "text-[11px] font-semibold" },
    md: { size: 76, strokeWidth: 5.5, textSize: "text-sm font-bold" },
    lg: { size: 100, strokeWidth: 7, textSize: "text-lg font-bold" },
  };

  const { size: dim, strokeWidth, textSize } = dimensions[size];
  const radius = (dim - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    percentage !== null
      ? circumference - (percentage / 100) * circumference
      : circumference;

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${className}`}
      role="progressbar"
      aria-valuenow={percentage ?? 0}
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
          stroke="#1e222d"
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
