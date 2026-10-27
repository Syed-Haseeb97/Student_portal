import React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { AttendanceRollCallView } from "@/components/lecturer/AttendanceRollCallView";
import { isMockModeEnabled } from "@/lib/api/client";

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

export const metadata = {
  title: "Class Attendance Roll-Call | IIIT Tiruchirappalli",
  description: "Mark student attendance roll-call for scheduled lecture session.",
};

export default async function AttendanceRollCallPage({ params }: PageProps) {
  const { sessionId } = await params;
  const isMock = isMockModeEnabled();

  return (
    <AppShell currentPath="/lecturer" userRole="lecturer" userRollNumber="FAC-01">
      <AttendanceRollCallView sessionId={sessionId} isMockDefault={isMock} />
    </AppShell>
  );
}
