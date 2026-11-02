import React from "react";
import Image from "next/image";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { LandingAuthRedirect } from "@/components/landing/LandingAuthRedirect";
import { LandingAccessCard } from "@/components/landing/LandingAccessCard";
import {
  ArrowRight,
  ArrowUpRight,
  Clock,
  MapPin,
  TriangleAlert,
  ChevronRight,
  CalendarDays,
  ShieldCheck,
  CheckCircle2,
  BookOpen,
} from "lucide-react";

export const metadata = {
  title: "IIIT Tiruchirappalli | Academic Attendance & Student Portal",
  description:
    "Official attendance ledger, 75% statutory ordinance margin calculator, and classroom timetables for Indian Institute of Information Technology, Tiruchirappalli.",
  icons: {
    icon: [
      { url: "/images/iiitt-logo.png", type: "image/png" },
      { url: "/icon.png", type: "image/png" },
    ],
    shortcut: "/images/iiitt-logo.png",
    apple: "/images/iiitt-logo.png",
  },
};

const SAMPLE_COURSES = [
  { code: "CS101", title: "Programming in C", short: "C-Prog", attended: 28, total: 32 },
  { code: "CS102", title: "Data Structures", short: "DSA", attended: 32, total: 36 },
  { code: "EC101", title: "Digital Logic Design", short: "DLD", attended: 24, total: 33 },
  { code: "MA101", title: "Mathematics I", short: "Math", attended: 29, total: 35 },
  { code: "HS101", title: "Professional Comm.", short: "PC", attended: 21, total: 25 },
];

const SCALE_MIN = 60;
const THRESHOLD = 75;

function DemoDistributionScale() {
  const sorted = [...SAMPLE_COURSES].sort((a, b) => (a.attended / a.total) - (b.attended / b.total));
  const position = (value: number) =>
    `${((Math.max(value, SCALE_MIN) - SCALE_MIN) / (100 - SCALE_MIN)) * 100}%`;

  return (
    <div className="mt-auto pt-8">
      <div className="relative h-14">
        <div className="absolute inset-x-0 top-1/2 h-px bg-line" />
        <div className="absolute top-1/2 h-px bg-risk/40" style={{ left: 0, width: position(THRESHOLD) }} />
        <div className="absolute top-1 bottom-1 w-px bg-ink z-10" style={{ left: position(THRESHOLD) }} />
        {sorted.map((c, i) => {
          const value = (c.attended / c.total) * 100;
          const safe = value >= THRESHOLD;
          return (
            <div key={c.code} className="absolute top-1/2 -translate-x-1/2" style={{ left: position(value) }}>
              <span
                className={`block size-3 -translate-y-1/2 rounded-full ring-2 ring-surface ${safe ? "bg-safe" : "bg-risk"}`}
                title={`${c.title} · ${value.toFixed(1)}%`}
              />
              <span
                className={`absolute left-1/2 -translate-x-1/2 text-[11px] font-medium font-mono whitespace-nowrap ${
                  safe ? "text-muted" : "text-risk font-semibold"
                } ${i % 2 ? "top-3" : "-top-8"}`}
              >
                {c.short}
              </span>
            </div>
          );
        })}
      </div>
      <div className="relative mt-2 h-4 font-mono text-[11px] text-muted">
        <span className="absolute left-0">{SCALE_MIN}%</span>
        <span className="absolute -translate-x-1/2 font-semibold text-ink" style={{ left: position(THRESHOLD) }}>
          {THRESHOLD}% required
        </span>
        <span className="absolute right-0">100%</span>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <AppShell currentPath="/">
      <LandingAuthRedirect />

      <div className="space-y-16 sm:space-y-24 animate-in fade-in duration-300">
        {/* HERO SECTION */}
        <section className="grid gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-center pt-4 sm:pt-8">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-1.5 text-xs text-muted shadow-xs">
              <span className="size-1.5 rounded-full bg-safe animate-pulse" />
              <span>Official Academic Ledger · IIIT Tiruchirappalli</span>
            </div>

            <div className="space-y-4">
              <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl leading-[1.05] tracking-tight text-ink">
                Know your attendance.<br />
                Every margin, every class.
              </h1>

              <p className="max-w-xl text-base sm:text-lg leading-relaxed text-muted">
                The authoritative attendance ledger, 75% statutory examination compliance system, and
                weekly department timetables for Indian Institute of Information Technology, Tiruchirappalli.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href="/sign-in"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-solid text-on-solid px-7 py-3.5 text-sm font-medium hover:opacity-90 active:scale-[0.98] transition-all shadow-sm"
              >
                <span>Sign in with Institute Email</span>
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="#showcase"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-line bg-surface text-ink px-6 py-3.5 text-sm font-medium hover:bg-raised active:scale-[0.98] transition-all"
              >
                <span>Explore Preview</span>
              </Link>
            </div>

            <div className="pt-2 flex items-center gap-6 text-xs text-muted font-mono">
              <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-safe" /> 75% Ordinance Compliance
              </span>
              <span>•</span>
              <span>Verified @iiitt.ac.in Roster</span>
            </div>
          </div>

          {/* Quick Access Card */}
          <div>
            <LandingAccessCard />
          </div>
        </section>

        {/* VISUAL SHOWCASE DIRECTLY INSPIRED BY PORTAL_UI */}
        <section id="showcase" className="space-y-6 scroll-mt-24">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-sm font-mono text-muted">Interactive System Preview</p>
              <h2 className="mt-1 font-serif text-3xl sm:text-4xl text-ink">
                Designed for clarity and academic precision.
              </h2>
            </div>
            <Link
              href="/sign-in"
              className="inline-flex items-center gap-1 text-sm font-medium text-safe hover:underline"
            >
              Sign in to view your live data <ArrowUpRight className="size-4" />
            </Link>
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
            {/* Overall Attendance Card */}
            <div className="card flex flex-col p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-muted">Overall attendance</p>
                  <span className="mt-3 block font-serif text-7xl text-ink sm:text-8xl leading-none tracking-tight">
                    83<span className="text-[0.5em] tracking-normal">.2%</span>
                  </span>
                </div>
                <div className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-muted">
                  <CheckCircle2 className="size-3.5 text-safe" /> On Track
                </div>
              </div>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">
                <span className="font-semibold text-ink">4 of 5 subjects</span> are currently above the 75% ordinance requirement.
                Each subject is audited separately, so a surplus in one cannot offset a deficit in another.
              </p>

              <dl className="mt-8 grid grid-cols-3 divide-x divide-line border-y border-line py-4 text-center">
                {[
                  ["Attended", 134],
                  ["Missed", 27],
                  ["Held", 161],
                ].map(([label, n]) => (
                  <div key={label}>
                    <dd className="font-serif text-3xl text-ink">{n}</dd>
                    <dt className="mt-1 text-xs text-muted">{label}</dt>
                  </div>
                ))}
              </dl>

              <DemoDistributionScale />
            </div>

            {/* Stacked Right Column: Up Next + Needs Attention */}
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-1">
              {/* Up Next Hero Card */}
              <div className="relative overflow-hidden rounded-2xl bg-hero p-6 text-on-hero">
                <div className="absolute -top-20 -right-20 size-56 rounded-full border-[28px] border-on-hero/5" />
                <div className="relative flex items-center justify-between">
                  <p className="text-sm text-on-hero/60">Up next</p>
                  <span className="flex items-center gap-1.5 rounded-full bg-on-hero/10 px-2.5 py-1 text-xs font-medium">
                    <span className="size-1.5 animate-pulse rounded-full bg-[#7ee2b8]" /> in 25 min
                  </span>
                </div>
                <h3 className="relative mt-6 font-serif text-3xl leading-tight">Data Structures & Algorithms</h3>
                <p className="relative mt-1 text-sm text-on-hero/60">Lecture · Dr. R. Meenakshi</p>
                <div className="relative mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-on-hero/80">
                  <span className="flex items-center gap-2">
                    <Clock className="size-4 text-on-hero/50" /> 11:15 – 12:05
                  </span>
                  <span className="flex items-center gap-2">
                    <MapPin className="size-4 text-on-hero/50" /> LH-02, Academic Block
                  </span>
                </div>
              </div>

              {/* Needs Attention Card */}
              <div className="rounded-2xl border border-risk/20 bg-risk-soft p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-risk">
                    <TriangleAlert className="size-4" /> Needs attention
                  </div>
                  <div className="mt-4 space-y-3">
                    <div className="group flex w-full items-center gap-3 rounded-xl bg-surface/70 p-3 text-left transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">Digital Logic Design</p>
                        <p className="mt-0.5 text-xs text-muted">
                          Attend the next <span className="font-semibold text-risk">3 classes</span> to recover
                        </p>
                      </div>
                      <span className="font-serif text-2xl text-risk leading-none">
                        72<span className="text-[0.6em]">.7%</span>
                      </span>
                      <ChevronRight className="size-4 text-muted" />
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-risk/15 text-xs text-muted flex items-center justify-between">
                  <span>Minimum ordinance</span>
                  <span className="font-mono font-medium text-ink">75.0% required</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3 CORE PILLARS */}
        <section className="space-y-8">
          <div>
            <p className="text-sm font-mono text-muted">Academic Governance</p>
            <h2 className="mt-1 font-serif text-3xl sm:text-4xl text-ink">
              Every regulation, transparently calculated.
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="card p-6 sm:p-7 space-y-4">
              <div className="size-10 rounded-xl bg-safe-soft border border-safe/25 grid place-items-center text-safe">
                <ShieldCheck className="size-5" />
              </div>
              <h3 className="font-serif text-2xl text-ink">75% Statutory Ordinance</h3>
              <p className="text-sm text-muted leading-relaxed">
                Mandatory institute attendance rule computed individually per course. Safe margins and deficits are
                strictly audited without inter-course compensation.
              </p>
            </div>

            <div className="card p-6 sm:p-7 space-y-4">
              <div className="size-10 rounded-xl bg-accent-soft border border-safe/25 grid place-items-center text-safe">
                <Clock className="size-5" />
              </div>
              <h3 className="font-serif text-2xl text-ink">Bunk Margin Planner</h3>
              <p className="text-sm text-muted leading-relaxed">
                Interactive simulator allowing students to test future attendance decisions. See projected percentages
                before taking leave or planning medical absences.
              </p>
            </div>

            <div className="card p-6 sm:p-7 space-y-4">
              <div className="size-10 rounded-xl bg-warn-soft border border-warn/25 grid place-items-center text-warn">
                <CalendarDays className="size-5" />
              </div>
              <h3 className="font-serif text-2xl text-ink">Department Schedules</h3>
              <p className="text-sm text-muted leading-relaxed">
                Official weekly timetable matrices for Computer Science (11), Electronics & Communication (12), AI & DS (13),
                and VLSI Design (14).
              </p>
            </div>
          </div>
        </section>

        {/* PERMANENT CAMPUS SHOWCASE */}
        <section className="card overflow-hidden">
          <div className="grid lg:grid-cols-2">
            <div className="relative min-h-72 lg:min-h-full">
              <Image
                src="/images/iiitt-campus.jpg"
                alt="IIIT Tiruchirappalli Permanent Campus, Sethurappatti"
                fill
                className="object-cover"
                priority
              />
            </div>
            <div className="p-8 sm:p-12 space-y-6 flex flex-col justify-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-line bg-paper px-3 py-1 text-xs text-muted w-fit">
                <MapPin className="size-3.5 text-safe" />
                <span>Sethurappatti (NH-45B), Tiruchirappalli</span>
              </div>
              <div className="space-y-3">
                <h3 className="font-serif text-3xl sm:text-4xl text-ink">
                  Permanent Campus, Tiruchirappalli
                </h3>
                <p className="text-sm text-muted leading-relaxed">
                  Indian Institute of Information Technology, Tiruchirappalli is an Institute of National Importance
                  established by the Ministry of Education, Government of India. Operating from its state-of-the-art
                  permanent campus at Sethurappatti with modern academic blocks and computational facilities.
                </p>
              </div>

              <div className="pt-2 flex flex-wrap gap-4 text-xs font-mono text-muted">
                <span className="p-2.5 rounded-lg border border-line bg-paper">
                  PIN: 620 012 · Tamil Nadu
                </span>
                <span className="p-2.5 rounded-lg border border-line bg-paper">
                  Autonomous Institute under MoE
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* BOTTOM CALL TO ACTION */}
        <section className="rounded-2xl border border-line bg-surface p-8 sm:p-12 text-center space-y-6">
          <div className="max-w-xl mx-auto space-y-3">
            <h2 className="font-serif text-3xl sm:text-4xl text-ink">
              Ready to verify your semester attendance?
            </h2>
            <p className="text-sm text-muted leading-relaxed">
              Sign in with your verified @iiitt.ac.in institute email account to view your live attendance ledger,
              timetable schedule, and official circulars.
            </p>
          </div>
          <div>
            <Link
              href="/sign-in"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-solid text-on-solid px-8 py-3.5 text-sm font-medium hover:opacity-90 active:scale-[0.98] transition-all shadow-sm"
            >
              <span>Sign In to Portal</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
