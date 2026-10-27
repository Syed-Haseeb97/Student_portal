"use client";

import React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { LecturerDashboardView } from "@/components/lecturer/LecturerDashboardView";
import { isMockModeEnabled } from "@/lib/api/client";

export default function LecturerDashboardPage() {
  const isMock = isMockModeEnabled();

  return (
    <RoleGuard allowedRoles={["lecturer"]}>
      <AppShell currentPath="/lecturer">
        <LecturerDashboardView isMockDefault={isMock} />
      </AppShell>
    </RoleGuard>
  );
}
