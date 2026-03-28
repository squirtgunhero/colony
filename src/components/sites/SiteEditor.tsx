"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import { SitePreview } from "./SitePreview";
import { SitePromptInput } from "./SitePromptInput";
import {
  Globe,
  ArrowLeft,
  ExternalLink,
  Check,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface PromptEntry {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface SiteData {
  id: string;
  name: string;
  slug: string;
  status: string;
  htmlContent: string | null;
  prompt: string | null;
}

interface SiteEditorProps {
  site: SiteData;
}

export function SiteEditor({ site: initialSite }: SiteEditorProps) {
  const { theme } = useColonyTheme();
  const router = useRouter();
  const [site, setSite] = useState(initialSite);
  const [html, setHtml] = useState(initialSite.htmlContent);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [history, setHistory] = useState<PromptEntry[]>(() => {
    if (initialSite.prompt && initialSite.htmlContent) {
      return [
        {
          role: "user" as const,
          content: initialSite.prompt,
          timestamp: new Date(),
        },
        {
          role: "assistant" as const,
          content: `Site generated successfully (v1)`,
          timestamp: new Date(),
        },
      ];
    }
    return [];
  });

  const handleGenerate = useCallback(
    async (prompt: string) => {
      setIsGenerating(true);
      setHistory((prev) => [
        ...prev,
        { role: "user", content: prompt, timestamp: new Date() },
      ]);

      try {
        const res = await fetch(`/api/sites/${site.id}/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Generation failed");
        }

        const data = await res.json();
        setHtml(data.html);
        setSite((prev) => ({ ...prev, htmlContent: data.html, prompt }));
        setHistory((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Site updated (v${data.version}) — ${data.tokensUsed.toLocaleString()} tokens used`,
            timestamp: new Date(),
          },
        ]);
      } catch (error) {
        const msg =
          error instanceof Error ? error.message : "Generation failed";
        toast.error(msg);
        setHistory((prev) => [
          ...prev,
          { role: "assistant", content: `Error: ${msg}`, timestamp: new Date() },
        ]);
      } finally {
        setIsGenerating(false);
      }
    },
    [site.id]
  );

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      const action = site.status === "published" ? "unpublish" : "publish";
      const res = await fetch(`/api/sites/${site.id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (res.ok) {
        const data = await res.json();
        setSite((prev) => ({ ...prev, status: data.status }));
        toast.success(
          action === "publish" ? "Site published!" : "Site unpublished"
        );
      }
    } catch {
      toast.error("Failed to update publish status");
    } finally {
      setIsPublishing(false);
    }
  };

  const siteUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/s/${site.slug}`
      : `/s/${site.slug}`;

  return (
    <div className="flex flex-col h-[calc(100vh-48px)]">
      {/* Top toolbar */}
      <div
        className="flex items-center justify-between px-4 py-2 shrink-0"
        style={{ borderBottom: `1px solid ${withAlpha(theme.text, 0.06)}` }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/marketing/sites")}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: theme.textMuted }}
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          </button>
          <div className="flex items-center gap-2">
            <Globe
              className="h-4 w-4"
              style={{ color: theme.accent }}
              strokeWidth={1.5}
            />
            <span className="text-sm font-medium" style={{ color: theme.text }}>
              {site.name}
            </span>
            <span
              className="text-[10px] font-medium px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: withAlpha(
                  site.status === "published" ? "#30d158" : theme.text,
                  0.1
                ),
                color: site.status === "published" ? "#30d158" : theme.textMuted,
              }}
            >
              {site.status}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {site.status === "published" && (
            <a
              href={siteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{
                backgroundColor: withAlpha(theme.text, 0.05),
                color: theme.textMuted,
              }}
            >
              <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
              View live
            </a>
          )}
          <button
            onClick={handlePublish}
            disabled={isPublishing || !html}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-[0.97]"
            style={{
              backgroundColor: html ? theme.accent : withAlpha(theme.text, 0.08),
              color: html ? (theme.isDark ? "#000" : "#fff") : theme.textMuted,
              opacity: isPublishing ? 0.6 : 1,
            }}
          >
            {isPublishing ? (
              <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2} />
            ) : site.status === "published" ? (
              <Check className="h-3 w-3" strokeWidth={2} />
            ) : (
              <Globe className="h-3 w-3" strokeWidth={2} />
            )}
            {site.status === "published" ? "Unpublish" : "Publish"}
          </button>
        </div>
      </div>

      {/* Main editor: prompt panel + preview */}
      <div className="flex-1 flex min-h-0">
        {/* Left: Prompt panel */}
        <div
          className="w-[340px] shrink-0 flex flex-col"
          style={{ borderRight: `1px solid ${withAlpha(theme.text, 0.06)}` }}
        >
          <SitePromptInput
            history={history}
            onSubmit={handleGenerate}
            isGenerating={isGenerating}
            siteName={site.name}
          />
        </div>

        {/* Right: Preview */}
        <SitePreview html={html} isGenerating={isGenerating} />
      </div>
    </div>
  );
}
