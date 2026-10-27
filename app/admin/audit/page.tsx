"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { useAuth } from "@/components/auth/AuthProvider";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  ArrowLeft,
  RefreshCw,
  ChevronRight,
  ChevronDown,
} from "lucide-react";

interface AuditEvent {
  id: string;
  action: string;
  actorUid: string;
  targetUid?: string;
  targetEmail?: string;
  reason?: string;
  role?: string;
  rowCount?: number;
  insertedCount?: number;
  createdAt?: string;
  timestamp?: string;
  [key: string]: unknown;
}

export default function AdminAuditPage() {
  const { getIdToken } = useAuth();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getIdToken();
      const res = await fetch("/api/admin/audit-events?limit=50", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch (err) {
      console.error("Failed to load audit events:", err);
    } finally {
      setLoading(false);
    }
  }, [getIdToken]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const token = await getIdToken();
        const res = await fetch("/api/admin/audit-events?limit=50", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok && active) {
          const data = await res.json();
          setEvents(data.events || []);
        }
      } catch (err) {
        console.error("Failed to load audit events:", err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [getIdToken]);

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <AppShell currentPath="/admin/audit">
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
                  IMMUTABLE LOGS
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink uppercase">
                Security Audit Trail
              </h1>
              <p className="text-xs sm:text-sm text-muted mt-1 max-w-2xl leading-relaxed">
                Read-only chronological ledger of all administrative security events, roster modifications,
                staff permission grants, and attendance rectifications.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => void fetchEvents()}
              className="p-2 shrink-0"
              title="Refresh Audit Log"
            >
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>

          <Card variant="raised" className="border-line/80 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-line bg-surface/60 text-[10px] font-mono text-muted uppercase tracking-wider">
                    <th className="py-3 px-4 font-semibold">Action</th>
                    <th className="py-3 px-4 font-semibold">Actor Identifier</th>
                    <th className="py-3 px-4 font-semibold">Details / Justification</th>
                    <th className="py-3 px-4 font-semibold text-right">Timestamp</th>
                    <th className="py-3 px-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted font-mono">
                        Loading cryptographically signed audit entries...
                      </td>
                    </tr>
                  ) : events.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted font-mono">
                        No audit events recorded yet.
                      </td>
                    </tr>
                  ) : (
                    events.map((evt) => {
                      const isExpanded = expandedId === evt.id;
                      const dateStr = evt.createdAt
                        ? new Date(evt.createdAt).toLocaleString("en-IN", {
                            timeZone: "Asia/Kolkata",
                            month: "short",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "N/A";

                      return (
                        <React.Fragment key={evt.id}>
                          <tr
                            onClick={() => setExpandedId(isExpanded ? null : evt.id)}
                            className="hover:bg-raised/40 transition-colors cursor-pointer"
                          >
                            <td className="py-3 px-4 font-mono font-bold text-accent">
                              {evt.action}
                            </td>
                            <td className="py-3 px-4 font-mono text-muted truncate max-w-[140px]">
                              {evt.actorUid}
                            </td>
                            <td className="py-3 px-4 text-ink max-w-[280px] truncate">
                              {evt.reason ||
                                (evt.targetEmail && `Target: ${evt.targetEmail}`) ||
                                (evt.rowCount && `${evt.rowCount} rows processed`) ||
                                "-"}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-muted text-[11px]">
                              {dateStr} IST
                            </td>
                            <td className="py-3 px-3 text-muted text-center">
                              {isExpanded ? (
                                <ChevronDown className="size-4" />
                              ) : (
                                <ChevronRight className="size-4" />
                              )}
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className="bg-canvas border-b border-line">
                              <td colSpan={5} className="p-4 font-mono text-[11px]">
                                <span className="text-muted block text-[10px] uppercase font-bold mb-1">
                                  Raw Audit Record Payload:
                                </span>
                                <pre className="bg-surface p-3 rounded-[3px] border border-line text-ink overflow-x-auto">
                                  {JSON.stringify(evt, null, 2)}
                                </pre>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </AppShell>
    </RoleGuard>
  );
}
