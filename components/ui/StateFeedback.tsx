import React from "react";
import { AlertCircle, Inbox, Loader2, RotateCcw } from "lucide-react";
import { Button } from "./Button";

export function Skeleton({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-raised/70 border border-line/40 ${className}`}
      {...props}
    />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-in fade-in duration-200" aria-label="Loading dashboard records">
      {/* Top Banner Skeleton */}
      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-surface/50 border border-line">
        <Skeleton className="h-5 w-44 rounded-full" />
        <Skeleton className="h-6 w-56 rounded-lg hidden sm:block" />
      </div>

      {/* Identity Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-line pb-6">
        <div className="space-y-2">
          <Skeleton className="h-4 w-36 rounded-md" />
          <Skeleton className="h-8 w-64 rounded-xl" />
          <Skeleton className="h-4 w-80 rounded-md" />
        </div>
        <Skeleton className="h-9 w-24 rounded-xl" />
      </div>

      {/* KPI Cards Skeleton */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="md:col-span-2 p-5 rounded-2xl bg-surface/60 border border-line space-y-3">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-32 rounded-md" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-6 w-48 rounded-lg" />
          <Skeleton className="h-4 w-full rounded-md" />
          <Skeleton className="h-4 w-3/4 rounded-md" />
        </div>
        <div className="p-5 rounded-2xl bg-surface/60 border border-line space-y-3">
          <Skeleton className="h-4 w-28 rounded-md" />
          <Skeleton className="h-10 w-16 rounded-xl" />
          <Skeleton className="h-3 w-32 rounded-md" />
        </div>
        <div className="p-5 rounded-2xl bg-surface/60 border border-line space-y-3">
          <Skeleton className="h-4 w-28 rounded-md" />
          <Skeleton className="h-10 w-16 rounded-xl" />
          <Skeleton className="h-3 w-32 rounded-md" />
        </div>
      </div>

      {/* Filter Tabs Skeleton */}
      <div className="flex justify-between items-center border-b border-line/60 pb-4">
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-48 rounded-lg" />
          <Skeleton className="h-3 w-32 rounded-md" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-8 w-28 rounded-lg" />
        </div>
      </div>

      {/* Subject Cards Grid Skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="p-5 rounded-2xl bg-surface/60 border border-line space-y-4"
          >
            <div className="flex justify-between items-start">
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-20 rounded-md" />
                <Skeleton className="h-5 w-40 rounded-lg" />
                <Skeleton className="h-3 w-24 rounded-md" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <div className="flex items-center gap-4 pt-1">
              <Skeleton className="size-18 rounded-full shrink-0" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-3.5 w-24 rounded-md" />
                <Skeleton className="h-3.5 w-28 rounded-md" />
                <Skeleton className="h-3 w-32 rounded-md" />
              </div>
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function LoadingState({
  title = "Loading data...",
  description = "Fetching the latest attendance and course records.",
  className = "",
}: {
  title?: string;
  description?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-line bg-surface/50 ${className}`}
    >
      <Loader2 className="size-8 text-accent animate-spin mb-3" aria-hidden="true" />
      <h4 className="text-sm font-semibold text-ink">{title}</h4>
      {description && <p className="mt-1 text-xs text-muted max-w-sm leading-relaxed">{description}</p>}
    </div>
  );
}

export function EmptyState({
  icon: Icon = Inbox,
  title = "No records found",
  description = "There are no courses or attendance sessions available yet.",
  actionLabel,
  onAction,
  className = "",
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-dashed border-line bg-surface/40 ${className}`}
    >
      <div className="size-12 rounded-2xl bg-raised grid place-items-center mb-3 text-muted border border-line/60">
        <Icon className="size-6" />
      </div>
      <h4 className="text-sm font-semibold text-ink">{title}</h4>
      <p className="mt-1 text-xs text-muted max-w-sm leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <Button variant="secondary" size="sm" onClick={onAction} className="mt-4">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export function ErrorState({
  title = "Failed to load data",
  error = "An unexpected error occurred while communicating with the service.",
  onRetry,
  className = "",
}: {
  title?: string;
  error?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-risk/30 bg-risk/5 ${className}`}
    >
      <div className="size-12 rounded-2xl bg-risk/10 grid place-items-center mb-3 text-risk border border-risk/20">
        <AlertCircle className="size-6" />
      </div>
      <h4 className="text-sm font-semibold text-ink">{title}</h4>
      <p className="mt-1 text-xs text-risk/90 max-w-sm leading-relaxed">{error}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} className="mt-4 gap-2">
          <RotateCcw className="size-3.5" />
          Retry
        </Button>
      )}
    </div>
  );
}
