import React from "react";
import { AlertCircle, Inbox, Loader2, RotateCcw } from "lucide-react";
import { Button } from "./Button";

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
      {description && <p className="mt-1 text-xs text-muted max-w-sm">{description}</p>}
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
      <div className="size-11 rounded-2xl bg-raised grid place-items-center mb-3 text-muted border border-line/60">
        <Icon className="size-5" />
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
      <div className="size-11 rounded-2xl bg-risk/10 grid place-items-center mb-3 text-risk border border-risk/20">
        <AlertCircle className="size-5" />
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
