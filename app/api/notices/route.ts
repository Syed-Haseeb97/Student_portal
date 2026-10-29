import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebase/admin";
import { normalizeEmail } from "@/lib/roster/validate";
import type { AcademicNotice, CreateNoticePayload } from "@/lib/api/types";

export const runtime = "nodejs";

function bearerToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization") ?? "";
  const match = /^Bearer (.+)$/i.exec(authHeader);
  return match?.[1] ?? null;
}

// In-memory store for mock mode
export const mutableNotices: AcademicNotice[] = [
  {
    id: "notice-001",
    type: "assignment",
    title: "Assignment 1: Flowcharts, Branching & Loops in C",
    content: "Implement solutions for the 5 algorithm problems discussed in tutorial 1. Ensure well-commented code, adhere to standard C99 conventions, and submit via the course repository by the deadline.",
    courseCode: "CS1101",
    courseTitle: "Introduction to Computer Programming",
    targetBranch: "all",
    priority: "important",
    postedByUid: "fac-anoop",
    postedByName: "Dr. Anoop Jacob Thomas",
    postedByEmail: "anoopjt@iiitt.ac.in",
    postedByDepartment: "Computer Science & Engineering",
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    dueDate: new Date(Date.now() + 86400000 * 5).toISOString(),
    maxMarks: 50,
    submissionInfo: "Submit zipped .c files via course portal",
  },
  {
    id: "notice-002",
    type: "notice",
    title: "Calculus Tutorial & Problem Solving Session",
    content: "Special problem-solving tutorial for Differential Calculus (MA1103) will be held this Wednesday at 4:00 PM in Lecture Hall 102. Attendance is highly encouraged for all first-year sections.",
    courseCode: "MA1103",
    courseTitle: "Differential Calculus and Matrices",
    targetBranch: "all",
    priority: "normal",
    postedByUid: "fac-karuppasamy",
    postedByName: "Mr. Karuppasamy S",
    postedByEmail: "karuppasamys.tf@iiitt.ac.in",
    postedByDepartment: "Mathematics",
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: "notice-003",
    type: "assignment",
    title: "Physics Lab Record Evaluation (Experiment 1 & 2)",
    content: "All students must bring completed and signed observation notebooks for Experiment 1 (Torsional Pendulum) and Experiment 2 (Spectrometer) during their respective lab periods this week.",
    courseCode: "PH1102",
    courseTitle: "Physics Laboratory",
    targetBranch: "11",
    priority: "urgent",
    postedByUid: "fac-kamakshi",
    postedByName: "Dr. K. Kamakshi",
    postedByEmail: "kamakshik@iiitt.ac.in",
    postedByDepartment: "Physics",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    dueDate: new Date(Date.now() + 86400000 * 3).toISOString(),
    maxMarks: 20,
    submissionInfo: "Hardcopy physical record submission in Physics Lab",
  },
  {
    id: "notice-004",
    type: "notice",
    title: "NSS / NCC Orientation & Community Outreach Briefing",
    content: "First-year orientation for NSS and Life Skills (HM1102) will take place this Thursday during Period 5-7. All registered students must assemble at the Multipurpose Hall by 1:50 PM.",
    courseCode: "HM1102",
    courseTitle: "NSS / NCC / Emotional Intelligence",
    targetBranch: "all",
    priority: "normal",
    postedByUid: "fac-ravi",
    postedByName: "Dr. B. Ravi",
    postedByEmail: "ravib@iiitt.ac.in",
    postedByDepartment: "Humanities & Social Sciences",
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
  },
];

/**
 * GET /api/notices
 * Fetch all notices and assignments with optional filtering by target branch or course.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetBranch = searchParams.get("targetBranch");
  const isMock = process.env.NEXT_PUBLIC_ENABLE_MOCK_API === "true";

  if (isMock) {
    let filtered = mutableNotices;
    if (targetBranch && targetBranch !== "all") {
      filtered = filtered.filter(
        (n) => !n.targetBranch || n.targetBranch === "all" || n.targetBranch === targetBranch
      );
    }
    return NextResponse.json({ ok: true, notices: filtered });
  }

  try {
    const { db } = getFirebaseAdmin();
    const snap = await db
      .collection("notices")
      .where("active", "==", true)
      .limit(60)
      .get();

    const notices: AcademicNotice[] = [];
    for (const doc of snap.docs) {
      const data = doc.data();
      const n: AcademicNotice = {
        id: doc.id,
        type: data.type === "assignment" ? "assignment" : "notice",
        title: String(data.title || ""),
        content: String(data.content || ""),
        courseCode: data.courseCode ? String(data.courseCode) : null,
        courseTitle: data.courseTitle ? String(data.courseTitle) : null,
        targetBranch: data.targetBranch || "all",
        priority: data.priority || "normal",
        postedByUid: String(data.postedByUid || ""),
        postedByName: String(data.postedByName || "Faculty"),
        postedByEmail: String(data.postedByEmail || ""),
        postedByDepartment: data.postedByDepartment ? String(data.postedByDepartment) : null,
        createdAt: data.createdAt || new Date().toISOString(),
        dueDate: data.dueDate ? String(data.dueDate) : null,
        maxMarks: typeof data.maxMarks === "number" ? data.maxMarks : null,
        submissionInfo: data.submissionInfo ? String(data.submissionInfo) : null,
      };

      if (
        !targetBranch ||
        targetBranch === "all" ||
        !n.targetBranch ||
        n.targetBranch === "all" ||
        n.targetBranch === targetBranch
      ) {
        notices.push(n);
      }
    }

    // Sort newest first
    notices.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ ok: true, notices });
  } catch (err) {
    console.error("Failed to fetch notices:", err);
    // Fallback gracefully to synthetic notices
    return NextResponse.json({ ok: true, notices: mutableNotices });
  }
}

/**
 * POST /api/notices
 * Teachers and Admins can post a new announcement or assignment deadline.
 */
export async function POST(request: Request) {
  const token = bearerToken(request);
  const isMock = process.env.NEXT_PUBLIC_ENABLE_MOCK_API === "true";

  let body: Partial<CreateNoticePayload>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    type = "notice",
    title,
    content,
    courseCode,
    courseTitle,
    targetBranch = "all",
    priority = "normal",
    dueDate,
    maxMarks,
    submissionInfo,
  } = body;

  if (!title || title.trim().length < 3) {
    return NextResponse.json({ error: "Title must be at least 3 characters." }, { status: 400 });
  }

  if (!content || content.trim().length < 5) {
    return NextResponse.json({ error: "Notice content or instructions must be at least 5 characters." }, { status: 400 });
  }

  if (isMock || !token) {
    // If mock mode, accept and prepend to in-memory list
    const newNotice: AcademicNotice = {
      id: `notice-${Date.now()}`,
      type: type === "assignment" ? "assignment" : "notice",
      title: title.trim(),
      content: content.trim(),
      courseCode: courseCode?.trim() || null,
      courseTitle: courseTitle?.trim() || null,
      targetBranch: targetBranch as AcademicNotice["targetBranch"],
      priority: priority as AcademicNotice["priority"],
      postedByUid: "mock-faculty-current",
      postedByName: "Course Faculty",
      postedByEmail: "faculty@iiitt.ac.in",
      postedByDepartment: "Academic Department",
      createdAt: new Date().toISOString(),
      dueDate: dueDate || null,
      maxMarks: typeof maxMarks === "number" ? maxMarks : null,
      submissionInfo: submissionInfo?.trim() || null,
    };

    mutableNotices.unshift(newNotice);
    return NextResponse.json({ ok: true, notice: newNotice });
  }

  try {
    const { auth, db } = getFirebaseAdmin();
    const identity = await auth.verifyIdToken(token, true);

    const staffDoc = await db.collection("staff").doc(identity.uid).get();
    if (!staffDoc.exists || staffDoc.get("active") !== true) {
      return NextResponse.json({ error: "Only authorized faculty or administrators can post notices." }, { status: 403 });
    }

    const staffData = staffDoc.data();
    const role = staffData?.role;
    if (role !== "lecturer" && role !== "admin") {
      return NextResponse.json({ error: "Only lecturers and administrators can post notices." }, { status: 403 });
    }

    const noticeDocRef = db.collection("notices").doc();
    const nowIso = new Date().toISOString();

    const noticeData = {
      id: noticeDocRef.id,
      type: type === "assignment" ? "assignment" : "notice",
      title: title.trim(),
      content: content.trim(),
      courseCode: courseCode?.trim() || null,
      courseTitle: courseTitle?.trim() || null,
      targetBranch: targetBranch || "all",
      priority: priority || "normal",
      postedByUid: identity.uid,
      postedByName: staffData?.name || identity.name || "Course Faculty",
      postedByEmail: normalizeEmail(identity.email || staffData?.email || ""),
      postedByDepartment: staffData?.department || null,
      createdAt: nowIso,
      dueDate: dueDate || null,
      maxMarks: typeof maxMarks === "number" ? maxMarks : null,
      submissionInfo: submissionInfo?.trim() || null,
      active: true,
    };

    await noticeDocRef.set(noticeData);

    return NextResponse.json({ ok: true, notice: noticeData });
  } catch (err) {
    console.error("Error creating notice:", err);
    return NextResponse.json({ error: "Failed to publish notice. Please retry." }, { status: 500 });
  }
}
