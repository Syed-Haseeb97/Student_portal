import React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { StudentDashboardView } from "@/components/dashboard/StudentDashboardView";
import { isMockModeEnabled } from "@/lib/api/client";

export default function StudentDashboardPage() {
  const isMock = isMockModeEnabled();

  return (
    <AppShell currentPath="/dashboard" userRole="student">
      <StudentDashboardView isMockDefault={isMock} />
    </AppShell>
  );
}
