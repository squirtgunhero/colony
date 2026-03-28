"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import { createCompany } from "@/app/(dashboard)/companies/actions";

const FIELDS = [
  ["name", "Company Name", true],
  ["domain", "Domain (e.g. acme.com)", false],
  ["industry", "Industry", false],
  ["size", "Size (e.g. 11-50)", false],
  ["phone", "Phone", false],
  ["email", "Email", false],
  ["website", "Website", false],
  ["address", "Address", false],
  ["city", "City", false],
  ["state", "State", false],
  ["zipCode", "Zip Code", false],
] as const;

type FieldKey = (typeof FIELDS)[number][0];

export function NewCompanyForm() {
  const { theme } = useColonyTheme();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<FieldKey, string>>({
    name: "",
    domain: "",
    industry: "",
    size: "",
    phone: "",
    email: "",
    website: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
  });

  

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await createCompany(form);
      router.push("/browse/companies");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <Link
        href="/browse/companies"
        className="inline-flex items-center gap-1.5 text-sm mb-6 transition-colors"
        style={{ color: theme.textMuted }}
      >
        <ArrowLeft className="h-4 w-4" />
        Companies
      </Link>

      <h1
        className="text-[28px] leading-tight font-semibold tracking-[-0.01em] mb-6"
        style={{ color: theme.text, fontFamily: "'Manrope', var(--font-inter), sans-serif" }}
      >
        New Company
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {FIELDS.map(([key, label, required]) => (
          <div key={key}>
            <label className="text-xs font-medium mb-1 block" style={{ color: theme.textMuted }}>
              {label}{required ? " *" : ""}
            </label>
            <input
              value={form[key]}
              onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
              required={required as boolean}
              className="w-full h-10 px-3 rounded-xl text-sm outline-none transition-all"
              style={{
                backgroundColor: "rgba(255,255,255,0.03)",
                boxShadow: "none",
                border: `1px solid ${withAlpha(theme.text, 0.06)}`,
                color: theme.text,
                caretColor: theme.accent,
                fontFamily: "'DM Sans', sans-serif",
              }}
            />
          </div>
        ))}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving || !form.name.trim()}
            className="px-6 py-2 rounded-full text-sm font-medium transition-all disabled:opacity-50"
            style={{ backgroundColor: theme.accent, color: theme.bg }}
          >
            {saving ? "Creating..." : "Create Company"}
          </button>
          <Link
            href="/browse/companies"
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
