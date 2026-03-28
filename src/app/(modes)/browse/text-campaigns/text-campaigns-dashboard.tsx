"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import {
  MessageSquare,
  MessageSquareText,
  Plus,
  Send,
  Clock,
  CheckCircle,
  Pause,
  Play,
  Trash2,
  Users,
  Search,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ActionButton } from "@/components/ui/action-button";
import { EmptyState } from "@/components/ui/empty-state";

interface Campaign {
  id: string;
  name: string;
  message: string;
  status: string;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  recipientCount: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  replyCount: number;
  createdAt: string;
}

interface Contact {
  id: string;
  name: string;
  phone: string | null;
  type: string;
  source: string | null;
  tags: string[];
}

interface Props {
  campaigns: Campaign[];
  contacts: Contact[];
}

const statusConfig: Record<string, { color: string; icon: typeof Send; label: string }> = {
  draft: { color: "#98989d", icon: Clock, label: "Draft" },
  scheduled: { color: "#ff9f0a", icon: Clock, label: "Scheduled" },
  sending: { color: "#64d2ff", icon: Send, label: "Sending" },
  completed: { color: "#30d158", icon: CheckCircle, label: "Completed" },
  paused: { color: "#ff9f0a", icon: Pause, label: "Paused" },
};

export function TextCampaignsDashboard({ campaigns, contacts }: Props) {
  const { theme } = useColonyTheme();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showCreate, setShowCreate] = useState(false);

  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [contactSearch, setContactSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  const filteredContacts = contacts.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(contactSearch.toLowerCase());
    const matchesType = filterType === "all" || c.type === filterType;
    return matchesSearch && matchesType;
  });

  const charCount = message.length;
  const segmentCount = Math.ceil(charCount / 160) || 1;

  const handleCreate = () => {
    if (!name.trim() || !message.trim() || selectedContacts.length === 0) return;
    startTransition(async () => {
      const res = await fetch("/api/text-campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, message, contactIds: selectedContacts }),
      });
      if (res.ok) {
        setShowCreate(false);
        setName("");
        setMessage("");
        setSelectedContacts([]);
        router.refresh();
      }
    });
  };

  const handleAction = (id: string, action: string) => {
    startTransition(async () => {
      if (action === "delete") {
        await fetch(`/api/text-campaigns/${id}`, { method: "DELETE" });
      } else {
        await fetch(`/api/text-campaigns/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
      }
      router.refresh();
    });
  };

  const toggleContact = (id: string) => {
    setSelectedContacts((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    const ids = filteredContacts.map((c) => c.id);
    setSelectedContacts((prev) => {
      const allSelected = ids.every((id) => prev.includes(id));
      if (allSelected) return prev.filter((id) => !ids.includes(id));
      return [...new Set([...prev, ...ids])];
    });
  };

  const inputStyle: React.CSSProperties = {
    backgroundColor: withAlpha(theme.text, 0.04),
    color: theme.text,
  };

  return (
    <div className="p-6 sm:p-8 max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Text Campaigns"
        subtitle="Send bulk text messages to your contacts"
        icon={MessageSquareText}
        actions={
          <ActionButton
            label={showCreate ? "Cancel" : "New Campaign"}
            icon={Plus}
            variant={showCreate ? "secondary" : "primary"}
            onClick={() => setShowCreate(!showCreate)}
          />
        }
      />

      {/* Create form */}
      {showCreate && (
        <div
          className="rounded-2xl p-5 space-y-4"
          style={{ backgroundColor: withAlpha(theme.text, 0.03) }}
        >
          <h3 className="text-[15px] font-semibold" style={{ color: theme.text }}>Create Campaign</h3>

          <div>
            <label className="text-[11px] font-medium uppercase tracking-[0.06em] block mb-1.5" style={{ color: withAlpha(theme.text, 0.45) }}>
              Campaign Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Spring Open House Invite"
              className="w-full h-10 px-3.5 rounded-xl text-[13px] outline-none transition-colors focus:ring-1"
              style={{ ...inputStyle, borderColor: "transparent" }}
            />
          </div>

          <div>
            <label className="text-[11px] font-medium uppercase tracking-[0.06em] block mb-1.5" style={{ color: withAlpha(theme.text, 0.45) }}>
              Message <span style={{ color: withAlpha(theme.text, 0.3) }}>({charCount}/160 · {segmentCount} segment{segmentCount > 1 ? "s" : ""})</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Hi {{first_name}}, ..."
              rows={4}
              className="w-full px-3.5 py-3 rounded-xl text-[13px] outline-none resize-none transition-colors"
              style={inputStyle}
            />
            <p className="text-[11px] mt-1" style={{ color: withAlpha(theme.text, 0.3) }}>
              Use {"{{name}}"} or {"{{first_name}}"} for personalization
            </p>
          </div>

          {/* Contact selector */}
          <div>
            <label className="text-[11px] font-medium uppercase tracking-[0.06em] block mb-1.5" style={{ color: withAlpha(theme.text, 0.45) }}>
              Recipients ({selectedContacts.length} selected)
            </label>
            <div className="flex gap-2 mb-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: withAlpha(theme.text, 0.25) }} />
                <input
                  type="text"
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  placeholder="Search contacts..."
                  className="w-full h-10 pl-9 pr-3 rounded-xl text-[13px] outline-none"
                  style={inputStyle}
                />
              </div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="h-10 px-3 rounded-xl text-[12px] outline-none"
                style={inputStyle}
              >
                <option value="all" style={{ backgroundColor: theme.bg }}>All Types</option>
                <option value="lead" style={{ backgroundColor: theme.bg }}>Leads</option>
                <option value="client" style={{ backgroundColor: theme.bg }}>Clients</option>
              </select>
              <button
                onClick={selectAll}
                className="h-10 px-3.5 rounded-xl text-[12px] font-medium whitespace-nowrap transition-colors"
                style={{ backgroundColor: withAlpha(theme.text, 0.05), color: withAlpha(theme.text, 0.5) }}
              >
                {filteredContacts.every((c) => selectedContacts.includes(c.id)) ? "Deselect All" : "Select All"}
              </button>
            </div>
            <div
              className="max-h-48 overflow-y-auto rounded-xl"
              style={{ backgroundColor: withAlpha(theme.text, 0.02) }}
            >
              {filteredContacts.map((contact) => {
                const selected = selectedContacts.includes(contact.id);
                return (
                  <button
                    key={contact.id}
                    onClick={() => toggleContact(contact.id)}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left transition-colors"
                    style={{
                      backgroundColor: selected ? withAlpha(theme.accent, 0.06) : "transparent",
                    }}
                  >
                    <div
                      className="h-4 w-4 rounded-md flex items-center justify-center shrink-0 transition-colors"
                      style={{
                        backgroundColor: selected ? theme.accent : withAlpha(theme.text, 0.08),
                      }}
                    >
                      {selected && <CheckCircle className="h-3 w-3" style={{ color: theme.bg }} />}
                    </div>
                    <span className="text-[13px] flex-1" style={{ color: theme.text }}>{contact.name}</span>
                    <span className="text-[11px]" style={{ color: withAlpha(theme.text, 0.3) }}>{contact.phone}</span>
                  </button>
                );
              })}
              {filteredContacts.length === 0 && (
                <p className="text-[12px] p-4 text-center" style={{ color: withAlpha(theme.text, 0.4) }}>
                  No contacts with phone numbers found
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={() => setShowCreate(false)}
              className="h-9 px-4 rounded-xl text-[13px] font-medium transition-opacity hover:opacity-70"
              style={{ color: withAlpha(theme.text, 0.5) }}
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={isPending || !name.trim() || !message.trim() || selectedContacts.length === 0}
              className="flex items-center gap-2 h-9 px-5 rounded-xl text-[13px] font-medium transition-all active:scale-[0.97]"
              style={{
                backgroundColor: theme.accent,
                color: theme.bg,
                opacity: (!name.trim() || !message.trim() || selectedContacts.length === 0) ? 0.4 : 1,
              }}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              {isPending ? "Creating..." : "Create Campaign"}
            </button>
          </div>
        </div>
      )}

      {/* Campaign list */}
      {campaigns.length === 0 && !showCreate ? (
        <EmptyState
          icon={MessageSquare}
          title="No text campaigns yet"
          description="Create your first campaign to send bulk messages to your contacts."
        />
      ) : (
        <div className="space-y-1.5">
          {campaigns.map((campaign) => {
            const cfg = statusConfig[campaign.status] || statusConfig.draft;
            const StatusIcon = cfg.icon;
            return (
              <div
                key={campaign.id}
                className="rounded-2xl p-4 transition-colors"
                style={{ backgroundColor: withAlpha(theme.text, 0.02) }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = withAlpha(theme.text, 0.04)}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = withAlpha(theme.text, 0.02)}
              >
                <div className="flex items-start gap-4">
                  <StatusIcon
                    className="h-4 w-4 mt-0.5 shrink-0"
                    style={{ color: cfg.color }}
                    strokeWidth={1.5}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[14px] font-medium truncate" style={{ color: theme.text }}>
                        {campaign.name}
                      </p>
                      <span
                        className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0"
                        style={{ backgroundColor: withAlpha(cfg.color, 0.12), color: cfg.color }}
                      >
                        {cfg.label}
                      </span>
                    </div>

                    <p className="text-[12px] mt-0.5 line-clamp-1" style={{ color: withAlpha(theme.text, 0.4) }}>
                      {campaign.message}
                    </p>

                    <div className="flex items-center gap-4 mt-2 text-[11px]" style={{ color: withAlpha(theme.text, 0.35) }}>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" strokeWidth={1.5} />
                        {campaign.recipientCount} recipients
                      </span>
                      {campaign.sentCount > 0 && (
                        <>
                          <span>{campaign.sentCount} sent</span>
                          {campaign.failedCount > 0 && (
                            <span style={{ color: "#ff453a" }}>{campaign.failedCount} failed</span>
                          )}
                          {campaign.replyCount > 0 && (
                            <span style={{ color: "#30d158" }}>{campaign.replyCount} replies</span>
                          )}
                        </>
                      )}
                      <span>
                        {new Date(campaign.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {campaign.status === "draft" && (
                      <button
                        onClick={() => handleAction(campaign.id, "send")}
                        disabled={isPending}
                        className="flex items-center gap-1 h-8 px-3 rounded-lg text-[11px] font-medium transition-opacity hover:opacity-70"
                        style={{ backgroundColor: withAlpha("#30d158", 0.12), color: "#30d158" }}
                      >
                        <Send className="h-3 w-3" strokeWidth={1.5} />
                        Send
                      </button>
                    )}
                    {campaign.status === "sending" && (
                      <button
                        onClick={() => handleAction(campaign.id, "pause")}
                        disabled={isPending}
                        className="h-8 w-8 flex items-center justify-center rounded-lg transition-opacity hover:opacity-70"
                        style={{ color: "#ff9f0a" }}
                      >
                        <Pause className="h-3.5 w-3.5" strokeWidth={1.5} />
                      </button>
                    )}
                    {campaign.status === "paused" && (
                      <button
                        onClick={() => handleAction(campaign.id, "send")}
                        disabled={isPending}
                        className="h-8 w-8 flex items-center justify-center rounded-lg transition-opacity hover:opacity-70"
                        style={{ color: "#30d158" }}
                      >
                        <Play className="h-3.5 w-3.5" strokeWidth={1.5} />
                      </button>
                    )}
                    {["draft", "completed"].includes(campaign.status) && (
                      <button
                        onClick={() => handleAction(campaign.id, "delete")}
                        disabled={isPending}
                        className="h-8 w-8 flex items-center justify-center rounded-lg transition-opacity hover:opacity-70"
                        style={{ color: withAlpha(theme.text, 0.25) }}
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
