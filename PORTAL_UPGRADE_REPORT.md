# IIIT Tiruchirappalli Student Portal — Complete Overhaul & Feature Parity Report

## Executive Summary
The `Student_portal` repository has been comprehensively refactored and modernized to serve as a production-grade campus attendance and academic companion portal for **Indian Institute of Information Technology, Tiruchirappalli (IIITT)**.

Borrowing high-impact student and faculty capabilities from `presnt-main` (`D:\downloads\presnt-main\presnt-main`), the portal has been transformed from a static mock display into an institutional, security-hardened, and student-focused web platform.

---

## 1. Landing Page Transformation: Login & Email Verification First
- **Previous Flaw**: The landing page originally rendered a generic sample mock student with hardcoded data before any user authentication.
- **Modernized Experience**:
  - Replaced the landing page (`/`) with a secure **Institutional Gateway Card** (`InstitutionalAuthGate.tsx`).
  - Strict domain validation for official institute email addresses (`@iiitt.ac.in`).
  - **Server-Side One-Time Passcode (OTP)** verification flow (`/api/auth/send-verification` and `/api/auth/verify-code`).
  - Real email dispatching via **Resend API** with HTML templating and local sandbox/dev support (`devCode`).
  - **Presnt-Inspired Attendance & Bunk Margin Calculator**: Embedded directly on the landing page, enabling students to calculate their safe bunks or required recovery classes against the strict 75% threshold before logging in.
  - Active session detection: Users with an active session are immediately greeted and can jump to their dashboard with a single click.

---

## 2. Presnt Feature Parity: Weekly Timetable & Class Schedule
- **New Component**: `StudentTimetableView.tsx`
- **Features**:
  - Weekly schedule organized by day (Monday through Friday) synced to **Asia/Kolkata wall-clock time**.
  - Current day auto-highlight with active status indicator.
  - Class cards displaying start/end times, course code, course title, room/lecture hall (e.g. `LH-101`, `Hardware Lab-2`), type badge (`Lecture`, `Lab`, `Tutorial`), and faculty instructor.
  - Quick attendance preview badge on each scheduled class.
  - One-click **Subject Details** button to inspect that course's full attendance history.

---

## 3. Presnt Feature Parity: Subject Detail & Session History Breakdown
- **New Component**: `StudentSubjectDetailModal.tsx`
- **Features**:
  - Triggered whenever a student clicks on any course card in `/dashboard` or within the timetable view.
  - **Attendance Progress Ring**: Circular visual gauge with attended, missed, and total completed session tallies.
  - **Presnt Bunk Engine**: Computes exact real-time guidance:
    - *Compliant Course*: "Safe Bunk Margin: You can safely miss X classes without dipping below 75%."
    - *Shortfall Course*: "Recovery Target: Attend next Y consecutive classes to reach 75%."
  - **Chronological Session Attendance History**:
    - Complete roll-call record list: Date, time, classroom, topic covered, and status badge (`Present`, `Absent`, `Scheduled`, `Cancelled`).
    - Tab filters to isolate `All`, `Present`, `Absent`, or `Scheduled` sessions.

---

## 4. Presnt 1.0.6 Parity: Faculty Classroom Conflict Detection Engine
- **Files**: `SessionCreateModal.tsx`, `lib/api/client.ts`, `lib/api/client.test.ts`
- **Features**:
  - Real-time room and time overlap detection: When faculty schedules a session, the system cross-checks existing sessions in that room on that date.
  - Instant amber conflict alert in the UI:
    > "Classroom Scheduling Conflict: LH-101 is already booked on 2026-10-27 from 09:00 – 10:00 for CS201 (Data Structures and Algorithms). Please choose a different classroom or time slot."
  - Modal form prevents submission and API returns HTTP `409 Conflict` if a clash exists.

---

## 5. Security & Architectural Cleanups
1. **Purged Foreign Bloat**: Removed 3 untracked copies of the Expo/React Native mobile app inside `Student_portal` (>300 MB) that were causing TypeScript and ESLint failures.
2. **Removed Client-Side Secrets**: Eliminated client-side Resend API key exposure. Email delivery and verification now execute strictly on server routes (`app/api/auth/*`).
3. **React 19 / Next.js 16 Hook Integrity**: Fixed cascading render errors (`react-hooks/set-state-in-effect`) and memoization warnings across all components.
4. **Independent 75% Policy Enforcement**: Scheduled and cancelled sessions are excluded; each course offering is calculated independently.

---

## 6. Verification & Quality Gates
- **ESLint**: 0 errors, 0 warnings.
- **TypeScript (`tsc --noEmit`)**: 0 errors.
- **Test Suite (`npm test`)**: **40/40 tests passing** across attendance calculation, roster validation, HTTP bounded JSON, API client, timetable, session history, and conflict detection.
- **Production Build (`next build` with Turbopack)**: All 16 routes statically and dynamically generated with 0 errors in 39.1s.
