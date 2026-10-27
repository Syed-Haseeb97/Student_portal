import React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { LecturerDashboardView } from "@/components/lecturer/LecturerDashboardView";
import { isMockModeEnabled } from "@/lib/api/client";

export const metadata = {
  title: "Lecturer Attendance Console | IIIT Tiruchirappalli",
  description: "Faculty attendance management, class scheduling, and roll-call records for IIIT Tiruchirappalli.",
};

export default function LecturerDashboardPage() {
  const isMock = isMockModeEnabled();

  return (
    <AppShell currentPath="/lecturer" userRole="lecturer" userRollNumber="FAC-01">
      <LecturerDashboardView isMockDefault={isMock} />
    </AppShell>
  );
}
