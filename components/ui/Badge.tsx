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
  compliant: "bg-accent/10 border-accent/30 text-accent",
  shortfall: "bg-risk/10 border-risk/30 text-risk",
  warning: "bg-warning/10 border-warning/30 text-warning",
  neutral: "bg-surface border-line text-muted",
  preview: "bg-surface border-line text-muted",
  indigo: "bg-indigo/10 border-indigo/30 text-indigo",
};

const sizeStyles = {
  sm: "px-2.5 py-0.5 text-xs font-medium",
  md: "px-3 py-1 text-xs font-semibold",
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
      className={`inline-flex items-center gap-1.5 rounded-full border transition-colors ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
