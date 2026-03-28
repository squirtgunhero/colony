"use client";

import { useState, useRef, useEffect } from "react";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import { ArrowUp, Sparkles } from "lucide-react";

interface PromptEntry {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface SitePromptInputProps {
  history: PromptEntry[];
  onSubmit: (prompt: string) => void;
  isGenerating: boolean;
  siteName: string;
}

const SUGGESTIONS = [
  "Create a modern real estate landing page with my listings",
  "Build a professional business website with a contact form",
  "Make a property showcase page with image gallery",
  "Design a lead capture page for home valuations",
];

export function SitePromptInput({
  history,
  onSubmit,
  isGenerating,
  siteName,
}: SitePromptInputProps) {
  const { theme } = useColonyTheme();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [history.length]);

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed || isGenerating) return;
    onSubmit(trimmed);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
  }, [input]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="px-4 py-3 shrink-0"
        style={{ borderBottom: `1px solid ${withAlpha(theme.text, 0.06)}` }}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" style={{ color: theme.accent }} strokeWidth={1.5} />
          <h3 className="text-sm font-semibold" style={{ color: theme.text }}>
            {siteName}
          </h3>
        </div>
        <p className="text-xs mt-0.5" style={{ color: theme.textMuted }}>
          Describe what you want — Colony AI will build it
        </p>
      </div>

      {/* Chat history */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {history.length === 0 ? (
          <div className="space-y-2 pt-4">
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: theme.textMuted }}>
              Try something like:
            </p>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => { setInput(s); textareaRef.current?.focus(); }}
                className="block w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors"
                style={{
                  backgroundColor: withAlpha(theme.text, 0.04),
                  color: theme.textSoft,
                }}
              >
                {s}
              </button>
            ))}
          </div>
        ) : (
          history.map((entry, i) => (
            <div
              key={i}
              className={`flex ${entry.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className="max-w-[90%] px-3.5 py-2.5 rounded-2xl text-sm"
                style={{
                  backgroundColor:
                    entry.role === "user"
                      ? withAlpha(theme.accent, 0.12)
                      : withAlpha(theme.text, 0.06),
                  color: theme.text,
                }}
              >
                {entry.role === "assistant" ? (
                  <p className="text-xs" style={{ color: theme.textMuted }}>
                    {entry.content}
                  </p>
                ) : (
                  <p>{entry.content}</p>
                )}
              </div>
            </div>
          ))
        )}
        {isGenerating && (
          <div className="flex justify-start">
            <div
              className="px-3.5 py-2.5 rounded-2xl"
              style={{ backgroundColor: withAlpha(theme.text, 0.06) }}
            >
              <div className="flex items-center gap-1.5">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-1.5 w-1.5 rounded-full animate-pulse"
                      style={{
                        backgroundColor: theme.accent,
                        animationDelay: `${i * 200}ms`,
                      }}
                    />
                  ))}
                </div>
                <span className="text-xs" style={{ color: theme.textMuted }}>
                  Building...
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <div
        className="px-4 py-3 shrink-0"
        style={{ borderTop: `1px solid ${withAlpha(theme.text, 0.06)}` }}
      >
        <div
          className="flex items-end gap-2 rounded-xl px-3 py-2"
          style={{ backgroundColor: withAlpha(theme.text, 0.05) }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your site or changes..."
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            style={{ color: theme.text, maxHeight: 120 }}
            disabled={isGenerating}
          />
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || isGenerating}
            className="shrink-0 h-8 w-8 flex items-center justify-center rounded-lg transition-all"
            style={{
              backgroundColor: input.trim() ? theme.accent : withAlpha(theme.text, 0.08),
              color: input.trim() ? (theme.isDark ? "#000" : "#fff") : theme.textMuted,
              opacity: isGenerating ? 0.5 : 1,
            }}
          >
            <ArrowUp className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}
