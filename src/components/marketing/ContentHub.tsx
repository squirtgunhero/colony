"use client";

import { useState } from "react";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha, type ColonyTheme } from "@/lib/themes";
import {
  Sparkles,
  Copy,
  Check,
  Facebook,
  Instagram,
  Linkedin,
  Mail,
  Globe,
  FileText,
  ChevronDown,
  Loader2,
} from "lucide-react";

interface Template {
  id: string;
  name: string;
  category: string;
  subcategory: string | null;
  platform: string | null;
  headline: string | null;
  body: string;
  ctaText: string | null;
  isSystem: boolean;
}

interface Property {
  id: string;
  address: string | null;
  city: string | null;
  state: string | null;
  price: number | null;
}

interface ContentHubProps {
  templates: Template[];
  properties: Property[];
}

const contentTypes = [
  { value: "new_listing", label: "New Listing" },
  { value: "open_house", label: "Open House" },
  { value: "just_sold", label: "Just Sold" },
  { value: "market_update", label: "Market Update" },
  { value: "price_reduction", label: "Price Reduction" },
  { value: "testimonial", label: "Testimonial" },
  { value: "ad_copy", label: "Ad Copy" },
  { value: "general", label: "General" },
];

const platforms = [
  { value: "facebook", label: "Facebook", icon: Facebook },
  { value: "instagram", label: "Instagram", icon: Instagram },
  { value: "linkedin", label: "LinkedIn", icon: Linkedin },
  { value: "email", label: "Email", icon: Mail },
  { value: "generic", label: "Any Platform", icon: Globe },
];

const categoryLabels: Record<string, string> = {
  social_post: "Social Posts",
  ad_copy: "Ad Copy",
  email: "Email",
  landing_page: "Landing Pages",
};

function getPlatformIcon(platform: string | null) {
  switch (platform) {
    case "facebook": return Facebook;
    case "instagram": return Instagram;
    case "linkedin": return Linkedin;
    case "email": return Mail;
    default: return Globe;
  }
}

export function ContentHub({ templates, properties }: ContentHubProps) {
  const { theme } = useColonyTheme();

  // Generator state
  const [contentType, setContentType] = useState("new_listing");
  const [platform, setPlatform] = useState("facebook");
  const [propertyId, setPropertyId] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generated, setGenerated] = useState<{
    headline: string;
    body: string;
    cta: string;
    hashtags: string[];
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Template filter
  const [templateFilter, setTemplateFilter] = useState<string>("all");

  const filteredTemplates = templates.filter((t) => {
    if (templateFilter === "all") return true;
    return t.category === templateFilter;
  });

  const categories = [...new Set(templates.map((t) => t.category))];

  async function handleGenerate() {
    setIsGenerating(true);
    setGenerated(null);

    try {
      const res = await fetch("/api/marketing/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: contentType,
          platform,
          propertyId: propertyId || undefined,
          prompt: customPrompt || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Generation failed");
      }

      const data = await res.json();
      setGenerated(data.generated);
    } catch (error) {
      console.error("Generation error:", error);
    } finally {
      setIsGenerating(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function getFullContent(): string {
    if (!generated) return "";
    let content = "";
    if (generated.headline) content += generated.headline + "\n\n";
    content += generated.body;
    if (generated.cta) content += "\n\n" + generated.cta;
    if (generated.hashtags?.length) content += "\n\n" + generated.hashtags.join(" ");
    return content;
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1
          className="text-2xl font-light"
          style={{ fontFamily: "var(--font-spectral), Georgia, serif" }}
        >
          Content Studio
        </h1>
        <p className="text-sm mt-1" style={{ color: theme.textMuted }}>
          Generate and manage marketing content with AI
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: AI Generator */}
        <div>
          <div
            className="rounded-xl p-6"
            style={{
              backgroundColor: withAlpha(theme.text, 0.03),
              border: `1px solid ${withAlpha(theme.text, 0.06)}`,
            }}
          >
            <div className="flex items-center gap-2 mb-5">
              <Sparkles className="h-5 w-5" style={{ color: theme.accent }} />
              <h2 className="text-base font-medium" style={{ color: theme.text }}>
                AI Content Generator
              </h2>
            </div>

            {/* Content Type */}
            <div className="mb-4">
              <label className="text-xs font-medium mb-1.5 block" style={{ color: theme.textMuted }}>
                Content Type
              </label>
              <div className="relative">
                <select
                  value={contentType}
                  onChange={(e) => setContentType(e.target.value)}
                  className="w-full appearance-none rounded-lg px-3 py-2.5 text-sm pr-8"
                  style={{
                    backgroundColor: withAlpha(theme.text, 0.05),
                    color: theme.text,
                    border: `1px solid ${withAlpha(theme.text, 0.1)}`,
                  }}
                >
                  {contentTypes.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="absolute right-2.5 top-3 h-4 w-4 pointer-events-none"
                  style={{ color: theme.textMuted }}
                />
              </div>
            </div>

            {/* Platform */}
            <div className="mb-4">
              <label className="text-xs font-medium mb-1.5 block" style={{ color: theme.textMuted }}>
                Platform
              </label>
              <div className="flex gap-2 flex-wrap">
                {platforms.map((p) => {
                  const Icon = p.icon;
                  const isActive = platform === p.value;
                  return (
                    <button
                      key={p.value}
                      onClick={() => setPlatform(p.value)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={{
                        backgroundColor: isActive
                          ? withAlpha(theme.accent, 0.15)
                          : withAlpha(theme.text, 0.05),
                        color: isActive ? theme.accent : theme.textMuted,
                        border: `1px solid ${isActive ? withAlpha(theme.accent, 0.3) : "transparent"}`,
                      }}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Property (optional) */}
            {properties.length > 0 && (
              <div className="mb-4">
                <label className="text-xs font-medium mb-1.5 block" style={{ color: theme.textMuted }}>
                  Property (optional)
                </label>
                <div className="relative">
                  <select
                    value={propertyId}
                    onChange={(e) => setPropertyId(e.target.value)}
                    className="w-full appearance-none rounded-lg px-3 py-2.5 text-sm pr-8"
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
                    className="absolute right-2.5 top-3 h-4 w-4 pointer-events-none"
                    style={{ color: theme.textMuted }}
                  />
                </div>
              </div>
            )}

            {/* Custom prompt */}
            <div className="mb-5">
              <label className="text-xs font-medium mb-1.5 block" style={{ color: theme.textMuted }}>
                Additional instructions (optional)
              </label>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="e.g., Mention the renovated kitchen, target first-time buyers..."
                rows={3}
                className="w-full rounded-lg px-3 py-2.5 text-sm resize-none"
                style={{
                  backgroundColor: withAlpha(theme.text, 0.05),
                  color: theme.text,
                  border: `1px solid ${withAlpha(theme.text, 0.1)}`,
                }}
              />
            </div>

            {/* Generate button */}
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
                  Generate Content
                </>
              )}
            </button>
          </div>

          {/* Generated Output */}
          {generated && (
            <div
              className="rounded-xl p-6 mt-4"
              style={{
                backgroundColor: withAlpha(theme.accent, 0.04),
                border: `1px solid ${withAlpha(theme.accent, 0.15)}`,
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium" style={{ color: theme.text }}>
                  Generated Content
                </h3>
                <button
                  onClick={() => copyToClipboard(getFullContent())}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    backgroundColor: withAlpha(theme.text, 0.05),
                    color: theme.textMuted,
                  }}
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5" style={{ color: "#22c55e" }} />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copy All
                    </>
                  )}
                </button>
              </div>

              {generated.headline && (
                <p
                  className="text-base font-semibold mb-3"
                  style={{ color: theme.text }}
                >
                  {generated.headline}
                </p>
              )}

              <p
                className="text-sm whitespace-pre-wrap leading-relaxed"
                style={{ color: theme.text, opacity: 0.85 }}
              >
                {generated.body}
              </p>

              {generated.cta && (
                <p
                  className="text-sm font-medium mt-3"
                  style={{ color: theme.accent }}
                >
                  {generated.cta}
                </p>
              )}

              {generated.hashtags?.length > 0 && (
                <p className="text-xs mt-3" style={{ color: theme.textMuted }}>
                  {generated.hashtags.join(" ")}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right: Template Library */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-medium" style={{ color: theme.text }}>
              Template Library
            </h2>
          </div>

          {/* Category filter */}
          <div className="flex gap-1 mb-4 flex-wrap">
            <button
              onClick={() => setTemplateFilter("all")}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                backgroundColor: templateFilter === "all" ? withAlpha(theme.accent, 0.15) : "transparent",
                color: templateFilter === "all" ? theme.accent : theme.textMuted,
              }}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setTemplateFilter(cat)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  backgroundColor: templateFilter === cat ? withAlpha(theme.accent, 0.15) : "transparent",
                  color: templateFilter === cat ? theme.accent : theme.textMuted,
                }}
              >
                {categoryLabels[cat] || cat}
              </button>
            ))}
          </div>

          {/* Templates */}
          {filteredTemplates.length === 0 ? (
            <div
              className="rounded-xl p-10 text-center"
              style={{
                backgroundColor: withAlpha(theme.text, 0.03),
                border: `1px solid ${withAlpha(theme.text, 0.06)}`,
              }}
            >
              <FileText
                className="h-10 w-10 mx-auto mb-3"
                style={{ color: theme.textMuted, opacity: 0.4 }}
              />
              <p className="text-sm mb-1" style={{ color: theme.text }}>
                No templates yet
              </p>
              <p className="text-xs" style={{ color: theme.textMuted }}>
                Generate content with AI and save your favorites as templates.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTemplates.map((template) => {
                const PlatformIcon = getPlatformIcon(template.platform);
                return (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    PlatformIcon={PlatformIcon}
                    theme={theme}
                    onCopy={copyToClipboard}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TemplateCard({
  template,
  PlatformIcon,
  theme,
  onCopy,
}: {
  template: Template;
  PlatformIcon: React.ElementType;
  theme: ColonyTheme;
  onCopy: (text: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const preview = template.body.length > 120
    ? template.body.slice(0, 120) + "..."
    : template.body;

  return (
    <div
      className="rounded-xl p-4 transition-all cursor-pointer"
      style={{
        backgroundColor: withAlpha(theme.text, 0.03),
        border: `1px solid ${withAlpha(theme.text, 0.06)}`,
      }}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <PlatformIcon className="h-4 w-4" style={{ color: theme.accent }} />
          <span className="text-sm font-medium" style={{ color: theme.text }}>
            {template.name}
          </span>
          {template.isSystem && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full"
              style={{
                backgroundColor: withAlpha(theme.accent, 0.1),
                color: theme.accent,
              }}
            >
              Template
            </span>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            let full = "";
            if (template.headline) full += template.headline + "\n\n";
            full += template.body;
            if (template.ctaText) full += "\n\n" + template.ctaText;
            onCopy(full);
          }}
          className="p-1.5 rounded-lg transition-colors hover:opacity-70"
          style={{ color: theme.textMuted }}
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
      </div>

      {template.headline && !expanded && (
        <p className="text-xs font-medium mb-1" style={{ color: theme.text, opacity: 0.7 }}>
          {template.headline}
        </p>
      )}

      <p
        className="text-xs whitespace-pre-wrap leading-relaxed"
        style={{ color: theme.textMuted }}
      >
        {expanded ? template.body : preview}
      </p>

      {expanded && template.ctaText && (
        <p className="text-xs font-medium mt-2" style={{ color: theme.accent }}>
          {template.ctaText}
        </p>
      )}

      <div className="flex items-center gap-2 mt-2">
        <span
          className="text-[10px] px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: withAlpha(theme.text, 0.05),
            color: theme.textMuted,
          }}
        >
          {categoryLabels[template.category] || template.category}
        </span>
        {template.subcategory && (
          <span
            className="text-[10px] px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: withAlpha(theme.text, 0.05),
              color: theme.textMuted,
            }}
          >
            {template.subcategory.replace(/_/g, " ")}
          </span>
        )}
      </div>
    </div>
  );
}
