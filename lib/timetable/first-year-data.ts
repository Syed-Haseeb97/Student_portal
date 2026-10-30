export type DayOfWeek = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday";

export interface PeriodSlot {
  id: string; // e.g. "P1", "B1", "P3", "LUNCH", etc.
  label: string; // "Period 1", "Morning Break", etc.
  startTime: string; // "09:20"
  endTime: string; // "10:10"
  isBreak?: boolean;
}

export interface CourseDetail {
  code: string;
  name: string;
  credits: number;
  type: string;
  facultyName: string;
  facultyEmail: string;
  facultyPhone: string;
  slotLetter: string;
  theme: {
    bg: string;
    border: string;
    text: string;
    badgeBg: string;
    badgeText: string;
    glow: string;
    accentHex: string;
  };
}

export interface TimetableCell {
  slotCode: string; // "C1", "F11", "BREAK", "LUNCH", etc.
  courseCode?: string;
  label?: string; // e.g. "Physics Lab"
  isBreak?: boolean;
}

export interface BranchTimetable {
  branchCode: "11" | "12" | "13" | "14";
  branchName: string;
  shortName: string;
  degree: string;
  semester: string;
  academicYear: string;
  courses: Record<string, CourseDetail>; // slotLetter -> CourseDetail
  schedule: Record<DayOfWeek, (string | null)[]>; // array of 10 slots matching PERIOD_SLOTS
}

export const PERIOD_SLOTS: PeriodSlot[] = [
  { id: "P1", label: "Period 1", startTime: "09:20", endTime: "10:10" },
  { id: "P2", label: "Period 2", startTime: "10:10", endTime: "11:00" },
  { id: "TB1", label: "Tea Break", startTime: "11:00", endTime: "11:20", isBreak: true },
  { id: "P3", label: "Period 3", startTime: "11:20", endTime: "12:10" },
  { id: "P4", label: "Period 4", startTime: "12:10", endTime: "13:00" },
  { id: "LUNCH", label: "Lunch Break", startTime: "13:00", endTime: "14:00", isBreak: true },
  { id: "P5", label: "Period 5", startTime: "14:00", endTime: "14:50" },
  { id: "P6", label: "Period 6", startTime: "14:50", endTime: "15:40" },
  { id: "TB2", label: "Tea Break", startTime: "15:40", endTime: "16:00", isBreak: true },
  { id: "P7", label: "Period 7", startTime: "16:00", endTime: "16:50" },
];

export const COLOR_THEMES = {
  mathematics: {
    bg: "bg-indigo-500/10 hover:bg-indigo-500/20",
    border: "border-indigo-500/30 hover:border-indigo-500/60",
    text: "text-indigo-300",
    badgeBg: "bg-indigo-500/20",
    badgeText: "text-indigo-200",
    glow: "shadow-[0_0_15px_rgba(99,102,241,0.2)]",
    accentHex: "#818cf8",
  },
  physics: {
    bg: "bg-cyan-500/10 hover:bg-cyan-500/20",
    border: "border-cyan-500/30 hover:border-cyan-500/60",
    text: "text-cyan-300",
    badgeBg: "bg-cyan-500/20",
    badgeText: "text-cyan-200",
    glow: "shadow-[0_0_15px_rgba(6,182,212,0.2)]",
    accentHex: "#22d3ee",
  },
  programming: {
    bg: "bg-emerald-500/10 hover:bg-emerald-500/20",
    border: "border-emerald-500/30 hover:border-emerald-500/60",
    text: "text-emerald-300",
    badgeBg: "bg-emerald-500/20",
    badgeText: "text-emerald-200",
    glow: "shadow-[0_0_15px_rgba(16,185,129,0.2)]",
    accentHex: "#34d399",
  },
  engineering: {
    bg: "bg-amber-500/10 hover:bg-amber-500/20",
    border: "border-amber-500/30 hover:border-amber-500/60",
    text: "text-amber-300",
    badgeBg: "bg-amber-500/20",
    badgeText: "text-amber-200",
    glow: "shadow-[0_0_15px_rgba(245,158,11,0.2)]",
    accentHex: "#fbbf24",
  },
  electronics: {
    bg: "bg-rose-500/10 hover:bg-rose-500/20",
    border: "border-rose-500/30 hover:border-rose-500/60",
    text: "text-rose-300",
    badgeBg: "bg-rose-500/20",
    badgeText: "text-rose-200",
    glow: "shadow-[0_0_15px_rgba(244,63,94,0.2)]",
    accentHex: "#fb7185",
  },
  humanities: {
    bg: "bg-blue-500/10 hover:bg-blue-500/20",
    border: "border-blue-500/30 hover:border-blue-500/60",
    text: "text-blue-300",
    badgeBg: "bg-blue-500/20",
    badgeText: "text-blue-200",
    glow: "shadow-[0_0_15px_rgba(59,130,246,0.2)]",
    accentHex: "#60a5fa",
  },
  skills: {
    bg: "bg-purple-500/10 hover:bg-purple-500/20",
    border: "border-purple-500/30 hover:border-purple-500/60",
    text: "text-purple-300",
    badgeBg: "bg-purple-500/20",
    badgeText: "text-purple-200",
    glow: "shadow-[0_0_15px_rgba(168,85,247,0.2)]",
    accentHex: "#c084fc",
  },
  break: {
    bg: "bg-white/[0.02]",
    border: "border-line/40",
    text: "text-muted/60",
    badgeBg: "bg-white/5",
    badgeText: "text-muted",
    glow: "",
    accentHex: "#6b7280",
  },
};

export const BRANCH_TIMETABLES: Record<string, BranchTimetable> = {
  // CSE - Branch 11
  "11": {
    branchCode: "11",
    branchName: "Computer Science & Engineering",
    shortName: "CSE Core",
    degree: "B.Tech",
    semester: "Semester I (Odd)",
    academicYear: "2026-27",
    courses: {
      A: {
        code: "MA1103",
        name: "Differential Calculus and Matrices",
        credits: 3,
        type: "GIR",
        facultyName: "Mr. Karuppasamy S",
        facultyEmail: "karuppasamys.tf@iiitt.ac.in",
        facultyPhone: "+91 96551 14806",
        slotLetter: "A",
        theme: COLOR_THEMES.mathematics,
      },
      B: {
        code: "PH1101",
        name: "Physics",
        credits: 3,
        type: "GIR",
        facultyName: "Dr. K. Kamakshi",
        facultyEmail: "kamakshik@iiitt.ac.in",
        facultyPhone: "+91 89781 63865",
        slotLetter: "B",
        theme: COLOR_THEMES.physics,
      },
      C: {
        code: "CS1101",
        name: "Introduction to Computer Programming",
        credits: 3,
        type: "GIR",
        facultyName: "Dr. Anoop Jacob Thomas",
        facultyEmail: "anoopjt@iiitt.ac.in",
        facultyPhone: "+91 76962 65939",
        slotLetter: "C",
        theme: COLOR_THEMES.programming,
      },
      D: {
        code: "ME1101",
        name: "Engineering Graphics",
        credits: 2,
        type: "GIR",
        facultyName: "Dr. Velmurugan C",
        facultyEmail: "velmuruganc@iiitt.ac.in",
        facultyPhone: "+91 99430 22961",
        slotLetter: "D",
        theme: COLOR_THEMES.engineering,
      },
      E: {
        code: "EC1103",
        name: "Introduction to Electronics Engineering",
        credits: 3,
        type: "GIR",
        facultyName: "Dr. T. Devashena",
        facultyEmail: "tdevashena@gmail.com",
        facultyPhone: "+91 98432 85927",
        slotLetter: "E",
        theme: COLOR_THEMES.electronics,
      },
      F: {
        code: "PH1102",
        name: "Physics Laboratory",
        credits: 2,
        type: "GIR",
        facultyName: "Dr. K. Kamakshi",
        facultyEmail: "kamakshik@iiitt.ac.in",
        facultyPhone: "+91 89781 63865",
        slotLetter: "F",
        theme: COLOR_THEMES.physics,
      },
      G: {
        code: "CS1102",
        name: "Introduction to Computer Programming Laboratory",
        credits: 2,
        type: "GIR",
        facultyName: "Dr. K. Jayasri",
        facultyEmail: "jayasrik.tf@iiitt.ac.in",
        facultyPhone: "+91 63808 73082",
        slotLetter: "G",
        theme: COLOR_THEMES.programming,
      },
      H: {
        code: "HM1102",
        name: "NSS / NCC / Emotional Intelligence and Well-Being",
        credits: 0,
        type: "GIR",
        facultyName: "Dr. B. Ravi",
        facultyEmail: "ravib@iiitt.ac.in",
        facultyPhone: "+91 98498 82720",
        slotLetter: "H",
        theme: COLOR_THEMES.skills,
      },
    },
    schedule: {
      Monday: ["C1", "F11", null, "F12", "F13", null, "D11", "D12", null, "D13"],
      Tuesday: [null, "F21", null, "F22", "F23", null, "A1", "E11", null, "E12"],
      Wednesday: ["E1", "G11", null, "G12", "G13", null, "A2", "B1", null, null],
      Thursday: ["A3", "D1", null, "C2", "E2", null, "B2", null, null, null],
      Friday: ["C3", "F31", null, "F32", "F33", null, "B3", "H1", null, "H2"],
    },
  },

  // CSE AI & DS - Branch 13
  "13": {
    branchCode: "13",
    branchName: "Computer Science & Engineering (AI & DS)",
    shortName: "CSE AI & DS",
    degree: "B.Tech",
    semester: "Semester I (Odd)",
    academicYear: "2026-27",
    courses: {
      A: {
        code: "MA1103",
        name: "Differential Calculus and Matrices",
        credits: 3,
        type: "GIR",
        facultyName: "Mr. Karuppasamy S",
        facultyEmail: "karuppasamys.tf@iiitt.ac.in",
        facultyPhone: "+91 96551 14806",
        slotLetter: "A",
        theme: COLOR_THEMES.mathematics,
      },
      B: {
        code: "PH1101",
        name: "Physics",
        credits: 3,
        type: "GIR",
        facultyName: "Dr. K. Kamakshi",
        facultyEmail: "kamakshik@iiitt.ac.in",
        facultyPhone: "+91 89781 63865",
        slotLetter: "B",
        theme: COLOR_THEMES.physics,
      },
      C: {
        code: "CS1101",
        name: "Introduction to Computer Programming",
        credits: 3,
        type: "GIR",
        facultyName: "Dr. Anoop Jacob Thomas",
        facultyEmail: "anoopjt@iiitt.ac.in",
        facultyPhone: "+91 76962 65939",
        slotLetter: "C",
        theme: COLOR_THEMES.programming,
      },
      D: {
        code: "ME1101",
        name: "Engineering Graphics",
        credits: 3,
        type: "GIR",
        facultyName: "Dr. Velmurugan C",
        facultyEmail: "velmuruganc@iiitt.ac.in",
        facultyPhone: "+91 99430 22961",
        slotLetter: "D",
        theme: COLOR_THEMES.engineering,
      },
      E: {
        code: "EC1103",
        name: "Introduction to Electronics Engineering",
        credits: 3,
        type: "GIR",
        facultyName: "Dr. T. Devashena",
        facultyEmail: "tdevashena@gmail.com",
        facultyPhone: "+91 98432 85927",
        slotLetter: "E",
        theme: COLOR_THEMES.electronics,
      },
      F: {
        code: "PH1102",
        name: "Physics Laboratory",
        credits: 2,
        type: "GIR",
        facultyName: "Dr. K. Kamakshi",
        facultyEmail: "kamakshik@iiitt.ac.in",
        facultyPhone: "+91 89781 63865",
        slotLetter: "F",
        theme: COLOR_THEMES.physics,
      },
      G: {
        code: "CS1102",
        name: "Introduction to Computer Programming Laboratory",
        credits: 2,
        type: "GIR",
        facultyName: "Dr. K. Jayasri",
        facultyEmail: "jayasrik.tf@iiitt.ac.in",
        facultyPhone: "+91 63808 73082",
        slotLetter: "G",
        theme: COLOR_THEMES.programming,
      },
      H: {
        code: "HM1102",
        name: "NSS / NCC / Emotional Intelligence and Well-Being",
        credits: 0,
        type: "GIR",
        facultyName: "Dr. B. Ravi",
        facultyEmail: "ravib@iiitt.ac.in",
        facultyPhone: "+91 98498 82720",
        slotLetter: "H",
        theme: COLOR_THEMES.skills,
      },
    },
    schedule: {
      Monday: [null, "D1", null, "A1", null, null, "C1", "B1", null, null],
      Tuesday: ["C2", "G11", null, "G12", "G13", null, "E1", "B2", null, null],
      Wednesday: ["A2", "F11", null, "F12", "F13", null, "D11", "D12", null, "D13"],
      Thursday: ["E2", "F21", null, "F22", "F23", null, "C3", "E11", null, "E12"],
      Friday: ["A3", "H1", null, "H2", "B3", null, "F31", "F32", null, "F33"],
    },
  },

  // ECE Core - Branch 12
  "12": {
    branchCode: "12",
    branchName: "Electronics & Communication Engineering",
    shortName: "ECE Core",
    degree: "B.Tech",
    semester: "Semester I (Odd)",
    academicYear: "2026-27",
    courses: {
      A: {
        code: "MA1101",
        name: "Mathematics-I",
        credits: 4,
        type: "GIR",
        facultyName: "Dr. Poornima P",
        facultyEmail: "poornimap.tf@iiitt.ac.in",
        facultyPhone: "+91 88914 42676",
        slotLetter: "A",
        theme: COLOR_THEMES.mathematics,
      },
      B: {
        code: "HM1101",
        name: "English for Communication",
        credits: 2,
        type: "GIR",
        facultyName: "Dr. Sindhu V",
        facultyEmail: "sindhuv@iiitt.ac.in",
        facultyPhone: "+91 88705 14441",
        slotLetter: "B",
        theme: COLOR_THEMES.humanities,
      },
      C: {
        code: "CS1101",
        name: "Introduction to Computer Programming",
        credits: 2,
        type: "GIR",
        facultyName: "Dr. Anoop Jacob Thomas",
        facultyEmail: "anoopjt@iiitt.ac.in",
        facultyPhone: "+91 76962 65939",
        slotLetter: "C",
        theme: COLOR_THEMES.programming,
      },
      D: {
        code: "EC1101",
        name: "Introduction of Electronics & Communication Engineering",
        credits: 3,
        type: "GIR",
        facultyName: "Dr. M. Harish Adhithya",
        facultyEmail: "harishadhithyam@iiitt.ac.in",
        facultyPhone: "+91 78452 37545",
        slotLetter: "D",
        theme: COLOR_THEMES.electronics,
      },
      E: {
        code: "ME2101",
        name: "Basics of Mechanical Engineering",
        credits: 3,
        type: "GIR",
        facultyName: "Dr. Velmurugan C",
        facultyEmail: "velmuruganc@iiitt.ac.in",
        facultyPhone: "+91 99430 22961",
        slotLetter: "E",
        theme: COLOR_THEMES.engineering,
      },
      F: {
        code: "EC1102",
        name: "Electronics Laboratory",
        credits: 2,
        type: "GIR",
        facultyName: "Dr. M. Harish Adhithya",
        facultyEmail: "harishadhithyam@iiitt.ac.in",
        facultyPhone: "+91 78452 37545",
        slotLetter: "F",
        theme: COLOR_THEMES.electronics,
      },
      G: {
        code: "CS1102",
        name: "Introduction to Computer Programming Laboratory",
        credits: 2,
        type: "GIR",
        facultyName: "Dr. J. Kokila",
        facultyEmail: "kokilaj@iiitt.ac.in",
        facultyPhone: "+91 95978 18491",
        slotLetter: "G",
        theme: COLOR_THEMES.programming,
      },
      H: {
        code: "ME1102",
        name: "Basics of Mechanical Engineering Laboratory",
        credits: 2,
        type: "GIR",
        facultyName: "Dr. Velmurugan C",
        facultyEmail: "velmuruganc@iiitt.ac.in",
        facultyPhone: "+91 99430 22961",
        slotLetter: "H",
        theme: COLOR_THEMES.engineering,
      },
      I: {
        code: "HM1102",
        name: "NSS / NCC / Emotional Intelligence and Well-Being",
        credits: 0,
        type: "GIR",
        facultyName: "Dr. B. Ravi",
        facultyEmail: "ravib@iiitt.ac.in",
        facultyPhone: "+91 98498 82720",
        slotLetter: "I",
        theme: COLOR_THEMES.skills,
      },
    },
    schedule: {
      Monday: ["D1", "C1", null, "B1", null, null, "F11", "F12", null, "F13"],
      Tuesday: ["A1", "E1", null, null, null, null, "H11", "H12", null, "H13"],
      Wednesday: [null, "D2", null, "C2", "A2", null, "G11", "G12", null, "G13"],
      Thursday: [null, "B2", null, null, "D3", null, "NSS", "NSS", null, "NSS"],
      Friday: ["A3", "E2", null, "C3", null, null, null, null, null, null],
    },
  },

  // ECE VLSI Design - Branch 14
  "14": {
    branchCode: "14",
    branchName: "Electronics & Communication Engineering (VLSI Design)",
    shortName: "VLSI Design",
    degree: "B.Tech",
    semester: "Semester I (Odd)",
    academicYear: "2026-27",
    courses: {
      A: {
        code: "MA1101",
        name: "Engineering Mathematics-I",
        credits: 3,
        type: "GIR",
        facultyName: "Dr. Poornima P",
        facultyEmail: "poornimap.tf@iiitt.ac.in",
        facultyPhone: "+91 88914 42676",
        slotLetter: "A",
        theme: COLOR_THEMES.mathematics,
      },
      B: {
        code: "HM1101",
        name: "Technical English",
        credits: 2,
        type: "GIR",
        facultyName: "Dr. Sindhu V",
        facultyEmail: "sindhuv@iiitt.ac.in",
        facultyPhone: "+91 88705 14441",
        slotLetter: "B",
        theme: COLOR_THEMES.humanities,
      },
      C: {
        code: "CS1101",
        name: "Introduction to Computer Programming",
        credits: 3,
        type: "GIR",
        facultyName: "Dr. J. Kokila",
        facultyEmail: "kokilaj@iiitt.ac.in",
        facultyPhone: "+91 95978 18491",
        slotLetter: "C",
        theme: COLOR_THEMES.programming,
      },
      D: {
        code: "ME2101",
        name: "Basics of Mechanical Engineering",
        credits: 3,
        type: "GIR",
        facultyName: "Dr. Velmurugan C",
        facultyEmail: "velmuruganc@iiitt.ac.in",
        facultyPhone: "+91 99430 22961",
        slotLetter: "D",
        theme: COLOR_THEMES.engineering,
      },
      E: {
        code: "EC1101",
        name: "Introduction of Electronics & Communication Engineering",
        credits: 3,
        type: "GIR",
        facultyName: "Dr. M. Harish Adhithya",
        facultyEmail: "harishadhithyam@iiitt.ac.in",
        facultyPhone: "+91 78452 37545",
        slotLetter: "E",
        theme: COLOR_THEMES.electronics,
      },
      F: {
        code: "ME1102",
        name: "Engineering Practice",
        credits: 2,
        type: "GIR",
        facultyName: "Dr. Velmurugan C",
        facultyEmail: "velmuruganc@iiitt.ac.in",
        facultyPhone: "+91 99430 22961",
        slotLetter: "F",
        theme: COLOR_THEMES.engineering,
      },
      G: {
        code: "CS1102",
        name: "Introduction to Computer Programming Laboratory",
        credits: 2,
        type: "GIR",
        facultyName: "Dr. J. Kokila",
        facultyEmail: "kokilaj@iiitt.ac.in",
        facultyPhone: "+91 95978 18491",
        slotLetter: "G",
        theme: COLOR_THEMES.programming,
      },
      H: {
        code: "EC1102",
        name: "Electronics Laboratory",
        credits: 2,
        type: "GIR",
        facultyName: "Dr. M. Harish Adhithya",
        facultyEmail: "harishadhithyam@iiitt.ac.in",
        facultyPhone: "+91 78452 37545",
        slotLetter: "H",
        theme: COLOR_THEMES.electronics,
      },
      I: {
        code: "HM1102",
        name: "NSS / NCC",
        credits: 0,
        type: "GIR",
        facultyName: "Dr. B. Ravi",
        facultyEmail: "ravib@iiitt.ac.in",
        facultyPhone: "+91 98498 82720",
        slotLetter: "I",
        theme: COLOR_THEMES.skills,
      },
    },
    schedule: {
      Monday: [null, "B1", null, "E1", "D1", null, "A1", "C1", null, null],
      Tuesday: ["C2", "A2", null, "D2", "E2", null, "H11", "H12", null, "H13"],
      Wednesday: ["A3", "F11", null, "F12", "F13", null, null, null, null, null],
      Thursday: ["E3", null, null, "B2", "A4", null, "C3", null, null, null],
      Friday: [null, "G11", null, "G12", "G13", null, "NSS", "NSS", null, "NSS"],
    },
  },
};

/**
 * Resolves slot code (e.g. "C1", "F11", "NSS") to the course detail
 */
export function resolveSlotCourse(
  branch: BranchTimetable,
  slotCode: string | null
): CourseDetail | null {
  if (!slotCode) return null;
  const upper = slotCode.toUpperCase().trim();
  if (upper === "NSS" || upper === "NCC") {
    return branch.courses["H"] || branch.courses["I"] || null;
  }
  const firstLetter = upper.charAt(0);
  return branch.courses[firstLetter] || null;
}

/**
 * Given a roll number or email, reliably resolves the branch code ("11", "12", "13", "14").
 * - 11: CSE Core
 * - 12: ECE Core
 * - 13: CSE (AI & DS)
 * - 14: ECE (VLSI Design)
 */
export function resolveBranchFromRollOrEmail(identifier?: string | null): "11" | "12" | "13" | "14" {
  if (!identifier) return "11";
  const clean = identifier.trim().toLowerCase().split("@")[0]!;

  // Strict match: [YY][CourseCode][ClassRoll] e.g. 261161, 261419, 261305, 261245
  const strictMatch = clean.match(/^(?:20)?\d{2}(11|12|13|14)\d{2,4}$/);
  if (strictMatch && strictMatch[1]) {
    return strictMatch[1] as "11" | "12" | "13" | "14";
  }

  // General embedded match: e.g. "student-261419" or "261419-batch"
  const generalMatch = clean.match(/(?:20)?\d{2}(11|12|13|14)\d{2,4}/);
  if (generalMatch && generalMatch[1]) {
    return generalMatch[1] as "11" | "12" | "13" | "14";
  }

  // Semantic keyword fallbacks (check specific before general)
  if (clean.includes("vlsi") || clean.includes("14")) return "14";
  if (clean.includes("aids") || clean.includes("ai&ds") || clean.includes("ai_ds") || clean.includes("13")) return "13";
  if (clean.includes("ece") || clean.includes("12")) return "12";
  if (clean.includes("cse") || clean.includes("11")) return "11";

  return "11";
}
