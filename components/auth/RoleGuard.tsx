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

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/sign-in");
      return;
    }

    if (role && !allowedRoles.includes(role)) {
      if (role === "admin") router.replace("/admin");
      else if (role === "lecturer") router.replace("/lecturer");
      else router.replace("/dashboard");
    }
  }, [user, role, loading, allowedRoles, router]);

  if (loading || !user || !role || !allowedRoles.includes(role)) {
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
