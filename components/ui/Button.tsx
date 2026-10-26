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
    "bg-accent text-canvas font-semibold hover:bg-accent/90 active:bg-accent/80 border border-transparent shadow-xs",
  secondary:
    "bg-surface text-ink font-medium border border-line hover:border-muted/50 hover:bg-raised active:bg-surface",
  outline:
    "bg-transparent text-ink font-medium border border-line hover:border-accent hover:text-accent active:bg-surface",
  ghost:
    "bg-transparent text-muted hover:text-ink hover:bg-surface active:bg-raised border border-transparent",
  danger:
    "bg-risk/10 text-risk border border-risk/30 hover:bg-risk/20 active:bg-risk/30 font-semibold",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs rounded-lg gap-1.5",
  md: "px-4 py-2 text-sm rounded-xl gap-2",
  lg: "px-5 py-2.5 text-base rounded-xl gap-2.5",
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
  const commonClasses = `inline-flex items-center justify-center select-none transition-colors duration-150 disabled:opacity-50 disabled:pointer-events-none cursor-pointer ${
    variantStyles[variant]
  } ${sizeStyles[size]} ${className}`;

  if (href) {
    const linkProps = props as Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof ButtonBaseProps>;
    return (
      <Link
        href={href}
        className={commonClasses}
        aria-disabled={disabled || busy}
        {...linkProps}
      >
        {busy && <LoadingSpinner size={size} />}
        {children}
      </Link>
    );
  }

  const buttonProps = props as Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonBaseProps>;
  return (
    <button
      disabled={disabled || busy}
      className={commonClasses}
      {...buttonProps}
    >
      {busy && <LoadingSpinner size={size} />}
      {children}
    </button>
  );
}

function LoadingSpinner({ size }: { size: ButtonSize }) {
  const dim = size === "sm" ? "size-3.5" : size === "lg" ? "size-5" : "size-4";
  return (
    <svg
      className={`animate-spin ${dim} shrink-0`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
