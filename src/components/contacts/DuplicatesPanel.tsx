"use client";

import { useState, useEffect } from "react";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import { AlertTriangle, Merge, X, ChevronDown, ChevronUp } from "lucide-react";

interface DuplicatePair {
  contactA: { id: string; name: string; email?: string | null; phone?: string | null };
  contactB: { id: string; name: string; email?: string | null; phone?: string | null };
  matchReason: string;
  confidence: number;
}

export function DuplicatesPanel() {
  const { theme } = useColonyTheme();
  const [duplicates, setDuplicates] = useState<DuplicatePair[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [merging, setMerging] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/contacts/duplicates")
      .then((r) => (r.ok ? r.json() : { duplicates: [] }))
      .then((data) => setDuplicates(data.duplicates || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleMerge(keepId: string, mergeId: string) {
    setMerging(`${keepId}:${mergeId}`);
    try {
      const res = await fetch("/api/contacts/duplicates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keepId, mergeId }),
      });
      if (res.ok) {
        setDuplicates((prev) =>
          prev.filter(
            (d) =>
              !(d.contactA.id === keepId && d.contactB.id === mergeId) &&
              !(d.contactA.id === mergeId && d.contactB.id === keepId)
          )
        );
      }
    } finally {
      setMerging(null);
    }
  }

  function handleDismiss(pair: DuplicatePair) {
    setDuplicates((prev) =>
      prev.filter(
        (d) =>
          !(d.contactA.id === pair.contactA.id && d.contactB.id === pair.contactB.id)
      )
    );
  }

  if (loading || duplicates.length === 0) return null;

  

  return (
    <div
      className="rounded-xl mb-4"
      style={{ backgroundColor: withAlpha("#f59e0b", 0.06), boxShadow: "none" }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" style={{ color: "#f59e0b" }} />
          <span className="text-sm font-medium" style={{ color: theme.text }}>
            {duplicates.length} potential duplicate{duplicates.length !== 1 ? "s" : ""} found
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4" style={{ color: theme.textMuted }} />
        ) : (
          <ChevronDown className="h-4 w-4" style={{ color: theme.textMuted }} />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-3 space-y-2">
          {duplicates.slice(0, 10).map((pair, i) => {
            const isMerging =
              merging === `${pair.contactA.id}:${pair.contactB.id}` ||
              merging === `${pair.contactB.id}:${pair.contactA.id}`;

            return (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-lg"
                style={{ backgroundColor: withAlpha(theme.text, 0.03) }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium" style={{ color: theme.text }}>
                      {pair.contactA.name}
                    </span>
                    <span style={{ color: theme.textMuted }}>&</span>
                    <span className="font-medium" style={{ color: theme.text }}>
                      {pair.contactB.name}
                    </span>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: theme.textMuted }}>
                    {pair.matchReason} ({pair.confidence}% match)
                  </p>
                </div>

                <button
                  onClick={() => handleMerge(pair.contactA.id, pair.contactB.id)}
                  disabled={!!merging}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                  style={{ backgroundColor: withAlpha(theme.accent, 0.15), color: theme.accent }}
                >
                  <Merge className="h-3 w-3" />
                  {isMerging ? "Merging..." : "Merge"}
                </button>

                <button
                  onClick={() => handleDismiss(pair)}
                  className="h-6 w-6 flex items-center justify-center rounded"
                  style={{ color: theme.textMuted }}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
