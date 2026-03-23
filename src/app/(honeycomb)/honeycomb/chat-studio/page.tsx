"use client";

import { PageShell, EmptyState } from "@/components/honeycomb/page-shell";
import {
  Plus, Bot, Trash2, Settings, Copy, Check, Eye,
  MessageSquare, Code2, ChevronRight, GripVertical,
} from "lucide-react";
import { useChatBots } from "@/lib/honeycomb/hooks";
import { createChatBot, updateChatBot, deleteChatBot } from "@/lib/honeycomb/api";
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
import { useState, useCallback } from "react";
import type { ChatBot, QualificationQuestion } from "@/lib/honeycomb/types";

// ============================================
// Qualification Question Builder
// ============================================

const FIELD_MAPPINGS = [
  { value: "name", label: "Name" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "budget", label: "Budget" },
  { value: "timeline", label: "Timeline" },
  { value: "service_area", label: "Service Area" },
  { value: "property_type", label: "Property Type" },
  { value: "notes", label: "Notes" },
] as const;

const INPUT_TYPES = [
  { value: "text", label: "Text" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "select", label: "Select" },
  { value: "multiselect", label: "Multi-Select" },
  { value: "number", label: "Number" },
] as const;

function QualificationBuilder({
  questions,
  onChange,
}: {
  questions: QualificationQuestion[];
  onChange: (q: QualificationQuestion[]) => void;
}) {
  const addQuestion = () => {
    const usedMappings = questions.map((q) => q.fieldMapping);
    const nextMapping = FIELD_MAPPINGS.find((f) => !usedMappings.includes(f.value))?.value || "notes";
    onChange([
      ...questions,
      {
        id: `q_${Date.now()}`,
        question: "",
        fieldMapping: nextMapping,
        inputType: nextMapping === "email" ? "email" : nextMapping === "phone" ? "phone" : "text",
        required: true,
      },
    ]);
  };

  const updateQuestion = (index: number, updates: Partial<QualificationQuestion>) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], ...updates };
    onChange(updated);
  };

  const removeQuestion = (index: number) => {
    onChange(questions.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm text-neutral-300">Qualification Questions</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={addQuestion}
          className="text-amber-500 hover:text-amber-400 text-xs"
        >
          <Plus className="h-3 w-3 mr-1" /> Add Question
        </Button>
      </div>

      {questions.length === 0 && (
        <p className="text-xs text-neutral-500 py-2">
          No qualification questions. The bot will accept free-form messages.
        </p>
      )}

      {questions.map((q, index) => (
        <div
          key={q.id}
          className="bg-[#0c0c0c] border border-[#1f1f1f] rounded-lg p-3 space-y-2"
        >
          <div className="flex items-start gap-2">
            <GripVertical className="h-4 w-4 text-neutral-600 mt-2 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Input
                value={q.question}
                onChange={(e) => updateQuestion(index, { question: e.target.value })}
                placeholder="e.g., What's your name?"
                className="bg-[#161616] border-[#1f1f1f] text-white text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={q.fieldMapping}
                  onChange={(e) =>
                    updateQuestion(index, {
                      fieldMapping: e.target.value as QualificationQuestion["fieldMapping"],
                    })
                  }
                  className="bg-[#161616] border border-[#1f1f1f] text-white text-xs rounded-md px-2 py-1.5"
                >
                  {FIELD_MAPPINGS.map((f) => (
                    <option key={f.value} value={f.value}>
                      Maps to: {f.label}
                    </option>
                  ))}
                </select>
                <select
                  value={q.inputType}
                  onChange={(e) =>
                    updateQuestion(index, {
                      inputType: e.target.value as QualificationQuestion["inputType"],
                    })
                  }
                  className="bg-[#161616] border border-[#1f1f1f] text-white text-xs rounded-md px-2 py-1.5"
                >
                  {INPUT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      Type: {t.label}
                    </option>
                  ))}
                </select>
              </div>
              {(q.inputType === "select" || q.inputType === "multiselect") && (
                <Input
                  value={q.options?.join(", ") || ""}
                  onChange={(e) =>
                    updateQuestion(index, {
                      options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  placeholder="Options (comma-separated): e.g., Buy, Sell, Both"
                  className="bg-[#161616] border-[#1f1f1f] text-white text-xs"
                />
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeQuestion(index)}
              className="text-neutral-500 hover:text-red-500 h-8 w-8 flex-shrink-0"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================
// Embed Code Snippet
// ============================================

function EmbedCodeSnippet({ embedToken }: { embedToken: string }) {
  const [copied, setCopied] = useState(false);
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const snippet = `<script src="${baseUrl}/api/chatbot/embed?token=${embedToken}" async></script>`;

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [snippet]);

  return (
    <div className="bg-[#0c0c0c] border border-[#1f1f1f] rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <Label className="text-sm text-neutral-300 flex items-center gap-1.5">
          <Code2 className="h-3.5 w-3.5" /> Embed Code
        </Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="text-xs text-neutral-400 hover:text-white"
        >
          {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
          {copied ? "Copied!" : "Copy"}
        </Button>
      </div>
      <code className="text-xs text-amber-400 break-all block">{snippet}</code>
      <p className="text-[11px] text-neutral-500 mt-2">
        Add this to your website&apos;s HTML, just before the closing &lt;/body&gt; tag.
      </p>
    </div>
  );
}

// ============================================
// Bot Configuration Dialog
// ============================================

function BotConfigDialog({
  bot,
  open,
  onClose,
  onSave,
}: {
  bot: ChatBot;
  open: boolean;
  onClose: () => void;
  onSave: () => void;
}) {
  const [name, setName] = useState(bot.name);
  const [description, setDescription] = useState(bot.description || "");
  const [welcomeMessage, setWelcomeMessage] = useState(bot.welcomeMessage || "");
  const [brandColor, setBrandColor] = useState(bot.brandColor || "#f59e0b");
  const [position, setPosition] = useState<"bottom-right" | "bottom-left">(bot.position || "bottom-right");
  const [companyName, setCompanyName] = useState(bot.companyName || "");
  const [autoGreet, setAutoGreet] = useState(bot.autoGreet);
  const [autoGreetDelay, setAutoGreetDelay] = useState(bot.autoGreetDelay);
  const [collectLeadAfter, setCollectLeadAfter] = useState(bot.collectLeadAfter);
  const [qualificationFlow, setQualificationFlow] = useState<QualificationQuestion[]>(
    (bot.qualificationFlow as QualificationQuestion[]) || []
  );
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"general" | "qualification" | "appearance" | "embed">("general");

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateChatBot(bot.id, {
        name,
        description: description || undefined,
        welcomeMessage: welcomeMessage || undefined,
        brandColor,
        position: position as "bottom-right" | "bottom-left",
        companyName: companyName || undefined,
        autoGreet,
        autoGreetDelay,
        collectLeadAfter,
        qualificationFlow,
      });
      onSave();
      onClose();
    } catch (error) {
      console.error("Failed to update chat bot:", error);
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { key: "general", label: "General", icon: Settings },
    { key: "qualification", label: "Qualification", icon: MessageSquare },
    { key: "appearance", label: "Appearance", icon: Eye },
    { key: "embed", label: "Embed", icon: Code2 },
  ] as const;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-[#161616] border-[#1f1f1f] text-white max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Configure: {bot.name}</DialogTitle>
          <DialogDescription>
            Customize your chatbot&apos;s behavior, qualification flow, and appearance.
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-[#1f1f1f] pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors ${
                activeTab === tab.key
                  ? "bg-amber-500/10 text-amber-500"
                  : "text-neutral-400 hover:text-white hover:bg-[#1f1f1f]"
              }`}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 min-h-0">
          {activeTab === "general" && (
            <>
              <div className="grid gap-2">
                <Label htmlFor="cfg-name">Name *</Label>
                <Input
                  id="cfg-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-[#0c0c0c] border-[#1f1f1f] text-white"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cfg-desc">Description</Label>
                <Textarea
                  id="cfg-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-[#0c0c0c] border-[#1f1f1f] text-white"
                  rows={2}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cfg-welcome">Welcome Message</Label>
                <Input
                  id="cfg-welcome"
                  value={welcomeMessage}
                  onChange={(e) => setWelcomeMessage(e.target.value)}
                  placeholder="Hi! How can I help you today?"
                  className="bg-[#0c0c0c] border-[#1f1f1f] text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={autoGreet}
                      onChange={(e) => setAutoGreet(e.target.checked)}
                      className="rounded bg-[#0c0c0c] border-[#1f1f1f]"
                    />
                    Auto-greet visitors
                  </Label>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cfg-delay">Greet delay (seconds)</Label>
                  <Input
                    id="cfg-delay"
                    type="number"
                    min={0}
                    max={30}
                    value={autoGreetDelay}
                    onChange={(e) => setAutoGreetDelay(parseInt(e.target.value) || 3)}
                    className="bg-[#0c0c0c] border-[#1f1f1f] text-white"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cfg-collect">Start qualification after N visitor messages</Label>
                <Input
                  id="cfg-collect"
                  type="number"
                  min={1}
                  max={10}
                  value={collectLeadAfter}
                  onChange={(e) => setCollectLeadAfter(parseInt(e.target.value) || 2)}
                  className="bg-[#0c0c0c] border-[#1f1f1f] text-white"
                />
                <p className="text-xs text-neutral-500">
                  After this many messages, the bot will start asking qualification questions.
                </p>
              </div>
            </>
          )}

          {activeTab === "qualification" && (
            <QualificationBuilder
              questions={qualificationFlow}
              onChange={setQualificationFlow}
            />
          )}

          {activeTab === "appearance" && (
            <>
              <div className="grid gap-2">
                <Label htmlFor="cfg-company">Company Name</Label>
                <Input
                  id="cfg-company"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Your Company"
                  className="bg-[#0c0c0c] border-[#1f1f1f] text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="cfg-color">Brand Color</Label>
                  <div className="flex gap-2 items-center">
                    <input
                      id="cfg-color"
                      type="color"
                      value={brandColor}
                      onChange={(e) => setBrandColor(e.target.value)}
                      className="w-10 h-10 rounded border border-[#1f1f1f] cursor-pointer bg-transparent"
                    />
                    <Input
                      value={brandColor}
                      onChange={(e) => setBrandColor(e.target.value)}
                      className="bg-[#0c0c0c] border-[#1f1f1f] text-white font-mono text-sm"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Widget Position</Label>
                  <select
                    value={position}
                    onChange={(e) => setPosition(e.target.value as "bottom-right" | "bottom-left")}
                    className="bg-[#0c0c0c] border border-[#1f1f1f] text-white text-sm rounded-md px-3 py-2"
                  >
                    <option value="bottom-right">Bottom Right</option>
                    <option value="bottom-left">Bottom Left</option>
                  </select>
                </div>
              </div>

              {/* Preview */}
              <div className="mt-4">
                <Label className="text-sm text-neutral-300 mb-2 block">Preview</Label>
                <div className="bg-[#0c0c0c] border border-[#1f1f1f] rounded-lg p-6 relative h-48 overflow-hidden">
                  <div
                    className="absolute bottom-4 flex items-end gap-3"
                    style={{ [position === "bottom-left" ? "left" : "right"]: 16 }}
                  >
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
                      style={{ backgroundColor: brandColor }}
                    >
                      <MessageSquare className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <div className="absolute top-4 left-4 right-4">
                    <div
                      className="rounded-t-lg px-4 py-3 text-white text-sm font-medium"
                      style={{ backgroundColor: brandColor }}
                    >
                      {companyName || "Chat"}
                    </div>
                    <div className="bg-white rounded-b-lg px-4 py-3 border border-[#ddd]">
                      <div className="bg-[#f0f0f0] rounded-lg px-3 py-2 text-xs text-[#333] inline-block max-w-[70%]">
                        {welcomeMessage || "Hi! How can I help you today?"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === "embed" && (
            <>
              <EmbedCodeSnippet embedToken={bot.embedToken} />
              <div className="bg-[#0c0c0c] border border-[#1f1f1f] rounded-lg p-3 space-y-2">
                <Label className="text-sm text-neutral-300">Status</Label>
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                      bot.status === "active"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : bot.status === "paused"
                        ? "bg-amber-500/10 text-amber-400"
                        : "bg-neutral-500/10 text-neutral-400"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        bot.status === "active"
                          ? "bg-emerald-500"
                          : bot.status === "paused"
                          ? "bg-amber-500"
                          : "bg-neutral-500"
                      }`}
                    />
                    {bot.status}
                  </span>
                  {bot.status === "draft" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        await updateChatBot(bot.id, { status: "active" });
                        onSave();
                      }}
                      className="text-xs border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10"
                    >
                      Activate
                    </Button>
                  )}
                  {bot.status === "active" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        await updateChatBot(bot.id, { status: "paused" });
                        onSave();
                      }}
                      className="text-xs border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
                    >
                      Pause
                    </Button>
                  )}
                  {bot.status === "paused" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        await updateChatBot(bot.id, { status: "active" });
                        onSave();
                      }}
                      className="text-xs border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10"
                    >
                      Resume
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-xs text-neutral-500">
                The widget will only appear on your site when the bot status is <strong>active</strong>.
                Draft and paused bots return a 403 error to the widget script.
              </p>
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="border-[#1f1f1f] text-neutral-300 hover:bg-[#1f1f1f]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name || saving}
            className="bg-amber-500 hover:bg-amber-600 text-black font-medium"
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// Main Page
// ============================================

export default function ChatStudioPage() {
  const { data, loading, refetch } = useChatBots();
  const chatBots = data?.chatBots ?? [];

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [configBot, setConfigBot] = useState<ChatBot | null>(null);
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
      subtitle="Create and manage AI-powered chat experiences for lead qualification"
      ctaLabel="Create Chat"
      ctaIcon={Plus}
      onCtaClick={() => setIsCreateDialogOpen(true)}
    >
      {/* Existing Chats */}
      <div className="bg-[#161616] border border-[#1f1f1f] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f1f1f]">
          <h2 className="text-lg font-medium text-white">Your Chat Bots</h2>
        </div>
        {loading ? (
          <div className="p-8 flex justify-center">
            <div className="h-8 w-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : chatBots.length === 0 ? (
          <EmptyState
            icon={Bot}
            title="No chat bots yet"
            description="Create your first AI chat bot to qualify leads and engage visitors automatically."
            ctaLabel="Create Chat Bot"
            ctaIcon={Plus}
            onCtaClick={() => setIsCreateDialogOpen(true)}
          />
        ) : (
          <div className="divide-y divide-[#1f1f1f]">
            {chatBots.map((bot) => (
              <div
                key={bot.id}
                className="px-6 py-4 flex items-center justify-between group hover:bg-[#1a1a1a] transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div
                    className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${bot.brandColor}15` }}
                  >
                    <Bot className="h-5 w-5" style={{ color: bot.brandColor }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-medium truncate">{bot.name}</p>
                    <p className="text-sm text-neutral-400 truncate">
                      {bot.description || bot.companyName || "No description"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Status badge */}
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                      bot.status === "active"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : bot.status === "paused"
                        ? "bg-amber-500/10 text-amber-400"
                        : "bg-neutral-500/10 text-neutral-400"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        bot.status === "active"
                          ? "bg-emerald-500"
                          : bot.status === "paused"
                          ? "bg-amber-500"
                          : "bg-neutral-500"
                      }`}
                    />
                    {bot.status}
                  </span>

                  <div className="text-right">
                    <p className="text-white text-sm">{bot.conversationCount} conversations</p>
                    <p className="text-xs text-neutral-500">
                      {(bot.qualificationFlow as unknown[])?.length || 0} questions
                    </p>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setConfigBot(bot)}
                      className="text-neutral-400 hover:text-white h-8 w-8"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteChatBot(bot.id)}
                      className="text-neutral-500 hover:text-red-500 h-8 w-8"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <ChevronRight className="h-4 w-4 text-neutral-600" />
                  </div>
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
              Create a new AI-powered chat bot for lead qualification.
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

      {/* Bot Configuration Dialog */}
      {configBot && (
        <BotConfigDialog
          bot={configBot}
          open={!!configBot}
          onClose={() => setConfigBot(null)}
          onSave={() => refetch()}
        />
      )}
    </PageShell>
  );
}
