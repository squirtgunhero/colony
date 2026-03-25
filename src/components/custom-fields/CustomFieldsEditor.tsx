"use client";

import { useState, useEffect } from "react";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import { Plus, X, Save } from "lucide-react";

interface FieldDef {
  id: string;
  name: string;
  fieldKey: string;
  fieldType: string;
  options: unknown;
  isRequired: boolean;
}

interface FieldValue {
  fieldKey: string;
  name: string;
  fieldType: string;
  value: string;
  options: unknown;
}

interface CustomFieldsEditorProps {
  entityType: "contact" | "deal" | "company" | "property";
  entityId: string;
}

export function CustomFieldsEditor({ entityType, entityId }: CustomFieldsEditorProps) {
  const { theme } = useColonyTheme();
  const [definitions, setDefinitions] = useState<FieldDef[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newField, setNewField] = useState({ name: "", fieldType: "text" });

  useEffect(() => {
    Promise.all([
      fetch(`/api/custom-fields?entityType=${entityType}`).then((r) => r.json()),
      fetch(`/api/custom-fields/values?entityId=${entityId}`).then((r) => r.json()),
    ]).then(([defData, valData]) => {
      setDefinitions(defData.fields || []);
      const vals: Record<string, string> = {};
      (valData.values || []).forEach((v: FieldValue) => {
        vals[v.fieldKey] = v.value;
      });
      setValues(vals);
    }).catch(() => {});
  }, [entityType, entityId]);

  function handleChange(fieldKey: string, value: string) {
    setValues((prev) => ({ ...prev, [fieldKey]: value }));
    setDirty(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const fields = definitions.map((d) => ({
        definitionId: d.id,
        value: values[d.fieldKey] || "",
      }));
      await fetch("/api/custom-fields/values", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityId, fields }),
      });
      setDirty(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddField() {
    if (!newField.name.trim()) return;
    const fieldKey = newField.name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    const res = await fetch("/api/custom-fields", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entityType,
        name: newField.name,
        fieldKey,
        fieldType: newField.fieldType,
      }),
    });
    if (res.ok) {
      const created = await res.json();
      setDefinitions((prev) => [...prev, created]);
      setNewField({ name: "", fieldType: "text" });
      setShowAdd(false);
    }
  }

  async function handleDeleteField(id: string) {
    await fetch(`/api/custom-fields?id=${id}`, { method: "DELETE" });
    setDefinitions((prev) => prev.filter((d) => d.id !== id));
  }

  if (definitions.length === 0 && !showAdd) {
    return (
      <button
        onClick={() => setShowAdd(true)}
        className="flex items-center gap-1.5 text-xs transition-colors"
        style={{ color: theme.textMuted }}
      >
        <Plus className="h-3 w-3" />
        Add custom field
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold" style={{ color: theme.textMuted }}>
          Custom Fields
        </h3>
        <div className="flex items-center gap-2">
          {dirty && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium"
              style={{ backgroundColor: withAlpha(theme.accent, 0.15), color: theme.accent }}
            >
              <Save className="h-2.5 w-2.5" />
              {saving ? "Saving..." : "Save"}
            </button>
          )}
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="h-5 w-5 flex items-center justify-center rounded"
            style={{ color: theme.textMuted }}
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      </div>

      {definitions.map((def) => (
        <div key={def.id} className="group">
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-medium" style={{ color: theme.textMuted }}>
              {def.name}
            </label>
            <button
              onClick={() => handleDeleteField(def.id)}
              className="h-4 w-4 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color: theme.textMuted }}
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </div>
          {def.fieldType === "boolean" ? (
            <button
              onClick={() => handleChange(def.fieldKey, values[def.fieldKey] === "true" ? "false" : "true")}
              className="h-7 px-3 rounded text-xs"
              style={{
                backgroundColor: values[def.fieldKey] === "true" ? withAlpha(theme.accent, 0.15) : withAlpha(theme.text, 0.05),
                color: values[def.fieldKey] === "true" ? theme.accent : theme.textMuted,
              }}
            >
              {values[def.fieldKey] === "true" ? "Yes" : "No"}
            </button>
          ) : def.fieldType === "select" ? (
            <select
              value={values[def.fieldKey] || ""}
              onChange={(e) => handleChange(def.fieldKey, e.target.value)}
              className="w-full h-7 px-2 rounded text-xs outline-none"
              style={{
                backgroundColor: "rgba(255,255,255,0.03)",
                border: `1px solid ${withAlpha(theme.text, 0.08)}`,
                color: theme.text,
              }}
            >
              <option value="">Select...</option>
              {(Array.isArray(def.options) ? def.options : []).map((opt: unknown) => (
                <option key={String(opt)} value={String(opt)}>
                  {String(opt)}
                </option>
              ))}
            </select>
          ) : (
            <input
              type={def.fieldType === "number" ? "number" : def.fieldType === "date" ? "date" : "text"}
              value={values[def.fieldKey] || ""}
              onChange={(e) => handleChange(def.fieldKey, e.target.value)}
              className="w-full h-7 px-2 rounded text-xs outline-none"
              style={{
                backgroundColor: "rgba(255,255,255,0.03)",
                border: `1px solid ${withAlpha(theme.text, 0.08)}`,
                color: theme.text,
                caretColor: theme.accent,
              }}
            />
          )}
        </div>
      ))}

      {showAdd && (
        <div
          className="p-3 rounded-lg space-y-2"
          style={{ backgroundColor: withAlpha(theme.text, 0.03) }}
        >
          <input
            placeholder="Field name"
            value={newField.name}
            onChange={(e) => setNewField((prev) => ({ ...prev, name: e.target.value }))}
            className="w-full h-7 px-2 rounded text-xs outline-none"
            style={{
              backgroundColor: "rgba(255,255,255,0.03)",
              border: `1px solid ${withAlpha(theme.text, 0.08)}`,
              color: theme.text,
              caretColor: theme.accent,
            }}
          />
          <select
            value={newField.fieldType}
            onChange={(e) => setNewField((prev) => ({ ...prev, fieldType: e.target.value }))}
            className="w-full h-7 px-2 rounded text-xs outline-none"
            style={{
              backgroundColor: "rgba(255,255,255,0.03)",
              border: `1px solid ${withAlpha(theme.text, 0.08)}`,
              color: theme.text,
            }}
          >
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="date">Date</option>
            <option value="boolean">Yes/No</option>
            <option value="email">Email</option>
            <option value="phone">Phone</option>
            <option value="url">URL</option>
          </select>
          <div className="flex gap-2">
            <button
              onClick={handleAddField}
              disabled={!newField.name.trim()}
              className="px-3 py-1 rounded text-xs font-medium disabled:opacity-50"
              style={{ backgroundColor: theme.accent, color: theme.bg }}
            >
              Add
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="px-3 py-1 rounded text-xs"
              style={{ color: theme.textMuted }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
