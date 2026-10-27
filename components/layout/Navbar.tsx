"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import {
  Menu,
  X,
  GraduationCap,
  Briefcase,
  ShieldAlert,
  LogOut,
  Sparkles,
  Clock,
  Calendar,
} from "lucide-react";

interface NavbarProps {
  currentPath?: string;
}

export function Navbar({ currentPath = "/" }: NavbarProps) {
  const { user, role, isMock, signOut, loading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [timeStr, setTimeStr] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      try {
        const now = new Date();
        const formatted = new Intl.DateTimeFormat("en-IN", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }).format(now);
        setTimeStr(formatted);
      } catch {
        setTimeStr("");
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  const displayName = user?.name ? user.name.split(" ")[0] : (user?.rollNumber || user?.staffId || "User");
  const identifier = user?.rollNumber || user?.staffId || (role ? role.toUpperCase() : "");

  return (
    <header className="border-b border-line/80 bg-canvas/90 backdrop-blur-xl sticky top-0 z-40 transition-all">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-18 items-center justify-between gap-4">
          {/* Logo & Institute Branding */}
          <Link
            href="/"
            className="flex items-center gap-3.5 group focus-visible:outline-accent"
          >
            <div className="relative size-10 rounded-[3px] bg-surface border border-line p-1 shadow-sm transition-all group-hover:border-accent shrink-0">
              <Image
                src="/images/iiitt-logo.png"
                alt="IIIT Tiruchirappalli Official Emblem"
                width={36}
                height={36}
                className="w-full h-full object-contain"
                priority
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-extrabold tracking-tight text-ink group-hover:text-accent transition-colors uppercase">
                  IIIT Tiruchirappalli<span className="text-accent font-mono">.</span>
                </span>
                {isMock && (
                  <span className="hidden lg:inline-flex text-[9px] uppercase font-bold font-mono tracking-widest text-warning bg-warning/10 border border-warning/25 px-1.5 py-0.5 rounded-[2px]">
                    Preview Mode
                  </span>
                )}
                {!isMock && (
                  <span className="hidden lg:inline-flex text-[9px] uppercase font-bold font-mono tracking-widest text-accent bg-accent/10 border border-accent/25 px-1.5 py-0.5 rounded-[2px]">
                    INI · Govt of India
                  </span>
                )}
              </div>
              <p className="text-[10px] font-mono tracking-wider text-muted truncate leading-tight mt-0.5 uppercase">
                Academic Ledger · 75% Statutory Ordinance
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-muted">
            <Link
              href="/"
              className={`transition-colors hover:text-ink ${
                currentPath === "/" ? "text-accent border-b border-accent pb-0.5" : ""
              }`}
            >
              Home
            </Link>

            {role === "student" && (
              <>
                <Link
                  href="/dashboard"
                  className={`transition-colors hover:text-ink ${
                    currentPath === "/dashboard" ? "text-accent border-b border-accent pb-0.5" : ""
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  href="/dashboard?tab=calculator"
                  className="transition-colors hover:text-accent flex items-center gap-1.5 font-mono text-[11px]"
                >
                  <Sparkles className="size-3 text-accent" />
                  <span>75% ENGINE</span>
                </Link>
                <Link
                  href="/dashboard?tab=timetable"
                  className="transition-colors hover:text-accent flex items-center gap-1.5 font-mono text-[11px]"
                >
                  <Calendar className="size-3 text-accent" />
                  <span>TIMETABLE</span>
                </Link>
              </>
            )}

            {role === "lecturer" && (
              <>
                <Link
                  href="/lecturer"
                  className={`transition-colors hover:text-ink ${
                    currentPath.startsWith("/lecturer") ? "text-accent border-b border-accent pb-0.5" : ""
                  }`}
                >
                  Faculty Portal
                </Link>
              </>
            )}

            {role === "admin" && (
              <>
                <Link
                  href="/admin"
                  className={`transition-colors hover:text-ink ${
                    currentPath === "/admin" ? "text-accent border-b border-accent pb-0.5" : ""
                  }`}
                >
                  Admin Console
                </Link>
                <Link
                  href="/admin/roster"
                  className={`transition-colors hover:text-ink ${
                    currentPath.startsWith("/admin/roster") ? "text-accent border-b border-accent pb-0.5" : ""
                  }`}
                >
                  Roster
                </Link>
                <Link
                  href="/admin/staff"
                  className={`transition-colors hover:text-ink ${
                    currentPath.startsWith("/admin/staff") ? "text-accent border-b border-accent pb-0.5" : ""
                  }`}
                >
                  Staff
                </Link>
                <Link
                  href="/admin/academic"
                  className={`transition-colors hover:text-ink ${
                    currentPath.startsWith("/admin/academic") ? "text-accent border-b border-accent pb-0.5" : ""
                  }`}
                >
                  Catalog
                </Link>
              </>
            )}

            {!user && (
              <Link
                href="/sign-in"
                className="transition-colors hover:text-accent font-mono text-[11px]"
              >
                ACCESS VERIFICATION
              </Link>
            )}
          </nav>

          {/* Right Status / User Controls */}
          <div className="hidden sm:flex items-center gap-3">
            {timeStr && (
              <div className="hidden xl:flex items-center gap-1.5 text-[11px] font-mono text-[#c9d5b5] px-2 py-1 rounded-[3px] bg-surface border border-line">
                <Clock className="size-3 text-accent" />
                <span>{timeStr} IST</span>
              </div>
            )}

            {!loading && user ? (
              <div className="flex items-center gap-2.5 bg-surface border border-line p-1 pl-2.5 rounded-[3px]">
                <div className="flex items-center gap-2 text-xs">
                  {role === "admin" ? (
                    <ShieldAlert className="size-3.5 text-accent" />
                  ) : role === "lecturer" ? (
                    <Briefcase className="size-3.5 text-accent" />
                  ) : (
                    <GraduationCap className="size-3.5 text-accent" />
                  )}
                  <span className="font-bold text-ink">{displayName}</span>
                  {identifier && (
                    <>
                      <span className="text-muted/60">•</span>
                      <span className="text-[10px] font-mono text-accent font-bold uppercase">
                        {identifier}
                      </span>
                    </>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="p-1 rounded-[2px] bg-canvas hover:bg-risk/15 hover:text-risk text-muted transition-colors border border-line cursor-pointer"
                  title="Sign Out"
                  aria-label="Sign Out"
                >
                  <LogOut className="size-3.5" />
                </button>
              </div>
            ) : !loading ? (
              <Button href="/sign-in" variant="primary" size="sm" className="font-semibold text-xs shadow-xs">
                Sign In
              </Button>
            ) : null}
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-[3px] border border-line bg-surface text-muted hover:text-ink cursor-pointer"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-line/80 bg-surface/98 backdrop-blur-2xl p-5 space-y-4 animate-in slide-in-from-top-3">
          <div className="flex flex-col gap-2 text-sm font-semibold">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-[3px] hover:bg-raised text-ink"
            >
              Home
            </Link>

            {role === "student" && (
              <>
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-[3px] hover:bg-raised text-ink"
                >
                  Student Dashboard
                </Link>
                <Link
                  href="/dashboard?tab=calculator"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-[3px] hover:bg-raised text-ink flex items-center gap-2"
                >
                  <Sparkles className="size-4 text-accent" />
                  <span>75% Margin Engine</span>
                </Link>
                <Link
                  href="/dashboard?tab=timetable"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-[3px] hover:bg-raised text-ink flex items-center gap-2"
                >
                  <Calendar className="size-4 text-accent" />
                  <span>Timetable</span>
                </Link>
              </>
            )}

            {role === "lecturer" && (
              <Link
                href="/lecturer"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-[3px] hover:bg-raised text-ink"
              >
                Faculty Portal
              </Link>
            )}

            {role === "admin" && (
              <>
                <Link
                  href="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-[3px] hover:bg-raised text-ink"
                >
                  Admin Console
                </Link>
                <Link
                  href="/admin/roster"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-[3px] hover:bg-raised text-ink"
                >
                  Roster Management
                </Link>
                <Link
                  href="/admin/staff"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-[3px] hover:bg-raised text-ink"
                >
                  Staff Management
                </Link>
              </>
            )}
          </div>

          <div className="pt-3 border-t border-line flex items-center justify-between">
            {user ? (
              <div className="flex items-center justify-between w-full">
                <div className="text-xs">
                  <span className="text-muted block text-[10px]">Logged in as</span>
                  <strong className="text-ink font-semibold">{user.email}</strong>
                  {identifier && (
                    <span className="text-accent font-mono text-[10px] block uppercase mt-0.5">
                      {role?.toUpperCase()} · {identifier}
                    </span>
                  )}
                </div>
                <Button variant="secondary" size="sm" onClick={() => signOut()} className="text-xs">
                  Sign Out
                </Button>
              </div>
            ) : (
              <Button href="/sign-in" variant="primary" size="md" className="w-full text-center">
                Sign In with Institutional Email
              </Button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
