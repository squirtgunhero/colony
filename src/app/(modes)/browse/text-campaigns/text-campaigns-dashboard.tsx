"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import {
  MessageSquare,
  Plus,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  Pause,
  Play,
  Trash2,
  Users,
  Search,
} from "lucide-react";

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
  draft: { color: "#6b7280", icon: Clock, label: "Draft" },
  scheduled: { color: "#eab308", icon: Clock, label: "Scheduled" },
  sending: { color: "#3b82f6", icon: Send, label: "Sending" },
  completed: { color: "#22c55e", icon: CheckCircle, label: "Completed" },
  paused: { color: "#eab308", icon: Pause, label: "Paused" },
};

export function TextCampaignsDashboard({ campaigns, contacts }: Props) {
  const { theme } = useColonyTheme();
  const borderColor = withAlpha(theme.text, 0.06);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showCreate, setShowCreate] = useState(false);

  // Create form state
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

  const inputStyle = {
    backgroundColor: withAlpha(theme.text, 0.04),
    border: `1px solid ${borderColor}`,
    color: theme.text,
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-[22px] font-semibold"
            style={{ fontFamily: "'Spectral', serif", color: theme.text }}
          >
            Text Campaigns
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: withAlpha(theme.text, 0.4) }}>
            Send bulk text messages to your contacts
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 h-9 px-4 rounded-lg text-[13px] font-medium transition-colors"
          style={{ backgroundColor: theme.accent, color: theme.bg }}
        >
          <Plus className="h-3.5 w-3.5" />
          New Campaign
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="rounded-xl p-5 space-y-4" style={{ backgroundColor: withAlpha(theme.text, 0.02), border: `1px solid ${borderColor}` }}>
          <h3 className="text-[15px] font-medium" style={{ color: theme.text }}>Create Campaign</h3>

          <div>
            <label className="text-[11px] uppercase tracking-wider block mb-1.5" style={{ color: withAlpha(theme.text, 0.5) }}>
              Campaign Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Spring Open House Invite"
              className="w-full h-9 px-3 rounded-lg text-[13px] outline-none"
              style={inputStyle}
            />
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wider block mb-1.5" style={{ color: withAlpha(theme.text, 0.5) }}>
              Message <span style={{ color: withAlpha(theme.text, 0.3) }}>({charCount}/160 · {segmentCount} segment{segmentCount > 1 ? "s" : ""})</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Hi {{first_name}}, ..."
              rows={4}
              className="w-full px-3 py-2.5 rounded-lg text-[13px] outline-none resize-none"
              style={inputStyle}
            />
            <p className="text-[11px] mt-1" style={{ color: withAlpha(theme.text, 0.3) }}>
              Use {"{{name}}"} or {"{{first_name}}"} for personalization
            </p>
          </div>

          {/* Contact selector */}
          <div>
            <label className="text-[11px] uppercase tracking-wider block mb-1.5" style={{ color: withAlpha(theme.text, 0.5) }}>
              Recipients ({selectedContacts.length} selected)
            </label>
            <div className="flex gap-2 mb-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: withAlpha(theme.text, 0.3) }} />
                <input
                  type="text"
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  placeholder="Search contacts..."
                  className="w-full h-9 pl-9 pr-3 rounded-lg text-[13px] outline-none"
                  style={inputStyle}
                />
              </div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="h-9 px-3 rounded-lg text-[12px] outline-none"
                style={inputStyle}
              >
                <option value="all" style={{ backgroundColor: theme.bg }}>All Types</option>
                <option value="lead" style={{ backgroundColor: theme.bg }}>Leads</option>
                <option value="client" style={{ backgroundColor: theme.bg }}>Clients</option>
              </select>
              <button
                onClick={selectAll}
                className="h-9 px-3 rounded-lg text-[12px] font-medium whitespace-nowrap"
                style={{ backgroundColor: withAlpha(theme.text, 0.06), color: withAlpha(theme.text, 0.6) }}
              >
                {filteredContacts.every((c) => selectedContacts.includes(c.id)) ? "Deselect All" : "Select All"}
              </button>
            </div>
            <div
              className="max-h-48 overflow-y-auto rounded-lg space-y-0.5"
              style={{ border: `1px solid ${borderColor}` }}
            >
              {filteredContacts.map((contact) => {
                const selected = selectedContacts.includes(contact.id);
                return (
                  <button
                    key={contact.id}
                    onClick={() => toggleContact(contact.id)}
                    className="w-full flex items-center gap-3 px-3 py-2 text-left transition-colors"
                    style={{
                      backgroundColor: selected ? withAlpha(theme.accent, 0.08) : "transparent",
                    }}
                  >
                    <div
                      className="h-4 w-4 rounded border-2 flex items-center justify-center shrink-0"
                      style={{
                        borderColor: selected ? theme.accent : withAlpha(theme.text, 0.2),
                        backgroundColor: selected ? theme.accent : "transparent",
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

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowCreate(false)}
              className="h-9 px-4 rounded-lg text-[13px] font-medium"
              style={{ color: withAlpha(theme.text, 0.5) }}
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={isPending || !name.trim() || !message.trim() || selectedContacts.length === 0}
              className="flex items-center gap-2 h-9 px-5 rounded-lg text-[13px] font-medium transition-all"
              style={{
                backgroundColor: theme.accent,
                color: theme.bg,
                opacity: (!name.trim() || !message.trim() || selectedContacts.length === 0) ? 0.5 : 1,
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
        <div
          className="rounded-xl p-10 text-center"
          style={{ backgroundColor: withAlpha(theme.text, 0.02), border: `1px solid ${borderColor}` }}
        >
          <MessageSquare className="h-8 w-8 mx-auto mb-3" style={{ color: withAlpha(theme.text, 0.2) }} />
          <p className="text-[14px] font-medium mb-1" style={{ color: theme.text }}>
            No text campaigns yet
          </p>
          <p className="text-[12px]" style={{ color: withAlpha(theme.text, 0.4) }}>
            Create your first campaign to send bulk messages to your contacts
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {campaigns.map((campaign) => {
            const cfg = statusConfig[campaign.status] || statusConfig.draft;
            const StatusIcon = cfg.icon;
            const deliveryRate = campaign.sentCount > 0
              ? Math.round((campaign.deliveredCount / campaign.sentCount) * 100)
              : 0;
            return (
              <div
                key={campaign.id}
                className="rounded-xl p-4 transition-colors hover:bg-white/[0.02]"
                style={{ border: `1px solid ${borderColor}` }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: withAlpha(cfg.color, 0.12) }}
                  >
                    <StatusIcon className="h-4 w-4" style={{ color: cfg.color }} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[14px] font-medium truncate" style={{ color: theme.text }}>
                        {campaign.name}
                      </p>
                      <span
                        className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0"
                        style={{ backgroundColor: withAlpha(cfg.color, 0.15), color: cfg.color }}
                      >
                        {cfg.label}
                      </span>
                    </div>

                    <p className="text-[12px] mt-0.5 line-clamp-1" style={{ color: withAlpha(theme.text, 0.4) }}>
                      {campaign.message}
                    </p>

                    <div className="flex items-center gap-4 mt-2 text-[11px]" style={{ color: withAlpha(theme.text, 0.35) }}>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {campaign.recipientCount} recipients
                      </span>
                      {campaign.sentCount > 0 && (
                        <>
                          <span>{campaign.sentCount} sent</span>
                          {campaign.failedCount > 0 && (
                            <span style={{ color: "#ef4444" }}>{campaign.failedCount} failed</span>
                          )}
                          {campaign.replyCount > 0 && (
                            <span style={{ color: "#22c55e" }}>{campaign.replyCount} replies</span>
                          )}
                        </>
                      )}
                      <span>
                        {new Date(campaign.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {campaign.status === "draft" && (
                      <button
                        onClick={() => handleAction(campaign.id, "send")}
                        disabled={isPending}
                        className="flex items-center gap-1 h-8 px-3 rounded-lg text-[11px] font-medium transition-colors"
                        style={{ backgroundColor: withAlpha("#22c55e", 0.15), color: "#22c55e" }}
                      >
                        <Send className="h-3 w-3" />
                        Send
                      </button>
                    )}
                    {campaign.status === "sending" && (
                      <button
                        onClick={() => handleAction(campaign.id, "pause")}
                        disabled={isPending}
                        className="h-8 w-8 flex items-center justify-center rounded-lg"
                        style={{ color: "#eab308" }}
                      >
                        <Pause className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {campaign.status === "paused" && (
                      <button
                        onClick={() => handleAction(campaign.id, "send")}
                        disabled={isPending}
                        className="h-8 w-8 flex items-center justify-center rounded-lg"
                        style={{ color: "#22c55e" }}
                      >
                        <Play className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {["draft", "completed"].includes(campaign.status) && (
                      <button
                        onClick={() => handleAction(campaign.id, "delete")}
                        disabled={isPending}
                        className="h-8 w-8 flex items-center justify-center rounded-lg transition-colors"
                        style={{ color: withAlpha(theme.text, 0.3) }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
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
