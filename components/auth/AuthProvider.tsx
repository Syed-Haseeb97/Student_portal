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
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isMock] = useState(() => isMockModeEnabled());

  const [user, setUser] = useState<AuthProfile | null>(() => {
    if (typeof window !== "undefined" && isMockModeEnabled()) {
      return {
        uid: "mock-student-261161",
        email: "261161@iiitt.ac.in",
        role: "student",
        name: "Syed Haseeb",
        rollNumber: "261161",
        batch: "2026",
        programme: "Computer Science & Engineering",
        active: true,
      };
    }
    return null;
  });

  const [role, setRole] = useState<UserRole | null>(() => {
    if (typeof window !== "undefined" && isMockModeEnabled()) {
      return "student";
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

  const signOut = useCallback(async () => {
    if (isMock) {
      setUser(null);
      setRole(null);
      router.push("/");
      return;
    }
    try {
      const { auth } = getFirebaseClient();
      await fbSignOut(auth);
      setUser(null);
      setRole(null);
      router.push("/");
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
    }),
    [user, role, loading, isMock, getIdToken, signOut, refreshProfile]
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
