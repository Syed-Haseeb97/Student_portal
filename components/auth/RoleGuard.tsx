"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, type UserRole } from "@/components/auth/AuthProvider";
import { Loader2 } from "lucide-react";

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  // Administrators have superuser access to all views (student dashboard, faculty portal, admin console)
  const isAuthorized = Boolean(
    role && (allowedRoles.includes(role) || role === "admin")
  );

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/sign-in");
      return;
    }

    if (role && !isAuthorized) {
      if (role === "lecturer") router.replace("/lecturer");
      else router.replace("/dashboard");
    }
  }, [user, role, loading, isAuthorized, router]);

  if (loading || !user || !role || !isAuthorized) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="size-6 animate-spin text-accent" />
        <span className="text-xs font-mono uppercase tracking-widest text-muted">
          Authorizing Session...
        </span>
      </div>
    );
  }

  return <>{children}</>;
}
