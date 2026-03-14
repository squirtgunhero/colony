"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAssistantStore } from "@/lib/assistant/store";
import { useModeStore } from "@/lib/mode";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { WaveformVisualizer, type WaveformState } from "./WaveformVisualizer";
import { ChatMessageBubble } from "./ChatMessageBubble";
import { ChatSuggestionChips } from "./ChatSuggestionChips";
import { ColonySuggestions } from "./ColonySuggestions";
import { OnboardingFlow } from "./OnboardingFlow";

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

function formatPipeline(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
  if (value > 0) return `$${value.toLocaleString()}`;
  return "$0";
}

function getGreeting(name: string | null): string {
  const hour = new Date().getHours();
  const timeWord =
    hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
  return name ? `Good ${timeWord}, ${capitalize(name)}.` : `Good ${timeWord}.`;
}

export function ChatCanvas() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();

  const {
    messages,
    isLoading,
    pendingActions,
    applyAction,
    cancelAction,
    isListening,
    loadHistory,
    addMessage,
  } = useAssistantStore();

  const { activeChips, clearChips } = useModeStore();
  const { theme } = useColonyTheme();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [suggestions, setSuggestions] = useState<{
    suggestions: { id: string; type: string; text: string; action: string }[];
    isNewUser: boolean;
  } | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

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

  // Detect post-OAuth connection redirects and show a welcome message
  useEffect(() => {
    const metaConnected = searchParams.get("meta_connected");
    const googleConnected = searchParams.get("google_connected");

    if (metaConnected === "true") {
      addMessage({
        id: `system-meta-connected-${Date.now()}`,
        role: "assistant",
        content: "Facebook Ads connected! You can now tell me to run ads anytime \u2014 just say something like \"I need seller leads\" or \"run a Facebook ad\" and I'll handle the rest.",
        timestamp: new Date(),
      });
      window.history.replaceState({}, "", "/chat");
    }

    if (googleConnected === "true") {
      addMessage({
        id: `system-google-connected-${Date.now()}`,
        role: "assistant",
        content: "Google Ads connected! I can now help you manage your Google campaigns \u2014 analyze keywords, pause/resume campaigns, add negative keywords, and adjust budgets.",
        timestamp: new Date(),
      });
      window.history.replaceState({}, "", "/chat");
    }
  }, [searchParams, addMessage]);

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

  // Suggestion chips for empty state — max 4 with prefixed symbols
  const EMPTY_STATE_CHIPS = [
    { label: "\u2726 Generate leads", prompt: "I need leads" },
    { label: "\u25FC View pipeline", prompt: "Show my pipeline" },
    { label: "+ Add contact", prompt: "Create a new contact" },
    { label: "\u25C6 Summary", prompt: "Give me a summary of today" },
  ];

  return (
    <div
      ref={scrollContainerRef}
      className="flex-1 flex flex-col overflow-y-auto pb-72 relative"
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

        {/* Empty State — conversation-first, no tabs */}
        {!hasMessages && !showOnboarding && (
          <div className="flex flex-col items-center text-center px-4">
            {/* Waveform — Colony's presence */}
            <div className="mb-6" style={{ marginBottom: 24 }}>
              <WaveformVisualizer state={waveformState} />
            </div>

            {/* Greeting — larger, lighter weight, fade-in */}
            <h1
              className="leading-tight mb-4"
              style={{
                fontFamily: "var(--font-spectral), Georgia, serif",
                fontWeight: 200,
                fontSize: 32,
                color: theme.text,
                opacity: 1,
                animation: "colonyFadeIn 0.6s ease-out",
              }}
            >
              {summary ? getGreeting(summary.firstName) : "Welcome back."}
            </h1>

            {/* Summary line — more spacing, muted */}
            {summary && (
              <p
                className="max-w-md mb-6"
                style={{
                  fontFamily: "var(--font-dm-sans), sans-serif",
                  fontSize: 14,
                  color: theme.textMuted,
                  marginTop: 4,
                }}
              >
                {summary.leadsCount} active lead
                {summary.leadsCount !== 1 ? "s" : ""}.{" "}
                {summary.pendingTasks} pending task
                {summary.pendingTasks !== 1 ? "s" : ""}.
                {summary.pipelineValue > 0 && (
                  <>{" "}Pipeline at {formatPipeline(summary.pipelineValue)}.</>
                )}
              </p>
            )}

            {/* Suggestion chips — 4 max with staggered entrance */}
            <div className="flex flex-wrap justify-center gap-2.5 mb-6">
              {EMPTY_STATE_CHIPS.map((chip, i) => (
                <button
                  key={chip.label}
                  onClick={() => {
                    const { sendToLam } = useAssistantStore.getState();
                    sendToLam(chip.prompt);
                  }}
                  className="transition-all duration-300 hover:brightness-110 active:scale-[0.97]"
                  style={{
                    fontFamily: "var(--font-dm-sans), sans-serif",
                    fontSize: 13,
                    fontWeight: 500,
                    padding: "10px 18px",
                    borderRadius: 24,
                    color: theme.textSoft,
                    backgroundColor: theme.bgGlow,
                    border: `1px solid ${theme.accentSoft}`,
                    opacity: 0,
                    animation: `colonyChipIn 0.35s ease-out ${i * 0.1}s forwards`,
                  }}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* AI suggestions — capped to 2 */}
            {suggestions && (
              <ColonySuggestions
                suggestions={suggestions.suggestions.slice(0, 2)}
                isNewUser={suggestions.isNewUser}
              />
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

      <style>{`
        @keyframes colonyFadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes colonyChipIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
