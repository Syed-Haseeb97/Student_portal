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
  compliant: "bg-[#d9fa58]/15 border-[#d9fa58]/35 text-[#d9fa58]",
  shortfall: "bg-rose-500/15 border-rose-500/35 text-rose-400",
  warning: "bg-amber-500/15 border-amber-500/35 text-amber-300",
  neutral: "bg-surface border-line text-muted",
  preview: "bg-[#d9fa58]/10 border-[#d9fa58]/30 text-[#d9fa58]",
  indigo: "bg-[#819a35]/20 border-[#819a35]/40 text-[#c9d5b5]",
};

const sizeStyles = {
  sm: "px-2 py-0.5 text-[10px] font-bold font-mono tracking-wider uppercase rounded-[3px]",
  md: "px-2.5 py-1 text-xs font-bold font-mono tracking-wider uppercase rounded-[3px]",
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
