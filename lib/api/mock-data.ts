/**
 * Synthetic Mock Data for IIIT Tiruchirappalli Student Portal
 *
 * All records here are strictly synthetic and for local development/UI preview only.
 * No real student identities or records are represented.
 */

import type { StudentDashboardData, SessionRecord } from "./types";

export const SYNTHETIC_STUDENT: StudentDashboardData = {
  isSynthetic: true,
  student: {
    uid: "synthetic-student-261161",
    rollNumber: "261161",
    batch: "2026",
    programme: "CSE",
    name: "Alex Doe",
    email: "student@iiitt.ac.in",
  },
  policy: {
    thresholdPercent: 75,
    countsOnlyCompletedSessions: true,
  },
  summaries: [
    {
      offeringId: "cs201-2026s1",
      courseId: "cs201",
      courseCode: "CS201",
      courseTitle: "Data Structures and Algorithms",
      term: "2026-S1",
      attended: 18,
      missed: 2,
      total: 20,
      percentage: 90.0,
      status: "compliant",
      thresholdPercent: 75,
      latestSessionDate: "2026-10-24",
    },
    {
      offeringId: "ma201-2026s1",
      courseId: "ma201",
      courseCode: "MA201",
      courseTitle: "Discrete Mathematics",
      term: "2026-S1",
      attended: 14,
      missed: 6,
      total: 20,
      percentage: 70.0,
      status: "shortfall",
      thresholdPercent: 75,
      latestSessionDate: "2026-10-23",
    },
    {
      offeringId: "ec201-2026s1",
      courseId: "ec201",
      courseCode: "EC201",
      courseTitle: "Digital Logic Design",
      term: "2026-S1",
      attended: 16,
      missed: 4,
      total: 20,
      percentage: 80.0,
      status: "compliant",
      thresholdPercent: 75,
      latestSessionDate: "2026-10-22",
    },
    {
      offeringId: "cs202-2026s1",
      courseId: "cs202",
      courseCode: "CS202",
      courseTitle: "Object Oriented Programming",
      term: "2026-S1",
      attended: 15,
      missed: 5,
      total: 20,
      percentage: 75.0,
      status: "compliant",
      thresholdPercent: 75,
      latestSessionDate: "2026-10-21",
    },
    {
      offeringId: "hs201-2026s1",
      courseId: "hs201",
      courseCode: "HS201",
      courseTitle: "Professional Communication",
      term: "2026-S1",
      attended: 0,
      missed: 0,
      total: 0,
      percentage: null,
      status: "no_data",
      thresholdPercent: 75,
      latestSessionDate: null,
    },
  ],
  generatedAt: "2026-10-26T12:00:00.000Z",
};

/**
 * Synthetic record for a student with an approved roster profile but zero enrolled courses.
 * Used for testing empty dashboard state handling.
 */
export const SYNTHETIC_EMPTY_STUDENT: StudentDashboardData = {
  isSynthetic: true,
  student: {
    uid: "synthetic-student-261199",
    rollNumber: "261199",
    batch: "2026",
    programme: "ECE",
    name: "New Student",
    email: "newstudent@iiitt.ac.in",
  },
  policy: {
    thresholdPercent: 75,
    countsOnlyCompletedSessions: true,
  },
  summaries: [],
  generatedAt: "2026-10-26T12:00:00.000Z",
};

export const SYNTHETIC_RECENT_SESSIONS: SessionRecord[] = [
  {
    id: "sess-101",
    offeringId: "cs201-2026s1",
    sessionDate: "2026-10-24",
    startTime: "09:00",
    endTime: "10:00",
    room: "LH-101",
    status: "completed",
  },
  {
    id: "sess-102",
    offeringId: "ma201-2026s1",
    sessionDate: "2026-10-23",
    startTime: "10:15",
    endTime: "11:15",
    room: "LH-102",
    status: "completed",
  },
  {
    id: "sess-103",
    offeringId: "ec201-2026s1",
    sessionDate: "2026-10-25",
    startTime: "14:00",
    endTime: "15:00",
    room: "Lab-3",
    status: "cancelled",
    cancelReason: "Faculty attending departmental review meeting",
  },
  {
    id: "sess-104",
    offeringId: "cs201-2026s1",
    sessionDate: "2026-10-27",
    startTime: "09:00",
    endTime: "10:00",
    room: "LH-101",
    status: "scheduled",
  },
];
