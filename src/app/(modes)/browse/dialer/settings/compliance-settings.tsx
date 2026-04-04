"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { ActionButton } from "@/components/ui/action-button";
import {
  Shield,
  Clock,
  Phone,
  Mic,
  Plus,
  Upload,
  Download,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Settings {
  id: string;
  callingHoursStart: string;
  callingHoursEnd: string;
  callingTimezone: string;
  maxCallsPerDay: number;
  cooldownDays: number;
  recordingConsent: boolean;
}

interface DNCEntry {
  id: string;
  phone: string;
  reason: string | null;
  source: string | null;
  addedAt: string;
}

interface Props {
  initialSettings: Settings;
  initialDNCCount: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const START_TIMES = Array.from({ length: 13 }, (_, i) => {
  const hour = 6 + Math.floor(i / 2);
  const min = i % 2 === 0 ? "00" : "30";
  return `${hour.toString().padStart(2, "0")}:${min}`;
}); // 06:00 - 12:00

const END_TIMES = Array.from({ length: 21 }, (_, i) => {
  const hour = 12 + Math.floor(i / 2);
  const min = i % 2 === 0 ? "00" : "30";
  return `${hour.toString().padStart(2, "0")}:${min}`;
}); // 12:00 - 22:00

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern (ET)" },
  { value: "America/Chicago", label: "Central (CT)" },
  { value: "America/Denver", label: "Mountain (MT)" },
  { value: "America/Los_Angeles", label: "Pacific (PT)" },
  { value: "America/Anchorage", label: "Alaska (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii (HT)" },
];

function formatTime12(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${m.toString().padStart(2, "0")} ${suffix}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ComplianceSettings({ initialSettings, initialDNCCount }: Props) {
  const { theme } = useColonyTheme();

  // Settings state
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // DNC state
  const [dncEntries, setDncEntries] = useState<DNCEntry[]>([]);
  const [dncTotal, setDncTotal] = useState(initialDNCCount);
  const [dncPage, setDncPage] = useState(1);
  const [dncTotalPages, setDncTotalPages] = useState(1);
  const [dncSearch, setDncSearch] = useState("");
  const [dncLoading, setDncLoading] = useState(false);
  const [dncLoaded, setDncLoaded] = useState(false);

  // Add number form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [newReason, setNewReason] = useState("manual");
  const [addingPhone, setAddingPhone] = useState(false);

  // CSV import
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  // Shared styles
  const inputStyle: React.CSSProperties = {
    backgroundColor: withAlpha(theme.text, 0.05),
    border: `1px solid ${withAlpha(theme.text, 0.08)}`,
    color: theme.text,
  };

  // ---------------------------------------------------------------------------
  // Settings handlers
  // ---------------------------------------------------------------------------

  const saveSettings = useCallback(async (updates: Partial<Settings>) => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/dialer/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const updated = await res.json();
        setSettings((prev) => ({ ...prev, ...updated }));
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  }, []);

  const handleSettingChange = useCallback(
    (field: keyof Settings, value: string | number | boolean) => {
      setSettings((prev) => ({ ...prev, [field]: value }));
      saveSettings({ [field]: value });
    },
    [saveSettings]
  );

  // ---------------------------------------------------------------------------
  // DNC handlers
  // ---------------------------------------------------------------------------

  const fetchDNC = useCallback(
    async (page = 1, search = "") => {
      setDncLoading(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: "20",
          ...(search ? { search } : {}),
        });
        const res = await fetch(`/api/dialer/dnc?${params}`);
        if (res.ok) {
          const data = await res.json();
          setDncEntries(data.entries);
          setDncTotal(data.total);
          setDncPage(data.page);
          setDncTotalPages(data.totalPages);
          setDncLoaded(true);
        }
      } finally {
        setDncLoading(false);
      }
    },
    []
  );

  // Load DNC entries on first render of that section
  useEffect(() => {
    if (!dncLoaded) {
      fetchDNC(1, "");
    }
  }, [dncLoaded, fetchDNC]);

  const handleDncSearch = useCallback(() => {
    fetchDNC(1, dncSearch);
  }, [dncSearch, fetchDNC]);

  const handleAddPhone = useCallback(async () => {
    if (!newPhone.trim()) return;
    setAddingPhone(true);
    try {
      const res = await fetch("/api/dialer/dnc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: newPhone.trim(), reason: newReason, source: "manual" }),
      });
      if (res.ok) {
        setNewPhone("");
        setShowAddForm(false);
        fetchDNC(dncPage, dncSearch);
      }
    } finally {
      setAddingPhone(false);
    }
  }, [newPhone, newReason, dncPage, dncSearch, fetchDNC]);

  const handleDeleteEntry = useCallback(
    async (phone: string) => {
      const res = await fetch("/api/dialer/dnc", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      if (res.ok) {
        fetchDNC(dncPage, dncSearch);
      }
    },
    [dncPage, dncSearch, fetchDNC]
  );

  const handleCSVImport = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setImporting(true);
      try {
        const text = await file.text();
        const numbers = text
          .split(/[\r\n,]+/)
          .map((n) => n.trim())
          .filter((n) => n.length > 0);

        if (numbers.length === 0) return;

        const res = await fetch("/api/dialer/dnc/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ numbers }),
        });
        if (res.ok) {
          fetchDNC(1, dncSearch);
        }
      } finally {
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [dncSearch, fetchDNC]
  );

  const handleExport = useCallback(() => {
    const csvContent = ["phone,reason,source,added_at"]
      .concat(
        dncEntries.map(
          (e) => `${e.phone},${e.reason || ""},${e.source || ""},${e.addedAt}`
        )
      )
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dnc-list.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [dncEntries]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="p-6 sm:p-8 max-w-5xl mx-auto space-y-6">
      {/* Back link */}
      <Link
        href="/browse/dialer"
        className="inline-flex items-center gap-1.5 text-[12px] font-medium transition-opacity hover:opacity-70"
        style={{ color: withAlpha(theme.text, 0.4) }}
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Dialer
      </Link>

      <PageHeader
        title="Compliance & DNC Settings"
        subtitle="Configure calling hours, recording consent, and manage your Do Not Call list"
        icon={Shield}
        actions={
          saving ? (
            <span className="text-[12px]" style={{ color: withAlpha(theme.text, 0.4) }}>
              Saving...
            </span>
          ) : saved ? (
            <span className="text-[12px]" style={{ color: "#30d158" }}>
              Saved
            </span>
          ) : null
        }
      />

      {/* ------------------------------------------------------------------- */}
      {/* Section 1: Calling Hours */}
      {/* ------------------------------------------------------------------- */}
      <SectionCard title="Calling Hours" subtitle="Set allowed calling windows to comply with TCPA regulations">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Start time */}
          <div>
            <label
              className="block text-[11px] font-medium uppercase tracking-[0.06em] mb-1.5"
              style={{ color: withAlpha(theme.text, 0.4) }}
            >
              Start Time
            </label>
            <select
              value={settings.callingHoursStart}
              onChange={(e) => handleSettingChange("callingHoursStart", e.target.value)}
              className="w-full h-9 px-3 rounded-lg text-[13px] focus:outline-none appearance-none"
              style={inputStyle}
            >
              {START_TIMES.map((t) => (
                <option key={t} value={t}>
                  {formatTime12(t)}
                </option>
              ))}
            </select>
          </div>

          {/* End time */}
          <div>
            <label
              className="block text-[11px] font-medium uppercase tracking-[0.06em] mb-1.5"
              style={{ color: withAlpha(theme.text, 0.4) }}
            >
              End Time
            </label>
            <select
              value={settings.callingHoursEnd}
              onChange={(e) => handleSettingChange("callingHoursEnd", e.target.value)}
              className="w-full h-9 px-3 rounded-lg text-[13px] focus:outline-none appearance-none"
              style={inputStyle}
            >
              {END_TIMES.map((t) => (
                <option key={t} value={t}>
                  {formatTime12(t)}
                </option>
              ))}
            </select>
          </div>

          {/* Timezone */}
          <div>
            <label
              className="block text-[11px] font-medium uppercase tracking-[0.06em] mb-1.5"
              style={{ color: withAlpha(theme.text, 0.4) }}
            >
              Timezone
            </label>
            <select
              value={settings.callingTimezone}
              onChange={(e) => handleSettingChange("callingTimezone", e.target.value)}
              className="w-full h-9 px-3 rounded-lg text-[13px] focus:outline-none appearance-none"
              style={inputStyle}
            >
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>

          {/* Max calls per day */}
          <div>
            <label
              className="block text-[11px] font-medium uppercase tracking-[0.06em] mb-1.5"
              style={{ color: withAlpha(theme.text, 0.4) }}
            >
              Max Calls Per Day
            </label>
            <input
              type="number"
              min={1}
              max={1000}
              value={settings.maxCallsPerDay}
              onChange={(e) => handleSettingChange("maxCallsPerDay", parseInt(e.target.value) || 200)}
              className="w-full h-9 px-3 rounded-lg text-[13px] focus:outline-none"
              style={inputStyle}
            />
          </div>

          {/* Cooldown days */}
          <div className="sm:col-span-2">
            <label
              className="block text-[11px] font-medium uppercase tracking-[0.06em] mb-1.5"
              style={{ color: withAlpha(theme.text, 0.4) }}
            >
              Cooldown Days Between Calls (same number)
            </label>
            <input
              type="number"
              min={0}
              max={90}
              value={settings.cooldownDays}
              onChange={(e) => handleSettingChange("cooldownDays", parseInt(e.target.value) || 0)}
              className="w-full sm:w-48 h-9 px-3 rounded-lg text-[13px] focus:outline-none"
              style={inputStyle}
            />
            <p className="text-[11px] mt-1.5" style={{ color: withAlpha(theme.text, 0.35) }}>
              Set to 0 to disable. Prevents calling the same number within the specified number of days.
            </p>
          </div>
        </div>
      </SectionCard>

      {/* ------------------------------------------------------------------- */}
      {/* Section 2: Recording Consent */}
      {/* ------------------------------------------------------------------- */}
      <SectionCard title="Recording Consent" subtitle="TCPA two-party consent compliance">
        <div className="flex items-start gap-4">
          {/* Toggle */}
          <button
            onClick={() => handleSettingChange("recordingConsent", !settings.recordingConsent)}
            className="shrink-0 mt-0.5 relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200"
            style={{
              backgroundColor: settings.recordingConsent
                ? theme.accent
                : withAlpha(theme.text, 0.15),
            }}
          >
            <span
              className="inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform duration-200"
              style={{
                transform: settings.recordingConsent ? "translateX(18px)" : "translateX(3px)",
              }}
            />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium" style={{ color: theme.text }}>
              Two-party consent announcement
            </p>
            <p className="text-[12px] mt-1 leading-relaxed" style={{ color: withAlpha(theme.text, 0.45) }}>
              When enabled, a recording consent announcement will play at the beginning of
              each call. This is required in two-party consent states (California, Connecticut,
              Florida, Illinois, Maryland, Massachusetts, Michigan, Montana, Nevada, New Hampshire,
              Oregon, Pennsylvania, Washington). The Telephone Consumer Protection Act (TCPA)
              requires businesses to inform callers when a conversation is being recorded.
            </p>
          </div>
        </div>
      </SectionCard>

      {/* ------------------------------------------------------------------- */}
      {/* Section 3: Do Not Call List */}
      {/* ------------------------------------------------------------------- */}
      <SectionCard
        title="Do Not Call List"
        subtitle="Manage numbers that should never be contacted"
        actions={
          <span
            className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full text-[10px] font-semibold"
            style={{
              backgroundColor: withAlpha(theme.accent, 0.15),
              color: theme.accent,
            }}
          >
            {dncTotal}
          </span>
        }
      >
        {/* Action bar */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5"
              style={{ color: withAlpha(theme.text, 0.3) }}
            />
            <input
              type="text"
              placeholder="Search phone numbers..."
              value={dncSearch}
              onChange={(e) => setDncSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleDncSearch()}
              className="w-full h-9 pl-9 pr-3 rounded-lg text-[13px] focus:outline-none"
              style={inputStyle}
            />
          </div>

          <ActionButton
            label="Add Number"
            icon={Plus}
            variant="secondary"
            size="sm"
            onClick={() => setShowAddForm(!showAddForm)}
          />

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            className="hidden"
            onChange={handleCSVImport}
          />
          <ActionButton
            label={importing ? "Importing..." : "Import CSV"}
            icon={Upload}
            variant="secondary"
            size="sm"
            disabled={importing}
            onClick={() => fileInputRef.current?.click()}
          />

          <ActionButton
            label="Export"
            icon={Download}
            variant="ghost"
            size="sm"
            onClick={handleExport}
            disabled={dncEntries.length === 0}
          />
        </div>

        {/* Add number inline form */}
        {showAddForm && (
          <div
            className="flex items-end gap-3 mb-4 p-4 rounded-xl"
            style={{ backgroundColor: withAlpha(theme.text, 0.03) }}
          >
            <div className="flex-1">
              <label
                className="block text-[11px] font-medium uppercase tracking-[0.06em] mb-1.5"
                style={{ color: withAlpha(theme.text, 0.4) }}
              >
                Phone Number
              </label>
              <input
                type="text"
                placeholder="+1 (555) 123-4567"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddPhone()}
                className="w-full h-9 px-3 rounded-lg text-[13px] focus:outline-none"
                style={inputStyle}
              />
            </div>
            <div className="w-40">
              <label
                className="block text-[11px] font-medium uppercase tracking-[0.06em] mb-1.5"
                style={{ color: withAlpha(theme.text, 0.4) }}
              >
                Reason
              </label>
              <select
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
                className="w-full h-9 px-3 rounded-lg text-[13px] focus:outline-none appearance-none"
                style={inputStyle}
              >
                <option value="manual">Manual</option>
                <option value="requested">Requested</option>
                <option value="regulatory">Regulatory</option>
              </select>
            </div>
            <ActionButton
              label={addingPhone ? "Adding..." : "Add"}
              variant="primary"
              size="sm"
              disabled={addingPhone || !newPhone.trim()}
              onClick={handleAddPhone}
            />
          </div>
        )}

        {/* DNC Table */}
        {dncLoading && dncEntries.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[13px]" style={{ color: withAlpha(theme.text, 0.4) }}>
              Loading...
            </p>
          </div>
        ) : dncEntries.length === 0 ? (
          <div className="text-center py-8">
            <Phone
              className="h-8 w-8 mx-auto mb-2"
              style={{ color: withAlpha(theme.text, 0.15) }}
              strokeWidth={1}
            />
            <p className="text-[13px] font-medium" style={{ color: withAlpha(theme.text, 0.4) }}>
              No DNC entries yet
            </p>
            <p className="text-[12px] mt-0.5" style={{ color: withAlpha(theme.text, 0.3) }}>
              Add phone numbers manually or import from a CSV file.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${withAlpha(theme.text, 0.06)}` }}>
                    {["Phone Number", "Reason", "Source", "Date Added", ""].map((header) => (
                      <th
                        key={header}
                        className="text-left text-[11px] font-medium uppercase tracking-[0.06em] pb-2.5 px-2 first:pl-0"
                        style={{ color: withAlpha(theme.text, 0.35) }}
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dncEntries.map((entry) => (
                    <tr
                      key={entry.id}
                      className="group"
                      style={{ borderBottom: `0.5px solid ${withAlpha(theme.text, 0.04)}` }}
                    >
                      <td className="py-2.5 px-2 pl-0">
                        <span className="text-[13px] font-mono" style={{ color: theme.text }}>
                          {entry.phone}
                        </span>
                      </td>
                      <td className="py-2.5 px-2">
                        <span
                          className="inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium capitalize"
                          style={{
                            backgroundColor: withAlpha(theme.text, 0.05),
                            color: withAlpha(theme.text, 0.6),
                          }}
                        >
                          {entry.reason || "manual"}
                        </span>
                      </td>
                      <td className="py-2.5 px-2">
                        <span className="text-[12px] capitalize" style={{ color: withAlpha(theme.text, 0.45) }}>
                          {entry.source || "-"}
                        </span>
                      </td>
                      <td className="py-2.5 px-2">
                        <span className="text-[12px]" style={{ color: withAlpha(theme.text, 0.45) }}>
                          {formatDate(entry.addedAt)}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-right">
                        <button
                          onClick={() => handleDeleteEntry(entry.phone)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-red-500/10"
                          title="Remove from DNC list"
                        >
                          <Trash2 className="h-3.5 w-3.5" style={{ color: "#ff453a" }} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {dncTotalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-3" style={{ borderTop: `1px solid ${withAlpha(theme.text, 0.05)}` }}>
                <p className="text-[12px]" style={{ color: withAlpha(theme.text, 0.4) }}>
                  Page {dncPage} of {dncTotalPages} ({dncTotal} entries)
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => fetchDNC(dncPage - 1, dncSearch)}
                    disabled={dncPage <= 1}
                    className="h-7 w-7 rounded-md flex items-center justify-center transition-colors disabled:opacity-30"
                    style={{ backgroundColor: withAlpha(theme.text, 0.05) }}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" style={{ color: theme.text }} />
                  </button>
                  <button
                    onClick={() => fetchDNC(dncPage + 1, dncSearch)}
                    disabled={dncPage >= dncTotalPages}
                    className="h-7 w-7 rounded-md flex items-center justify-center transition-colors disabled:opacity-30"
                    style={{ backgroundColor: withAlpha(theme.text, 0.05) }}
                  >
                    <ChevronRight className="h-3.5 w-3.5" style={{ color: theme.text }} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </SectionCard>
    </div>
  );
}
