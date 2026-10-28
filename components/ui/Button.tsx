import React from "react";
import Link from "next/link";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonBaseProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  busy?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}

export type ButtonProps = ButtonBaseProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonBaseProps> & {
    href?: undefined;
  };

export type LinkButtonProps = ButtonBaseProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof ButtonBaseProps> & {
    href: string;
  };

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-[#d9fa58] text-[#171915] font-extrabold hover:bg-[#e5ff83] hover:-translate-y-0.5 active:translate-y-0 border border-[#d9fa58] shadow-sm tracking-wide",
  secondary:
    "bg-surface text-ink font-semibold border border-line hover:border-[#819a35]/60 hover:bg-raised active:bg-surface",
  outline:
    "bg-transparent text-ink font-semibold border border-line hover:border-[#d9fa58] hover:text-[#d9fa58] active:bg-surface",
  ghost:
    "bg-transparent text-muted hover:text-ink hover:bg-surface active:bg-raised border border-transparent",
  danger:
    "bg-rose-500/15 text-rose-400 border border-rose-500/35 hover:bg-rose-500/25 active:bg-rose-500/30 font-bold",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3.5 py-1.5 text-xs rounded-full gap-1.5",
  md: "px-5 py-2.5 text-xs sm:text-sm rounded-full gap-2",
  lg: "px-6 py-3 text-sm sm:text-base rounded-full gap-2.5",
};

export function Button({
  variant = "primary",
  size = "md",
  busy = false,
  disabled = false,
  className = "",
  children,
  href,
  ...props
}: ButtonProps | LinkButtonProps) {
  const commonClasses = `inline-flex items-center justify-center select-none transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none cursor-pointer ${
    variantStyles[variant]
  } ${sizeStyles[size]} ${className}`;

  if (href) {
    const linkProps = props as Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof ButtonBaseProps>;
    return (
      <Link href={href} className={commonClasses} {...linkProps}>
        {busy ? (
          <span className="inline-flex items-center gap-2">
            <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            <span>{children}</span>
          </span>
        ) : (
          children
        )}
      </Link>
    );
  }

  const buttonProps = props as React.ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button
      disabled={disabled || busy}
      className={commonClasses}
      {...buttonProps}
    >
      {busy ? (
        <span className="inline-flex items-center gap-2">
          <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span>{children}</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}
