"use client";

import { useEffect, useRef, useState } from "react";
import { useAssistantStore } from "@/lib/assistant/store";
import { useModeStore } from "@/lib/mode";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import { WaveformVisualizer, type WaveformState } from "./WaveformVisualizer";
import { ChatMessageBubble } from "./ChatMessageBubble";
import { ChatSuggestionChips } from "./ChatSuggestionChips";
import { ColonySuggestions } from "./ColonySuggestions";
import { OnboardingFlow } from "./OnboardingFlow";
import { TodayView } from "./TodayView";

interface Summary {
  firstName: string | null;
  leadsCount: number;
  pendingTasks: number;
  pipelineValue: number;
  onboardingCompleted: boolean;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function getGreeting(name: string | null): string {
  const hour = new Date().getHours();
  const timeWord =
    hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
  return name ? `Good ${timeWord}, ${capitalize(name)}.` : `Good ${timeWord}.`;
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
    loadHistory,
  } = useAssistantStore();

  const { activeChips, clearChips } = useModeStore();
  const { theme } = useColonyTheme();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [suggestions, setSuggestions] = useState<{
    suggestions: { id: string; type: string; text: string; action: string }[];
    isNewUser: boolean;
  } | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [homeTab, setHomeTab] = useState<"chat" | "today">("chat");

  useEffect(() => {
    fetch("/api/chat/summary")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setSummary(data);
          if (!data.onboardingCompleted) setShowOnboarding(true);
        }
      })
      .catch(() => {});

    fetch("/api/chat/suggestions")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setSuggestions(data);
      })
      .catch(() => {});

    loadHistory();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
      <div className={`mx-auto w-full max-w-2xl px-4 py-8 flex flex-col relative z-10 ${hasMessages ? "flex-1" : ""}`}>
        {/* Onboarding Flow */}
        {showOnboarding && !hasMessages && (
          <OnboardingFlow
            firstName={summary?.firstName ?? null}
            onComplete={() => setShowOnboarding(false)}
          />
        )}

        {/* Empty State */}
        {!hasMessages && !showOnboarding && (
          <div className="flex flex-col items-center justify-center text-center px-4 min-h-[calc(100dvh-12rem)]">
            {/* Chat / Today toggle */}
            <div className="flex gap-1 mb-6 rounded-xl p-1" style={{ backgroundColor: withAlpha(theme.text, 0.05) }}>
              {(["chat", "today"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setHomeTab(tab)}
                  className="px-4 py-1.5 rounded-lg text-xs font-medium transition-all capitalize"
                  style={{
                    backgroundColor: homeTab === tab ? withAlpha(theme.accent, 0.15) : "transparent",
                    color: homeTab === tab ? theme.accent : theme.textMuted,
                  }}
                >
                  {tab === "chat" ? "Home" : "Today"}
                </button>
              ))}
            </div>

            {homeTab === "today" ? (
              <TodayView />
            ) : (
            <>
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
                opacity: 1,
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
                  color: theme.text,
                  opacity: 0.6,
                }}
              >
                {summary.leadsCount} active lead
                {summary.leadsCount !== 1 ? "s" : ""}.{" "}
                {summary.pendingTasks} pending task
                {summary.pendingTasks !== 1 ? "s" : ""}.{" "}
                Pipeline at {formatPipeline(summary.pipelineValue)}.
              </p>
            )}

            {/* AI suggestions or onboarding prompts */}
            {suggestions && (
              <ColonySuggestions
                suggestions={suggestions.suggestions}
                isNewUser={suggestions.isNewUser}
              />
            )}

            {/* Quick action chips — neumorphic, 2×2 grid on narrow screens */}
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:justify-center gap-3 max-w-md mx-auto sm:max-w-none">
              {quickActions.map((action) => {
                const raised = `4px 4px 8px rgba(0,0,0,0.4), -4px -4px 8px rgba(255,255,255,0.04)`;
                const hover = `2px 2px 4px rgba(0,0,0,0.3), -2px -2px 4px rgba(255,255,255,0.03), 0 0 12px ${withAlpha(theme.accent, 0.1)}`;
                const pressed = `inset 3px 3px 6px rgba(0,0,0,0.4), inset -3px -3px 6px rgba(255,255,255,0.04)`;
                return (
                  <button
                    key={action.label}
                    onClick={() => setInput(action.prompt)}
                    className="px-4 py-2.5 sm:px-6 sm:py-3 rounded-3xl text-sm transition-all duration-300 text-center"
                    style={{
                      fontFamily: "var(--font-dm-sans), sans-serif",
                      color: theme.text,
                      opacity: 0.7,
                      backgroundColor: theme.bgGlow,
                      border: "none",
                      boxShadow: raised,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = hover;
                      e.currentTarget.style.opacity = "0.9";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = raised;
                      e.currentTarget.style.opacity = "0.7";
                    }}
                    onMouseDown={(e) => {
                      e.currentTarget.style.boxShadow = pressed;
                      e.currentTarget.style.color = theme.accent;
                      e.currentTarget.style.opacity = "1";
                    }}
                    onMouseUp={(e) => {
                      e.currentTarget.style.boxShadow = hover;
                      e.currentTarget.style.color = theme.text;
                      e.currentTarget.style.opacity = "0.9";
                    }}
                  >
                    {action.label}
                  </button>
                );
              })}
            </div>
            </>
            )}
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
