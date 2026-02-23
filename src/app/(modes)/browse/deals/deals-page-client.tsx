"use client";

import { useState } from "react";
import { List, LayoutGrid } from "lucide-react";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import { DealsListView } from "@/components/browse/DealsListView";
import { DealsBoard } from "@/components/deals/deals-board";
import { PipelineStats } from "@/components/deals/PipelineStats";

interface Deal {
  id: string;
  title: string;
  stage: string;
  value: number | null;
  notes: string | null;
  isFavorite: boolean;
  updatedAt: Date;
  createdAt: Date;
  contact: { id: string; name: string } | null;
  property: { id: string; address: string; city: string } | null;
}

interface Contact {
  id: string;
  name: string;
}

interface Property {
  id: string;
  address: string;
  city: string;
}

interface DealsPageClientProps {
  deals: Deal[];
  contacts: Contact[];
  properties: Property[];
}

export function DealsPageClient({
  deals,
  contacts,
  properties,
}: DealsPageClientProps) {
  const [view, setView] = useState<"board" | "list">("board");
  const { theme } = useColonyTheme();

  const neumorphicRaised = `3px 3px 6px rgba(0,0,0,0.35), -3px -3px 6px rgba(255,255,255,0.03)`;

  return (
    <div className="p-6 space-y-6">
      {/* Header with toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-[28px] leading-tight font-semibold tracking-[-0.01em]"
            style={{ color: theme.text, fontFamily: "'Spectral', serif" }}
          >
            Deals
          </h1>
        </div>
        <div
          className="flex rounded-xl overflow-hidden"
          style={{ boxShadow: neumorphicRaised }}
        >
          <button
            onClick={() => setView("board")}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all"
            style={{
              backgroundColor:
                view === "board"
                  ? withAlpha(theme.accent, 0.15)
                  : theme.bgGlow,
              color: view === "board" ? theme.accent : theme.textMuted,
            }}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Board
          </button>
          <button
            onClick={() => setView("list")}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all"
            style={{
              backgroundColor:
                view === "list"
                  ? withAlpha(theme.accent, 0.15)
                  : theme.bgGlow,
              color: view === "list" ? theme.accent : theme.textMuted,
            }}
          >
            <List className="h-3.5 w-3.5" />
            List
          </button>
        </div>
      </div>

      {/* Content */}
      {view === "board" ? (
        <>
          <DealsBoard
            deals={deals}
            contacts={contacts}
            properties={properties}
          />
          <PipelineStats deals={deals as unknown as { id: string; stage: string; value: number | null; createdAt: string | Date; updatedAt: string | Date }[]} />
        </>
      ) : (
        <DealsListView deals={deals} />
      )}
    </div>
  );
}
