"use client";

import { PageShell, EmptyState } from "@/components/honeycomb/page-shell";
import { Plus, Bot, Trash2 } from "lucide-react";
import { useChatBots } from "@/lib/honeycomb/hooks";
import { createChatBot, deleteChatBot } from "@/lib/honeycomb/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

export default function ChatStudioPage() {
  const { data, loading, refetch } = useChatBots();
  const chatBots = data?.chatBots ?? [];

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newBotName, setNewBotName] = useState("");
  const [newBotDescription, setNewBotDescription] = useState("");
  const [newBotWelcome, setNewBotWelcome] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateChatBot = async () => {
    if (!newBotName) return;
    setIsCreating(true);
    try {
      await createChatBot({
        name: newBotName,
        description: newBotDescription || undefined,
        welcomeMessage: newBotWelcome || undefined,
      });
      setIsCreateDialogOpen(false);
      setNewBotName("");
      setNewBotDescription("");
      setNewBotWelcome("");
      refetch();
    } catch (error) {
      console.error("Failed to create chat bot:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteChatBot = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this chat bot?")) {
      try {
        await deleteChatBot(id);
        refetch();
      } catch (error) {
        console.error("Failed to delete chat bot:", error);
      }
    }
  };

  return (
    <PageShell
      title="Chat Studio"
      subtitle="Create and manage AI-powered chat experiences"
      ctaLabel="Create Chat"
      ctaIcon={Plus}
      onCtaClick={() => setIsCreateDialogOpen(true)}
    >
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
            onCtaClick={() => setIsCreateDialogOpen(true)}
          />
        ) : (
          <div className="divide-y divide-[#1f1f1f]">
            {chatBots.map((bot) => (
              <div key={bot.id} className="px-6 py-4 flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Bot className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-white font-medium">{bot.name}</p>
                    <p className="text-sm text-neutral-400">{bot.description || "No description"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-white">{bot.conversationCount} conversations</p>
                    <p className="text-sm text-neutral-400 capitalize">{bot.status}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteChatBot(bot.id)}
                    className="text-neutral-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Chat Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-[#161616] border-[#1f1f1f] text-white">
          <DialogHeader>
            <DialogTitle>Create Chat Bot</DialogTitle>
            <DialogDescription>
              Create a new AI-powered chat experience.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={newBotName}
                onChange={(e) => setNewBotName(e.target.value)}
                placeholder="e.g., Lead Qualifier Bot"
                className="bg-[#0c0c0c] border-[#1f1f1f] text-white"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newBotDescription}
                onChange={(e) => setNewBotDescription(e.target.value)}
                placeholder="What does this chat bot do?"
                className="bg-[#0c0c0c] border-[#1f1f1f] text-white"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="welcome">Welcome Message</Label>
              <Input
                id="welcome"
                value={newBotWelcome}
                onChange={(e) => setNewBotWelcome(e.target.value)}
                placeholder="Hi! How can I help you today?"
                className="bg-[#0c0c0c] border-[#1f1f1f] text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              className="border-[#1f1f1f] text-neutral-300 hover:bg-[#1f1f1f]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateChatBot}
              disabled={!newBotName || isCreating}
              className="bg-amber-500 hover:bg-amber-600 text-black font-medium"
            >
              {isCreating ? "Creating..." : "Create Chat"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
