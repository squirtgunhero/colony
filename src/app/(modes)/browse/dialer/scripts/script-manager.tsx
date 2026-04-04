"use client";

import { useState } from "react";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { ActionButton } from "@/components/ui/action-button";
import {
  FlaskConical,
  Plus,
  Trash2,
  Pencil,
  ToggleLeft,
  ToggleRight,
  PhoneCall,
  CalendarCheck,
  ArrowLeft,
  X,
  Check,
} from "lucide-react";
import Link from "next/link";

interface TaraScript {
  id: string;
  userId: string;
  name: string;
  objective: string;
  greeting: string;
  systemPrompt: string;
  isActive: boolean;
  weight: number;
  totalCalls: number;
  connectedCalls: number;
  appointmentsSet: number;
  avgDuration: number;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  initialScripts: TaraScript[];
}

const OBJECTIVES = [
  { key: "qualify", label: "Qualify Lead" },
  { key: "appointment", label: "Set Appointment" },
  { key: "followup", label: "Follow Up" },
] as const;

function formatDuration(seconds: number): string {
  if (!seconds) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function connectRate(script: TaraScript): string {
  if (script.totalCalls === 0) return "0%";
  return `${Math.round((script.connectedCalls / script.totalCalls) * 100)}%`;
}

export function ScriptManager({ initialScripts }: Props) {
  const { theme } = useColonyTheme();
  const [scripts, setScripts] = useState<TaraScript[]>(initialScripts);
  const [activeTab, setActiveTab] = useState<string>("qualify");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);

  // Create form state
  const [formName, setFormName] = useState("");
  const [formGreeting, setFormGreeting] = useState("");
  const [formSystemPrompt, setFormSystemPrompt] = useState("");
  const [formWeight, setFormWeight] = useState(50);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editGreeting, setEditGreeting] = useState("");
  const [editSystemPrompt, setEditSystemPrompt] = useState("");
  const [editWeight, setEditWeight] = useState(50);

  const tabScripts = scripts.filter((s) => s.objective === activeTab);
  const activeTabScripts = tabScripts.filter((s) => s.isActive);
  const totalActiveWeight = activeTabScripts.reduce((sum, s) => sum + s.weight, 0);

  const borderColor = withAlpha(theme.text, 0.08);
  const inputBg = withAlpha(theme.text, 0.05);

  async function handleCreate() {
    if (!formName || !formGreeting || !formSystemPrompt) return;
    setSaving(true);
    try {
      const res = await fetch("/api/dialer/scripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          objective: activeTab,
          greeting: formGreeting,
          systemPrompt: formSystemPrompt,
          weight: formWeight,
        }),
      });
      if (res.ok) {
        const script = await res.json();
        setScripts((prev) => [
          { ...script, createdAt: script.createdAt, updatedAt: script.updatedAt },
          ...prev,
        ]);
        setShowCreate(false);
        setFormName("");
        setFormGreeting("");
        setFormSystemPrompt("");
        setFormWeight(50);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(script: TaraScript) {
    const res = await fetch(`/api/dialer/scripts/${script.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !script.isActive }),
    });
    if (res.ok) {
      const updated = await res.json();
      setScripts((prev) => prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)));
    }
  }

  async function handleSaveEdit(id: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/dialer/scripts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          greeting: editGreeting,
          systemPrompt: editSystemPrompt,
          weight: editWeight,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setScripts((prev) => prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)));
        setEditingId(null);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/dialer/scripts/${id}`, { method: "DELETE" });
    if (res.ok) {
      setScripts((prev) => prev.filter((s) => s.id !== id));
      setDeletingId(null);
    }
  }

  function startEdit(script: TaraScript) {
    setEditingId(script.id);
    setEditName(script.name);
    setEditGreeting(script.greeting);
    setEditSystemPrompt(script.systemPrompt);
    setEditWeight(script.weight);
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-6">
      <div className="mb-4">
        <Link
          href="/browse/dialer"
          className="inline-flex items-center gap-1.5 text-[12px] font-medium transition-colors"
          style={{ color: withAlpha(theme.text, 0.4) }}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Dialer
        </Link>
      </div>

      <PageHeader
        title="Tara Scripts"
        subtitle="A/B test different greetings and prompts for Voice AI calls"
        icon={FlaskConical}
        actions={
          <ActionButton
            label="Add Variant"
            icon={Plus}
            onClick={() => {
              setShowCreate(true);
              setFormName("");
              setFormGreeting("");
              setFormSystemPrompt("");
              setFormWeight(50);
            }}
            size="sm"
          />
        }
      />

      {/* Objective Tabs */}
      <div
        className="flex gap-1 p-1 rounded-xl mb-6"
        style={{ backgroundColor: withAlpha(theme.text, 0.04) }}
      >
        {OBJECTIVES.map((obj) => {
          const isActive = activeTab === obj.key;
          const count = scripts.filter((s) => s.objective === obj.key).length;
          return (
            <button
              key={obj.key}
              onClick={() => {
                setActiveTab(obj.key);
                setShowCreate(false);
                setEditingId(null);
              }}
              className="flex-1 py-2 px-3 rounded-lg text-[13px] font-medium transition-all"
              style={{
                backgroundColor: isActive ? withAlpha(theme.accent, 0.15) : "transparent",
                color: isActive ? theme.accent : withAlpha(theme.text, 0.5),
              }}
            >
              {obj.label}
              {count > 0 && (
                <span
                  className="ml-1.5 text-[11px]"
                  style={{ opacity: 0.6 }}
                >
                  ({count})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Weight visualization */}
      {activeTabScripts.length > 0 && (
        <div className="mb-4">
          <p className="text-[11px] font-medium mb-2" style={{ color: withAlpha(theme.text, 0.4) }}>
            TRAFFIC DISTRIBUTION
          </p>
          <div className="flex gap-0.5 h-2 rounded-full overflow-hidden" style={{ backgroundColor: withAlpha(theme.text, 0.06) }}>
            {activeTabScripts.map((s) => {
              const pct = totalActiveWeight > 0 ? (s.weight / totalActiveWeight) * 100 : 0;
              return (
                <div
                  key={s.id}
                  className="h-full rounded-full"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: theme.accent,
                    opacity: 0.4 + (pct / 100) * 0.6,
                  }}
                  title={`${s.name}: ${Math.round(pct)}%`}
                />
              );
            })}
          </div>
          <div className="flex gap-3 mt-1.5 flex-wrap">
            {activeTabScripts.map((s) => {
              const pct = totalActiveWeight > 0 ? Math.round((s.weight / totalActiveWeight) * 100) : 0;
              return (
                <span key={s.id} className="text-[11px]" style={{ color: withAlpha(theme.text, 0.5) }}>
                  {s.name}: {pct}%
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <SectionCard title="New Script Variant" className="mb-4">
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-medium mb-1" style={{ color: withAlpha(theme.text, 0.5) }}>
                NAME
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Warm Opener v2"
                className="w-full px-3 py-2 rounded-lg text-[13px] outline-none"
                style={{ backgroundColor: inputBg, border: `1px solid ${borderColor}`, color: theme.text }}
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium mb-1" style={{ color: withAlpha(theme.text, 0.5) }}>
                GREETING
              </label>
              <textarea
                value={formGreeting}
                onChange={(e) => setFormGreeting(e.target.value)}
                placeholder="Hi {firstName}, this is Tara calling from..."
                rows={3}
                className="w-full px-3 py-2 rounded-lg text-[13px] outline-none resize-none"
                style={{ backgroundColor: inputBg, border: `1px solid ${borderColor}`, color: theme.text }}
              />
              <p className="text-[11px] mt-0.5" style={{ color: withAlpha(theme.text, 0.3) }}>
                Use {"{firstName}"} for the contact&apos;s first name
              </p>
            </div>
            <div>
              <label className="block text-[11px] font-medium mb-1" style={{ color: withAlpha(theme.text, 0.5) }}>
                SYSTEM PROMPT
              </label>
              <textarea
                value={formSystemPrompt}
                onChange={(e) => setFormSystemPrompt(e.target.value)}
                placeholder="You are Tara, a friendly real estate AI assistant..."
                rows={5}
                className="w-full px-3 py-2 rounded-lg text-[13px] outline-none resize-none"
                style={{ backgroundColor: inputBg, border: `1px solid ${borderColor}`, color: theme.text }}
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium mb-1" style={{ color: withAlpha(theme.text, 0.5) }}>
                WEIGHT (0-100)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={formWeight}
                  onChange={(e) => setFormWeight(parseInt(e.target.value))}
                  className="flex-1"
                  style={{ accentColor: theme.accent }}
                />
                <span className="text-[13px] font-medium w-10 text-right" style={{ color: theme.text }}>
                  {formWeight}
                </span>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <ActionButton
                label={saving ? "Saving..." : "Create Script"}
                icon={Check}
                onClick={handleCreate}
                disabled={saving || !formName || !formGreeting || !formSystemPrompt}
                size="sm"
              />
              <ActionButton
                label="Cancel"
                icon={X}
                onClick={() => setShowCreate(false)}
                variant="ghost"
                size="sm"
              />
            </div>
          </div>
        </SectionCard>
      )}

      {/* Script cards */}
      {tabScripts.length === 0 && !showCreate ? (
        <SectionCard>
          <div className="text-center py-8">
            <FlaskConical
              className="h-10 w-10 mx-auto mb-3"
              style={{ color: withAlpha(theme.text, 0.15) }}
              strokeWidth={1.2}
            />
            <p className="text-[13px] font-medium" style={{ color: withAlpha(theme.text, 0.5) }}>
              Using default greeting and prompt
            </p>
            <p className="text-[12px] mt-1" style={{ color: withAlpha(theme.text, 0.3) }}>
              Add a variant to customize Tara&apos;s behavior for this objective.
            </p>
          </div>
        </SectionCard>
      ) : (
        <div className="space-y-3">
          {tabScripts.map((script) => {
            const isEditing = editingId === script.id;
            const isDeleting = deletingId === script.id;
            const pct =
              totalActiveWeight > 0 && script.isActive
                ? Math.round((script.weight / totalActiveWeight) * 100)
                : 0;

            return (
              <div
                key={script.id}
                className="rounded-xl overflow-hidden"
                style={{
                  backgroundColor: withAlpha(theme.text, 0.03),
                  border: `1px solid ${withAlpha(theme.text, 0.06)}`,
                  opacity: script.isActive ? 1 : 0.55,
                }}
              >
                {/* Header row */}
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() => handleToggleActive(script)}
                      title={script.isActive ? "Deactivate" : "Activate"}
                    >
                      {script.isActive ? (
                        <ToggleRight className="h-5 w-5" style={{ color: theme.accent }} />
                      ) : (
                        <ToggleLeft className="h-5 w-5" style={{ color: withAlpha(theme.text, 0.3) }} />
                      )}
                    </button>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold truncate" style={{ color: theme.text }}>
                        {script.name}
                      </p>
                      <p className="text-[11px] truncate" style={{ color: withAlpha(theme.text, 0.4) }}>
                        {script.greeting.length > 80
                          ? script.greeting.slice(0, 80) + "..."
                          : script.greeting}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {script.isActive && (
                      <span
                        className="text-[11px] font-medium px-2 py-0.5 rounded-md"
                        style={{
                          backgroundColor: withAlpha(theme.accent, 0.1),
                          color: theme.accent,
                        }}
                      >
                        {pct}% traffic
                      </span>
                    )}
                    <button
                      onClick={() => (isEditing ? setEditingId(null) : startEdit(script))}
                      className="p-1.5 rounded-lg transition-colors"
                      style={{ color: withAlpha(theme.text, 0.4) }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setDeletingId(isDeleting ? null : script.id)}
                      className="p-1.5 rounded-lg transition-colors"
                      style={{ color: withAlpha(theme.text, 0.4) }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Performance metrics */}
                <div
                  className="flex gap-6 px-4 py-2.5"
                  style={{ borderTop: `1px solid ${withAlpha(theme.text, 0.05)}` }}
                >
                  <div className="flex items-center gap-1.5">
                    <PhoneCall className="h-3 w-3" style={{ color: withAlpha(theme.text, 0.3) }} />
                    <span className="text-[11px]" style={{ color: withAlpha(theme.text, 0.5) }}>
                      {script.totalCalls} calls
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px]" style={{ color: withAlpha(theme.text, 0.5) }}>
                      Connect: {connectRate(script)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CalendarCheck className="h-3 w-3" style={{ color: withAlpha(theme.text, 0.3) }} />
                    <span className="text-[11px]" style={{ color: withAlpha(theme.text, 0.5) }}>
                      {script.appointmentsSet} appts
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px]" style={{ color: withAlpha(theme.text, 0.5) }}>
                      Avg: {formatDuration(script.avgDuration)}
                    </span>
                  </div>
                </div>

                {/* Delete confirm */}
                {isDeleting && (
                  <div
                    className="px-4 py-3 flex items-center justify-between"
                    style={{
                      borderTop: `1px solid ${withAlpha(theme.text, 0.05)}`,
                      backgroundColor: withAlpha(theme.text, 0.02),
                    }}
                  >
                    <p className="text-[12px]" style={{ color: withAlpha(theme.text, 0.6) }}>
                      Delete this script variant? This cannot be undone.
                    </p>
                    <div className="flex gap-2">
                      <ActionButton
                        label="Delete"
                        icon={Trash2}
                        onClick={() => handleDelete(script.id)}
                        variant="primary"
                        size="sm"
                      />
                      <ActionButton
                        label="Cancel"
                        onClick={() => setDeletingId(null)}
                        variant="ghost"
                        size="sm"
                      />
                    </div>
                  </div>
                )}

                {/* Edit form */}
                {isEditing && (
                  <div
                    className="px-4 py-4 space-y-3"
                    style={{
                      borderTop: `1px solid ${withAlpha(theme.text, 0.05)}`,
                      backgroundColor: withAlpha(theme.text, 0.02),
                    }}
                  >
                    <div>
                      <label className="block text-[11px] font-medium mb-1" style={{ color: withAlpha(theme.text, 0.5) }}>
                        NAME
                      </label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-[13px] outline-none"
                        style={{ backgroundColor: inputBg, border: `1px solid ${borderColor}`, color: theme.text }}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium mb-1" style={{ color: withAlpha(theme.text, 0.5) }}>
                        GREETING
                      </label>
                      <textarea
                        value={editGreeting}
                        onChange={(e) => setEditGreeting(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 rounded-lg text-[13px] outline-none resize-none"
                        style={{ backgroundColor: inputBg, border: `1px solid ${borderColor}`, color: theme.text }}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium mb-1" style={{ color: withAlpha(theme.text, 0.5) }}>
                        SYSTEM PROMPT
                      </label>
                      <textarea
                        value={editSystemPrompt}
                        onChange={(e) => setEditSystemPrompt(e.target.value)}
                        rows={5}
                        className="w-full px-3 py-2 rounded-lg text-[13px] outline-none resize-none"
                        style={{ backgroundColor: inputBg, border: `1px solid ${borderColor}`, color: theme.text }}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium mb-1" style={{ color: withAlpha(theme.text, 0.5) }}>
                        WEIGHT (0-100)
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={editWeight}
                          onChange={(e) => setEditWeight(parseInt(e.target.value))}
                          className="flex-1"
                          style={{ accentColor: theme.accent }}
                        />
                        <span className="text-[13px] font-medium w-10 text-right" style={{ color: theme.text }}>
                          {editWeight}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <ActionButton
                        label={saving ? "Saving..." : "Save Changes"}
                        icon={Check}
                        onClick={() => handleSaveEdit(script.id)}
                        disabled={saving}
                        size="sm"
                      />
                      <ActionButton
                        label="Cancel"
                        icon={X}
                        onClick={() => setEditingId(null)}
                        variant="ghost"
                        size="sm"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
