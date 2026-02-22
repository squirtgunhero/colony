"use client";

import { useEffect, useRef, useState } from "react";
import { useAssistantStore } from "@/lib/assistant/store";
import { useModeStore } from "@/lib/mode";
import { useChatTheme } from "@/lib/chat-theme-context";
import { WaveformVisualizer, type WaveformState } from "./WaveformVisualizer";
import { ChatMessageBubble } from "./ChatMessageBubble";
import { ChatSuggestionChips } from "./ChatSuggestionChips";

interface Summary {
  firstName: string | null;
  leadsCount: number;
  pendingTasks: number;
  pipelineValue: number;
}

function getGreeting(name: string | null): string {
  const hour = new Date().getHours();
  const timeWord =
    hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
  return name ? `Good ${timeWord}, ${name}.` : `Good ${timeWord}.`;
}

function formatPipeline(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
  if (value > 0) return `$${value.toLocaleString()}`;
  return "$0";
}

const quickActions = [
  { label: "Add a contact", prompt: "Create a new contact" },
  { label: "Check my pipeline", prompt: "Show me my pipeline summary" },
  { label: "Draft a follow-up", prompt: "Help me draft a follow-up message" },
  { label: "Show referrals", prompt: "Show my referrals" },
];

export function ChatCanvas() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    isLoading,
    pendingActions,
    applyAction,
    cancelAction,
    setInput,
    isListening,
  } = useAssistantStore();

  const { activeChips, clearChips } = useModeStore();
  const { theme } = useChatTheme();
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    fetch("/api/chat/summary")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setSummary(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === "user") {
        clearChips();
      }
    }
  }, [messages, clearChips]);

  const hasMessages = messages.length > 0;

  const waveformState: WaveformState = isListening
    ? "listening"
    : isLoading
      ? "thinking"
      : "idle";

  return (
    <div
      ref={scrollContainerRef}
      className="flex-1 flex flex-col overflow-y-auto pb-32 relative"
      style={{
        background: `linear-gradient(160deg, ${theme.bg} 0%, ${theme.bgGlow} 50%, ${theme.bg} 100%)`,
        backgroundSize: "400% 400%",
        animation: "colonyBgShift 20s ease infinite",
        color: theme.text,
        transition: "background 500ms ease-in-out, color 500ms ease-in-out",
      }}
    >
      {/* Floating ambient orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div
          className="absolute w-[500px] h-[500px] rounded-full blur-[120px]"
          style={{
            background: theme.accentGlow,
            top: "10%",
            left: "20%",
            animation: "colonyOrb1 10s ease-in-out infinite",
          }}
        />
        <div
          className="absolute w-[400px] h-[400px] rounded-full blur-[100px]"
          style={{
            background: theme.accentGlow,
            bottom: "20%",
            right: "15%",
            animation: "colonyOrb2 8s ease-in-out infinite",
          }}
        />
        <div
          className="absolute w-[300px] h-[300px] rounded-full blur-[80px]"
          style={{
            background: theme.surface,
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            animation: "colonyOrb3 9s ease-in-out infinite",
          }}
        />
      </div>

      <div className="mx-auto w-full max-w-2xl px-4 py-8 flex-1 flex flex-col relative z-10">
        {/* Empty State */}
        {!hasMessages && (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
            {/* Waveform — Colony's presence */}
            <div className="mb-10">
              <WaveformVisualizer state={waveformState} />
            </div>

            {/* Greeting */}
            <h1
              className="text-[28px] font-light leading-tight mb-3"
              style={{
                fontFamily: "var(--font-spectral), Georgia, serif",
                fontWeight: 300,
                color: theme.text,
              }}
            >
              {summary ? getGreeting(summary.firstName) : "Welcome back."}
            </h1>

            {/* Summary line */}
            {summary && (
              <p
                className="text-sm max-w-md mb-8"
                style={{
                  fontFamily: "var(--font-dm-sans), sans-serif",
                  color: theme.textMuted,
                }}
              >
                {summary.leadsCount} active lead
                {summary.leadsCount !== 1 ? "s" : ""}.{" "}
                {summary.pendingTasks} pending task
                {summary.pendingTasks !== 1 ? "s" : ""}.{" "}
                Pipeline at {formatPipeline(summary.pipelineValue)}.
              </p>
            )}

            {/* Quick action chips */}
            <div className="flex flex-wrap justify-center gap-2">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  onClick={() => setInput(action.prompt)}
                  className="px-4 py-2 rounded-full text-sm transition-all duration-200"
                  style={{
                    fontFamily: "var(--font-dm-sans), sans-serif",
                    color: theme.textMuted,
                    backgroundColor: "transparent",
                    border: `1px solid ${theme.accentSoft}`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = theme.accent;
                    e.currentTarget.style.backgroundColor = theme.accentGlow;
                    e.currentTarget.style.color = theme.text;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = theme.accentSoft;
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.color = theme.textMuted;
                  }}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {hasMessages && (
          <div className="space-y-6 mt-auto">
            {messages.map((message, index) => (
              <div
                key={message.id}
                className="animate-in fade-in slide-in-from-bottom-2 duration-400"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <ChatMessageBubble
                  message={message}
                  pendingActions={pendingActions.filter((pa) =>
                    message.actions?.some(
                      (a) => JSON.stringify(a) === JSON.stringify(pa.action)
                    )
                  )}
                  onApplyAction={applyAction}
                  onCancelAction={cancelAction}
                />

                {message.role === "assistant" &&
                  index === messages.length - 1 &&
                  activeChips.length > 0 && <ChatSuggestionChips />}
              </div>
            ))}

            {/* Typing indicator */}
            {isLoading && (
              <div className="flex items-center gap-2 pl-1 animate-in fade-in duration-300">
                <div className="flex items-center gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        backgroundColor: theme.accent,
                        opacity: 0.4,
                        animation: `colonyDotFloat 1.4s ease-in-out infinite`,
                        animationDelay: `${i * 0.2}s`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} className="h-1" />
          </div>
        )}
      </div>
    </div>
  );
}
