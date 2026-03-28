"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import { createContact } from "@/app/(dashboard)/contacts/actions";

const CONTACT_TYPES = [
  { value: "lead", label: "Lead" },
  { value: "client", label: "Client" },
  { value: "prospect", label: "Prospect" },
  { value: "partner", label: "Partner" },
  { value: "vendor", label: "Vendor" },
  { value: "other", label: "Other" },
];

const FIELDS = [
  ["name", "Full Name", "text", true],
  ["email", "Email", "email", false],
  ["phone", "Phone", "tel", false],
  ["source", "Source (e.g. Referral, Website)", "text", false],
  ["notes", "Notes", "textarea", false],
] as const;

type FieldKey = (typeof FIELDS)[number][0];

export function NewContactForm() {
  const { theme } = useColonyTheme();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [type, setType] = useState("lead");
  const [form, setForm] = useState<Record<FieldKey, string>>({
    name: "",
    email: "",
    phone: "",
    source: "",
    notes: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await createContact({
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        type,
        source: form.source.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });
      router.push("/browse/contacts");
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = {
    backgroundColor: "rgba(255,255,255,0.03)",
    boxShadow: "none",
    border: `1px solid ${withAlpha(theme.text, 0.06)}`,
    color: theme.text,
    caretColor: theme.accent,
    fontFamily: "'DM Sans', sans-serif",
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <Link
        href="/browse/contacts"
        className="inline-flex items-center gap-1.5 text-sm mb-6 transition-colors"
        style={{ color: theme.textMuted }}
      >
        <ArrowLeft className="h-4 w-4" />
        Contacts
      </Link>

      <h1
        className="text-[28px] leading-tight font-semibold tracking-[-0.01em] mb-6"
        style={{ color: theme.text, fontFamily: "'Manrope', var(--font-inter), sans-serif" }}
      >
        New Contact
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {FIELDS.map(([key, label, inputType, required]) => (
          <div key={key}>
            <label className="text-xs font-medium mb-1 block" style={{ color: theme.textMuted }}>
              {label}{required ? " *" : ""}
            </label>
            {inputType === "textarea" ? (
              <textarea
                value={form[key]}
                onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none transition-all resize-none"
                style={inputStyle}
              />
            ) : (
              <input
                type={inputType}
                value={form[key]}
                onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                required={required as boolean}
                className="w-full h-10 px-3 rounded-xl text-sm outline-none transition-all"
                style={inputStyle}
              />
            )}
          </div>
        ))}

        {/* Contact Type */}
        <div>
          <label className="text-xs font-medium mb-1 block" style={{ color: theme.textMuted }}>
            Type
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full h-10 px-3 rounded-xl text-sm outline-none transition-all appearance-none"
            style={inputStyle}
          >
            {CONTACT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving || !form.name.trim()}
            className="px-6 py-2 rounded-full text-sm font-medium transition-all disabled:opacity-50"
            style={{ backgroundColor: theme.accent, color: theme.bg }}
          >
            {saving ? "Creating..." : "Create Contact"}
          </button>
          <Link
            href="/browse/contacts"
            className="px-6 py-2 rounded-full text-sm font-medium transition-all"
            style={{ color: theme.textMuted }}
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
