"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { useAuth } from "@/components/auth/AuthProvider";
import { validateRosterRow, type RosterRow } from "@/lib/roster/validate";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import {
  Upload,
  FileSpreadsheet,
  Search,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Download,
  Users,
  RefreshCw,
} from "lucide-react";

interface ValidationResult {
  valid: boolean;
  rows: RosterRow[];
  errors: Array<{ line: number; message: string }>;
}

export default function AdminRosterPage() {
  const { getIdToken } = useAuth();
  const [activeTab, setActiveTab] = useState<"list" | "import">("list");
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [batchFilter, setBatchFilter] = useState("all");

  // CSV Import State
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    ok: boolean;
    inserted?: number;
    error?: string;
  } | null>(null);

  const fetchRoster = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getIdToken();
      const params = new URLSearchParams();
      if (searchQuery) params.set("q", searchQuery);
      if (batchFilter !== "all") params.set("batch", batchFilter);

      const res = await fetch(`/api/admin/roster?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setRoster(data.roster || []);
      }
    } catch (err) {
      console.error("Failed to load roster:", err);
    } finally {
      setLoading(false);
    }
  }, [getIdToken, searchQuery, batchFilter]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const token = await getIdToken();
        const params = new URLSearchParams();
        if (searchQuery) params.set("q", searchQuery);
        if (batchFilter !== "all") params.set("batch", batchFilter);

        const res = await fetch(`/api/admin/roster?${params.toString()}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok && active) {
          const data = await res.json();
          setRoster(data.roster || []);
        }
      } catch (err) {
        console.error("Failed to load roster:", err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [getIdToken, searchQuery, batchFilter]);

  function parseAndValidateCSV(text: string) {
    setImportResult(null);

    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length <= 1) {
      setValidation({
        valid: false,
        rows: [],
        errors: [{ line: 0, message: "CSV file is empty or missing data rows." }],
      });
      return;
    }

    const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
    const rows: RosterRow[] = [];
    const errors: Array<{ line: number; message: string }> = [];

    for (let i = 1; i < lines.length; i++) {
      const lineText = lines[i];
      if (!lineText) continue;
      const values = lineText.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));

      const record: Record<string, unknown> = {};
      headers.forEach((h, idx) => {
        record[h] = values[idx] !== undefined ? values[idx] : "";
      });

      try {
        const validated = validateRosterRow(record);
        rows.push(validated);
      } catch (err) {
        errors.push({
          line: i + 1,
          message: err instanceof Error ? err.message : "Invalid row format",
        });
      }
    }

    setValidation({
      valid: errors.length === 0 && rows.length > 0,
      rows,
      errors,
    });
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = String(evt.target?.result || "");
      parseAndValidateCSV(text);
    };
    reader.readAsText(file);
  }

  async function handleImportSubmit() {
    if (!validation?.valid || validation.rows.length === 0) return;
    setImporting(true);
    setImportResult(null);

    try {
      const token = await getIdToken();
      const res = await fetch("/api/admin/roster/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(validation.rows),
      });

      const data = await res.json();
      if (!res.ok) {
        setImportResult({ ok: false, error: data.error || "Roster import failed." });
      } else {
        setImportResult({ ok: true, inserted: data.inserted ?? validation.rows.length });
        setValidation(null);
        void fetchRoster();
      }
    } catch (err) {
      setImportResult({
        ok: false,
        error: err instanceof Error ? err.message : "Network error during roster upload.",
      });
    } finally {
      setImporting(false);
    }
  }

  function downloadSampleCSV() {
    const sample = `rollNumber,email,batch,programme,active\n261161,261161@iiitt.ac.in,2026,Computer Science and Engineering,true\n261162,261162@iiitt.ac.in,2026,Computer Science and Engineering,true\n261201,261201@iiitt.ac.in,2026,Electronics and Communication Engineering,true\n`;
    const blob = new Blob([sample], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "roster-import-template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <AppShell currentPath="/admin/roster">
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
                  STUDENT REGISTRY
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink uppercase">
                Approved Student Roster
              </h1>
              <p className="text-xs sm:text-sm text-muted mt-1 max-w-2xl leading-relaxed">
                Only students matching an active record on this registry can complete verified portal
                authentication and access institutional attendance ledgers.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={activeTab === "list" ? "primary" : "outline"}
                size="sm"
                onClick={() => setActiveTab("list")}
                className="font-mono text-xs"
              >
                <Users className="size-3.5 mr-1.5" />
                Roster List ({roster.length})
              </Button>
              <Button
                variant={activeTab === "import" ? "primary" : "outline"}
                size="sm"
                onClick={() => setActiveTab("import")}
                className="font-mono text-xs"
              >
                <Upload className="size-3.5 mr-1.5" />
                Import CSV
              </Button>
            </div>
          </div>

          {/* TAB 1: Roster List */}
          {activeTab === "list" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="w-full sm:w-80">
                  <Input
                    placeholder="Search by roll number, email, or branch..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    leftIcon={<Search className="size-4" />}
                  />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <select
                    value={batchFilter}
                    onChange={(e) => setBatchFilter(e.target.value)}
                    className="bg-surface border border-line text-ink text-xs font-mono rounded-[3px] px-3 py-2 focus:outline-none focus:border-accent"
                  >
                    <option value="all">All Batches</option>
                    <option value="2026">Batch 2026</option>
                    <option value="2025">Batch 2025</option>
                    <option value="2024">Batch 2024</option>
                    <option value="2023">Batch 2023</option>
                  </select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void fetchRoster()}
                    className="p-2"
                    title="Refresh"
                  >
                    <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
                  </Button>
                </div>
              </div>

              <Card variant="raised" className="border-line/80 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-line bg-surface/60 text-[10px] font-mono text-muted uppercase tracking-wider">
                        <th className="py-3 px-4 font-semibold">Roll Number</th>
                        <th className="py-3 px-4 font-semibold">Institutional Email</th>
                        <th className="py-3 px-4 font-semibold">Batch</th>
                        <th className="py-3 px-4 font-semibold">Programme / Discipline</th>
                        <th className="py-3 px-4 font-semibold text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line/60">
                      {loading ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-muted font-mono">
                            Loading approved registry entries...
                          </td>
                        </tr>
                      ) : roster.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-muted font-mono">
                            No student roster entries found. Click &quot;Import CSV&quot; to populate.
                          </td>
                        </tr>
                      ) : (
                        roster.map((row) => (
                          <tr key={row.rollNumber} className="hover:bg-raised/40 transition-colors font-mono">
                            <td className="py-3 px-4 font-bold text-accent">{row.rollNumber}</td>
                            <td className="py-3 px-4 text-ink">{row.email}</td>
                            <td className="py-3 px-4 text-muted">{row.batch}</td>
                            <td className="py-3 px-4 text-muted font-sans text-xs">{row.programme}</td>
                            <td className="py-3 px-4 text-right">
                              <Badge variant={row.active ? "compliant" : "shortfall"} size="sm">
                                {row.active ? "ACTIVE" : "INACTIVE"}
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
          )}

          {/* TAB 2: CSV Import */}
          {activeTab === "import" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-[3px] bg-surface border border-line">
                <div className="text-xs space-y-1">
                  <span className="font-bold text-ink block font-mono">CSV File Structure Standard</span>
                  <p className="text-muted leading-relaxed">
                    Columns required: <code className="text-accent font-mono">rollNumber,email,batch,programme,active</code>.
                    All emails must strictly conform to <code className="text-accent font-mono">@iiitt.ac.in</code>.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadSampleCSV}
                  className="font-mono text-xs shrink-0"
                >
                  <Download className="size-3.5 mr-1.5" />
                  Download Sample CSV
                </Button>
              </div>

              {/* Upload Dropzone */}
              <div className="border-2 border-dashed border-line hover:border-accent/60 transition-colors rounded-[3px] p-8 text-center bg-surface/30">
                <input
                  type="file"
                  id="csv-file-input"
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label
                  htmlFor="csv-file-input"
                  className="flex flex-col items-center justify-center cursor-pointer gap-3"
                >
                  <div className="p-3 rounded-full bg-accent/10 border border-accent/20 text-accent">
                    <FileSpreadsheet className="size-6" />
                  </div>
                  <div>
                    <span className="font-semibold text-ink text-sm block">
                      Click to choose CSV file or drag and drop
                    </span>
                    <span className="text-muted text-xs font-mono mt-0.5 block">
                      Accepts standard comma-separated roster lists up to 1MB
                    </span>
                  </div>
                </label>
              </div>

              {/* Validation Summary */}
              {validation && (
                <div className="space-y-4">
                  {validation.valid ? (
                    <div className="rounded-[3px] border border-accent/40 bg-accent/10 p-4 text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2.5 text-ink">
                        <CheckCircle2 className="size-5 text-accent shrink-0" />
                        <div>
                          <strong className="font-mono font-bold text-accent block">
                            CSV VALIDATION PASSED
                          </strong>
                          <span className="text-muted">
                            {validation.rows.length} valid student records ready for atomic import.
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="primary"
                        size="md"
                        onClick={handleImportSubmit}
                        busy={importing}
                        className="font-mono text-xs uppercase"
                      >
                        {importing ? "Importing Roster..." : `Commit ${validation.rows.length} Records`}
                      </Button>
                    </div>
                  ) : (
                    <div className="rounded-[3px] border border-risk/40 bg-risk/10 p-4 text-xs space-y-2 text-risk">
                      <div className="flex items-center gap-2 font-bold font-mono">
                        <AlertCircle className="size-4 shrink-0" />
                        CSV VALIDATION FAILED: {validation.errors.length} ISSUE(S) DETECTED
                      </div>
                      <ul className="list-disc list-inside space-y-1 font-mono text-[11px] text-risk/90 max-h-40 overflow-y-auto">
                        {validation.errors.map((e, idx) => (
                          <li key={idx}>
                            Line {e.line}: {e.message}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Preview Table */}
                  {validation.rows.length > 0 && (
                    <Card variant="raised" className="border-line overflow-hidden">
                      <CardHeader className="py-3 px-4 border-b border-line bg-surface/50">
                        <CardTitle className="text-xs font-mono text-muted uppercase">
                          Import Preview (First 5 Rows)
                        </CardTitle>
                      </CardHeader>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs font-mono">
                          <thead>
                            <tr className="border-b border-line text-[10px] text-muted uppercase">
                              <th className="py-2.5 px-4">Roll</th>
                              <th className="py-2.5 px-4">Email</th>
                              <th className="py-2.5 px-4">Batch</th>
                              <th className="py-2.5 px-4">Programme</th>
                              <th className="py-2.5 px-4">Active</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-line/40">
                            {validation.rows.slice(0, 5).map((r, i) => (
                              <tr key={i}>
                                <td className="py-2 px-4 text-accent">{r.rollNumber}</td>
                                <td className="py-2 px-4 text-ink">{r.email}</td>
                                <td className="py-2 px-4 text-muted">{r.batch}</td>
                                <td className="py-2 px-4 text-muted">{r.programme}</td>
                                <td className="py-2 px-4 text-muted">{r.active ? "true" : "false"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  )}
                </div>
              )}

              {/* Import Result Notification */}
              {importResult && (
                <div
                  className={`rounded-[3px] border p-4 text-xs font-mono ${
                    importResult.ok
                      ? "border-accent/40 bg-accent/10 text-accent"
                      : "border-risk/40 bg-risk/10 text-risk"
                  }`}
                >
                  {importResult.ok ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 shrink-0" />
                      <span>
                        SUCCESS: Successfully imported {importResult.inserted} student roster entries into the database.
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <AlertCircle className="size-4 shrink-0" />
                      <span>ERROR: {importResult.error}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </AppShell>
    </RoleGuard>
  );
}
