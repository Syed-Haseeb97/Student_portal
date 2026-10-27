"use client";

import React from "react";
import { Navbar } from "./Navbar";
import { useAuth } from "@/components/auth/AuthProvider";

interface AppShellProps {
  children: React.ReactNode;
  currentPath?: string;
}

export function AppShell({
  children,
  currentPath = "/",
}: AppShellProps) {
  const { isMock } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-ink selection:bg-accent/20 selection:text-accent font-sans">
      <Navbar currentPath={currentPath} />

      <main className="flex-1 w-full mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {children}
      </main>

      <footer className="border-t border-line/60 bg-surface/40 mt-auto py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted">
          <div>
            <p className="font-medium text-ink flex items-center gap-2">
              <span>Indian Institute of Information Technology, Tiruchirappalli</span>
              {isMock && (
                <span className="text-[10px] font-mono text-warning bg-warning/10 border border-warning/20 px-1.5 py-0.2 rounded-[2px]">
                  SYNTHETIC PREVIEW
                </span>
              )}
            </p>
            <p className="mt-0.5 text-muted/75 text-[11px]">
              Permanent Campus: Sethurappatti, Tiruchirappalli - 620 012, Tamil Nadu, India.
            </p>
          </div>
          <div className="flex items-center gap-3 text-right font-mono text-[11px]">
            <span className="text-muted/60">An Institute of National Importance</span>
            <span>•</span>
            <span className="text-accent">75% Attendance Ordinance</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
