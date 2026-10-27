import React from "react";
import Image from "next/image";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { LandingAuthRedirect } from "@/components/landing/LandingAuthRedirect";
import {
  ShieldCheck,
  Clock,
  MapPin,
  Calendar,
  ExternalLink,
  ArrowRight,
} from "lucide-react";

export const metadata = {
  title: "IIIT Tiruchirappalli | Academic Attendance & Student Portal",
  description:
    "Official attendance ledger, 75% statutory ordinance margin calculator, and classroom timetables for Indian Institute of Information Technology, Tiruchirappalli.",
};

export default function HomePage() {
  return (
    <AppShell currentPath="/">
      <LandingAuthRedirect />
      <div className="space-y-16 py-6 sm:py-10 animate-in fade-in duration-300">
        {/* HERO SECTION: Mobility IIITT Aesthetic */}
        <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          {/* Left Column: Official Branding & Campus Identity */}
          <div className="space-y-6">
            {/* Mobility Signature Eyebrow */}
            <div className="landing-eyebrow">
              <span className="eyebrow-pulse" />
              <span>ACADEMIC LEDGER · 2026 SESSION · IIIT TIRUCHIRAPPALLI</span>
            </div>

            {/* Main Headline */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Image
                  src="/images/iiitt-logo.png"
                  alt="IIIT Trichy Official Emblem"
                  width={44}
                  height={44}
                  className="size-11 object-contain"
                  priority
                />
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-widest text-[#a5b09d] font-mono">
                    இந்திய தகவல் தொழில்நுட்பக் கழகம்
                  </h2>
                  <p className="text-[10px] text-muted font-mono uppercase">
                    Institute of National Importance · Govt. of India
                  </p>
                </div>
              </div>

              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-[-0.06em] leading-[0.93] text-ink uppercase mt-4">
                Know your attendance.<br />
                Every margin.<br />
                <span className="text-accent">Every class.</span>
              </h1>

              <p className="mt-4 max-w-xl text-xs sm:text-sm leading-relaxed text-muted">
                The official attendance ledger for IIIT Tiruchirappalli students and faculty.
                Automated 75% examination ordinance compliance, weekly schedule timetables, and
                safe bunk margin forecasting.
              </p>
            </div>

            {/* Permanent Campus Showcase Card: Sharp Mobility Architecture */}
            <div className="relative rounded-[3px] overflow-hidden border border-line group bg-surface">
              <div className="relative h-48 sm:h-56 w-full">
                <Image
                  src="/images/iiitt-campus.jpg"
                  alt="IIIT Tiruchirappalli Permanent Campus, Sethurappatti"
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-102"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-canvas via-canvas/50 to-transparent" />
              </div>

              <div className="absolute top-3 left-3 z-10">
                <span className="text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-[2px] bg-canvas/90 border border-line text-accent font-bold">
                  01 / SETHURAPPATTI (NH-45B)
                </span>
              </div>

              <div className="absolute bottom-0 inset-x-0 p-4 space-y-1 z-10">
                <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-accent">
                  <MapPin className="size-3.5" />
                  <span>Permanent Campus · Central Academic Block</span>
                </div>
                <p className="text-xs text-muted/90 max-w-md">
                  Smart lecture halls (LH-101 to LH-106), Central Computing Facility (CCF), and VLSI Labs synced to campus roll-call.
                </p>
              </div>
            </div>

            {/* Fast Stats Ticker: Precision Monospace */}
            <div className="grid grid-cols-3 gap-2.5 pt-1">
              <div className="p-3 rounded-[3px] bg-surface border border-line text-center">
                <span className="text-2xl sm:text-3xl font-black text-accent font-mono block">75%</span>
                <span className="text-[10px] text-muted font-mono uppercase mt-0.5 block">Statutory Rule</span>
              </div>
              <div className="p-3 rounded-[3px] bg-surface border border-line text-center">
                <span className="text-2xl sm:text-3xl font-black text-ink font-mono block">100%</span>
                <span className="text-[10px] text-muted font-mono uppercase mt-0.5 block">Roster Verified</span>
              </div>
              <div className="p-3 rounded-[3px] bg-surface border border-line text-center">
                <span className="text-2xl sm:text-3xl font-black text-[#c9d5b5] font-mono block">0</span>
                <span className="text-[10px] text-muted font-mono uppercase mt-0.5 block">Attendance Drift</span>
              </div>
            </div>
          </div>

          {/* Right Column: Institutional Gateway Access */}
          <div className="lg:sticky lg:top-24 space-y-4">
            <div className="p-6 sm:p-8 rounded-[3px] bg-surface border border-line space-y-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-accent" />
                  <span className="text-[10px] font-mono uppercase tracking-widest text-accent font-bold">
                    INSTITUTIONAL ACCESS
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold uppercase text-ink tracking-tight">
                  Sign In to Portal
                </h2>
                <p className="text-xs text-muted leading-relaxed">
                  Authentication is strictly restricted to verified <span className="text-ink font-mono font-medium">@iiitt.ac.in</span> institutional email accounts linked to the official institute roster.
                </p>
              </div>

              <div className="pt-2">
                <Link
                  href="/sign-in"
                  className="flex items-center justify-center gap-2 w-full py-3.5 px-4 rounded-[3px] bg-accent text-[#171915] font-bold text-xs uppercase tracking-wide font-mono hover:bg-[#cbf046] transition-all cursor-pointer shadow-sm"
                >
                  <span>Sign In with @iiitt.ac.in</span>
                  <ArrowRight className="size-4" />
                </Link>
              </div>

              <div className="border-t border-line pt-4 space-y-2 text-[11px] text-muted font-mono">
                <div className="flex items-center justify-between">
                  <span>Authentication Method</span>
                  <span className="text-ink">Passwordless Email Link</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Authorized Domain</span>
                  <span className="text-accent">@iiitt.ac.in</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Statutory Rule</span>
                  <span className="text-ink">75% Attendance Policy</span>
                </div>
              </div>
            </div>

            {/* Quick Helper Notes */}
            <div className="p-3.5 rounded-[3px] bg-surface border border-line text-xs text-muted space-y-1.5">
              <div className="flex items-center gap-2 font-bold font-mono text-ink text-[11px] uppercase">
                <ShieldCheck className="size-3.5 text-accent" />
                <span>Institutional Verification Guarantee</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Students and faculty authenticate via one-time secure link dispatched to their institutional mailbox. No third-party passwords or unverified claims.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 2: KEY PORTAL CAPABILITIES */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-line pb-4">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-accent font-bold block mb-1">
                PLATFORM CAPABILITIES
              </span>
              <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-ink">
                Engineered specifically for IIIT Trichy
              </h2>
            </div>
            <p className="text-xs text-muted max-w-sm">
              Built to eliminate spreadsheet errors, proxy attendance, and unexpected semester debar notices.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Pillar 1 */}
            <div className="p-5 rounded-[3px] bg-surface border border-line space-y-3 hover:border-accent/40 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-accent font-bold uppercase">
                  01 / STATUTORY RULE
                </span>
                <ShieldCheck className="size-4 text-accent" />
              </div>
              <h3 className="text-base font-bold text-ink uppercase">Independent 75% Ordinance</h3>
              <p className="text-xs text-muted leading-relaxed">
                Each subject is calculated independently. A 95% attendance in Data Structures will never offset a 68% shortfall in Discrete Mathematics.
              </p>
            </div>

            {/* Pillar 2 */}
            <div className="p-5 rounded-[3px] bg-surface border border-line space-y-3 hover:border-accent/40 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-accent font-bold uppercase">
                  02 / WEEKLY SCHEDULE
                </span>
                <Calendar className="size-4 text-accent" />
              </div>
              <h3 className="text-base font-bold text-ink uppercase">Weekly Timetable Sync</h3>
              <p className="text-xs text-muted leading-relaxed">
                View your complete Monday through Friday timetable with lecture halls, laboratory assignments, and instructor names in Asia/Kolkata time.
              </p>
            </div>

            {/* Pillar 3 */}
            <div className="p-5 rounded-[3px] bg-surface border border-line space-y-3 hover:border-accent/40 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-accent font-bold uppercase">
                  03 / RESOURCE SCHEDULING
                </span>
                <Clock className="size-4 text-accent" />
              </div>
              <h3 className="text-base font-bold text-ink uppercase">Classroom Conflict Detection</h3>
              <p className="text-xs text-muted leading-relaxed">
                Prevents faculty and clubs from double-booking lecture theatres (LH-101, Lab-2) with real-time room overlap detection.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 3: INSTITUTIONAL FOOTER */}
        <footer className="pt-8 border-t border-line text-xs text-muted space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Image
                src="/images/iiitt-seal.png"
                alt="IIITT Seal"
                width={32}
                height={32}
                className="object-contain"
              />
              <div>
                <span className="font-bold text-ink block uppercase text-[11px] tracking-wide">
                  Indian Institute of Information Technology, Tiruchirappalli
                </span>
                <span className="text-[10px] font-mono text-muted">
                  Sethurappatti, Trichy-Madurai National Highway (NH-45B), Tamil Nadu – 620012
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono font-bold">
              <a
                href="https://www.iiitt.ac.in"
                target="_blank"
                rel="noreferrer"
                className="hover:text-accent transition-colors flex items-center gap-1 uppercase"
              >
                <span>Official IIITT Site</span>
                <ExternalLink className="size-3" />
              </a>
              <a
                href="https://placement.iiitt.ac.in"
                target="_blank"
                rel="noreferrer"
                className="hover:text-accent transition-colors flex items-center gap-1 uppercase"
              >
                <span>Placements</span>
                <ExternalLink className="size-3" />
              </a>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-4 border-t border-line/40 text-[10px] font-mono">
            <span>© {new Date().getFullYear()} IIIT TIRUCHIRAPPALLI · ACADEMIC SERVICES DIVISION</span>
            <span className="text-muted/80 uppercase">CAMPUS IN MOTION · CLEAR LISTINGS · INFORMED ATTENDANCE</span>
          </div>
        </footer>
      </div>
    </AppShell>
  );
}
