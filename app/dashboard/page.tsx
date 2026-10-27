"use client";

import React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { StudentDashboardView } from "@/components/dashboard/StudentDashboardView";
import { isMockModeEnabled } from "@/lib/api/client";

export default function StudentDashboardPage() {
  const isMock = isMockModeEnabled();

  return (
    <RoleGuard allowedRoles={["student"]}>
      <AppShell currentPath="/dashboard">
        <StudentDashboardView isMockDefault={isMock} />
      </AppShell>
    </RoleGuard>
  );
}
