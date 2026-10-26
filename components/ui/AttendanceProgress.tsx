import React from "react";
import { formatPercent } from "@/lib/attendance/calc";

export interface AttendanceProgressProps {
  attended: number;
  total: number;
  thresholdPercent?: number; // default 75
  variant?: "circular" | "linear";
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export function AttendanceProgress({
  attended,
  total,
  thresholdPercent = 75,
  variant = "circular",
  size = "md",
  showLabel = true,
  className = "",
}: AttendanceProgressProps) {
  const hasData = total > 0;
  const percentage = hasData ? (attended / total) * 100 : null;
  const isCompliant = percentage !== null && percentage >= thresholdPercent;

  const colorClass = !hasData
    ? "text-muted"
    : isCompliant
    ? "text-accent"
    : "text-risk";

  const strokeColor = !hasData
    ? "#8b91a3"
    : isCompliant
    ? "#2dd4bf"
    : "#fb7185";

  if (variant === "linear") {
    const fillPercent = Math.min(100, Math.max(0, percentage ?? 0));
    return (
      <div className={`w-full space-y-1.5 ${className}`}>
        {showLabel && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted">Attendance</span>
            <span className={`font-semibold ${colorClass}`}>
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
          className="relative h-2 w-full overflow-hidden rounded-full bg-line"
        >
          <div
            className={`h-full transition-all duration-300 rounded-full ${
              !hasData
                ? "bg-muted/40"
                : isCompliant
                ? "bg-accent"
                : "bg-risk"
            }`}
            style={{ width: `${fillPercent}%` }}
          />
          {/* 75% Threshold Marker Line */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-ink/40"
            style={{ left: `${thresholdPercent}%` }}
            title={`Required threshold: ${thresholdPercent}%`}
          />
        </div>
      </div>
    );
  }

  // Circular gauge variant
  const dimensions = {
    sm: { size: 48, strokeWidth: 4, textSize: "text-[11px]" },
    md: { size: 72, strokeWidth: 5.5, textSize: "text-sm font-semibold" },
    lg: { size: 96, strokeWidth: 7, textSize: "text-lg font-bold" },
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
      className={`relative inline-flex items-center justify-center ${className}`}
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
          stroke="#232734"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Animated progress arc */}
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
      </svg>
      <div className={`absolute inset-0 flex items-center justify-center ${textSize} ${colorClass}`}>
        {formatPercent(percentage)}
      </div>
    </div>
  );
}
