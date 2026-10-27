"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { useAuth } from "@/components/auth/AuthProvider";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  BookOpen,
  Layers,
  Upload,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";

interface Course {
  id: string;
  code: string;
  title: string;
  credits?: number;
  active: boolean;
}

interface Offering {
  id: string;
  courseId: string;
  courseCode?: string;
  courseTitle?: string;
  term: string;
  batch: string;
  programme: string;
  active: boolean;
}

export default function AdminAcademicPage() {
  const { getIdToken } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"catalog" | "import">("catalog");

  // Import form state
  const [importKind, setImportKind] = useState<"courses" | "offerings">("courses");
  const [importJson, setImportJson] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ ok: boolean; message: string } | null>(null);

  const fetchAcademicData = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getIdToken();
      const res = await fetch("/api/admin/academic-data", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setCourses(data.courses || []);
        setOfferings(data.offerings || []);
      }
    } catch (err) {
      console.error("Failed to load academic data:", err);
    } finally {
      setLoading(false);
    }
  }, [getIdToken]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const token = await getIdToken();
        const res = await fetch("/api/admin/academic-data", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok && active) {
          const data = await res.json();
          setCourses(data.courses || []);
          setOfferings(data.offerings || []);
        }
      } catch (err) {
        console.error("Failed to load academic data:", err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [getIdToken]);

  async function handleImportSubmit(e: React.FormEvent) {
    e.preventDefault();
    setImporting(true);
    setImportResult(null);

    try {
      let rows: unknown[];
      try {
        rows = JSON.parse(importJson);
        if (!Array.isArray(rows)) throw new Error("JSON must be an array of objects.");
      } catch (parseErr) {
        setImportResult({
          ok: false,
          message: parseErr instanceof Error ? parseErr.message : "Invalid JSON syntax",
        });
        setImporting(false);
        return;
      }

      const token = await getIdToken();
      const res = await fetch("/api/admin/academic-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ kind: importKind, rows }),
      });

      const data = await res.json();
      if (!res.ok) {
        setImportResult({ ok: false, message: data.error || "Import failed." });
      } else {
        setImportResult({
          ok: true,
          message: `Successfully imported ${data.imported} ${importKind} records.`,
        });
        setImportJson("");
        void fetchAcademicData();
      }
    } catch (err) {
      setImportResult({
        ok: false,
        message: err instanceof Error ? err.message : "Network error during curriculum import.",
      });
    } finally {
      setImporting(false);
    }
  }

  const sampleCourseJson = JSON.stringify(
    [
      { id: "cs301", code: "CS301", title: "Compiler Design", credits: 4, active: true },
      { id: "cs302", code: "CS302", title: "Computer Networks", credits: 4, active: true },
    ],
    null,
    2
  );

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <AppShell currentPath="/admin/academic">
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
                  CURRICULUM CATALOG
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink uppercase">
                Academic Courses & Offerings
              </h1>
              <p className="text-xs sm:text-sm text-muted mt-1 max-w-2xl leading-relaxed">
                Manage curriculum course codes, semester course offerings, and enrolled cohorts
                eligible for timetable scheduling and attendance logging.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={activeTab === "catalog" ? "primary" : "outline"}
                size="sm"
                onClick={() => setActiveTab("catalog")}
                className="font-mono text-xs"
              >
                <BookOpen className="size-3.5 mr-1.5" />
                Catalog View
              </Button>
              <Button
                variant={activeTab === "import" ? "primary" : "outline"}
                size="sm"
                onClick={() => setActiveTab("import")}
                className="font-mono text-xs"
              >
                <Upload className="size-3.5 mr-1.5" />
                Import JSON
              </Button>
            </div>
          </div>

          {activeTab === "catalog" && (
            <div className="space-y-6">
              {/* Courses Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold font-mono text-ink uppercase tracking-wider flex items-center gap-2">
                    <BookOpen className="size-4 text-accent" />
                    Courses Master Catalog ({courses.length})
                  </h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void fetchAcademicData()}
                    className="p-1.5"
                    title="Refresh"
                  >
                    <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
                  </Button>
                </div>

                <Card variant="raised" className="border-line/80 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-line bg-surface/60 text-[10px] font-mono text-muted uppercase">
                          <th className="py-2.5 px-4">Code</th>
                          <th className="py-2.5 px-4">Course Title</th>
                          <th className="py-2.5 px-4">Credits</th>
                          <th className="py-2.5 px-4 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line/40">
                        {loading ? (
                          <tr>
                            <td colSpan={4} className="py-6 text-center text-muted font-mono">
                              Loading course catalog...
                            </td>
                          </tr>
                        ) : (
                          courses.map((c) => (
                            <tr key={c.id} className="hover:bg-raised/40 transition-colors">
                              <td className="py-2.5 px-4 font-mono font-bold text-accent">{c.code}</td>
                              <td className="py-2.5 px-4 text-ink font-medium">{c.title}</td>
                              <td className="py-2.5 px-4 font-mono text-muted">{c.credits ?? 4}</td>
                              <td className="py-2.5 px-4 text-right">
                                <Badge variant={c.active ? "compliant" : "shortfall"} size="sm">
                                  {c.active ? "ACTIVE" : "INACTIVE"}
                                </Badge>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>

              {/* Offerings Section */}
              <div className="space-y-3 pt-4">
                <h2 className="text-sm font-bold font-mono text-ink uppercase tracking-wider flex items-center gap-2">
                  <Layers className="size-4 text-accent" />
                  Active Course Offerings ({offerings.length})
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {offerings.map((o) => (
                    <Card key={o.id} variant="raised" className="border-line p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-accent text-sm">
                          {o.courseCode || o.id}
                        </span>
                        <Badge variant={o.active ? "compliant" : "shortfall"} size="sm">
                          {o.term}
                        </Badge>
                      </div>
                      <div className="text-sm font-semibold text-ink line-clamp-1">
                        {o.courseTitle || o.courseId}
                      </div>
                      <div className="text-[11px] font-mono text-muted space-y-0.5 pt-1 border-t border-line/60">
                        <div>Batch: {o.batch}</div>
                        <div className="truncate">Programme: {o.programme}</div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "import" && (
            <Card variant="raised" className="border-line/80 max-w-2xl">
              <CardHeader>
                <CardTitle className="text-base font-bold text-ink">
                  Atomic Academic Import
                </CardTitle>
                <CardDescription className="text-xs text-muted">
                  Import or update courses and offerings in structured JSON format. Foreign key
                  referential dependencies are automatically validated.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleImportSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-mono font-semibold text-ink uppercase block">
                      Target Collection Kind
                    </label>
                    <select
                      value={importKind}
                      onChange={(e) => setImportKind(e.target.value as "courses" | "offerings")}
                      className="w-full bg-surface border border-line text-ink text-xs font-mono rounded-[3px] p-2.5 focus:outline-none focus:border-accent"
                    >
                      <option value="courses">Courses (Master Catalog)</option>
                      <option value="offerings">Offerings (Course Semester Instances)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-mono font-semibold text-ink uppercase block">
                        JSON Records Array
                      </label>
                      <button
                        type="button"
                        onClick={() => setImportJson(sampleCourseJson)}
                        className="text-[10px] text-accent hover:underline font-mono cursor-pointer"
                      >
                        Insert Sample JSON
                      </button>
                    </div>
                    <textarea
                      rows={10}
                      value={importJson}
                      onChange={(e) => setImportJson(e.target.value)}
                      placeholder={sampleCourseJson}
                      className="w-full bg-canvas border border-line text-ink font-mono text-xs rounded-[3px] p-3 focus:outline-none focus:border-accent leading-relaxed"
                      required
                    />
                  </div>

                  {importResult && (
                    <div
                      className={`rounded-[3px] border p-3.5 text-xs font-mono flex items-center gap-2 ${
                        importResult.ok
                          ? "border-accent/40 bg-accent/10 text-accent"
                          : "border-risk/40 bg-risk/10 text-risk"
                      }`}
                    >
                      {importResult.ok ? (
                        <CheckCircle2 className="size-4 shrink-0" />
                      ) : (
                        <AlertCircle className="size-4 shrink-0" />
                      )}
                      <span>{importResult.message}</span>
                    </div>
                  )}

                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    busy={importing}
                    className="w-full font-mono text-xs uppercase"
                  >
                    {importing ? "Executing Atomic Import..." : "Commit Import Batch"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </AppShell>
    </RoleGuard>
  );
}
