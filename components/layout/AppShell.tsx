"use client";

import React from "react";
import { Navbar } from "./Navbar";
import { useAuth } from "@/components/auth/AuthProvider";

interface AppShellProps {
  children: React.ReactNode;
  currentPath?: string;
  hideFooter?: boolean;
}

export function AppShell({
  children,
  currentPath = "/",
  hideFooter = false,
}: AppShellProps) {
  const { isMock } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink selection:bg-safe-soft selection:text-ink font-sans">
      <Navbar currentPath={currentPath} />

      <main className="flex-1 w-full mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {children}
      </main>

      {!hideFooter && (
        <footer className="border-t border-line bg-surface/60 mt-auto py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted">
            <div>
              <p className="font-semibold text-ink flex items-center gap-2">
                <span>Indian Institute of Information Technology, Tiruchirappalli</span>
                {isMock && (
                  <span className="text-[10px] font-mono text-warn bg-warn-soft border border-warn/25 px-2.5 py-0.5 rounded-full">
                    SYNTHETIC PREVIEW
                  </span>
                )}
              </p>
              <p className="mt-1 text-muted text-xs">
                Permanent Campus: Sethurappatti, Tiruchirappalli - 620 012, Tamil Nadu, India.
              </p>
            </div>
            <div className="flex items-center gap-3 text-right font-mono text-xs">
              <span className="text-muted">Institute of National Importance</span>
              <span>•</span>
              <span className="text-safe font-medium">75% Attendance Ordinance</span>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
