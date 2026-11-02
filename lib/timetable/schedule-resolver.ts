import {
  BRANCH_TIMETABLES,
  PERIOD_SLOTS,
  resolveSlotCourse,
  type DayOfWeek,
  type BranchTimetable,
  type CourseDetail,
} from "./first-year-data";

export type AcademicClassType = "Lecture" | "Lab" | "Tutorial" | "Activity";

/**
 * Accurately determines whether a course offering is a Laboratory, Tutorial, Activity, or Lecture.
 */
export function getCourseClassType(course: CourseDetail): AcademicClassType {
  const name = course.name.toLowerCase();
  const code = course.code.toLowerCase();
  if (
    name.includes("laboratory") ||
    name.includes("lab") ||
    code.endsWith("02") ||
    code.endsWith("05") ||
    code.endsWith("04")
  ) {
    return "Lab";
  }
  if (name.includes("graphics") || name.includes("drawing") || name.includes("workshop")) {
    return "Lab";
  }
  if (name.includes("nss") || name.includes("ncc") || name.includes("well-being")) {
    return "Activity";
  }
  if (name.includes("tutorial") || name.includes("practice")) {
    return "Tutorial";
  }
  return "Lecture";
}

/**
 * Concise, high-legibility display titles engineered so they never clip or truncate
 * through letter descenders in the timetable grid or dashboard cards.
 */
export function getCourseDisplayTitle(course: CourseDetail, slotCode?: string): string {
  const code = course.code.toUpperCase().trim();
  const upperSlot = slotCode?.toUpperCase().trim() || "";

  // Batch-specific lab titles
  if (upperSlot.startsWith("F1")) return "Physics Lab (Batch 1)";
  if (upperSlot.startsWith("F2")) return "Physics Lab (Batch 2)";
  if (upperSlot.startsWith("F3")) return "Physics Lab (Batch 3)";
  if (upperSlot.startsWith("G1") && (code === "CS1102" || code === "CS1104")) return "Programming Lab (Batch 1)";
  if (upperSlot.startsWith("G2") && (code === "CS1102" || code === "CS1104")) return "Programming Lab (Batch 2)";
  if (upperSlot.startsWith("G3") && (code === "CS1102" || code === "CS1104")) return "Programming Lab (Batch 3)";
  if (upperSlot.startsWith("D1") && code === "ME1101") return "Graphics Lab (Batch 1)";
  if (upperSlot.startsWith("D2") && code === "ME1101") return "Graphics Lab (Batch 2)";
  if (upperSlot.startsWith("D3") && code === "ME1101") return "Graphics Lab (Batch 3)";
  if (upperSlot.startsWith("E1") && code === "EC1103") return "Electronics Lab (Batch 1)";
  if (upperSlot.startsWith("E2") && code === "EC1103") return "Electronics Lab (Batch 2)";
  if (upperSlot.startsWith("H1") && code === "EC1102") return "Electronics Lab (Batch 1)";

  if (code === "CS1101") return "Computer Programming";
  if (code === "CS1102") return "Programming Lab";
  if (code === "PH1101") return "Physics";
  if (code === "PH1102") return "Physics Lab";
  if (code === "MA1103") return "Calculus & Matrices";
  if (code === "ME1101") return "Engineering Graphics";
  if (code === "EC1103") return "Intro to Electronics";
  if (code === "HM1102") return "NSS / NCC & Well-Being";
  if (code === "EC1101") return "Digital Logic Design";
  if (code === "EC1102") return "Digital Logic Design Lab";
  if (code === "EC1104") return "Semiconductor Devices";
  if (code === "EC1105") return "Semiconductor Devices Lab";
  if (code === "CS1103") return "Foundations of AI & DS";
  if (code === "CS1104") return "AI & Data Science Lab";
  if (code === "VL1101") return "Basic VLSI Design";
  if (code === "VL1102") return "VLSI Design Lab";
  if (code === "ME1102") return "Engineering Practice";
  if (code === "ME2101") return "Basics of Mech. Eng.";
  if (code === "HM1101") return "Technical English";
  if (code === "MA1101") return "Engineering Maths 1";

  const name = course.name.trim();
  if (name.length > 25) {
    return name
      .replace(/Introduction to /gi, "")
      .replace(/Introduction of /gi, "")
      .replace(/Laboratory/gi, "Lab")
      .replace(/Engineering/gi, "Eng.")
      .replace(/Differential Calculus and Matrices/gi, "Calculus & Matrices");
  }
  return name;
}

/**
 * Identifies which lab batch (Batch 1, 2, or 3) a multi-period practical session belongs to.
 */
export function getSlotLabBatch(slotCode: string): "1" | "2" | "3" | null {
  const upper = slotCode.toUpperCase().trim();
  if (upper.startsWith("F1") || upper.startsWith("G1") || upper.startsWith("D1") || upper.startsWith("E1") || upper.startsWith("H1")) return "1";
  if (upper.startsWith("F2") || upper.startsWith("G2") || upper.startsWith("D2") || upper.startsWith("E2") || upper.startsWith("H2")) return "2";
  if (upper.startsWith("F3") || upper.startsWith("G3") || upper.startsWith("D3") || upper.startsWith("E3") || upper.startsWith("H3")) return "3";
  return null;
}

/**
 * Infers student lab batch (Batch 1: 1-22, Batch 2: 23-45, Batch 3: 46+) from student roll number.
 */
export function inferLabBatchFromRoll(rollOrEmail?: string): "1" | "2" | "3" | null {
  if (!rollOrEmail) return null;
  const clean = rollOrEmail.toLowerCase().split("@")[0]!;
  const match = clean.match(/^(?:20)?\d{2}(?:11|12|13|14)(\d{2,3})$/);
  if (match && match[1]) {
    const num = parseInt(match[1], 10);
    if (num <= 22) return "1";
    if (num <= 45) return "2";
    return "3";
  }
  return null;
}

/**
 * Clarifies multi-period slots and lab batches (e.g. F11, F12, F13 for Batch 1)
 */
export function getSlotBadge(slotCode: string, classType: AcademicClassType): string {
  const upper = slotCode.toUpperCase().trim();

  // Multi-slot physics lab batches
  if (upper === "F11") return "F11 · Batch 1 (1/3)";
  if (upper === "F12") return "F12 · Batch 1 (2/3)";
  if (upper === "F13") return "F13 · Batch 1 (3/3)";
  if (upper === "F21") return "F21 · Batch 2 (1/3)";
  if (upper === "F22") return "F22 · Batch 2 (2/3)";
  if (upper === "F23") return "F23 · Batch 2 (3/3)";
  if (upper === "F31") return "F31 · Batch 3 (1/3)";
  if (upper === "F32") return "F32 · Batch 3 (2/3)";
  if (upper === "F33") return "F33 · Batch 3 (3/3)";

  // Multi-slot programming lab
  if (upper === "G11") return "G11 · Batch 1 (1/3)";
  if (upper === "G12") return "G12 · Batch 1 (2/3)";
  if (upper === "G13") return "G13 · Batch 1 (3/3)";

  // Graphics lab
  if (upper === "D11") return "D11 · Batch 1 (1/3)";
  if (upper === "D12") return "D12 · Batch 1 (2/3)";
  if (upper === "D13") return "D13 · Batch 1 (3/3)";

  // Electronics lab
  if (upper === "E11") return "E11 · Batch 1 (1/2)";
  if (upper === "E12") return "E12 · Batch 1 (2/2)";

  // NSS / NCC
  if (upper.startsWith("H") || upper === "NSS" || upper === "NCC") return `${upper} · Activity`;

  return `${upper} · ${classType}`;
}

export function resolveClassRoom(course: CourseDetail, classType: AcademicClassType): string {
  const code = course.code.toUpperCase();
  if (classType === "Lab") {
    if (code === "PH1102") return "Physics Laboratory (Central Academic Block)";
    if (code === "CS1102" || code === "CS1104") return "Central Computer Lab 1";
    if (code === "ME1101" || code === "ME1102") return "Graphics & CAD Lab / Workshop";
    if (code === "EC1102" || code === "EC1103" || code === "EC1105") return "Basic Electronics Lab";
    return "Central Academic Laboratories";
  }
  if (classType === "Activity") {
    return "Institute Sports Ground / Activity Hall";
  }
  return "Smart Lecture Theatre (LH-101 / LH-102)";
}

export interface ResolvedSession {
  slotId: string;
  slotCode: string;
  day: DayOfWeek;
  start: string;
  end: string;
  startMinutes: number;
  endMinutes: number;
  code: string;
  title: string;
  type: string;
  classType: AcademicClassType;
  faculty: string;
  facultyEmail: string;
  facultyPhone: string;
  room: string;
  isPast: boolean;
  isOngoing: boolean;
  isNext: boolean;
  batchLabel?: string;
}

export interface UpcomingScheduleResult {
  todaySessions: ResolvedSession[];
  isWeekend: boolean;
  isDayComplete: boolean;
  ongoingSession: ResolvedSession | null;
  upNextSession: ResolvedSession;
  heroBadge: {
    status: "ongoing" | "upcoming_today" | "day_complete" | "weekend";
    label: string;
    timingLabel: string;
  };
}

/**
 * Checks whether a timetable slot is applicable for a given student's lab batch.
 * If studentBatch is null or "all", all slots are accepted.
 */
function isSlotApplicable(slotCode: string, studentBatch?: "1" | "2" | "3" | "all" | null): boolean {
  if (!studentBatch || studentBatch === "all") return true;
  const labBatch = getSlotLabBatch(slotCode);
  if (labBatch === null) return true; // Theory lecture or common class
  return labBatch === studentBatch;
}

/**
 * Resolves dayIndex (0 = Sun .. 6 = Sat) and minutes into the day (0..1439) in Indian Standard Time (IST).
 * IIIT Tiruchirappalli is located in India (IST, UTC+05:30). Anchoring to IST ensures deterministic,
 * accurate results across all client devices, international travel, and UTC server environments.
 */
export function getISTDateParts(date: Date): { dayIndex: number; currentMinutes: number } {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  let weekdayStr = "";
  let hourStr = "0";
  let minStr = "0";
  for (const p of parts) {
    if (p.type === "weekday") weekdayStr = p.value;
    if (p.type === "hour") hourStr = p.value;
    if (p.type === "minute") minStr = p.value;
  }
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const dayIndex = weekdayMap[weekdayStr] ?? date.getDay();
  const hour = parseInt(hourStr, 10) % 24;
  const minute = parseInt(minStr, 10);
  return { dayIndex, currentMinutes: hour * 60 + minute };
}

/**
 * Real-time authoritative schedule resolution for students.
 * Accurately determines:
 * 1. Today's full chronological session list with live past/ongoing/next status.
 * 2. True live ongoing class if one is currently in session.
 * 3. True upcoming class:
 *    - If classes remain today, the next one today with countdown (e.g. "Starts in 15m").
 *    - If all classes for today are finished, tomorrow's first scheduled class.
 *    - If weekend (Sat/Sun), Monday's first scheduled class.
 */
export function resolveUpcomingSchedule(
  branchCode: string = "11",
  studentBatch?: "1" | "2" | "3" | "all" | null,
  referenceDate: Date = new Date()
): UpcomingScheduleResult {
  const timetable: BranchTimetable =
    BRANCH_TIMETABLES[branchCode] ||
    BRANCH_TIMETABLES["11"];

  const { dayIndex, currentMinutes } = getISTDateParts(referenceDate);
  const isWeekend = dayIndex === 0 || dayIndex === 6;

  const dayMap: Record<number, DayOfWeek> = {
    1: "Monday",
    2: "Tuesday",
    3: "Wednesday",
    4: "Thursday",
    5: "Friday",
  };

  // Helper to resolve one day's sessions
  function buildDaySessions(dayName: DayOfWeek, checkCurrentTime: boolean = false): ResolvedSession[] {
    const slotCodes = timetable.schedule[dayName] || [];
    const list: ResolvedSession[] = [];

    slotCodes.forEach((slotCode, idx) => {
      if (!slotCode || slotCode === "BREAK" || slotCode === "LUNCH") return;
      const period = PERIOD_SLOTS[idx];
      if (!period || period.isBreak) return;

      const course = resolveSlotCourse(timetable, slotCode);
      if (!course) return;

      const [startH, startM] = period.startTime.split(":").map(Number);
      const [endH, endM] = period.endTime.split(":").map(Number);
      const startMin = startH * 60 + startM;
      const endMin = endH * 60 + endM;
      const classType = getCourseClassType(course);
      const displayTitle = getCourseDisplayTitle(course, slotCode);
      const room = resolveClassRoom(course, classType);
      const slotBadge = getSlotBadge(slotCode, classType);

      const isPast = checkCurrentTime ? currentMinutes > endMin : false;
      const isOngoing = checkCurrentTime ? currentMinutes >= startMin && currentMinutes <= endMin : false;

      list.push({
        slotId: period.id,
        slotCode,
        day: dayName,
        start: period.startTime,
        end: period.endTime,
        startMinutes: startMin,
        endMinutes: endMin,
        code: course.code,
        title: displayTitle,
        type: slotBadge,
        classType,
        faculty: course.facultyName,
        facultyEmail: course.facultyEmail,
        facultyPhone: course.facultyPhone,
        room,
        isPast,
        isOngoing,
        isNext: false, // will mark below
        batchLabel: getSlotLabBatch(slotCode) ? `Batch ${getSlotLabBatch(slotCode)}` : undefined,
      });
    });

    return list;
  }

  // 1. Resolve today's sessions if weekday
  let todaySessions: ResolvedSession[] = [];
  let ongoingSession: ResolvedSession | null = null;
  let upcomingTodaySession: ResolvedSession | null = null;
  let isDayComplete = false;

  if (!isWeekend) {
    const todayName = dayMap[dayIndex]!;
    todaySessions = buildDaySessions(todayName, true);

    // Identify ongoing session
    ongoingSession = todaySessions.find((s) => s.isOngoing && isSlotApplicable(s.slotCode, studentBatch)) || null;

    // Identify next upcoming session today (not past, not currently ongoing)
    upcomingTodaySession = todaySessions.find((s) => !s.isPast && !s.isOngoing && isSlotApplicable(s.slotCode, studentBatch)) || null;

    // If an ongoing session exists, mark it
    if (ongoingSession) {
      ongoingSession.isNext = true;
    } else if (upcomingTodaySession) {
      upcomingTodaySession.isNext = true;
    }

    // Determine if all applicable classes for today are complete
    const applicableToday = todaySessions.filter((s) => isSlotApplicable(s.slotCode, studentBatch));
    isDayComplete = applicableToday.length > 0 && applicableToday.every((s) => s.isPast);
  }

  // 2. If ongoing right now:
  if (ongoingSession) {
    const remaining = Math.max(0, ongoingSession.endMinutes - currentMinutes);
    return {
      todaySessions,
      isWeekend: false,
      isDayComplete: false,
      ongoingSession,
      upNextSession: ongoingSession,
      heroBadge: {
        status: "ongoing",
        label: remaining > 0 ? `Live now · Ends in ${remaining}m` : "Live now",
        timingLabel: `Today · ${ongoingSession.start} – ${ongoingSession.end}`,
      },
    };
  }

  // 3. If there is a class coming up later today:
  if (upcomingTodaySession) {
    const minutesToStart = Math.max(0, upcomingTodaySession.startMinutes - currentMinutes);
    let label = `Starts in ${minutesToStart}m`;
    if (minutesToStart > 60) {
      const h = Math.floor(minutesToStart / 60);
      const m = minutesToStart % 60;
      label = m > 0 ? `Starts in ${h}h ${m}m` : `Starts in ${h}h`;
    }
    return {
      todaySessions,
      isWeekend: false,
      isDayComplete: false,
      ongoingSession: null,
      upNextSession: upcomingTodaySession,
      heroBadge: {
        status: "upcoming_today",
        label: `Up next today · ${label}`,
        timingLabel: `Today · ${upcomingTodaySession.start} – ${upcomingTodaySession.end}`,
      },
    };
  }

  // 4. If all of today's classes ended OR it's a weekend:
  // Scan forward in the week to find the very next working class!
  for (let offset = 1; offset <= 7; offset++) {
    const nextDayIndex = (dayIndex + offset) % 7;
    const nextDayName = dayMap[nextDayIndex];
    if (!nextDayName) continue; // Skip Sat (6) and Sun (0)

    const nextDaySessions = buildDaySessions(nextDayName, false);
    const firstApplicable = nextDaySessions.find((s) => isSlotApplicable(s.slotCode, studentBatch));

    if (firstApplicable) {
      const isTomorrow = offset === 1;
      const status: "day_complete" | "weekend" = isWeekend || offset > 1 ? "weekend" : "day_complete";
      const dayDescriptor = isTomorrow ? "Tomorrow" : nextDayName;

      return {
        todaySessions,
        isWeekend,
        isDayComplete: !isWeekend && isDayComplete,
        ongoingSession: null,
        upNextSession: firstApplicable,
        heroBadge: {
          status,
          label: isTomorrow
            ? `Next class tomorrow (${nextDayName})`
            : `Next class on ${nextDayName}`,
          timingLabel: `${dayDescriptor} · ${firstApplicable.start} – ${firstApplicable.end}`,
        },
      };
    }
  }

  // Fallback if timetable is somehow completely empty
  const fallback = todaySessions[0] || {
    slotId: "P1",
    slotCode: "C1",
    day: "Monday" as DayOfWeek,
    start: "09:20",
    end: "10:10",
    startMinutes: 560,
    endMinutes: 610,
    code: "CS1101",
    title: "Computer Programming",
    type: "Lecture · C1",
    classType: "Lecture" as AcademicClassType,
    faculty: "Dr. Anoop Jacob Thomas",
    facultyEmail: "anoopjt@iiitt.ac.in",
    facultyPhone: "+91 76962 65939",
    room: "Smart Lecture Theatre (LH-101 / LH-102)",
    isPast: false,
    isOngoing: false,
    isNext: true,
  };

  return {
    todaySessions,
    isWeekend,
    isDayComplete: true,
    ongoingSession: null,
    upNextSession: fallback,
    heroBadge: {
      status: "day_complete",
      label: "Next scheduled class",
      timingLabel: `Monday · ${fallback.start} – ${fallback.end}`,
    },
  };
}
