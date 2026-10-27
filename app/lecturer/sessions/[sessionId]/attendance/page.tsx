"use client";

import React, { use } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { AttendanceRollCallView } from "@/components/lecturer/AttendanceRollCallView";
import { isMockModeEnabled } from "@/lib/api/client";

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

export default function AttendanceRollCallPage({ params }: PageProps) {
  const { sessionId } = use(params);
  const isMock = isMockModeEnabled();

  return (
    <RoleGuard allowedRoles={["lecturer"]}>
      <AppShell currentPath="/lecturer">
        <AttendanceRollCallView sessionId={sessionId} isMockDefault={isMock} />
      </AppShell>
    </RoleGuard>
  );
}
