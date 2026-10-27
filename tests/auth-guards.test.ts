import { test } from "node:test";
import assert from "node:assert/strict";

type UserRole = "student" | "lecturer" | "admin";

/** Pure helper reproducing the portal's authoritative role routing policy */
export function getRoleHomePath(role: UserRole | null | undefined): string {
  if (role === "admin") return "/admin";
  if (role === "lecturer") return "/lecturer";
  if (role === "student") return "/dashboard";
  return "/sign-in";
}

export function evaluateRouteAccess(params: {
  currentPath: string;
  allowedRoles: UserRole[];
  userRole: UserRole | null | undefined;
  isAuthenticated: boolean;
}): { allowed: boolean; redirectTo?: string } {
  const { allowedRoles, userRole, isAuthenticated } = params;

  if (!isAuthenticated || !userRole) {
    return { allowed: false, redirectTo: "/sign-in" };
  }

  if (allowedRoles.includes(userRole)) {
    return { allowed: true };
  }

  return { allowed: false, redirectTo: getRoleHomePath(userRole) };
}

test("role redirect: maps each authenticated role to its dedicated portal area", () => {
  assert.equal(getRoleHomePath("student"), "/dashboard");
  assert.equal(getRoleHomePath("lecturer"), "/lecturer");
  assert.equal(getRoleHomePath("admin"), "/admin");
  assert.equal(getRoleHomePath(null), "/sign-in");
  assert.equal(getRoleHomePath(undefined), "/sign-in");
});

test("route guard: unauthenticated visits redirect to /sign-in", () => {
  const result = evaluateRouteAccess({
    currentPath: "/dashboard",
    allowedRoles: ["student"],
    userRole: null,
    isAuthenticated: false,
  });
  assert.equal(result.allowed, false);
  assert.equal(result.redirectTo, "/sign-in");
});

test("route guard: matching role is permitted access", () => {
  const studentAccess = evaluateRouteAccess({
    currentPath: "/dashboard",
    allowedRoles: ["student"],
    userRole: "student",
    isAuthenticated: true,
  });
  assert.equal(studentAccess.allowed, true);
  assert.equal(studentAccess.redirectTo, undefined);

  const lecturerAccess = evaluateRouteAccess({
    currentPath: "/lecturer",
    allowedRoles: ["lecturer"],
    userRole: "lecturer",
    isAuthenticated: true,
  });
  assert.equal(lecturerAccess.allowed, true);

  const adminAccess = evaluateRouteAccess({
    currentPath: "/admin",
    allowedRoles: ["admin"],
    userRole: "admin",
    isAuthenticated: true,
  });
  assert.equal(adminAccess.allowed, true);
});

test("route guard: role mismatch redirects to user's authorized home rather than 404 or foreign view", () => {
  // Student trying to visit /lecturer
  const studentInLecturer = evaluateRouteAccess({
    currentPath: "/lecturer",
    allowedRoles: ["lecturer"],
    userRole: "student",
    isAuthenticated: true,
  });
  assert.equal(studentInLecturer.allowed, false);
  assert.equal(studentInLecturer.redirectTo, "/dashboard");

  // Student trying to visit /admin
  const studentInAdmin = evaluateRouteAccess({
    currentPath: "/admin",
    allowedRoles: ["admin"],
    userRole: "student",
    isAuthenticated: true,
  });
  assert.equal(studentInAdmin.allowed, false);
  assert.equal(studentInAdmin.redirectTo, "/dashboard");

  // Lecturer trying to visit /admin
  const lecturerInAdmin = evaluateRouteAccess({
    currentPath: "/admin",
    allowedRoles: ["admin"],
    userRole: "lecturer",
    isAuthenticated: true,
  });
  assert.equal(lecturerInAdmin.allowed, false);
  assert.equal(lecturerInAdmin.redirectTo, "/lecturer");

  // Admin trying to visit /dashboard
  const adminInStudent = evaluateRouteAccess({
    currentPath: "/dashboard",
    allowedRoles: ["student"],
    userRole: "admin",
    isAuthenticated: true,
  });
  assert.equal(adminInStudent.allowed, false);
  assert.equal(adminInStudent.redirectTo, "/admin");
});
