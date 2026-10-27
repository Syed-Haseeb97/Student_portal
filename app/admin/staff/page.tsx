"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { useAuth } from "@/components/auth/AuthProvider";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import {
  Briefcase,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  Shield,
} from "lucide-react";

interface StaffMember {
  uid: string;
  email: string;
  role: "lecturer" | "admin";
  active: boolean;
  name?: string;
  staffId?: string;
  department?: string;
  updatedAt?: string | null;
}

export default function AdminStaffPage() {
  const { getIdToken } = useAuth();
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProvisionModal, setShowProvisionModal] = useState(false);

  // Provision form state
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newStaffId, setNewStaffId] = useState("");
  const [newDepartment, setNewDepartment] = useState("Computer Science & Engineering");
  const [newRole, setNewRole] = useState<"lecturer" | "admin">("lecturer");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getIdToken();
      const res = await fetch("/api/admin/staff", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setStaffList(data.staff || []);
      }
    } catch (err) {
      console.error("Failed to load staff list:", err);
    } finally {
      setLoading(false);
    }
  }, [getIdToken]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const token = await getIdToken();
        const res = await fetch("/api/admin/staff", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok && active) {
          const data = await res.json();
          setStaffList(data.staff || []);
        }
      } catch (err) {
        console.error("Failed to load staff list:", err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [getIdToken]);

  async function handleProvisionStaff(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");
    setActionSuccess("");

    try {
      const token = await getIdToken();
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          email: newEmail.trim().toLowerCase(),
          role: newRole,
          active: true,
          name: newName.trim(),
          staffId: newStaffId.trim(),
          department: newDepartment,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Failed to provision staff member.");
      } else {
        setActionSuccess(`Successfully provisioned ${newEmail} as ${newRole}.`);
        setShowProvisionModal(false);
        setNewEmail("");
        setNewName("");
        setNewStaffId("");
        void fetchStaff();
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Network error during staff provisioning.");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleStaffStatus(member: StaffMember) {
    setActionSuccess("");
    try {
      const token = await getIdToken();
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          email: member.email,
          role: member.role,
          active: !member.active,
          name: member.name,
          staffId: member.staffId,
          department: member.department,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to update staff status.");
      } else {
        setActionSuccess(`Updated ${member.email} status to ${!member.active ? "ACTIVE" : "INACTIVE"}.`);
        void fetchStaff();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error updating status");
    }
  }

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <AppShell currentPath="/admin/staff">
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-6">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Link
                  href="/admin"
                  className="text-muted hover:text-ink transition-colors font-mono text-[10px] uppercase flex items-center gap-1"
                >
                  <ArrowLeft className="size-3" /> ADMIN CONSOLE
                </Link>
                <span className="text-muted/60">•</span>
                <span className="text-[10px] font-mono text-accent uppercase font-bold">
                  PERSONNEL DIRECTORY
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink uppercase">
                Faculty & Staff Registry
              </h1>
              <p className="text-xs sm:text-sm text-muted mt-1 max-w-2xl leading-relaxed">
                Assign lecturer and administrator privileges to verified institutional accounts.
                All updates are audited and safeguarded against last-administrator lockouts.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void fetchStaff()}
                className="p-2"
                title="Refresh List"
              >
                <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowProvisionModal(true)}
                className="font-mono text-xs uppercase"
              >
                <UserPlus className="size-3.5 mr-1.5" />
                Provision Staff
              </Button>
            </div>
          </div>

          {actionSuccess && (
            <div className="rounded-[3px] border border-accent/40 bg-accent/10 p-3.5 text-xs font-mono text-accent flex items-center gap-2">
              <CheckCircle2 className="size-4 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
          )}

          {/* Staff Table */}
          <Card variant="raised" className="border-line/80 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-line bg-surface/60 text-[10px] font-mono text-muted uppercase tracking-wider">
                    <th className="py-3 px-4 font-semibold">Faculty / Staff Member</th>
                    <th className="py-3 px-4 font-semibold">Institutional Email</th>
                    <th className="py-3 px-4 font-semibold">Role</th>
                    <th className="py-3 px-4 font-semibold">Department</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted font-mono">
                        Loading provisioned personnel...
                      </td>
                    </tr>
                  ) : staffList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted font-mono">
                        No staff accounts provisioned yet.
                      </td>
                    </tr>
                  ) : (
                    staffList.map((m) => (
                      <tr key={m.uid} className="hover:bg-raised/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-ink">{m.name || "Faculty Member"}</div>
                          {m.staffId && (
                            <span className="text-[10px] font-mono text-muted block uppercase">
                              ID: {m.staffId}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-muted">{m.email}</td>
                        <td className="py-3 px-4 font-mono">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[2px] text-[10px] font-bold uppercase ${
                              m.role === "admin"
                                ? "bg-warning/15 text-warning border border-warning/30"
                                : "bg-accent/15 text-accent border border-accent/30"
                            }`}
                          >
                            {m.role === "admin" ? <Shield className="size-3" /> : <Briefcase className="size-3" />}
                            {m.role.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-muted">{m.department || "Computer Science"}</td>
                        <td className="py-3 px-4">
                          <Badge variant={m.active ? "compliant" : "shortfall"} size="sm">
                            {m.active ? "ACTIVE" : "INACTIVE"}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => toggleStaffStatus(m)}
                            className={`px-2.5 py-1 rounded-[2px] font-mono text-[10px] font-bold uppercase transition-colors border cursor-pointer ${
                              m.active
                                ? "bg-canvas hover:bg-risk/15 text-muted hover:text-risk border-line"
                                : "bg-accent/10 hover:bg-accent/20 text-accent border-accent/30"
                            }`}
                          >
                            {m.active ? "Deactivate" : "Activate"}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Provisioning Modal */}
          {showProvisionModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
              <Card variant="raised" className="w-full max-w-lg border-line animate-in zoom-in-95">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-bold text-ink">
                      Provision Faculty or Staff Member
                    </CardTitle>
                    <button
                      type="button"
                      onClick={() => setShowProvisionModal(false)}
                      className="text-muted hover:text-ink text-sm font-mono cursor-pointer"
                    >
                      [ESC]
                    </button>
                  </div>
                  <CardDescription className="text-xs text-muted">
                    The account must be a verified <code className="text-accent">@iiitt.ac.in</code> identity.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleProvisionStaff} className="space-y-4">
                    <Input
                      id="staff-email"
                      type="email"
                      label="Institutional Email"
                      required
                      placeholder="faculty@iiitt.ac.in"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      hint="Target account must already be registered in Firebase Auth."
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        id="staff-name"
                        label="Full Name"
                        placeholder="Dr. Full Name"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                      />
                      <Input
                        id="staff-id"
                        label="Faculty / Staff ID"
                        placeholder="FAC-03"
                        value={newStaffId}
                        onChange={(e) => setNewStaffId(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-ink block font-mono">
                        Administrative Role
                      </label>
                      <select
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value as "lecturer" | "admin")}
                        className="w-full bg-surface border border-line text-ink text-xs font-mono rounded-[3px] p-2.5 focus:outline-none focus:border-accent"
                      >
                        <option value="lecturer">Lecturer (Course & Session Attendance Management)</option>
                        <option value="admin">Administrator (Full Access & Roster Provisioning)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-ink block font-mono">
                        Academic Department
                      </label>
                      <select
                        value={newDepartment}
                        onChange={(e) => setNewDepartment(e.target.value)}
                        className="w-full bg-surface border border-line text-ink text-xs font-mono rounded-[3px] p-2.5 focus:outline-none focus:border-accent"
                      >
                        <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                        <option value="Electronics & Communication Engineering">Electronics & Communication Engineering</option>
                        <option value="Science & Humanities">Science & Humanities</option>
                        <option value="Academic Office">Academic Office</option>
                      </select>
                    </div>

                    {formError && (
                      <div className="rounded-[3px] border border-risk/40 bg-risk/10 p-3 text-xs text-risk flex items-start gap-2">
                        <AlertCircle className="size-4 shrink-0 mt-0.5" />
                        <span>{formError}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowProvisionModal(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        busy={submitting}
                        className="font-mono text-xs uppercase"
                      >
                        {submitting ? "Provisioning..." : "Provision Account"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </AppShell>
    </RoleGuard>
  );
}
