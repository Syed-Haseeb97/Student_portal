"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";

export function LandingAuthRedirect() {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || !user || !role) return;

    if (role === "admin") {
      router.replace("/admin");
    } else if (role === "lecturer") {
      router.replace("/lecturer");
    } else if (role === "student") {
      router.replace("/dashboard");
    }
  }, [user, role, loading, router]);

  return null;
}
