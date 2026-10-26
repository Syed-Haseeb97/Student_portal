import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export function Input({
  label,
  error,
  hint,
  id,
  className = "",
  leftIcon,
  rightElement,
  disabled,
  ...props
}: InputProps) {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold uppercase tracking-wider text-muted"
        >
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        {leftIcon && (
          <div className="pointer-events-none absolute left-3.5 text-muted">
            {leftIcon}
          </div>
        )}

        <input
          id={inputId}
          disabled={disabled}
          aria-describedby={errorId ?? hintId}
          aria-invalid={Boolean(error)}
          className={`w-full rounded-xl border bg-canvas text-sm text-ink placeholder:text-muted/60 transition-colors py-2.5 outline-none ${
            leftIcon ? "pl-10" : "pl-3.5"
          } ${rightElement ? "pr-10" : "pr-3.5"} ${
            error
              ? "border-risk focus:border-risk focus:ring-1 focus:ring-risk/40"
              : "border-line focus:border-accent"
          } disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
          {...props}
        />

        {rightElement && (
          <div className="absolute right-3 text-muted">{rightElement}</div>
        )}
      </div>

      {error ? (
        <p id={errorId} role="alert" className="text-xs text-risk font-medium">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
