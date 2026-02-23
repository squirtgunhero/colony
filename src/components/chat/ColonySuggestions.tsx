"use client";

import { useAssistantStore } from "@/lib/assistant/store";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import {
  Clock,
  AlertTriangle,
  TrendingUp,
  CalendarPlus,
  UserPlus,
  Upload,
  MessageCircle,
} from "lucide-react";

interface Suggestion {
  id: string;
  type: string;
  text: string;
  action: string;
}

interface ColonySuggestionsProps {
  suggestions: Suggestion[];
  isNewUser: boolean;
}

const ICON_MAP: Record<string, typeof Clock> = {
  follow_up: Clock,
  overdue_task: AlertTriangle,
  stale_deal: TrendingUp,
  empty_calendar: CalendarPlus,
};

const ONBOARDING_PROMPTS = [
  {
    label: "Add your first contact",
    prompt: "Create a new contact",
    Icon: UserPlus,
  },
  {
    label: "Import contacts from your phone",
    prompt: "Help me import my contacts",
    Icon: Upload,
  },
  {
    label: "Tell me about your business",
    prompt: "I want to tell you about my business",
    Icon: MessageCircle,
  },
];

export function ColonySuggestions({
  suggestions,
  isNewUser,
}: ColonySuggestionsProps) {
  const { sendToLam } = useAssistantStore();
  const { theme } = useColonyTheme();

  if (isNewUser) {
    return (
      <div className="w-full max-w-md mx-auto mb-6">
        <p
          className="text-xs font-medium uppercase tracking-widest mb-3"
          style={{
            fontFamily: "var(--font-dm-sans), sans-serif",
            color: theme.textMuted,
          }}
        >
          Get started
        </p>
        <div className="flex flex-col gap-2">
          {ONBOARDING_PROMPTS.map((item) => {
            const raised = `3px 3px 6px rgba(0,0,0,0.35), -3px -3px 6px rgba(255,255,255,0.03)`;
            const hover = `2px 2px 4px rgba(0,0,0,0.25), -2px -2px 4px rgba(255,255,255,0.02), 0 0 12px ${withAlpha(theme.accent, 0.1)}`;
            return (
              <button
                key={item.label}
                onClick={() => sendToLam(item.prompt)}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl text-left text-sm transition-all duration-300"
                style={{
                  fontFamily: "var(--font-dm-sans), sans-serif",
                  color: theme.text,
                  opacity: 0.8,
                  backgroundColor: theme.bgGlow,
                  boxShadow: raised,
                  border: `1px solid ${withAlpha(theme.accent, 0.08)}`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = hover;
                  e.currentTarget.style.opacity = "1";
                  e.currentTarget.style.borderColor = withAlpha(
                    theme.accent,
                    0.2
                  );
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = raised;
                  e.currentTarget.style.opacity = "0.8";
                  e.currentTarget.style.borderColor = withAlpha(
                    theme.accent,
                    0.08
                  );
                }}
              >
                <item.Icon
                  className="h-4 w-4 shrink-0"
                  style={{ color: theme.accent }}
                />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) return null;

  return (
    <div className="w-full max-w-md mx-auto mb-6">
      <p
        className="text-xs font-medium uppercase tracking-widest mb-3"
        style={{
          fontFamily: "var(--font-dm-sans), sans-serif",
          color: theme.textMuted,
        }}
      >
        Colony suggests
      </p>
      <div className="flex flex-col gap-2">
        {suggestions.map((s, i) => {
          const Icon = ICON_MAP[s.type] ?? Clock;
          const raised = `3px 3px 6px rgba(0,0,0,0.35), -3px -3px 6px rgba(255,255,255,0.03)`;
          const hover = `2px 2px 4px rgba(0,0,0,0.25), -2px -2px 4px rgba(255,255,255,0.02), 0 0 12px ${withAlpha(theme.accent, 0.1)}`;
          return (
            <button
              key={s.id}
              onClick={() => sendToLam(s.action)}
              className="flex items-start gap-3 px-4 py-3 rounded-2xl text-left text-sm transition-all duration-300"
              style={{
                fontFamily: "var(--font-dm-sans), sans-serif",
                color: theme.text,
                opacity: 0,
                backgroundColor: theme.bgGlow,
                boxShadow: raised,
                border: `1px solid ${withAlpha(theme.accent, 0.08)}`,
                animation: `fadeSlideIn 0.4s ease-out ${i * 0.1}s forwards`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = hover;
                e.currentTarget.style.borderColor = withAlpha(
                  theme.accent,
                  0.2
                );
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = raised;
                e.currentTarget.style.borderColor = withAlpha(
                  theme.accent,
                  0.08
                );
              }}
            >
              <Icon
                className="h-4 w-4 shrink-0 mt-0.5"
                style={{ color: theme.accent }}
              />
              <span style={{ opacity: 0.85 }}>{s.text}</span>
            </button>
          );
        })}
      </div>
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
