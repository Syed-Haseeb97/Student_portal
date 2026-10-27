import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: "default" | "raised" | "dashed";
}

export function Card({
  variant = "default",
  className = "",
  children,
  ...props
}: CardProps) {
  const variantStyles = {
    default: "bg-surface border-line",
    raised: "bg-raised border-line",
    dashed: "bg-surface/50 border-line border-dashed",
  };

  return (
    <div
      className={`rounded-[3px] border transition-all ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`p-4 sm:p-5 pb-3 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={`text-base sm:text-lg font-bold text-ink tracking-tight ${className}`} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={`text-xs text-muted mt-1 leading-relaxed ${className}`} {...props}>
      {children}
    </p>
  );
}

export function CardContent({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`p-4 sm:p-5 pt-0 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`p-4 sm:p-5 pt-2 border-t border-line/60 flex items-center justify-between text-xs text-muted ${className}`} {...props}>
      {children}
    </div>
  );
}
