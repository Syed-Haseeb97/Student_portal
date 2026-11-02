import React from "react";

export type BadgeVariant =
  | "compliant"
  | "shortfall"
  | "warning"
  | "neutral"
  | "preview"
  | "indigo";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: React.ReactNode;
  size?: "sm" | "md";
}

const variantStyles: Record<BadgeVariant, string> = {
  compliant: "bg-safe-soft border-safe/25 text-safe",
  shortfall: "bg-risk-soft border-risk/25 text-risk",
  warning: "bg-warn-soft border-warn/25 text-warn",
  neutral: "bg-surface border-line text-muted",
  preview: "bg-accent-soft border-line text-safe",
  indigo: "bg-raised border-line text-ink",
};

const sizeStyles = {
  sm: "px-3 py-0.5 text-[10px] font-medium font-mono tracking-wider uppercase rounded-full",
  md: "px-3.5 py-1 text-xs font-medium font-mono tracking-wider uppercase rounded-full",
};

export function Badge({
  variant = "neutral",
  size = "md",
  className = "",
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 border transition-colors ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
