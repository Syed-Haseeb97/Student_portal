import React from "react";
import Image from "next/image";
import { AppShell } from "@/components/layout/AppShell";
import { LandingAuthRedirect } from "@/components/landing/LandingAuthRedirect";
import { LandingAccessCard } from "@/components/landing/LandingAccessCard";
import {
  ShieldCheck,
  Calendar,
  Clock,
  MapPin,
  ExternalLink,
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

export default function HomePage() {
  return (
    <AppShell currentPath="/" hideFooter>
      <LandingAuthRedirect />

      <div className="space-y-16 py-4 sm:py-8 animate-in fade-in duration-300">
        {/* HERO SECTION: Official Branding + Campus Identity + Access Gate */}
        <section className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
          {/* Left Column: Official Institute Identity */}
          <div className="space-y-6">
            {/* Signature Eyebrow Capsule */}
            <div className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-1.5 text-xs text-muted shadow-xs">
              <span className="size-1.5 rounded-full bg-safe animate-pulse" />
              <span className="font-mono text-[11px] tracking-wider uppercase font-semibold text-safe">
                ACADEMIC LEDGER · 2026 SESSION · IIIT TIRUCHIRAPPALLI
              </span>
            </div>

            {/* Main Headline & Institute Branding */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="grid size-12 place-items-center rounded-2xl border border-line bg-white p-2 shadow-xs shrink-0">
                  <Image
                    src="/images/iiitt-logo.png"
                    alt="IIIT Tiruchirappalli Official Emblem"
                    width={40}
                    height={40}
                    className="size-full object-contain"
                    priority
                  />
                </div>
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-widest text-ink/80 font-mono">
                    இந்திய தகவல் தொழில்நுட்பக் கழகம்
                  </h2>
                  <p className="text-[10px] text-muted font-mono uppercase">
                    Institute of National Importance · Govt. of India
                  </p>
                </div>
              </div>

              <h1 className="font-serif text-4xl sm:text-6xl lg:text-7xl leading-[0.96] tracking-tight text-ink uppercase mt-4">
                Know your attendance.<br />
                Every margin.<br />
                <span className="text-safe">Every class.</span>
              </h1>

              <p className="mt-4 max-w-xl text-xs sm:text-sm leading-relaxed text-muted">
                The official attendance ledger for IIIT Tiruchirappalli students and faculty.
                Automated 75% examination ordinance compliance, weekly schedule timetables, and
                safe bunk margin forecasting.
              </p>
            </div>

            {/* Permanent Campus Showcase Card */}
            <div className="relative rounded-3xl overflow-hidden border border-line group bg-surface shadow-xs">
              <div className="relative h-48 sm:h-56 w-full">
                <Image
                  src="/images/iiitt-campus.jpg"
                  alt="IIIT Tiruchirappalli Permanent Campus, Sethurappatti"
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-102"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-paper via-paper/50 to-transparent" />
              </div>

              <div className="absolute top-3 left-3 z-10">
                <span className="text-[10px] font-mono uppercase tracking-widest px-3 py-1 rounded-full bg-paper/90 border border-line text-safe font-bold">
                  01 / SETHURAPPATTI (NH-45B)
                </span>
              </div>

              <div className="absolute bottom-0 inset-x-0 p-5 space-y-1 z-10">
                <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-safe">
                  <MapPin className="size-3.5" />
                  <span>Permanent Campus · Central Academic Block</span>
                </div>
                <p className="text-xs text-muted/90 max-w-md">
                  Smart lecture halls (LH-101 to LH-106), Central Computing Facility (CCF), and VLSI Labs synced to campus roll-call.
                </p>
              </div>
            </div>

            {/* Fast Stats Ticker */}
            <div className="grid grid-cols-3 gap-3 pt-1">
              <div className="py-3 px-2 sm:px-4 rounded-2xl bg-surface border border-line text-center flex flex-col items-center justify-center shadow-xs">
                <span className="text-base sm:text-xl font-extrabold text-ink font-mono">75%</span>
                <span className="text-[9px] sm:text-[10px] text-muted font-mono uppercase tracking-wider">Ordinance</span>
              </div>
              <div className="py-3 px-2 sm:px-4 rounded-2xl bg-surface border border-line text-center flex flex-col items-center justify-center shadow-xs">
                <span className="text-base sm:text-xl font-extrabold text-safe font-mono">100%</span>
                <span className="text-[9px] sm:text-[10px] text-muted font-mono uppercase tracking-wider">In-Session</span>
              </div>
              <div className="py-3 px-2 sm:px-4 rounded-2xl bg-surface border border-line text-center flex flex-col items-center justify-center shadow-xs">
                <span className="text-base sm:text-xl font-extrabold text-ink font-mono">3-Hr</span>
                <span className="text-[9px] sm:text-[10px] text-muted font-mono uppercase tracking-wider">Window</span>
              </div>
            </div>
          </div>

          {/* Right Column: Institutional Access / Active Session Gate */}
          <div className="lg:sticky lg:top-24">
            <LandingAccessCard />
          </div>
        </section>

        {/* SECTION 2: THREE PILLARS OF STATUTORY COMPLIANCE */}
        <section className="space-y-6 pt-4 border-t border-line">
          <div className="space-y-1">
            <span className="text-[11px] font-mono uppercase text-safe font-semibold tracking-wider">
              Statutory Governance
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif text-ink">
              Core Academic Directives
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Pillar 1 */}
            <div className="p-6 rounded-2xl bg-surface border border-line space-y-3 hover:border-safe/40 transition-all shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-safe font-bold uppercase px-2.5 py-0.5 rounded-full bg-safe-soft border border-safe/20">
                  01 / STATUTORY RULE
                </span>
                <ShieldCheck className="size-4 text-safe" />
              </div>
              <h3 className="text-base font-bold text-ink uppercase">Independent 75% Ordinance</h3>
              <p className="text-xs text-muted leading-relaxed">
                Each subject is calculated independently. A 95% attendance in Introduction to Computer Programming will never offset a 68% shortfall in Differential Calculus.
              </p>
            </div>

            {/* Pillar 2 */}
            <div className="p-6 rounded-2xl bg-surface border border-line space-y-3 hover:border-safe/40 transition-all shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-safe font-bold uppercase px-2.5 py-0.5 rounded-full bg-safe-soft border border-safe/20">
                  02 / WEEKLY SCHEDULE
                </span>
                <Calendar className="size-4 text-safe" />
              </div>
              <h3 className="text-base font-bold text-ink uppercase">Weekly Timetable Sync</h3>
              <p className="text-xs text-muted leading-relaxed">
                View your complete Monday through Friday timetable with lecture halls, laboratory assignments, and instructor names in Asia/Kolkata time.
              </p>
            </div>

            {/* Pillar 3 */}
            <div className="p-6 rounded-2xl bg-surface border border-line space-y-3 hover:border-safe/40 transition-all shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-safe font-bold uppercase px-2.5 py-0.5 rounded-full bg-safe-soft border border-safe/20">
                  03 / RESOURCE SCHEDULING
                </span>
                <Clock className="size-4 text-safe" />
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
                alt="IIITT Official Seal"
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
                className="hover:text-safe transition-colors flex items-center gap-1 uppercase"
              >
                <span>Official IIITT Site</span>
                <ExternalLink className="size-3" />
              </a>
              <a
                href="https://placement.iiitt.ac.in"
                target="_blank"
                rel="noreferrer"
                className="hover:text-safe transition-colors flex items-center gap-1 uppercase"
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
