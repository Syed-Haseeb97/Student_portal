"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Menu, X, ShieldCheck, GraduationCap } from "lucide-react";

interface NavbarProps {
  currentPath?: string;
  userRole?: "student" | "lecturer" | "admin";
  userRollNumber?: string;
}

export function Navbar({
  currentPath = "/",
  userRole = "student",
  userRollNumber = "261161",
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="border-b border-line bg-canvas/80 backdrop-blur-md sticky top-0 z-40 transition-colors">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo & Branding */}
          <Link
            href="/"
            className="flex items-center gap-3 group focus-visible:outline-accent"
          >
            <div className="grid size-10 place-items-center rounded-xl bg-accent text-canvas font-black text-sm tracking-tight shadow-xs transition-transform group-hover:scale-105">
              II
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold tracking-wider uppercase text-ink">
                  IIITT PORTAL
                </span>
                <span className="hidden sm:inline-flex text-[10px] uppercase tracking-widest text-muted border border-line px-1.5 py-0.5 rounded">
                  Trichy
                </span>
              </div>
              <p className="text-[11px] text-muted leading-none mt-0.5">
                Attendance Management
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-muted">
            <Link
              href="/"
              className={`transition-colors hover:text-ink ${
                currentPath === "/" ? "text-accent font-semibold" : ""
              }`}
            >
              Overview
            </Link>
            <a
              href="#courses"
              className="transition-colors hover:text-ink"
            >
              Enrolled Courses
            </a>
            <a
              href="#policy"
              className="transition-colors hover:text-ink"
            >
              Attendance Policy
            </a>
          </nav>

          {/* Right actions: Role Tag, Synthetic Badge, Sign In */}
          <div className="hidden sm:flex items-center gap-3">
            <Badge variant="preview" size="sm">
              <span className="size-1.5 rounded-full bg-accent animate-pulse" />
              Preview · synthetic data
            </Badge>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-surface border border-line text-xs">
              <GraduationCap className="size-3.5 text-accent" />
              <span className="font-medium text-ink">{userRollNumber}</span>
              <span className="text-muted/60">|</span>
              <span className="text-muted capitalize">{userRole}</span>
            </div>

            <Button href="/sign-in" variant="outline" size="sm">
              Sign in
            </Button>
          </div>

          {/* Mobile hamburger button */}
          <div className="flex sm:hidden items-center gap-2">
            <Badge variant="preview" size="sm" className="text-[10px] px-2 py-0.5">
              Synthetic
            </Badge>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="grid size-9 place-items-center rounded-lg border border-line bg-surface text-ink hover:bg-raised"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile drawer menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-b border-line bg-surface p-4 space-y-3 animate-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-line/60 text-xs">
            <span className="text-muted">Simulated Profile:</span>
            <div className="flex items-center gap-1 text-ink font-medium">
              <ShieldCheck className="size-3.5 text-accent" />
              <span>Roll: {userRollNumber}</span>
            </div>
          </div>
          <nav className="flex flex-col gap-2 text-sm">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-raised text-ink"
            >
              Overview
            </Link>
            <a
              href="#courses"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-raised text-muted hover:text-ink"
            >
              Enrolled Courses
            </a>
            <a
              href="#policy"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-raised text-muted hover:text-ink"
            >
              Attendance Policy
            </a>
          </nav>
          <div className="pt-2">
            <Button
              href="/sign-in"
              variant="primary"
              size="sm"
              className="w-full"
              onClick={() => setMobileMenuOpen(false)}
            >
              Institutional Sign in
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
