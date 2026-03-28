"use client";

import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import { useAssistantStore } from "@/lib/assistant/store";

const QUICK_ACTIONS = [
  { label: "Draft Email", icon: "\u2709", prompt: "Create a marketing email about " },
  { label: "Score Leads", icon: "\u25C6", prompt: "Score and prioritize my leads" },
  { label: "Follow-up Plan", icon: "\u27F3", prompt: "Create a follow-up sequence for " },
  { label: "Social Post", icon: "\u25C8", prompt: "Create a social media post about " },
  { label: "Pipeline Report", icon: "\u25A4", prompt: "Give me a pipeline summary" },
  { label: "New Contact", icon: "+", prompt: "Add a new contact: " },
] as const;

export function QuickActions() {
  const { theme } = useColonyTheme();
  const { setInput, sendToLam } = useAssistantStore();

  const handleClick = (prompt: string) => {
    const endsWithSpace = prompt.endsWith(" ");
    if (endsWithSpace) {
      // Pre-fill the command bar so user can finish the sentence
      setInput(prompt);
      // Focus the input
      const input = document.querySelector<HTMLTextAreaElement>("[data-chat-input]");
      if (input) {
        input.focus();
        // Move cursor to end
        requestAnimationFrame(() => {
          input.selectionStart = input.selectionEnd = input.value.length;
        });
      }
    } else {
      // Submit immediately
      sendToLam(prompt);
    }
  };

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none sm:flex-wrap sm:justify-center">
      {QUICK_ACTIONS.map((action) => (
        <button
          key={action.label}
          onClick={() => handleClick(action.prompt)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-all duration-150 hover:brightness-110 active:scale-[0.97] flex-shrink-0"
          style={{
            backgroundColor: withAlpha(theme.accent, 0.08),
            border: `1px solid ${withAlpha(theme.accent, 0.15)}`,
            color: theme.textSoft,
            fontFamily: "var(--font-dm-sans), sans-serif",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = theme.accent;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = withAlpha(theme.accent, 0.15);
          }}
        >
          <span className="text-[14px]">{action.icon}</span>
          {action.label}
        </button>
      ))}
    </div>
  );
}
