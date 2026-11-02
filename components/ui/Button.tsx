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
    "bg-solid text-on-solid font-medium hover:opacity-90 active:scale-[0.98] border border-solid shadow-xs transition-all",
  secondary:
    "bg-surface text-ink font-medium border border-line hover:bg-raised active:bg-surface transition-all",
  outline:
    "bg-transparent text-ink font-medium border border-line hover:border-ink/40 active:bg-raised transition-all",
  ghost:
    "bg-transparent text-muted hover:text-ink hover:bg-surface active:bg-raised border border-transparent transition-all",
  danger:
    "bg-risk-soft text-risk border border-risk/30 hover:bg-risk/15 active:bg-risk/20 font-medium transition-all",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3.5 py-2 sm:py-1.5 text-xs rounded-full gap-1.5 min-h-[38px] sm:min-h-0",
  md: "px-5 py-2.5 text-xs sm:text-sm rounded-full gap-2 min-h-[42px] sm:min-h-0",
  lg: "px-6 py-3 text-sm sm:text-base rounded-full gap-2.5 min-h-[48px] sm:min-h-0",
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
  const commonClasses = `inline-flex items-center justify-center select-none transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none cursor-pointer touch-manipulation active:scale-[0.98] ${
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
      type={buttonProps.type || "button"}
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
