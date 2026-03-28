"use client";

import { useState, useEffect } from "react";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import { Mail, X } from "lucide-react";

interface EnrollDialogProps {
  contactId: string;
  contactName: string;
  children: React.ReactNode;
}

interface SequenceOption {
  id: string;
  name: string;
  status: string;
  steps: unknown[];
}

export function EnrollInSequenceDialog({
  contactId,
  contactName,
  children,
}: EnrollDialogProps) {
  const { theme } = useColonyTheme();
  const [open, setOpen] = useState(false);
  const [sequences, setSequences] = useState<SequenceOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [enrolling, setEnrolling] = useState<string | null>(null);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setResult(null);
    fetch("/api/sequences")
      .then((r) => r.json())
      .then((data) => {
        setSequences(
          (data as SequenceOption[]).filter((s) => s.status === "active")
        );
      })
      .finally(() => setLoading(false));
  }, [open]);

  async function handleEnroll(sequenceId: string) {
    setEnrolling(sequenceId);
    setResult(null);
    try {
      const res = await fetch("/api/sequences/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sequenceId, contactId }),
      });
      if (res.ok) {
        setResult({ ok: true, msg: `${contactName} enrolled successfully` });
        setTimeout(() => setOpen(false), 1500);
      } else {
        const data = await res.json();
        setResult({ ok: false, msg: data.error || "Enrollment failed" });
      }
    } finally {
      setEnrolling(null);
    }
  }

  const dividerColor = withAlpha(theme.text, 0.06);

  return (
    <>
      <div onClick={() => setOpen(true)}>{children}</div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0"
            style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
            onClick={() => setOpen(false)}
          />
          <div
            className="relative rounded-xl shadow-2xl w-full max-w-md p-5"
            style={{
              backgroundColor: theme.bgGlow,
              border: `1px solid ${dividerColor}`,
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3
                className="text-base font-semibold"
                style={{ color: theme.text }}
              >
                Enroll {contactName}
              </h3>
              <button
                onClick={() => setOpen(false)}
                className="h-7 w-7 flex items-center justify-center rounded-lg transition-colors"
                style={{ color: theme.textMuted }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {result && (
              <div
                className="px-3 py-2 rounded-lg text-xs font-medium mb-3"
                style={{
                  backgroundColor: result.ok
                    ? "rgba(16,185,129,0.15)"
                    : "rgba(239,68,68,0.15)",
                  color: result.ok ? "#10b981" : "#ef4444",
                }}
              >
                {result.msg}
              </div>
            )}

            {loading ? (
              <p
                className="text-sm text-center py-8"
                style={{ color: theme.textMuted }}
              >
                Loading sequences...
              </p>
            ) : sequences.length === 0 ? (
              <p
                className="text-sm text-center py-8"
                style={{ color: theme.textMuted }}
              >
                No active sequences. Create one first.
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {sequences.map((seq) => (
                  <div
                    key={seq.id}
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg border"
                    style={{
                      borderColor: dividerColor,
                      backgroundColor: withAlpha(theme.text, 0.02),
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      <Mail
                        className="h-4 w-4"
                        style={{ color: theme.accent }}
                      />
                      <div>
                        <span
                          className="text-sm font-medium"
                          style={{ color: theme.text }}
                        >
                          {seq.name}
                        </span>
                        <span
                          className="text-[10px] ml-2"
                          style={{ color: theme.textMuted }}
                        >
                          {(seq.steps as unknown[]).length} steps
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleEnroll(seq.id)}
                      disabled={enrolling === seq.id}
                      className="px-3 py-1 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
                      style={{
                        backgroundColor: withAlpha(theme.accent, 0.15),
                        color: theme.accent,
                      }}
                    >
                      {enrolling === seq.id ? "..." : "Enroll"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
