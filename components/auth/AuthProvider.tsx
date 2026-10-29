"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut as fbSignOut, type User as FirebaseUser } from "firebase/auth";
import { getFirebaseClient } from "@/lib/firebase/client";
import { isMockModeEnabled } from "@/lib/api/client";

export type UserRole = "student" | "lecturer" | "admin";

export interface AuthProfile {
  uid: string;
  email: string;
  role: UserRole | null;
  name?: string;
  rollNumber?: string;
  staffId?: string;
  batch?: string;
  programme?: string;
  department?: string;
  active?: boolean;
  unclaimed?: boolean;
}

export interface AuthContextValue {
  user: AuthProfile | null;
  role: UserRole | null;
  loading: boolean;
  isMock: boolean;
  getIdToken: (forceRefresh?: boolean) => Promise<string | null>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  switchRole?: (role: UserRole) => void;
}

const MOCK_PROFILES: Record<UserRole, AuthProfile> = {
  student: {
    uid: "mock-student-261161",
    email: "261161@iiitt.ac.in",
    role: "student",
    name: "Syed Haseeb",
    rollNumber: "261161",
    batch: "2026",
    programme: "Computer Science & Engineering",
    active: true,
  },
  lecturer: {
    uid: "mock-lecturer-1",
    email: "fac01@iiitt.ac.in",
    role: "lecturer",
    name: "Dr. Faculty Member",
    staffId: "FAC-01",
    department: "Computer Science & Engineering",
    active: true,
  },
  admin: {
    uid: "mock-admin-1",
    email: "admin@iiitt.ac.in",
    role: "admin",
    name: "System Administrator",
    staffId: "ADM-01",
    department: "Academic Section",
    active: true,
  },
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isMock] = useState(() => isMockModeEnabled());

  const [user, setUser] = useState<AuthProfile | null>(() => {
    if (typeof window !== "undefined" && isMockModeEnabled()) {
      const stored = window.localStorage.getItem("iiitt_mock_role");
      if (stored === "admin" || stored === "lecturer" || stored === "student") return MOCK_PROFILES[stored];
      return null;
    }
    return null;
  });

  const [role, setRole] = useState<UserRole | null>(() => {
    if (typeof window !== "undefined" && isMockModeEnabled()) {
      const stored = window.localStorage.getItem("iiitt_mock_role");
      if (stored === "admin" || stored === "lecturer" || stored === "student") return stored;
      return null;
    }
    return null;
  });

  const [loading, setLoading] = useState<boolean>(() => !isMockModeEnabled());

  const fetchProfileFromServer = useCallback(async (token: string): Promise<AuthProfile | null> => {
    try {
      const res = await fetch("/api/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        return (await res.json()) as AuthProfile;
      }
      return null;
    } catch (err) {
      console.error("Failed to load /api/me:", err);
      return null;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (isMock) {
      return;
    }

    try {
      const { auth } = getFirebaseClient();
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setUser(null);
        setRole(null);
        return;
      }
      const token = await currentUser.getIdToken();
      const profile = await fetchProfileFromServer(token);
      if (profile) {
        setUser(profile);
        setRole(profile.role);
      }
    } catch (err) {
      console.error("Error refreshing profile:", err);
    }
  }, [isMock, fetchProfileFromServer]);

  useEffect(() => {
    if (isMock) return;

    let unsubscribe: () => void = () => undefined;
    try {
      const { auth } = getFirebaseClient();
      unsubscribe = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
        if (!fbUser) {
          setUser(null);
          setRole(null);
          setLoading(false);
          return;
        }

        try {
          const token = await fbUser.getIdToken();
          const profile = await fetchProfileFromServer(token);
          if (profile) {
            setUser(profile);
            setRole(profile.role);
          } else {
            setUser({
              uid: fbUser.uid,
              email: fbUser.email ?? "",
              role: null,
              unclaimed: true,
            });
            setRole(null);
          }
        } catch (err) {
          console.error("Failed to resolve user auth state:", err);
          setUser(null);
          setRole(null);
        } finally {
          setLoading(false);
        }
      });
    } catch (err) {
      console.error("Firebase Auth initialization error:", err);
      setTimeout(() => setLoading(false), 0);
    }

    return () => unsubscribe();
  }, [isMock, fetchProfileFromServer]);

  const getIdToken = useCallback(
    async (forceRefresh = false): Promise<string | null> => {
      if (isMock) {
        return "mock-jwt-token";
      }
      try {
        const { auth } = getFirebaseClient();
        if (!auth.currentUser) return null;
        return await auth.currentUser.getIdToken(forceRefresh);
      } catch (err) {
        console.error("Failed to obtain ID token:", err);
        return null;
      }
    },
    [isMock]
  );

  const switchRole = useCallback(
    (newRole: UserRole) => {
      if (!isMock) return;
      if (typeof window !== "undefined") {
        window.localStorage.setItem("iiitt_mock_role", newRole);
      }
      const profile = MOCK_PROFILES[newRole];
      setUser(profile);
      setRole(newRole);
      if (newRole === "admin") router.push("/admin");
      else if (newRole === "lecturer") router.push("/lecturer");
      else router.push("/dashboard");
    },
    [isMock, router]
  );

  const signOut = useCallback(async () => {
    if (isMock) {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("iiitt_mock_role", "signed_out");
      }
      setUser(null);
      setRole(null);
      router.push("/sign-in");
      return;
    }
    try {
      const { auth } = getFirebaseClient();
      await fbSignOut(auth);
      setUser(null);
      setRole(null);
      router.push("/sign-in");
    } catch (err) {
      console.error("Error signing out:", err);
    }
  }, [isMock, router]);

  const value = useMemo(
    () => ({
      user,
      role,
      loading,
      isMock,
      getIdToken,
      signOut,
      refreshProfile,
      switchRole,
    }),
    [user, role, loading, isMock, getIdToken, signOut, refreshProfile, switchRole]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
