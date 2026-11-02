"use client";

import React from "react";
import { StudentAppShell } from "@/components/layout/StudentAppShell";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { StudentDashboardView } from "@/components/dashboard/StudentDashboardView";
import { isMockModeEnabled } from "@/lib/api/client";

export default function StudentDashboardPage() {
  const isMock = isMockModeEnabled();

  return (
    <RoleGuard allowedRoles={["student", "admin"]}>
      <StudentAppShell currentPath="/dashboard">
        <StudentDashboardView isMockDefault={isMock} />
      </StudentAppShell>
    </RoleGuard>
  );
}
