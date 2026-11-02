"use client";

import React, { createContext, useContext, useState, useMemo } from "react";
import Image from "next/image";
import { useAuth } from "@/components/auth/AuthProvider";
import { useTheme } from "@/components/theme/ThemeProvider";
import { SignOutConfirmModal } from "@/components/auth/SignOutConfirmModal";
import type { StudentSummary } from "@/lib/api/types";
import {
  LayoutDashboard,
  ClipboardCheck,
  CalendarDays,
  Bell,
  Sun,
  Moon,
  LogOut,
} from "lucide-react";

export type StudentNavView = "overview" | "attendance" | "timetable" | "notices";

interface StudentNavContextType {
  view: StudentNavView;
  setView: (view: StudentNavView) => void;
  unreadNoticesCount: number;
  setUnreadNoticesCount: (count: number) => void;
  selectedCourseForDrawer: StudentSummary | null;
  setSelectedCourseForDrawer: (course: StudentSummary | null) => void;
  selectedNoticeId: string | null;
  setSelectedNoticeId: (id: string | null) => void;
}

const StudentNavContext = createContext<StudentNavContextType | undefined>(undefined);

export function useStudentNav() {
  const context = useContext(StudentNavContext);
  if (!context) {
    throw new Error("useStudentNav must be used within a StudentAppShell");
  }
  return context;
}

const navItems: { id: StudentNavView; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "attendance", label: "Attendance", icon: ClipboardCheck },
  { id: "timetable", label: "Timetable", icon: CalendarDays },
  { id: "notices", label: "Notices", icon: Bell },
];

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-10 place-items-center rounded-xl border border-line bg-white p-1.5 shadow-xs shrink-0">
        <Image
          src="/images/iiitt-logo.png"
          alt="IIIT Tiruchirappalli"
          width={36}
          height={36}
          className="size-full object-contain"
        />
      </div>
      <div className="leading-tight">
        <p className="text-sm font-semibold text-ink">IIIT Trichy</p>
        <p className="text-xs text-muted">Student portal</p>
      </div>
    </div>
  );
}

interface StudentAppShellProps {
  children: React.ReactNode;
  currentPath?: string;
  initialView?: StudentNavView;
}

export function StudentAppShell({
  children,
  initialView = "overview",
}: StudentAppShellProps) {
  const [view, setView] = useState<StudentNavView>(initialView);
  const [unreadNoticesCount, setUnreadNoticesCount] = useState<number>(0);
  const [selectedCourseForDrawer, setSelectedCourseForDrawer] = useState<StudentSummary | null>(null);
  const [selectedNoticeId, setSelectedNoticeId] = useState<string | null>(null);
  const [showSignOutModal, setShowSignOutModal] = useState<boolean>(false);

  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const studentName = user?.name || "Student";
  const rollNumber = user?.rollNumber || (user?.email ? user.email.split("@")[0].toUpperCase() : "261101");

  const initials = useMemo(() => {
    if (user?.name) {
      const parts = user.name.trim().split(/\s+/);
      if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
      return parts[0].slice(0, 2).toUpperCase();
    }
    return "ST";
  }, [user?.name]);

  const navValue = useMemo(
    () => ({
      view,
      setView: (nextView: StudentNavView) => {
        setView(nextView);
        if (nextView !== "notices") setSelectedNoticeId(null);
        window.scrollTo({ top: 0, behavior: "smooth" });
      },
      unreadNoticesCount,
      setUnreadNoticesCount,
      selectedCourseForDrawer,
      setSelectedCourseForDrawer,
      selectedNoticeId,
      setSelectedNoticeId,
    }),
    [view, unreadNoticesCount, selectedCourseForDrawer, selectedNoticeId]
  );

  return (
    <StudentNavContext.Provider value={navValue}>
      <div className="min-h-screen bg-paper text-ink selection:bg-safe-soft selection:text-safe font-sans">
        {/* Desktop Fixed Left Sidebar (w-64) */}
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-paper px-5 py-6 lg:flex">
          <Brand />

          <nav className="mt-10 space-y-1" aria-label="Main">
            {navItems.map(({ id, label, icon: Icon }) => {
              const active = view === id;
              return (
                <button
                  key={id}
                  onClick={() => navValue.setView(id)}
                  aria-current={active ? "page" : undefined}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                    active ? "bg-solid text-on-solid" : "text-muted hover:bg-line/60 hover:text-ink"
                  }`}
                >
                  <Icon className="size-[18px]" strokeWidth={1.8} />
                  <span>{label}</span>
                  {id === "notices" && unreadNoticesCount > 0 && (
                    <span
                      className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        active ? "bg-on-solid text-solid" : "bg-risk text-white"
                      }`}
                    >
                      {unreadNoticesCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Student Profile Card at bottom of sidebar */}
          <div className="mt-auto rounded-2xl border border-line bg-surface p-4">
            <div className="flex items-center gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft text-sm font-semibold text-safe">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{studentName}</p>
                <p className="font-mono text-xs text-muted">{rollNumber}</p>
              </div>
            </div>
            <p className="mt-2.5 text-xs leading-relaxed text-muted font-mono">
              B.Tech · IIIT Tiruchirappalli
            </p>

            {/* Segmented Light/Dark Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
              className="mt-3.5 flex w-full items-center justify-between rounded-lg border border-line p-1 text-xs font-medium text-muted cursor-pointer"
            >
              <span
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 transition-colors ${
                  theme === "light" ? "bg-raised text-ink shadow-xs" : ""
                }`}
              >
                <Sun className="size-3.5" /> Light
              </span>
              <span
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 transition-colors ${
                  theme === "dark" ? "bg-solid text-on-solid shadow-xs" : ""
                }`}
              >
                <Moon className="size-3.5" /> Dark
              </span>
            </button>

            {/* Sign Out Button */}
            <button
              type="button"
              onClick={() => setShowSignOutModal(true)}
              className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-lg border border-line py-2 text-xs font-medium text-muted transition-colors hover:border-ink/30 hover:text-ink cursor-pointer"
            >
              <LogOut className="size-3.5" /> Sign out
            </button>
          </div>
        </aside>

        {/* Mobile Sticky Top Bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line bg-paper/90 px-5 backdrop-blur-lg lg:hidden">
          <Brand />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
              className="grid size-9 place-items-center rounded-full border border-line bg-surface text-muted cursor-pointer"
            >
              {theme === "light" ? <Moon className="size-4" /> : <Sun className="size-4" />}
            </button>
            <div className="grid size-9 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-safe">
              {initials}
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="px-5 pt-8 pb-28 sm:px-8 lg:ml-64 lg:px-12 lg:pt-12 lg:pb-16 min-h-screen">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>

        {/* Mobile Fixed Bottom Tab Bar */}
        <nav
          className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg lg:hidden"
          aria-label="Main"
        >
          {navItems.map(({ id, label, icon: Icon }) => {
            const active = view === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => navValue.setView(id)}
                className={`relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium cursor-pointer transition-colors ${
                  active ? "text-ink" : "text-muted"
                }`}
              >
                {active && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-ink" />}
                <span className="relative">
                  <Icon className="size-5" strokeWidth={active ? 2.2 : 1.8} />
                  {id === "notices" && unreadNoticesCount > 0 && (
                    <span className="absolute -top-1 -right-1.5 size-2 rounded-full bg-risk ring-2 ring-surface" />
                  )}
                </span>
                <span>{label}</span>
              </button>
            );
          })}
        </nav>

        {/* Sign Out Modal */}
        <SignOutConfirmModal
          isOpen={showSignOutModal}
          onClose={() => setShowSignOutModal(false)}
          onConfirm={signOut}
          userEmail={user?.email}
        />
      </div>
    </StudentNavContext.Provider>
  );
}
