"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import {
  ArrowLeft,
  Plus,
  Play,
  Pause,
  Trash2,
  Mail,
  Users,
  BarChart3,
} from "lucide-react";

interface SequenceStep {
  stepNumber: number;
  subject: string;
  bodyTemplate: string;
  delayDays: number;
  sendTime?: string;
}

interface Sequence {
  id: string;
  name: string;
  description: string | null;
  steps: SequenceStep[];
  status: string;
  createdAt: string;
  enrollmentCount: number;
  enrollmentsByStatus: Record<string, number>;
}

export default function SequencesPage() {
  const { theme } = useColonyTheme();
  const router = useRouter();
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSequences = useCallback(async () => {
    try {
      const res = await fetch("/api/sequences");
      if (res.ok) setSequences(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSequences();
  }, [fetchSequences]);

  async function toggleStatus(seq: Sequence) {
    const newStatus = seq.status === "active" ? "paused" : "active";
    await fetch("/api/sequences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: seq.id, status: newStatus, name: seq.name, steps: seq.steps }),
    });
    fetchSequences();
  }

  async function deleteSequence(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This will remove all enrollments.`)) return;
    await fetch(`/api/sequences?id=${id}`, { method: "DELETE" });
    fetchSequences();
  }

  const dividerColor = withAlpha(theme.text, 0.06);

  const statusBadge = (status: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      active: { bg: withAlpha("#10b981", 0.15), text: "#10b981" },
      paused: { bg: withAlpha("#f59e0b", 0.15), text: "#f59e0b" },
      draft: { bg: withAlpha(theme.textMuted, 0.15), text: theme.textMuted },
    };
    const c = colors[status] || colors.draft;
    return (
      <span
        className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
        style={{ backgroundColor: c.bg, color: c.text }}
      >
        {status}
      </span>
    );
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

      <div className="max-w-4xl mx-auto px-6 pt-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link
              href="/settings"
              className="h-8 w-8 flex items-center justify-center rounded-lg transition-colors"
              style={{ color: theme.textMuted }}
              onMouseEnter={(e) => (e.currentTarget.style.color = theme.accent)}
              onMouseLeave={(e) => (e.currentTarget.style.color = theme.textMuted)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1
                className="text-xl font-semibold"
                style={{ color: theme.text }}
              >
                Email Sequences
              </h1>
              <p className="text-sm" style={{ color: theme.textMuted }}>
                Multi-step drip campaigns sent from your Gmail
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push("/sequences/new")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              backgroundColor: theme.accent,
              color: "#fff",
            }}
          >
            <Plus className="h-4 w-4" />
            New Sequence
          </button>
        </div>

        {/* List */}
        {loading ? (
          <div className="text-center py-12" style={{ color: theme.textMuted }}>
            Loading sequences...
          </div>
        ) : sequences.length === 0 ? (
          <div
            className="text-center py-16 rounded-xl border"
            style={{
              borderColor: dividerColor,
              backgroundColor: withAlpha(theme.text, 0.02),
            }}
          >
            <Mail className="h-10 w-10 mx-auto mb-3" style={{ color: theme.textMuted }} />
            <p className="text-sm font-medium" style={{ color: theme.text }}>
              No sequences yet
            </p>
            <p className="text-xs mt-1" style={{ color: theme.textMuted }}>
              Create a drip campaign or ask Tara to set one up
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sequences.map((seq) => {
              const replied = seq.enrollmentsByStatus?.replied || 0;
              const totalEnrolled = seq.enrollmentCount;
              const replyRate =
                totalEnrolled > 0
                  ? `${((replied / totalEnrolled) * 100).toFixed(0)}%`
                  : "—";

              return (
                <div
                  key={seq.id}
                  className="rounded-xl border p-4 transition-all hover:shadow-sm cursor-pointer"
                  style={{
                    borderColor: dividerColor,
                    backgroundColor: withAlpha(theme.text, 0.02),
                  }}
                  onClick={() => router.push(`/sequences/${seq.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: withAlpha(theme.accent, 0.15),
                        }}
                      >
                        <Mail className="h-4 w-4" style={{ color: theme.accent }} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="font-medium text-sm truncate"
                            style={{ color: theme.text }}
                          >
                            {seq.name}
                          </span>
                          {statusBadge(seq.status)}
                        </div>
                        {seq.description && (
                          <p
                            className="text-xs truncate mt-0.5"
                            style={{ color: theme.textMuted }}
                          >
                            {seq.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 ml-4">
                      {/* Stats */}
                      <div className="flex items-center gap-4 text-xs" style={{ color: theme.textMuted }}>
                        <span className="flex items-center gap-1" title="Steps">
                          <Mail className="h-3 w-3" />
                          {(seq.steps as SequenceStep[]).length} steps
                        </span>
                        <span className="flex items-center gap-1" title="Enrolled">
                          <Users className="h-3 w-3" />
                          {totalEnrolled}
                        </span>
                        <span className="flex items-center gap-1" title="Reply rate">
                          <BarChart3 className="h-3 w-3" />
                          {replyRate}
                        </span>
                      </div>

                      {/* Actions */}
                      <div
                        className="flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => toggleStatus(seq)}
                          className="h-7 w-7 flex items-center justify-center rounded-lg transition-colors"
                          style={{ color: theme.textMuted }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = theme.accent)}
                          onMouseLeave={(e) => (e.currentTarget.style.color = theme.textMuted)}
                          title={seq.status === "active" ? "Pause" : "Activate"}
                        >
                          {seq.status === "active" ? (
                            <Pause className="h-3.5 w-3.5" />
                          ) : (
                            <Play className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => deleteSequence(seq.id, seq.name)}
                          className="h-7 w-7 flex items-center justify-center rounded-lg transition-colors"
                          style={{ color: theme.textMuted }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = theme.textMuted)}
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
