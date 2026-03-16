"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import {
  ArrowLeft,
  Sparkles,
  Save,
  Send,
  Loader2,
  ChevronDown,
  Copy,
  Check,
  Eye,
} from "lucide-react";

interface Step {
  id: string;
  stepOrder: number;
  delayDays: number;
  subject: string;
  bodyHtml: string | null;
  bodyText: string | null;
}

interface Campaign {
  id: string;
  name: string;
  type: string;
  status: string;
  subject: string | null;
  bodyHtml: string | null;
  bodyText: string | null;
  fromName: string | null;
  scheduledAt: Date | string | null;
  steps: Step[];
}

interface Property {
  id: string;
  address: string | null;
  city: string | null;
  state: string | null;
  price: number | null;
}

interface Contact {
  id: string;
  name: string;
  email: string | null;
}

interface EmailEditorProps {
  campaign: Campaign;
  properties: Property[];
  contacts: Contact[];
}

const emailTypes = [
  { value: "new_listing", label: "New Listing Announcement" },
  { value: "open_house", label: "Open House Invite" },
  { value: "just_sold", label: "Just Sold" },
  { value: "market_update", label: "Market Update" },
  { value: "newsletter", label: "Newsletter" },
  { value: "follow_up", label: "Follow-up" },
  { value: "drip_welcome", label: "Drip: Welcome" },
  { value: "price_reduction", label: "Price Reduction" },
];

const tones = [
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "urgent", label: "Urgent" },
  { value: "luxury", label: "Luxury" },
];

export function EmailEditor({ campaign, properties, contacts }: EmailEditorProps) {
  const { theme } = useColonyTheme();
  const router = useRouter();

  // Campaign fields
  const [name, setName] = useState(campaign.name);
  const [subject, setSubject] = useState(campaign.subject || "");
  const [bodyText, setBodyText] = useState(campaign.bodyText || "");
  const [fromName, setFromName] = useState(campaign.fromName || "");

  // AI generator
  const [emailType, setEmailType] = useState("new_listing");
  const [tone, setTone] = useState("professional");
  const [propertyId, setPropertyId] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // UI state
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/marketing/email/${campaign.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          subject: subject || null,
          bodyText: bodyText || null,
          fromName: fromName || null,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error("Save error:", error);
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerate() {
    setIsGenerating(true);
    try {
      const res = await fetch("/api/marketing/email/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: emailType,
          tone,
          propertyId: propertyId || undefined,
          prompt: customPrompt || undefined,
        }),
      });
      if (!res.ok) throw new Error("Generation failed");
      const data = await res.json();
      const gen = data.generated;

      // Fill in the fields
      if (gen.subject) setSubject(gen.subject);
      const fullBody = [gen.greeting, gen.body, gen.cta ? `[${gen.cta}]` : "", gen.closing]
        .filter(Boolean)
        .join("\n\n");
      setBodyText(fullBody);
    } catch (error) {
      console.error("Generate error:", error);
    } finally {
      setIsGenerating(false);
    }
  }

  function copyContent() {
    const content = `Subject: ${subject}\n\n${bodyText}`;
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const contactsWithEmail = contacts.filter((c) => c.email);

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/marketing/email")}
            className="p-2 rounded-lg transition-colors hover:opacity-70"
            style={{ color: theme.textMuted }}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-2xl font-light bg-transparent border-none outline-none w-full"
              style={{
                fontFamily: "var(--font-spectral), Georgia, serif",
                color: theme.text,
              }}
              placeholder="Campaign name..."
            />
            <p className="text-xs mt-0.5" style={{ color: theme.textMuted }}>
              {campaign.status} · {contactsWithEmail.length} contacts with email
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor: withAlpha(theme.text, 0.05),
              color: theme.textMuted,
            }}
          >
            <Eye className="h-4 w-4" />
            Preview
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            style={{ backgroundColor: theme.accent, color: "#fff" }}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saved ? (
              <Check className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saved ? "Saved!" : "Save"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: AI Generator Panel */}
        <div className="lg:col-span-1">
          <div
            className="rounded-xl p-5 sticky top-20"
            style={{
              backgroundColor: withAlpha(theme.text, 0.03),
              border: `1px solid ${withAlpha(theme.text, 0.06)}`,
            }}
          >
            <div className="flex items-center gap-2 mb-5">
              <Sparkles className="h-5 w-5" style={{ color: theme.accent }} />
              <h2 className="text-sm font-medium" style={{ color: theme.text }}>
                AI Email Generator
              </h2>
            </div>

            {/* Email Type */}
            <div className="mb-3">
              <label className="text-xs font-medium mb-1 block" style={{ color: theme.textMuted }}>
                Email Type
              </label>
              <div className="relative">
                <select
                  value={emailType}
                  onChange={(e) => setEmailType(e.target.value)}
                  className="w-full appearance-none rounded-lg px-3 py-2 text-sm pr-8"
                  style={{
                    backgroundColor: withAlpha(theme.text, 0.05),
                    color: theme.text,
                    border: `1px solid ${withAlpha(theme.text, 0.1)}`,
                  }}
                >
                  {emailTypes.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="absolute right-2.5 top-2.5 h-4 w-4 pointer-events-none"
                  style={{ color: theme.textMuted }}
                />
              </div>
            </div>

            {/* Tone */}
            <div className="mb-3">
              <label className="text-xs font-medium mb-1 block" style={{ color: theme.textMuted }}>
                Tone
              </label>
              <div className="flex gap-1.5 flex-wrap">
                {tones.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTone(t.value)}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                    style={{
                      backgroundColor:
                        tone === t.value
                          ? withAlpha(theme.accent, 0.15)
                          : withAlpha(theme.text, 0.05),
                      color: tone === t.value ? theme.accent : theme.textMuted,
                      border: `1px solid ${tone === t.value ? withAlpha(theme.accent, 0.3) : "transparent"}`,
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Property */}
            {properties.length > 0 && (
              <div className="mb-3">
                <label className="text-xs font-medium mb-1 block" style={{ color: theme.textMuted }}>
                  Property (optional)
                </label>
                <div className="relative">
                  <select
                    value={propertyId}
                    onChange={(e) => setPropertyId(e.target.value)}
                    className="w-full appearance-none rounded-lg px-3 py-2 text-sm pr-8"
                    style={{
                      backgroundColor: withAlpha(theme.text, 0.05),
                      color: theme.text,
                      border: `1px solid ${withAlpha(theme.text, 0.1)}`,
                    }}
                  >
                    <option value="">No specific property</option>
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.address || "Unknown"}, {p.city || ""}
                        {p.price ? ` — $${p.price.toLocaleString()}` : ""}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="absolute right-2.5 top-2.5 h-4 w-4 pointer-events-none"
                    style={{ color: theme.textMuted }}
                  />
                </div>
              </div>
            )}

            {/* Custom prompt */}
            <div className="mb-4">
              <label className="text-xs font-medium mb-1 block" style={{ color: theme.textMuted }}>
                Additional instructions
              </label>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="e.g., Mention the school district, target young families..."
                rows={3}
                className="w-full rounded-lg px-3 py-2 text-sm resize-none"
                style={{
                  backgroundColor: withAlpha(theme.text, 0.05),
                  color: theme.text,
                  border: `1px solid ${withAlpha(theme.text, 0.1)}`,
                }}
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-opacity disabled:opacity-50"
              style={{ backgroundColor: theme.accent, color: "#fff" }}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Email
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right: Email Editor */}
        <div className="lg:col-span-2">
          {showPreview ? (
            /* Preview Mode */
            <div
              className="rounded-xl overflow-hidden"
              style={{
                backgroundColor: "#ffffff",
                border: `1px solid ${withAlpha(theme.text, 0.1)}`,
              }}
            >
              <div
                className="px-6 py-3 text-xs"
                style={{
                  backgroundColor: "#f8f9fa",
                  borderBottom: "1px solid #e9ecef",
                  color: "#6c757d",
                }}
              >
                <p><strong>From:</strong> {fromName || "Your Name"}</p>
                <p><strong>Subject:</strong> {subject || "(no subject)"}</p>
              </div>
              <div className="px-8 py-6">
                <div
                  className="text-sm leading-relaxed whitespace-pre-wrap"
                  style={{ color: "#212529", fontFamily: "Georgia, serif" }}
                >
                  {bodyText || "Email content will appear here..."}
                </div>
              </div>
            </div>
          ) : (
            /* Edit Mode */
            <div className="space-y-4">
              {/* From Name */}
              <div
                className="rounded-xl p-5"
                style={{
                  backgroundColor: withAlpha(theme.text, 0.03),
                  border: `1px solid ${withAlpha(theme.text, 0.06)}`,
                }}
              >
                <label className="text-xs font-medium mb-1.5 block" style={{ color: theme.textMuted }}>
                  From Name
                </label>
                <input
                  value={fromName}
                  onChange={(e) => setFromName(e.target.value)}
                  placeholder="Your name or business name"
                  className="w-full bg-transparent text-sm outline-none"
                  style={{ color: theme.text }}
                />
              </div>

              {/* Subject Line */}
              <div
                className="rounded-xl p-5"
                style={{
                  backgroundColor: withAlpha(theme.text, 0.03),
                  border: `1px solid ${withAlpha(theme.text, 0.06)}`,
                }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium" style={{ color: theme.textMuted }}>
                    Subject Line
                  </label>
                  <span
                    className="text-[10px]"
                    style={{ color: subject.length > 60 ? "#ef4444" : theme.textMuted }}
                  >
                    {subject.length}/60
                  </span>
                </div>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Write a compelling subject line..."
                  className="w-full bg-transparent text-sm outline-none"
                  style={{ color: theme.text }}
                />
              </div>

              {/* Email Body */}
              <div
                className="rounded-xl p-5"
                style={{
                  backgroundColor: withAlpha(theme.text, 0.03),
                  border: `1px solid ${withAlpha(theme.text, 0.06)}`,
                }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium" style={{ color: theme.textMuted }}>
                    Email Body
                  </label>
                  <button
                    onClick={copyContent}
                    className="flex items-center gap-1 text-xs transition-colors hover:opacity-70"
                    style={{ color: theme.textMuted }}
                  >
                    {copied ? (
                      <>
                        <Check className="h-3 w-3" style={{ color: "#22c55e" }} />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  placeholder="Write your email content here, or use the AI generator..."
                  rows={18}
                  className="w-full bg-transparent text-sm outline-none resize-none leading-relaxed"
                  style={{ color: theme.text }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
