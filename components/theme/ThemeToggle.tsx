"use client";

import React from "react";
import { useTheme } from "./ThemeProvider";
import { Sun, Moon } from "lucide-react";

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ className = "", showLabel = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative inline-flex items-center justify-center p-1.5 sm:p-2 rounded-full border border-line bg-canvas hover:bg-raised text-muted hover:text-ink transition-all cursor-pointer touch-manipulation active:scale-95 focus-visible:outline-2 focus-visible:outline-accent ${className}`}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
    >
      {isDark ? (
        <Sun className="size-3.5 sm:size-4 text-amber-300 transition-transform duration-200 rotate-0 hover:rotate-45" />
      ) : (
        <Moon className="size-3.5 sm:size-4 text-sky-600 transition-transform duration-200 rotate-0 hover:-rotate-12" />
      )}
      {showLabel && (
        <span className="ml-2 text-xs font-mono font-medium">
          {isDark ? "Light Mode" : "Dark Mode"}
        </span>
      )}
    </button>
  );
}
