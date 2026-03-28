"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Mail,
  Clock,
  Save,
  Users,
  Play,
  Pause,
} from "lucide-react";

interface SequenceStep {
  stepNumber: number;
  subject: string;
  bodyTemplate: string;
  delayDays: number;
  sendTime?: string;
}

interface Enrollment {
  id: string;
  contactId: string;
  contactName: string;
  contactEmail: string | null;
  currentStep: number;
  status: string;
  nextSendAt: string | null;
  enrolledAt: string;
  recentEvents: { type: string; step: number; occurredAt: string }[];
}

interface Sequence {
  id: string;
  name: string;
  description: string | null;
  steps: SequenceStep[];
  status: string;
}

export default function SequenceDetailPage() {
  const { theme } = useColonyTheme();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isNew = id === "new";

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState<SequenceStep[]>([
    { stepNumber: 1, subject: "", bodyTemplate: "", delayDays: 0 },
  ]);
  const [status, setStatus] = useState("draft");
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(isNew);
  const [activeTab, setActiveTab] = useState<"steps" | "enrollments">("steps");

  const fetchSequence = useCallback(async () => {
    if (isNew) return;
    const res = await fetch("/api/sequences");
    if (!res.ok) return;
    const all: Sequence[] = await res.json();
    const seq = all.find((s) => s.id === id);
    if (seq) {
      setName(seq.name);
      setDescription(seq.description || "");
      setSteps(seq.steps as SequenceStep[]);
      setStatus(seq.status);
    }
    setLoaded(true);
  }, [id, isNew]);

  const fetchEnrollments = useCallback(async () => {
    if (isNew) return;
    const res = await fetch(`/api/sequences/enrollments?sequenceId=${id}`);
    if (res.ok) setEnrollments(await res.json());
  }, [id, isNew]);

  useEffect(() => {
    fetchSequence();
    fetchEnrollments();
  }, [fetchSequence, fetchEnrollments]);

  async function handleSave() {
    setSaving(true);
    try {
      const body: Record<string, unknown> = { name, description, steps, status };
      if (!isNew) body.id = id;

      const res = await fetch("/api/sequences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        if (isNew) {
          router.replace(`/sequences/${data.id}`);
        }
      }
    } finally {
      setSaving(false);
    }
  }

  function addStep() {
    setSteps([
      ...steps,
      {
        stepNumber: steps.length + 1,
        subject: "",
        bodyTemplate: "",
        delayDays: steps.length === 0 ? 0 : 3,
      },
    ]);
  }

  function removeStep(idx: number) {
    const updated = steps
      .filter((_, i) => i !== idx)
      .map((s, i) => ({ ...s, stepNumber: i + 1 }));
    setSteps(updated);
  }

  function updateStep(idx: number, patch: Partial<SequenceStep>) {
    setSteps(steps.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  }

  const dividerColor = withAlpha(theme.text, 0.06);

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span style={{ color: theme.textMuted }}>Loading...</span>
      </div>
    );
  }

  const inputStyle = {
    backgroundColor: withAlpha(theme.text, 0.04),
    borderColor: dividerColor,
    color: theme.text,
  };

  return (
    <div
      className="min-h-screen"
      style={{
        opacity: 0,
        animation: "fadeInPage 0.5s ease-out 0.05s forwards",
      }}
    >
      <style>{`
        @keyframes fadeInPage {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="max-w-4xl mx-auto px-6 pt-6 pb-16">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link
              href="/sequences"
              className="h-8 w-8 flex items-center justify-center rounded-lg transition-colors"
              style={{ color: theme.textMuted }}
              onMouseEnter={(e) => (e.currentTarget.style.color = theme.accent)}
              onMouseLeave={(e) => (e.currentTarget.style.color = theme.textMuted)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-xl font-semibold" style={{ color: theme.text }}>
              {isNew ? "New Sequence" : name || "Sequence"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {!isNew && (
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="text-xs px-3 py-1.5 rounded-lg border outline-none"
                style={inputStyle}
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
              </select>
            )}
            <button
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
              style={{
                backgroundColor: theme.accent,
                color: "#fff",
              }}
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>

        {/* Name & description */}
        <div className="space-y-3 mb-6">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Sequence name"
            className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none"
            style={inputStyle}
          />
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            className="w-full px-4 py-2 rounded-lg border text-xs outline-none"
            style={inputStyle}
          />
        </div>

        {/* Tabs */}
        {!isNew && (
          <div className="flex gap-1 mb-6">
            {(["steps", "enrollments"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  backgroundColor:
                    activeTab === tab
                      ? withAlpha(theme.accent, 0.15)
                      : "transparent",
                  color: activeTab === tab ? theme.accent : theme.textMuted,
                }}
              >
                {tab === "steps" ? (
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    Steps ({steps.length})
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    Enrollments ({enrollments.length})
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Steps tab */}
        {(isNew || activeTab === "steps") && (
          <div className="space-y-4">
            {steps.map((step, idx) => (
              <div
                key={idx}
                className="rounded-xl border p-4"
                style={{
                  borderColor: dividerColor,
                  backgroundColor: withAlpha(theme.text, 0.02),
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                      style={{
                        backgroundColor: withAlpha(theme.accent, 0.15),
                        color: theme.accent,
                      }}
                    >
                      {step.stepNumber}
                    </div>
                    <span
                      className="text-xs font-medium"
                      style={{ color: theme.textMuted }}
                    >
                      {idx === 0 ? "Send immediately" : `Wait ${step.delayDays} day${step.delayDays !== 1 ? "s" : ""}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {idx > 0 && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" style={{ color: theme.textMuted }} />
                        <input
                          type="number"
                          min={0}
                          value={step.delayDays}
                          onChange={(e) =>
                            updateStep(idx, { delayDays: parseInt(e.target.value) || 0 })
                          }
                          className="w-12 px-1.5 py-0.5 rounded border text-xs text-center outline-none"
                          style={inputStyle}
                        />
                        <span className="text-[10px]" style={{ color: theme.textMuted }}>
                          days
                        </span>
                      </div>
                    )}
                    {steps.length > 1 && (
                      <button
                        onClick={() => removeStep(idx)}
                        className="h-6 w-6 flex items-center justify-center rounded transition-colors"
                        style={{ color: theme.textMuted }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = theme.textMuted)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>

                <input
                  type="text"
                  value={step.subject}
                  onChange={(e) => updateStep(idx, { subject: e.target.value })}
                  placeholder="Subject line"
                  className="w-full px-3 py-2 rounded-lg border text-sm outline-none mb-2"
                  style={inputStyle}
                />
                <textarea
                  value={step.bodyTemplate}
                  onChange={(e) => updateStep(idx, { bodyTemplate: e.target.value })}
                  placeholder="Email body — use {{firstName}}, {{contactName}}, {{company}}, {{jobTitle}}"
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg border text-sm outline-none resize-none"
                  style={inputStyle}
                />
              </div>
            ))}

            <button
              onClick={addStep}
              className="w-full py-2.5 rounded-xl border border-dashed flex items-center justify-center gap-2 text-sm font-medium transition-all"
              style={{
                borderColor: withAlpha(theme.accent, 0.3),
                color: theme.accent,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = withAlpha(theme.accent, 0.05);
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <Plus className="h-4 w-4" />
              Add Step
            </button>
          </div>
        )}

        {/* Enrollments tab */}
        {!isNew && activeTab === "enrollments" && (
          <div>
            {enrollments.length === 0 ? (
              <div
                className="text-center py-12 rounded-xl border"
                style={{
                  borderColor: dividerColor,
                  backgroundColor: withAlpha(theme.text, 0.02),
                }}
              >
                <Users className="h-8 w-8 mx-auto mb-2" style={{ color: theme.textMuted }} />
                <p className="text-sm" style={{ color: theme.textMuted }}>
                  No contacts enrolled yet
                </p>
                <p className="text-xs mt-1" style={{ color: theme.textMuted }}>
                  Enroll contacts from their detail page or ask Tara
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {enrollments.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between px-4 py-3 rounded-xl border"
                    style={{
                      borderColor: dividerColor,
                      backgroundColor: withAlpha(theme.text, 0.02),
                    }}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/contacts/${e.contactId}`}
                          className="text-sm font-medium hover:underline"
                          style={{ color: theme.text }}
                        >
                          {e.contactName}
                        </Link>
                        <EnrollmentStatusBadge status={e.status} theme={theme} />
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-[11px]" style={{ color: theme.textMuted }}>
                        <span>Step {e.currentStep}</span>
                        {e.contactEmail && <span>{e.contactEmail}</span>}
                        {e.nextSendAt && (
                          <span>
                            Next: {new Date(e.nextSendAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-[10px] space-y-0.5 text-right" style={{ color: theme.textMuted }}>
                      {e.recentEvents.slice(0, 2).map((ev, i) => (
                        <div key={i}>
                          Step {ev.step}: {ev.type}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function EnrollmentStatusBadge({
  status,
  theme,
}: {
  status: string;
  theme: { textMuted: string };
}) {
  const colors: Record<string, { bg: string; text: string }> = {
    active: { bg: "rgba(16,185,129,0.15)", text: "#10b981" },
    completed: { bg: "rgba(59,130,246,0.15)", text: "#3b82f6" },
    paused: { bg: "rgba(245,158,11,0.15)", text: "#f59e0b" },
    replied: { bg: "rgba(168,85,247,0.15)", text: "#a855f7" },
    bounced: { bg: "rgba(239,68,68,0.15)", text: "#ef4444" },
  };
  const c = colors[status] || { bg: "rgba(156,163,175,0.15)", text: theme.textMuted };

  return (
    <span
      className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      {status}
    </span>
  );
}
