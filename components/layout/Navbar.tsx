"use client";

import React, { useState } from "react";
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
} from "lucide-react";

interface NavbarProps {
  currentPath?: string;
}

export function Navbar({ currentPath = "/" }: NavbarProps) {
  const { user, role, isMock, signOut, loading, switchRole } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
                  href="/dashboard/profile"
                  className={`transition-colors hover:text-ink ${
                    currentPath === "/dashboard/profile" ? "text-accent border-b border-accent pb-0.5" : ""
                  }`}
                >
                  Profile
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
            {isMock && switchRole && (
              <div className="flex items-center gap-1 bg-surface border border-line rounded-[3px] p-0.5 text-[10px] font-mono">
                <span className="text-muted px-1 font-bold text-[9px] uppercase tracking-wider">Role:</span>
                <button
                  type="button"
                  onClick={() => switchRole("student")}
                  className={`px-1.5 py-0.5 rounded-[2px] transition-colors font-bold cursor-pointer ${
                    role === "student" ? "bg-accent text-accent-contrast shadow-xs" : "text-muted hover:text-ink"
                  }`}
                >
                  Student
                </button>
                <button
                  type="button"
                  onClick={() => switchRole("lecturer")}
                  className={`px-1.5 py-0.5 rounded-[2px] transition-colors font-bold cursor-pointer ${
                    role === "lecturer" ? "bg-accent text-accent-contrast shadow-xs" : "text-muted hover:text-ink"
                  }`}
                >
                  Faculty
                </button>
                <button
                  type="button"
                  onClick={() => switchRole("admin")}
                  className={`px-1.5 py-0.5 rounded-[2px] transition-colors font-bold cursor-pointer ${
                    role === "admin" ? "bg-accent text-accent-contrast shadow-xs" : "text-muted hover:text-ink"
                  }`}
                >
                  Admin
                </button>
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
                  href="/dashboard/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-[3px] hover:bg-raised text-ink"
                >
                  Student Profile
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

          {isMock && switchRole && (
            <div className="pt-3 border-t border-line flex flex-col gap-2">
              <span className="text-[10px] font-mono uppercase text-muted font-bold">Switch Mock Role</span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    switchRole("student");
                    setMobileMenuOpen(false);
                  }}
                  className={`py-1.5 text-xs font-bold rounded-[3px] border transition-colors cursor-pointer text-center ${
                    role === "student" ? "bg-accent text-accent-contrast border-accent" : "border-line text-muted hover:text-ink"
                  }`}
                >
                  Student
                </button>
                <button
                  type="button"
                  onClick={() => {
                    switchRole("lecturer");
                    setMobileMenuOpen(false);
                  }}
                  className={`py-1.5 text-xs font-bold rounded-[3px] border transition-colors cursor-pointer text-center ${
                    role === "lecturer" ? "bg-accent text-accent-contrast border-accent" : "border-line text-muted hover:text-ink"
                  }`}
                >
                  Faculty
                </button>
                <button
                  type="button"
                  onClick={() => {
                    switchRole("admin");
                    setMobileMenuOpen(false);
                  }}
                  className={`py-1.5 text-xs font-bold rounded-[3px] border transition-colors cursor-pointer text-center ${
                    role === "admin" ? "bg-accent text-accent-contrast border-accent" : "border-line text-muted hover:text-ink"
                  }`}
                >
                  Admin
                </button>
              </div>
            </div>
          )}

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
