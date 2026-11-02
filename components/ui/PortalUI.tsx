"use client";

import React, { ReactNode } from "react";

export function Percent({ value, className = "" }: { value: number; className?: string }) {
  if (isNaN(value) || value == null) {
    return <span className={`font-serif leading-none tracking-tight ${className}`}>—</span>;
  }
  const [whole, decimal] = value.toFixed(1).split(".");
  return (
    <span className={`font-serif leading-none tracking-tight ${className}`}>
      {whole}
      <span className="text-[0.5em] tracking-normal">.{decimal}%</span>
    </span>
  );
}

export function AttendanceBar({
  value,
  threshold = 75,
  className = "",
}: {
  value: number;
  threshold?: number;
  className?: string;
}) {
  const safe = value >= threshold;
  return (
    <div className={`relative h-1.5 w-full rounded-full bg-line ${className}`}>
      <div
        className={`h-full rounded-full transition-all duration-300 ${safe ? "bg-safe" : "bg-risk"}`}
        style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
      />
      <div
        className="absolute -top-1 -bottom-1 w-0.5 rounded-full bg-ink z-10"
        style={{ left: `${threshold}%` }}
        title={`${threshold}% requirement`}
      />
    </div>
  );
}

export function StatusPill({ safe }: { safe: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
        safe ? "bg-safe-soft text-safe" : "bg-risk-soft text-risk"
      }`}
    >
      <span className={`size-1.5 rounded-full ${safe ? "bg-safe" : "bg-risk"}`} />
      {safe ? "On track" : "At risk"}
    </span>
  );
}

export function PageHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <p className="text-sm text-muted">{eyebrow}</p>
        <h1 className="mt-1 font-serif text-4xl leading-tight tracking-tight text-ink sm:text-5xl">
          {title}
        </h1>
      </div>
      {children}
    </div>
  );
}
