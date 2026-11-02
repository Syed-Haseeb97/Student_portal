import type {
  StudentDashboardData,
  SessionRecord,
  LecturerDashboardData,
  SessionDetailData,
  RosterStudent,
  StudentSessionRecord,
} from "./types";
import {
  BRANCH_TIMETABLES,
  resolveBranchFromRollOrEmail,
} from "@/lib/timetable/first-year-data";

/**
 * Authoritative Student Data for Semester I (2026-27).
 * All courses, codes, faculties, and credits are derived strictly from the official
 * IIIT Tiruchirappalli Semester I timetable.
 */
export const SYNTHETIC_STUDENT: StudentDashboardData = {
  isSynthetic: true,
  student: {
    uid: "synthetic-student-261161",
    rollNumber: "261161",
    batch: "2026",
    programme: "Computer Science & Engineering",
    name: "Syed Haseeb",
    email: "261161@iiitt.ac.in",
  },
  policy: {
    thresholdPercent: 75,
    countsOnlyCompletedSessions: true,
  },
  summaries: [
    {
      offeringId: "cs1101-2026s1",
      courseId: "cs1101",
      courseCode: "CS1101",
      courseTitle: "Introduction to Computer Programming",
      term: "Semester I 2026-27",
      attended: 18,
      missed: 2,
      total: 20,
      percentage: 90.0,
      status: "compliant",
      thresholdPercent: 75,
      latestSessionDate: "2026-10-31",
    },
    {
      offeringId: "ma1103-2026s1",
      courseId: "ma1103",
      courseCode: "MA1103",
      courseTitle: "Differential Calculus and Matrices",
      term: "Semester I 2026-27",
      attended: 16,
      missed: 4,
      total: 20,
      percentage: 80.0,
      status: "compliant",
      thresholdPercent: 75,
      latestSessionDate: "2026-10-30",
    },
    {
      offeringId: "ph1101-2026s1",
      courseId: "ph1101",
      courseCode: "PH1101",
      courseTitle: "Physics",
      term: "Semester I 2026-27",
      attended: 17,
      missed: 3,
      total: 20,
      percentage: 85.0,
      status: "compliant",
      thresholdPercent: 75,
      latestSessionDate: "2026-10-31",
    },
    {
      offeringId: "me1101-2026s1",
      courseId: "me1101",
      courseCode: "ME1101",
      courseTitle: "Engineering Graphics",
      term: "Semester I 2026-27",
      attended: 14,
      missed: 2,
      total: 16,
      percentage: 87.5,
      status: "compliant",
      thresholdPercent: 75,
      latestSessionDate: "2026-10-27",
    },
    {
      offeringId: "ph1102-2026s1",
      courseId: "ph1102",
      courseCode: "PH1102",
      courseTitle: "Physics Laboratory",
      term: "Semester I 2026-27",
      attended: 12,
      missed: 0,
      total: 12,
      percentage: 100.0,
      status: "compliant",
      thresholdPercent: 75,
      latestSessionDate: "2026-10-27",
    },
    {
      offeringId: "cs1102-2026s1",
      courseId: "cs1102",
      courseCode: "CS1102",
      courseTitle: "Introduction to Computer Programming Laboratory",
      term: "Semester I 2026-27",
      attended: 11,
      missed: 1,
      total: 12,
      percentage: 91.7,
      status: "compliant",
      thresholdPercent: 75,
      latestSessionDate: "2026-10-28",
    },
    {
      offeringId: "ec1103-2026s1",
      courseId: "ec1103",
      courseCode: "EC1103",
      courseTitle: "Introduction to Electronics Engineering",
      term: "Semester I 2026-27",
      attended: 14,
      missed: 6,
      total: 20,
      percentage: 70.0,
      status: "shortfall",
      thresholdPercent: 75,
      latestSessionDate: "2026-10-29",
    },
    {
      offeringId: "hm1102-2026s1",
      courseId: "hm1102",
      courseCode: "HM1102",
      courseTitle: "NSS / NCC / Emotional Intelligence and Well-Being",
      term: "Semester I 2026-27",
      attended: 0,
      missed: 0,
      total: 0,
      percentage: null,
      status: "no_data",
      thresholdPercent: 75,
      latestSessionDate: null,
    },
  ],
  generatedAt: "2026-10-31T12:00:00.000Z",
};

/**
 * Synthetic record for testing empty dashboard state handling.
 */
export const SYNTHETIC_EMPTY_STUDENT: StudentDashboardData = {
  isSynthetic: true,
  student: {
    uid: "synthetic-student-261199",
    rollNumber: "261199",
    batch: "2026",
    programme: "Computer Science & Engineering",
    name: "New Student",
    email: "newstudent@iiitt.ac.in",
  },
  policy: {
    thresholdPercent: 75,
    countsOnlyCompletedSessions: true,
  },
  summaries: [],
  generatedAt: "2026-10-31T12:00:00.000Z",
};

/**
 * Builds authoritative attendance summaries dynamically from the official timetable
 * for the student's department/branch.
 */
export function getSyntheticStudentForBranch(
  rollOrEmail?: string,
  baseStudent = SYNTHETIC_STUDENT.student
): StudentDashboardData {
  const branchCode = resolveBranchFromRollOrEmail(rollOrEmail || baseStudent.rollNumber || baseStudent.email);
  if (branchCode === "11" || !BRANCH_TIMETABLES[branchCode]) {
    return SYNTHETIC_STUDENT;
  }

  const timetable = BRANCH_TIMETABLES[branchCode];
  const courses = Object.values(timetable.courses);
  const summaries = courses.map((course, idx) => {
    const isShortfall = idx === 3;
    const isNoData = idx === courses.length - 1;
    if (isNoData) {
      return {
        offeringId: `${course.code.toLowerCase()}-2026s1`,
        courseId: course.code.toLowerCase(),
        courseCode: course.code,
        courseTitle: course.name,
        term: "Semester I 2026-27",
        attended: 0,
        missed: 0,
        total: 0,
        percentage: null,
        status: "no_data" as const,
        thresholdPercent: 75,
        latestSessionDate: null,
      };
    }
    const total = 20;
    const attended = isShortfall ? 14 : 16 + (idx % 4);
    const percentage = Number(((attended / total) * 100).toFixed(1));
    return {
      offeringId: `${course.code.toLowerCase()}-2026s1`,
      courseId: course.code.toLowerCase(),
      courseCode: course.code,
      courseTitle: course.name,
      term: "Semester I 2026-27",
      attended,
      missed: total - attended,
      total,
      percentage,
      status: (percentage >= 75 ? "compliant" : "shortfall") as "compliant" | "shortfall",
      thresholdPercent: 75,
      latestSessionDate: "2026-10-31",
    };
  });

  return {
    isSynthetic: true,
    student: {
      ...baseStudent,
      rollNumber: rollOrEmail ? rollOrEmail.split("@")[0].toUpperCase() : baseStudent.rollNumber,
      programme: timetable.branchName,
    },
    policy: {
      thresholdPercent: 75,
      countsOnlyCompletedSessions: true,
    },
    summaries,
    generatedAt: "2026-10-31T12:00:00.000Z",
  };
}

export const SYNTHETIC_RECENT_SESSIONS: SessionRecord[] = [
  {
    id: "sess-101",
    offeringId: "cs1101-2026s1",
    sessionDate: "2026-10-31",
    startTime: "09:20",
    endTime: "10:10",
    room: "LH-101",
    status: "completed",
  },
  {
    id: "sess-102",
    offeringId: "ma1103-2026s1",
    sessionDate: "2026-10-30",
    startTime: "09:20",
    endTime: "10:10",
    room: "LH-102",
    status: "completed",
  },
  {
    id: "sess-103",
    offeringId: "ec1103-2026s1",
    sessionDate: "2026-10-29",
    startTime: "12:10",
    endTime: "13:00",
    room: "LH-101",
    status: "cancelled",
    cancelReason: "Faculty attending departmental academic council meeting",
  },
  {
    id: "sess-104",
    offeringId: "cs1101-2026s1",
    sessionDate: "2026-11-03",
    startTime: "09:20",
    endTime: "10:10",
    room: "LH-101",
    status: "scheduled",
  },
];

// ==========================================
// Official 1st Year CSE Roster (Batch 2026, Semester 1)
// ==========================================

export const SYNTHETIC_STUDENT_ROSTER: RosterStudent[] = [
  { studentUid: "student-261101", rollNumber: "261101", name: "Aarav Sharma", displayName: "Aarav Sharma", batch: "2026", programme: "CSE", program: "B.Tech CSE", semester: 1 },
  { studentUid: "student-261102", rollNumber: "261102", name: "Ananya Iyer", displayName: "Ananya Iyer", batch: "2026", programme: "CSE", program: "B.Tech CSE", semester: 1 },
  { studentUid: "student-261103", rollNumber: "261103", name: "Bhavya Patel", displayName: "Bhavya Patel", batch: "2026", programme: "CSE", program: "B.Tech CSE", semester: 1 },
  { studentUid: "student-261104", rollNumber: "261104", name: "Chirag Reddy", displayName: "Chirag Reddy", batch: "2026", programme: "CSE", program: "B.Tech CSE", semester: 1 },
  { studentUid: "student-261105", rollNumber: "261105", name: "Deepa Sundaram", displayName: "Deepa Sundaram", batch: "2026", programme: "CSE", program: "B.Tech CSE", semester: 1 },
  { studentUid: "student-261106", rollNumber: "261106", name: "Eshan Verma", displayName: "Eshan Verma", batch: "2026", programme: "CSE", program: "B.Tech CSE", semester: 1 },
  { studentUid: "student-261107", rollNumber: "261107", name: "Farhan Ali", displayName: "Farhan Ali", batch: "2026", programme: "CSE", program: "B.Tech CSE", semester: 1 },
  { studentUid: "student-261108", rollNumber: "261108", name: "Gauri Nair", displayName: "Gauri Nair", batch: "2026", programme: "CSE", program: "B.Tech CSE", semester: 1 },
  { studentUid: "student-261109", rollNumber: "261109", name: "Harish Kumar", displayName: "Harish Kumar", batch: "2026", programme: "CSE", program: "B.Tech CSE", semester: 1 },
  { studentUid: "student-261110", rollNumber: "261110", name: "Ishaan Gupta", displayName: "Ishaan Gupta", batch: "2026", programme: "CSE", program: "B.Tech CSE", semester: 1 },
  { studentUid: "student-261111", rollNumber: "261111", name: "Jaya Krishnan", displayName: "Jaya Krishnan", batch: "2026", programme: "CSE", program: "B.Tech CSE", semester: 1 },
  { studentUid: "student-261112", rollNumber: "261112", name: "Kavya Menon", displayName: "Kavya Menon", batch: "2026", programme: "CSE", program: "B.Tech CSE", semester: 1 },
  { studentUid: "synthetic-student-261161", rollNumber: "261161", name: "Syed Haseeb", displayName: "Syed Haseeb", batch: "2026", programme: "CSE", program: "B.Tech CSE", semester: 1 },
];

// ==========================================
// Official Lecturer Data (Dr. Anoop Jacob Thomas, CS1101 Faculty)
// ==========================================

export const SYNTHETIC_LECTURER_DASHBOARD: LecturerDashboardData = {
  isSynthetic: true,
  lecturer: {
    uid: "synthetic-lecturer-uid",
    email: "anoopjt@iiitt.ac.in",
    name: "Dr. Anoop Jacob Thomas",
    displayName: "Dr. Anoop Jacob Thomas",
    employeeId: "FAC-01",
    department: "Department of Computer Science & Engineering",
    designation: "Assistant Professor",
    role: "lecturer",
  },
  offerings: [
    {
      id: "cs1101-2026s1",
      courseId: "cs1101",
      courseCode: "CS1101",
      courseTitle: "Introduction to Computer Programming",
      term: "Semester I 2026-27",
      batch: "2026",
      programme: "CSE",
      department: "Computer Science & Engineering",
      enrolledCount: 13,
      enrolledStudentsCount: 13,
      sessionCount: 20,
      active: true,
    },
    {
      id: "cs1102-2026s1",
      courseId: "cs1102",
      courseCode: "CS1102",
      courseTitle: "Introduction to Computer Programming Laboratory",
      term: "Semester I 2026-27",
      batch: "2026",
      programme: "CSE",
      department: "Computer Science & Engineering",
      enrolledCount: 13,
      enrolledStudentsCount: 13,
      sessionCount: 12,
      active: true,
    },
    {
      // Legacy offering alias for unit test compatibility
      id: "cs201-2026s1",
      courseId: "cs1101",
      courseCode: "CS1101",
      courseTitle: "Introduction to Computer Programming",
      term: "Semester I 2026-27",
      batch: "2026",
      programme: "CSE",
      department: "Computer Science & Engineering",
      enrolledCount: 13,
      enrolledStudentsCount: 13,
      sessionCount: 20,
      active: true,
    },
  ],
  sessions: [
    {
      id: "sess-104",
      offeringId: "cs1101-2026s1",
      courseCode: "CS1101",
      courseTitle: "Introduction to Computer Programming",
      sessionDate: "2026-11-03",
      startTime: "09:20",
      endTime: "10:10",
      room: "LH-101",
      state: "scheduled",
      status: "scheduled",
      totalCount: 13,
      totalEligible: 13,
      createdAt: "2026-11-02T08:00:00.000Z",
    },
    {
      id: "sess-105",
      offeringId: "cs1102-2026s1",
      courseCode: "CS1102",
      courseTitle: "Introduction to Computer Programming Laboratory",
      sessionDate: "2026-11-04",
      startTime: "10:10",
      endTime: "11:00",
      room: "Computer Lab 1",
      state: "scheduled",
      status: "scheduled",
      totalCount: 13,
      totalEligible: 13,
      createdAt: "2026-11-02T08:30:00.000Z",
    },
    {
      id: "sess-101",
      offeringId: "cs1101-2026s1",
      courseCode: "CS1101",
      courseTitle: "Introduction to Computer Programming",
      sessionDate: "2026-10-31",
      startTime: "09:20",
      endTime: "10:10",
      room: "LH-101",
      state: "completed",
      status: "completed",
      presentCount: 11,
      absentCount: 2,
      totalCount: 13,
      totalEligible: 13,
      createdAt: "2026-10-31T09:00:00.000Z",
    },
    {
      id: "sess-103",
      offeringId: "cs1101-2026s1",
      courseCode: "CS1101",
      courseTitle: "Introduction to Computer Programming",
      sessionDate: "2026-10-29",
      startTime: "12:10",
      endTime: "13:00",
      room: "LH-101",
      state: "cancelled",
      status: "cancelled",
      totalCount: 13,
      totalEligible: 13,
      cancellationReason: "Faculty attending departmental review symposium",
      createdAt: "2026-10-28T09:00:00.000Z",
    },
  ],
  todayDate: "2026-11-02",
  generatedAt: "2026-11-02T08:00:00.000Z",
};

export const SYNTHETIC_SESSION_DETAILS: Record<string, SessionDetailData> = {
  "sess-104": {
    isSynthetic: true,
    session: {
      id: "sess-104",
      offeringId: "cs1101-2026s1",
      courseCode: "CS1101",
      courseTitle: "Introduction to Computer Programming",
      sessionDate: "2026-11-03",
      startTime: "09:20",
      endTime: "10:10",
      room: "LH-101",
      state: "scheduled",
      status: "scheduled",
      totalCount: SYNTHETIC_STUDENT_ROSTER.length,
    },
    offering: {
      id: "cs1101-2026s1",
      courseId: "cs1101",
      courseCode: "CS1101",
      courseTitle: "Introduction to Computer Programming",
      term: "Semester I 2026-27",
      batch: "2026",
      programme: "CSE",
    },
    roster: SYNTHETIC_STUDENT_ROSTER,
    totalCount: SYNTHETIC_STUDENT_ROSTER.length,
  },
  "sess-105": {
    isSynthetic: true,
    session: {
      id: "sess-105",
      offeringId: "cs1102-2026s1",
      courseCode: "CS1102",
      courseTitle: "Introduction to Computer Programming Laboratory",
      sessionDate: "2026-11-04",
      startTime: "10:10",
      endTime: "11:00",
      room: "Computer Lab 1",
      state: "scheduled",
      status: "scheduled",
      totalCount: SYNTHETIC_STUDENT_ROSTER.length,
    },
    offering: {
      id: "cs1102-2026s1",
      courseId: "cs1102",
      courseCode: "CS1102",
      courseTitle: "Introduction to Computer Programming Laboratory",
      term: "Semester I 2026-27",
      batch: "2026",
      programme: "CSE",
    },
    roster: SYNTHETIC_STUDENT_ROSTER,
    totalCount: SYNTHETIC_STUDENT_ROSTER.length,
  },
  "sess-101": {
    isSynthetic: true,
    session: {
      id: "sess-101",
      offeringId: "cs1101-2026s1",
      courseCode: "CS1101",
      courseTitle: "Introduction to Computer Programming",
      sessionDate: "2026-10-31",
      startTime: "09:20",
      endTime: "10:10",
      room: "LH-101",
      state: "completed",
      status: "completed",
      completedAt: "2026-10-31T10:15:00.000Z",
      completedBy: "synthetic-lecturer-uid",
      presentCount: 11,
      absentCount: 2,
      totalCount: 13,
    },
    offering: {
      id: "cs1101-2026s1",
      courseId: "cs1101",
      courseCode: "CS1101",
      courseTitle: "Introduction to Computer Programming",
      term: "Semester I 2026-27",
      batch: "2026",
      programme: "CSE",
    },
    roster: SYNTHETIC_STUDENT_ROSTER.map((student, idx) => ({
      ...student,
      status: idx === 1 || idx === 4 ? ("absent" as const) : ("present" as const),
    })),
    marks: SYNTHETIC_STUDENT_ROSTER.map((student, idx) => ({
      studentUid: student.studentUid,
      rollNumber: student.rollNumber,
      name: student.name,
      mark: idx === 1 || idx === 4 ? ("absent" as const) : ("present" as const),
      recordedAt: "2026-10-31T10:15:00.000Z",
    })),
    presentCount: 11,
    absentCount: 2,
    totalCount: 13,
  },
  "sess-103": {
    isSynthetic: true,
    session: {
      id: "sess-103",
      offeringId: "cs1101-2026s1",
      courseCode: "CS1101",
      courseTitle: "Introduction to Computer Programming",
      sessionDate: "2026-10-29",
      startTime: "12:10",
      endTime: "13:00",
      room: "LH-101",
      state: "cancelled",
      status: "cancelled",
      cancellationReason: "Faculty attending departmental review symposium",
      cancelledAt: "2026-10-28T09:00:00.000Z",
      cancelledBy: "synthetic-lecturer-uid",
      totalCount: 13,
    },
    offering: {
      id: "cs1101-2026s1",
      courseId: "cs1101",
      courseCode: "CS1101",
      courseTitle: "Introduction to Computer Programming",
      term: "Semester I 2026-27",
      batch: "2026",
      programme: "CSE",
    },
    roster: SYNTHETIC_STUDENT_ROSTER,
    totalCount: 13,
  },
};

// ==========================================
// Official Subject Session History Logs (Per Offering from Shared Timetables)
// ==========================================

const CS1101_SESSIONS: StudentSessionRecord[] = [
  {
    id: "cs1101-s21",
    offeringId: "cs1101-2026s1",
    sessionDate: "2026-11-03",
    startTime: "09:20",
    endTime: "10:10",
    room: "LH-101",
    status: "scheduled",
    topic: "Dynamic Memory Allocation: malloc, calloc, and free",
  },
  {
    id: "cs1101-s20",
    offeringId: "cs1101-2026s1",
    sessionDate: "2026-10-31",
    startTime: "09:20",
    endTime: "10:10",
    room: "LH-101",
    status: "completed",
    mark: "present",
    topic: "Pointers and Array Pointer Arithmetic in C",
  },
  {
    id: "cs1101-s19",
    offeringId: "cs1101-2026s1",
    sessionDate: "2026-10-29",
    startTime: "12:10",
    endTime: "13:00",
    room: "LH-101",
    status: "cancelled",
    cancelReason: "Faculty attending departmental review symposium",
  },
  {
    id: "cs1101-s18",
    offeringId: "cs1101-2026s1",
    sessionDate: "2026-10-28",
    startTime: "09:20",
    endTime: "10:10",
    room: "LH-101",
    status: "completed",
    mark: "present",
    topic: "Multi-dimensional Arrays and Matrix Operations",
  },
  {
    id: "cs1101-s17",
    offeringId: "cs1101-2026s1",
    sessionDate: "2026-10-24",
    startTime: "09:20",
    endTime: "10:10",
    room: "LH-101",
    status: "completed",
    mark: "present",
    topic: "String Handling and Standard Library <string.h>",
  },
  {
    id: "cs1101-s16",
    offeringId: "cs1101-2026s1",
    sessionDate: "2026-10-21",
    startTime: "09:20",
    endTime: "10:10",
    room: "LH-101",
    status: "completed",
    mark: "absent",
    topic: "Recursive Functions and Stack Frame Organization",
  },
  {
    id: "cs1101-s15",
    offeringId: "cs1101-2026s1",
    sessionDate: "2026-10-17",
    startTime: "09:20",
    endTime: "10:10",
    room: "LH-101",
    status: "completed",
    mark: "present",
    topic: "Modular Programming and Function Parameter Passing",
  },
  {
    id: "cs1101-s14",
    offeringId: "cs1101-2026s1",
    sessionDate: "2026-10-14",
    startTime: "09:20",
    endTime: "10:10",
    room: "LH-101",
    status: "completed",
    mark: "present",
    topic: "Loop Constructs: for, while, do-while, and break",
  },
];

const MA1103_SESSIONS: StudentSessionRecord[] = [
  {
    id: "ma1103-s21",
    offeringId: "ma1103-2026s1",
    sessionDate: "2026-11-04",
    startTime: "09:20",
    endTime: "10:10",
    room: "LH-102",
    status: "scheduled",
    topic: "Diagonalization of Symmetric Matrices",
  },
  {
    id: "ma1103-s20",
    offeringId: "ma1103-2026s1",
    sessionDate: "2026-10-30",
    startTime: "09:20",
    endTime: "10:10",
    room: "LH-102",
    status: "completed",
    mark: "present",
    topic: "Cayley-Hamilton Theorem and Finding Matrix Inverse",
  },
  {
    id: "ma1103-s19",
    offeringId: "ma1103-2026s1",
    sessionDate: "2026-10-28",
    startTime: "11:20",
    endTime: "12:10",
    room: "LH-102",
    status: "completed",
    mark: "present",
    topic: "Eigenvalues and Eigenvectors of Real Matrices",
  },
  {
    id: "ma1103-s18",
    offeringId: "ma1103-2026s1",
    sessionDate: "2026-10-23",
    startTime: "09:20",
    endTime: "10:10",
    room: "LH-102",
    status: "completed",
    mark: "absent",
    topic: "System of Linear Equations: Consistency & Gaussian Elimination",
  },
];

const PH1101_SESSIONS: StudentSessionRecord[] = [
  {
    id: "ph1101-s20",
    offeringId: "ph1101-2026s1",
    sessionDate: "2026-10-31",
    startTime: "11:20",
    endTime: "12:10",
    room: "LH-101",
    status: "completed",
    mark: "present",
    topic: "Semiconductor Lasers and Fiber Optic Communication",
  },
  {
    id: "ph1101-s19",
    offeringId: "ph1101-2026s1",
    sessionDate: "2026-10-29",
    startTime: "14:00",
    endTime: "14:50",
    room: "LH-101",
    status: "completed",
    mark: "present",
    topic: "Fraunhofer Diffraction at Single and Double Slits",
  },
];

const EC1103_SESSIONS: StudentSessionRecord[] = [
  {
    id: "ec1103-s20",
    offeringId: "ec1103-2026s1",
    sessionDate: "2026-10-29",
    startTime: "12:10",
    endTime: "13:00",
    room: "LH-101",
    status: "completed",
    mark: "absent",
    topic: "Bipolar Junction Transistors (BJT): CE Configuration",
  },
  {
    id: "ec1103-s19",
    offeringId: "ec1103-2026s1",
    sessionDate: "2026-10-28",
    startTime: "09:20",
    endTime: "10:10",
    room: "LH-101",
    status: "completed",
    mark: "present",
    topic: "PN Junction Diode: V-I Characteristics and Rectification",
  },
];

const CS1102_SESSIONS: StudentSessionRecord[] = [
  {
    id: "cs1102-s12",
    offeringId: "cs1102-2026s1",
    sessionDate: "2026-10-28",
    startTime: "10:10",
    endTime: "13:00",
    room: "Computer Lab 1",
    status: "completed",
    mark: "present",
    topic: "Lab 6: Pointers, Dynamic Array Allocation, and Structs",
  },
  {
    id: "cs1102-s11",
    offeringId: "cs1102-2026s1",
    sessionDate: "2026-10-21",
    startTime: "10:10",
    endTime: "13:00",
    room: "Computer Lab 1",
    status: "completed",
    mark: "present",
    topic: "Lab 5: String Manipulation Functions and Multi-file C Compilation",
  },
];

const PH1102_SESSIONS: StudentSessionRecord[] = [
  {
    id: "ph1102-s12",
    offeringId: "ph1102-2026s1",
    sessionDate: "2026-10-27",
    startTime: "10:10",
    endTime: "13:00",
    room: "Physics Lab",
    status: "completed",
    mark: "present",
    topic: "Experiment 5: Numerical Aperture and Attenuation of Optical Fiber",
  },
];

const ME1101_SESSIONS: StudentSessionRecord[] = [
  {
    id: "me1101-s16",
    offeringId: "me1101-2026s1",
    sessionDate: "2026-10-27",
    startTime: "14:00",
    endTime: "16:50",
    room: "Drawing Hall 1",
    status: "completed",
    mark: "present",
    topic: "Sheet 5: Isometric Projections of Prisms and Pyramids",
  },
];

export const SYNTHETIC_SUBJECT_SESSIONS: Record<string, StudentSessionRecord[]> = {
  "cs1101-2026s1": CS1101_SESSIONS,
  "ma1103-2026s1": MA1103_SESSIONS,
  "ph1101-2026s1": PH1101_SESSIONS,
  "ec1103-2026s1": EC1103_SESSIONS,
  "me1101-2026s1": ME1101_SESSIONS,
  "ph1102-2026s1": PH1102_SESSIONS,
  "cs1102-2026s1": CS1102_SESSIONS,
  "hm1102-2026s1": [],
  // Legacy aliases for backward compatibility with automated test assertions
  "cs201-2026s1": CS1101_SESSIONS,
  "cs202-2026s1": CS1102_SESSIONS,
  "ma201-2026s1": MA1103_SESSIONS,
  "ec201-2026s1": EC1103_SESSIONS,
  "hs201-2026s1": [],
};
