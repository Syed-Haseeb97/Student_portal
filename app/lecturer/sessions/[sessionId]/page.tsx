"use client";

import React, { use } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { SessionDetailView } from "@/components/lecturer/SessionDetailView";
import { isMockModeEnabled } from "@/lib/api/client";

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

export default function SessionDetailPage({ params }: PageProps) {
  const { sessionId } = use(params);
  const isMock = isMockModeEnabled();

  return (
    <RoleGuard allowedRoles={["lecturer"]}>
      <AppShell currentPath="/lecturer">
        <SessionDetailView sessionId={sessionId} isMockDefault={isMock} />
      </AppShell>
    </RoleGuard>
  );
}
