"use client";

import React, { useState, useRef, useCallback } from "react";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  X,
  RefreshCw,
  Users,
  ArrowLeft,
} from "lucide-react";
import { previewCSVImport, commitCSVImport } from "@/app/(dashboard)/import/actions";
import type { ContactRow, CommitResult, DedupStrategy, PreviewResult } from "@/app/(dashboard)/import/actions";

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = "upload" | "map" | "preview" | "done";

interface Props {
  existingContactCount: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DEDUP_OPTIONS: { value: DedupStrategy; label: string; description: string }[] = [
  {
    value: "skip",
    label: "Skip duplicates",
    description: "Leave existing contacts untouched if the email matches.",
  },
  {
    value: "update",
    label: "Update duplicates",
    description: "Overwrite existing contacts with the new data.",
  },
  {
    value: "create",
    label: "Always create",
    description: "Import all rows even if a contact with that email exists.",
  },
];

const CONTACT_FIELDS = ["name", "email", "phone", "type", "source", "tags", "notes"] as const;
type ContactField = (typeof CONTACT_FIELDS)[number];

// ── Sub-components ─────────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: Step }) {
  const steps: { id: Step; label: string }[] = [
    { id: "upload", label: "Upload" },
    { id: "map", label: "Map columns" },
    { id: "preview", label: "Preview" },
    { id: "done", label: "Done" },
  ];
  const currentIdx = steps.findIndex((s) => s.id === current);

  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((step, i) => (
        <React.Fragment key={step.id}>
          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                i < currentIdx
                  ? "bg-green-500 text-white"
                  : i === currentIdx
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                  : "bg-zinc-200 text-zinc-400 dark:bg-zinc-700 dark:text-zinc-500"
              }`}
            >
              {i < currentIdx ? <CheckCircle className="w-4 h-4" /> : i + 1}
            </div>
            <span
              className={`text-sm font-medium hidden sm:inline ${
                i === currentIdx
                  ? "text-zinc-900 dark:text-white"
                  : i < currentIdx
                  ? "text-green-600"
                  : "text-zinc-400"
              }`}
            >
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <ChevronRight className="w-4 h-4 text-zinc-300 dark:text-zinc-600 flex-shrink-0" />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function Badge({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "warning" | "success" | "error" }) {
  const cls = {
    default: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    success: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    error:   "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  }[variant];
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{children}</span>;
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function ImportCenter({ existingContactCount }: Props) {
  const [step, setStep] = useState<Step>("upload");
  const [rawCsv, setRawCsv] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [isPasting, setIsPasting] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [columnMap, setColumnMap] = useState<Record<string, string>>({});
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null);
  const [dedupStrategy, setDedupStrategy] = useState<DedupStrategy>("skip");
  const [commitResult, setCommitResult] = useState<CommitResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── File handling ───────────────────────────────────────────────────────────

  const readFile = useCallback((file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setRawCsv(text);
      setFileName(file.name);
    };
    reader.readAsText(file);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) readFile(file);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) readFile(file);
    },
    [readFile]
  );

  // ── Step: Upload → Map ──────────────────────────────────────────────────────

  const handleUploadContinue = async () => {
    const csv = isPasting ? pasteText : rawCsv;
    if (!csv.trim()) { setError("Please provide a CSV file or paste CSV text."); return; }

    setError(null);
    setIsLoading(true);
    try {
      // Extract headers and auto-detect column map via previewCSVImport (preview_only)
      const result = await previewCSVImport(csv);
      setCsvHeaders(result.headers);
      setColumnMap(result.columnMap);
      setRawCsv(csv);
      setStep("map");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse CSV");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step: Map → Preview ─────────────────────────────────────────────────────

  const handleMapContinue = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const result = await previewCSVImport(rawCsv, columnMap);
      if (result.rows.length === 0) {
        setError('No valid rows found. Make sure your CSV has a column mapped to "name".');
        setIsLoading(false);
        return;
      }
      setPreviewResult(result);
      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate preview");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step: Preview → Done ────────────────────────────────────────────────────

  const handleCommit = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const result = await commitCSVImport(rawCsv, dedupStrategy, columnMap);
      setCommitResult(result);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setStep("upload");
    setRawCsv("");
    setFileName("");
    setPasteText("");
    setCsvHeaders([]);
    setColumnMap({});
    setPreviewResult(null);
    setCommitResult(null);
    setError(null);
    setIsPasting(false);
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto">
      <StepIndicator current={step} />

      {/* ── Step 1: Upload ── */}
      {step === "upload" && (
        <div className="space-y-6">
          {/* Stats bar */}
          <div className="flex items-center gap-3 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
            <Users className="w-5 h-5 text-zinc-400" />
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              You currently have{" "}
              <strong className="text-zinc-900 dark:text-white">{existingContactCount.toLocaleString()}</strong>{" "}
              contacts in your CRM.
            </span>
          </div>

          {/* Source toggle */}
          <div className="flex gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg w-fit">
            {(["file", "paste"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setIsPasting(mode === "paste")}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  (mode === "paste") === isPasting
                    ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm"
                    : "text-zinc-500 dark:text-zinc-400"
                }`}
              >
                {mode === "file" ? "Upload file" : "Paste CSV"}
              </button>
            ))}
          </div>

          {/* File drop zone */}
          {!isPasting && (
            <div
              className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-colors cursor-pointer ${
                isDragging
                  ? "border-zinc-900 dark:border-white bg-zinc-50 dark:bg-zinc-800"
                  : rawCsv
                  ? "border-green-400 bg-green-50 dark:border-green-500 dark:bg-green-900/10"
                  : "border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500"
              }`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={handleFileChange}
              />
              {rawCsv ? (
                <div className="flex flex-col items-center gap-3">
                  <CheckCircle className="w-10 h-10 text-green-500" />
                  <div>
                    <p className="font-semibold text-zinc-900 dark:text-white">{fileName || "File loaded"}</p>
                    <p className="text-sm text-zinc-500 mt-1">
                      {rawCsv.split("\n").filter(Boolean).length - 1} rows detected
                    </p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setRawCsv(""); setFileName(""); }}
                    className="text-xs text-zinc-400 hover:text-zinc-600 flex items-center gap-1 mt-1"
                  >
                    <X className="w-3 h-3" /> Remove
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <Upload className="w-10 h-10 text-zinc-300 dark:text-zinc-600" />
                  <div>
                    <p className="font-medium text-zinc-700 dark:text-zinc-300">
                      Drop your CSV here, or <span className="underline">browse</span>
                    </p>
                    <p className="text-sm text-zinc-400 mt-1">Accepts .csv and .txt files up to 4 MB</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Paste zone */}
          {isPasting && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Paste CSV data (first row must be headers)
              </label>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder={"name,email,phone,source\nJane Smith,jane@example.com,555-1234,zillow\nJohn Doe,john@example.com,,referral"}
                rows={10}
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 text-sm font-mono text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white resize-y"
              />
            </div>
          )}

          {/* HubSpot callout */}
          <div className="flex items-start gap-3 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-sm">🔶</span>
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Import from HubSpot</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Export your HubSpot contacts as a CSV (Contacts → Export) and upload it here. Full OAuth sync coming soon.
              </p>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <button
            onClick={handleUploadContinue}
            disabled={isLoading || (!rawCsv && !pasteText.trim())}
            className="flex items-center gap-2 px-6 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-medium text-sm hover:bg-zinc-700 dark:hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
            Continue
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Step 2: Map Columns ── */}
      {step === "map" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Map your columns</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              We auto-detected the mapping below. Adjust any column that wasn&apos;t recognised.
            </p>
          </div>

          <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
            <div className="grid grid-cols-2 gap-px bg-zinc-100 dark:bg-zinc-800 text-xs font-semibold text-zinc-500 uppercase tracking-wide">
              <div className="bg-zinc-50 dark:bg-zinc-900 px-4 py-3">Your CSV column</div>
              <div className="bg-zinc-50 dark:bg-zinc-900 px-4 py-3">Maps to field</div>
            </div>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {csvHeaders.map((header) => (
                <div key={header} className="grid grid-cols-2 gap-4 items-center px-4 py-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                    <span className="text-sm font-mono text-zinc-700 dark:text-zinc-300 truncate">{header}</span>
                  </div>
                  <select
                    value={columnMap[header] ?? ""}
                    onChange={(e) =>
                      setColumnMap((prev) => ({
                        ...prev,
                        [header]: e.target.value,
                      }))
                    }
                    className="text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white"
                  >
                    <option value="">— ignore —</option>
                    {CONTACT_FIELDS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setStep("upload")}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={handleMapContinue}
              disabled={isLoading || !Object.values(columnMap).includes("name")}
              className="flex items-center gap-2 px-6 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-medium text-sm hover:bg-zinc-700 dark:hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
              Preview import
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          {!Object.values(columnMap).includes("name") && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              You must map at least one column to <strong>name</strong> to continue.
            </p>
          )}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>
      )}

      {/* ── Step 3: Preview ── */}
      {step === "preview" && previewResult && (
        <div className="space-y-6">
          {/* Summary bar */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Total rows", value: previewResult.total, variant: "default" as const },
              { label: "Duplicates", value: previewResult.duplicates, variant: previewResult.duplicates > 0 ? "warning" as const : "success" as const },
              { label: "New contacts", value: previewResult.total - previewResult.duplicates, variant: "success" as const },
            ].map(({ label, value, variant }) => (
              <div
                key={label}
                className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-center"
              >
                <p className="text-2xl font-bold text-zinc-900 dark:text-white">{value}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{label}</p>
                {variant !== "default" && (
                  <div className="mt-2 flex justify-center">
                    <Badge variant={variant}>{variant === "warning" ? "needs review" : "ready"}</Badge>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Dedup strategy */}
          {previewResult.duplicates > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                How should we handle {previewResult.duplicates} duplicate{previewResult.duplicates !== 1 ? "s" : ""}?
              </p>
              <div className="space-y-2">
                {DEDUP_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                      dedupStrategy === opt.value
                        ? "border-zinc-900 dark:border-white bg-zinc-50 dark:bg-zinc-800"
                        : "border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="dedup"
                      value={opt.value}
                      checked={dedupStrategy === opt.value}
                      onChange={() => setDedupStrategy(opt.value)}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{opt.label}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{opt.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Row preview table */}
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto max-h-80">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-900 sticky top-0">
                  <tr>
                    {["Name", "Email", "Phone", "Type", "Source", "Status"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {previewResult.rows.slice(0, 200).map((row: ContactRow, i: number) => (
                    <tr
                      key={i}
                      className={row.isDuplicate ? "bg-amber-50 dark:bg-amber-900/10" : ""}
                    >
                      <td className="px-4 py-2.5 font-medium text-zinc-900 dark:text-white whitespace-nowrap">{row.name}</td>
                      <td className="px-4 py-2.5 text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{row.email ?? "—"}</td>
                      <td className="px-4 py-2.5 text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{row.phone ?? "—"}</td>
                      <td className="px-4 py-2.5">
                        <Badge>{row.type}</Badge>
                      </td>
                      <td className="px-4 py-2.5 text-zinc-500 dark:text-zinc-400">{row.source ?? "—"}</td>
                      <td className="px-4 py-2.5">
                        {row.isDuplicate ? (
                          <Badge variant="warning">duplicate</Badge>
                        ) : (
                          <Badge variant="success">new</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {previewResult.rows.length > 200 && (
                <p className="text-xs text-zinc-400 text-center py-3 border-t border-zinc-100 dark:border-zinc-800">
                  Showing first 200 of {previewResult.rows.length} rows. All rows will be imported.
                </p>
              )}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={() => setStep("map")}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={handleCommit}
              disabled={isLoading}
              className="flex items-center gap-2 px-6 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-medium text-sm hover:bg-zinc-700 dark:hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
              Import {previewResult.total} contacts
            </button>
          </div>
        </div>
      )}

      {/* ── Step 4: Done ── */}
      {step === "done" && commitResult && (
        <div className="space-y-6">
          <div className="flex flex-col items-center text-center py-8">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Import complete!</h2>
            <p className="text-zinc-500 dark:text-zinc-400 mt-2 max-w-sm">
              Your contacts have been added to the CRM and are ready to use.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Created", value: commitResult.created, variant: "success" as const },
              { label: "Updated", value: commitResult.updated, variant: "default" as const },
              { label: "Skipped", value: commitResult.skipped, variant: "default" as const },
              { label: "Errors", value: commitResult.errors, variant: commitResult.errors > 0 ? "error" as const : "default" as const },
            ].map(({ label, value, variant }) => (
              <div
                key={label}
                className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-center"
              >
                <p className="text-3xl font-bold text-zinc-900 dark:text-white">{value}</p>
                <div className="mt-1 flex justify-center">
                  <Badge variant={variant}>{label}</Badge>
                </div>
              </div>
            ))}
          </div>

          {commitResult.errorDetails && commitResult.errorDetails.length > 0 && (
            <div className="p-4 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10">
              <p className="text-sm font-medium text-red-700 dark:text-red-400 mb-2">Rows with errors:</p>
              <ul className="text-xs text-red-600 dark:text-red-400 space-y-1 list-disc list-inside">
                {commitResult.errorDetails.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}

          <div className="flex items-center gap-3 justify-center">
            <a
              href="/contacts"
              className="flex items-center gap-2 px-6 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-medium text-sm hover:bg-zinc-700 dark:hover:bg-zinc-100 transition-colors"
            >
              <Users className="w-4 h-4" />
              View contacts
            </a>
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Import another file
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
