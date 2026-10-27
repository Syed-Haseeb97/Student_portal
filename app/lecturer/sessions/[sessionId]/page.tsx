import React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { SessionDetailView } from "@/components/lecturer/SessionDetailView";
import { isMockModeEnabled } from "@/lib/api/client";

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

export const metadata = {
  title: "Class Session Details | IIIT Tiruchirappalli",
  description: "View verified student attendance records and class session details.",
};

export default async function SessionDetailPage({ params }: PageProps) {
  const { sessionId } = await params;
  const isMock = isMockModeEnabled();

  return (
    <AppShell currentPath="/lecturer" userRole="lecturer" userRollNumber="FAC-01">
      <SessionDetailView sessionId={sessionId} isMockDefault={isMock} />
    </AppShell>
  );
}
