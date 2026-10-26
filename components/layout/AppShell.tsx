import React from "react";
import { Navbar } from "./Navbar";

interface AppShellProps {
  children: React.ReactNode;
  currentPath?: string;
  userRole?: "student" | "lecturer" | "admin";
  userRollNumber?: string;
}

export function AppShell({
  children,
  currentPath = "/",
  userRole = "student",
  userRollNumber = "261161",
}: AppShellProps) {
  return (
    <div className="min-h-screen flex flex-col bg-canvas text-ink selection:bg-accent/20 selection:text-accent">
      <Navbar
        currentPath={currentPath}
        userRole={userRole}
        userRollNumber={userRollNumber}
      />

      <main className="flex-1 w-full mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {children}
      </main>

      <footer className="border-t border-line/60 bg-surface/40 mt-auto py-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted">
          <div>
            <p className="font-medium text-ink">
              Indian Institute of Information Technology, Tiruchirappalli
            </p>
            <p className="mt-0.5 text-muted/80">
              Department of Computer Science and Engineering & Electronics and Communication Engineering
            </p>
          </div>
          <div className="flex items-center gap-4 text-right">
            <span>Stage 1 UI Foundation</span>
            <span>•</span>
            <span className="text-accent/90">75% Policy Enforced</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
