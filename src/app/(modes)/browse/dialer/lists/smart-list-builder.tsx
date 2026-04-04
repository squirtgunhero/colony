"use client";

import { useState, useCallback, useEffect } from "react";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import { Plus, Trash2, Loader2, Sparkles } from "lucide-react";

interface SmartFilter {
  field: string;
  operator: string;
  value: string;
}

interface PreviewResult {
  count: number;
  contacts: { id: string; name: string; phone: string | null; type: string }[];
}

const REFRESH_OPTIONS = [
  { value: null, label: "Off" },
  { value: 15, label: "Every 15 min" },
  { value: 60, label: "Every hour" },
  { value: 240, label: "Every 4 hours" },
  { value: 1440, label: "Daily" },
] as const;

interface Props {
  onChange: (filters: SmartFilter[]) => void;
  onContactIdsResolved: (ids: string[]) => void;
  onRefreshIntervalChange?: (interval: number | null) => void;
}

const FIELDS = [
  { value: "type", label: "Contact Type" },
  { value: "source", label: "Source" },
  { value: "tags", label: "Tags" },
  { value: "leadScore", label: "Lead Score" },
  { value: "lastContactedAt", label: "Last Contacted" },
  { value: "createdAt", label: "Created Date" },
];

const OPERATORS: Record<string, { value: string; label: string }[]> = {
  type: [
    { value: "equals", label: "is" },
    { value: "not_equals", label: "is not" },
  ],
  source: [
    { value: "equals", label: "is" },
    { value: "not_equals", label: "is not" },
  ],
  tags: [
    { value: "contains", label: "contains" },
    { value: "empty", label: "is empty" },
  ],
  leadScore: [
    { value: "gte", label: ">=" },
    { value: "lte", label: "<=" },
    { value: "equals", label: "=" },
  ],
  lastContactedAt: [
    { value: "older_than", label: "more than X days ago" },
    { value: "within", label: "within last X days" },
  ],
  createdAt: [
    { value: "within", label: "within last X days" },
    { value: "older_than", label: "more than X days ago" },
  ],
};

const VALUE_OPTIONS: Record<string, { value: string; label: string }[]> = {
  type: [
    { value: "lead", label: "Lead" },
    { value: "client", label: "Client" },
    { value: "agent", label: "Agent" },
    { value: "vendor", label: "Vendor" },
  ],
  source: [
    { value: "zillow", label: "Zillow" },
    { value: "website", label: "Website" },
    { value: "referral", label: "Referral" },
    { value: "social", label: "Social" },
    { value: "cold_call", label: "Cold Call" },
    { value: "open_house", label: "Open House" },
    { value: "meta_ads", label: "Meta Ads" },
    { value: "google_ads", label: "Google Ads" },
  ],
};

const isSelectField = (field: string) => field === "type" || field === "source";
const isNumericField = (field: string) =>
  field === "leadScore" || field === "lastContactedAt" || field === "createdAt";

export function SmartListBuilder({ onChange, onContactIdsResolved, onRefreshIntervalChange }: Props) {
  const { theme } = useColonyTheme();
  const borderColor = withAlpha(theme.text, 0.06);
  const [filters, setFilters] = useState<SmartFilter[]>([
    { field: "type", operator: "equals", value: "lead" },
  ]);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [loading, setLoading] = useState(false);

  const inputStyle: React.CSSProperties = {
    backgroundColor: withAlpha(theme.text, 0.04),
    border: `1px solid ${borderColor}`,
    color: theme.text,
  };

  const fetchPreview = useCallback(async (currentFilters: SmartFilter[]) => {
    const validFilters = currentFilters.filter((f) => f.field && f.operator && f.value);
    if (validFilters.length === 0) {
      setPreview(null);
      onContactIdsResolved([]);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/dialer/call-lists/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filters: validFilters }),
      });
      if (res.ok) {
        const data = await res.json();
        setPreview(data);
        onContactIdsResolved(data.contacts.map((c: { id: string }) => c.id));
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [onContactIdsResolved]);

  // Debounced preview
  useEffect(() => {
    const timer = setTimeout(() => fetchPreview(filters), 500);
    return () => clearTimeout(timer);
  }, [filters, fetchPreview]);

  const addFilter = () => {
    const updated = [...filters, { field: "type", operator: "equals", value: "" }];
    setFilters(updated);
    onChange(updated);
  };

  const removeFilter = (index: number) => {
    const updated = filters.filter((_, i) => i !== index);
    setFilters(updated);
    onChange(updated);
  };

  const updateFilter = (index: number, patch: Partial<SmartFilter>) => {
    const updated = filters.map((f, i) => {
      if (i !== index) return f;
      const merged = { ...f, ...patch };
      // Reset downstream fields when field changes
      if (patch.field) {
        merged.operator = OPERATORS[patch.field]?.[0]?.value || "";
        merged.value = "";
      }
      return merged;
    });
    setFilters(updated);
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-3.5 w-3.5" style={{ color: theme.accent }} />
        <span className="text-[11px] uppercase tracking-wider font-medium" style={{ color: withAlpha(theme.text, 0.5) }}>
          Smart Filters
        </span>
        {loading && <Loader2 className="h-3 w-3 animate-spin" style={{ color: withAlpha(theme.text, 0.3) }} />}
      </div>

      {filters.map((filter, index) => (
        <div key={index} className="flex items-center gap-2">
          {/* Field */}
          <select
            value={filter.field}
            onChange={(e) => updateFilter(index, { field: e.target.value })}
            className="h-9 px-2 rounded-lg text-[12px] outline-none"
            style={inputStyle}
          >
            {FIELDS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>

          {/* Operator */}
          <select
            value={filter.operator}
            onChange={(e) => updateFilter(index, { operator: e.target.value })}
            className="h-9 px-2 rounded-lg text-[12px] outline-none"
            style={inputStyle}
          >
            {(OPERATORS[filter.field] || []).map((op) => (
              <option key={op.value} value={op.value}>{op.label}</option>
            ))}
          </select>

          {/* Value */}
          {isSelectField(filter.field) ? (
            <select
              value={filter.value}
              onChange={(e) => updateFilter(index, { value: e.target.value })}
              className="h-9 px-2 rounded-lg text-[12px] outline-none flex-1"
              style={inputStyle}
            >
              <option value="">Select...</option>
              {(VALUE_OPTIONS[filter.field] || []).map((v) => (
                <option key={v.value} value={v.value}>{v.label}</option>
              ))}
            </select>
          ) : isNumericField(filter.field) ? (
            <input
              type="number"
              value={filter.value}
              onChange={(e) => updateFilter(index, { value: e.target.value })}
              placeholder={filter.field === "leadScore" ? "Score" : "Days"}
              className="h-9 px-2 rounded-lg text-[12px] outline-none w-24"
              style={inputStyle}
            />
          ) : (
            <input
              value={filter.value}
              onChange={(e) => updateFilter(index, { value: e.target.value })}
              placeholder="Value"
              className="h-9 px-2 rounded-lg text-[12px] outline-none flex-1"
              style={inputStyle}
            />
          )}

          {/* Remove */}
          {filters.length > 1 && (
            <button
              onClick={() => removeFilter(index)}
              className="h-9 w-9 flex items-center justify-center rounded-lg transition-colors hover:bg-red-500/10"
              style={{ color: withAlpha(theme.text, 0.3) }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ))}

      <button
        onClick={addFilter}
        className="flex items-center gap-1.5 text-[12px] font-medium transition-opacity hover:opacity-70"
        style={{ color: theme.accent }}
      >
        <Plus className="h-3 w-3" />
        Add filter
      </button>

      {/* Auto-refresh interval */}
      {onRefreshIntervalChange && (
        <div className="flex items-center gap-2 pt-2">
          <label
            className="text-[11px] uppercase tracking-wider font-medium shrink-0"
            style={{ color: withAlpha(theme.text, 0.5) }}
          >
            Auto-refresh
          </label>
          <select
            defaultValue=""
            onChange={(e) => {
              const val = e.target.value;
              onRefreshIntervalChange(val === "" ? null : parseInt(val, 10));
            }}
            className="h-9 px-2 rounded-lg text-[12px] outline-none"
            style={inputStyle}
          >
            {REFRESH_OPTIONS.map((opt) => (
              <option key={String(opt.value)} value={opt.value ?? ""}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div
          className="mt-3 p-3 rounded-lg text-[12px]"
          style={{ backgroundColor: withAlpha(theme.accent, 0.06), color: theme.text }}
        >
          <span className="font-semibold" style={{ color: theme.accent }}>{preview.count}</span>
          {" "}contacts match
          {preview.count > 0 && preview.contacts.length > 0 && (
            <span style={{ color: withAlpha(theme.text, 0.5) }}>
              {" "}&mdash; {preview.contacts.map((c) => c.name).join(", ")}
              {preview.count > preview.contacts.length && `, +${preview.count - preview.contacts.length} more`}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
