"use client";

import { PageShell, EmptyState } from "@/components/honeycomb/page-shell";
import { Plus, Bot } from "lucide-react";
import { useChatBots } from "@/lib/honeycomb/hooks";

export default function ChatStudioPage() {
  const { data, loading } = useChatBots();
  const chatBots = data?.chatBots ?? [];

  return (
    <PageShell
      title="Chat Studio"
      subtitle="Create and manage AI-powered chat experiences"
      ctaLabel="Create Chat"
      ctaIcon={Plus}
    >
      {/* Chat Templates Grid */}
      <div className="mb-8">
        <h2 className="text-lg font-medium text-white mb-4">Templates</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Template cards will appear here when available */}
        </div>
      </div>

      {/* Existing Chats */}
      <div className="bg-[#161616] border border-[#1f1f1f] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f1f1f]">
          <h2 className="text-lg font-medium text-white">Your Chats</h2>
        </div>
        {loading ? (
          <div className="p-8 flex justify-center">
            <div className="h-8 w-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : chatBots.length === 0 ? (
          <EmptyState
            icon={Bot}
            title="No chats yet"
            description="Create your first AI chat to engage with your audience automatically."
            ctaLabel="Create Chat"
            ctaIcon={Plus}
          />
        ) : (
          <div className="divide-y divide-[#1f1f1f]">
            {chatBots.map((bot) => (
              <div key={bot.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Bot className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-white font-medium">{bot.name}</p>
                    <p className="text-sm text-neutral-400">{bot.description || "No description"}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white">{bot.conversationCount} conversations</p>
                  <p className="text-sm text-neutral-400 capitalize">{bot.status}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
