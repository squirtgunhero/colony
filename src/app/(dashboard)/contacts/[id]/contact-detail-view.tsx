"use client";

import { useState, useRef, useEffect, useCallback, forwardRef } from "react";
import Link from "next/link";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import { ActivityDialog } from "@/components/activities/activity-dialog";
import { ContactDialog } from "@/components/contacts/contact-dialog";
import { SendEmailDialog } from "@/components/email/send-email-dialog";
import { FavoriteContactButton } from "@/components/favorites/favorite-contact-button";
import { ThemedActivityTimeline } from "@/components/activities/themed-activity-timeline";
import { ThemedContactTasks } from "@/components/contacts/themed-contact-tasks";
import { formatCurrency } from "@/lib/date-utils";
import {
  ArrowLeft,
  Phone,
  Mail,
  Users,
  FileText,
  Pencil,
  MoreHorizontal,
  Trash2,
  MessageSquare,
  CheckSquare,
  Plus,
  Send,
  Linkedin,
  Building2,
  Briefcase,
  RefreshCw,
  Globe,
  Sparkles,
} from "lucide-react";
import { RelationshipScoreRing } from "@/components/contacts/RelationshipScoreRing";
import type { RelationshipScoreResult } from "@/lib/relationship-score";
import { createQuickNote } from "@/components/quick-capture/actions";
import { deleteContact } from "@/app/(dashboard)/contacts/actions";
import { useRouter } from "next/navigation";
import { usePresence } from "@/lib/realtime/presence";
import { useRealtimeUpdates } from "@/lib/realtime/broadcast";
import { PresenceAvatars } from "@/components/ui/presence-avatars";
import { EnrollInSequenceDialog } from "@/components/sequences/enroll-dialog";

interface Deal {
  id: string;
  title: string;
  value: number | null;
  stage: string;
  notes: string | null;
  createdAt: string;
  property?: { id: string; address: string } | null;
}

interface Property {
  id: string;
  address: string;
  city: string;
  state: string | null;
  price: number;
  status: string;
}

interface Activity {
  id: string;
  type: string;
  title: string;
  description: string | null;
  metadata: string | null;
  createdAt: string;
  deal?: { id: string; title: string } | null;
  property?: { id: string; address: string } | null;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  priority: string;
  completed: boolean;
}

interface EmailInteractionItem {
  id: string;
  direction: string;
  subject: string | null;
  snippet: string | null;
  occurredAt: string;
  externalEmail: string;
}

interface MeetingInteractionItem {
  id: string;
  title: string | null;
  startTime: string;
  endTime: string;
  status: string;
  externalEmail: string;
}

interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  type: string;
  source: string | null;
  notes: string | null;
  tags: string[];
  isFavorite: boolean;
  createdAt: string;
  activities: Activity[];
  deals: Deal[];
  properties: Property[];
  tasks: Task[];
  emailInteractions?: EmailInteractionItem[];
  meetingInteractions?: MeetingInteractionItem[];
  // Enrichment fields
  jobTitle?: string | null;
  companyName?: string | null;
  companyDomain?: string | null;
  industry?: string | null;
  linkedinUrl?: string | null;
  avatarUrl?: string | null;
  enrichedAt?: string | null;
  enrichmentSource?: string | null;
}

function formatLastContacted(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
  }
  const months = Math.floor(diffDays / 30);
  return `${months} month${months > 1 ? "s" : ""} ago`;
}

const sourceLabels: Record<string, string> = {
  zillow: "Zillow",
  website: "Website",
  referral: "Referral",
  social: "Social Media",
  cold_call: "Cold Call",
  open_house: "Open House",
  other: "Other",
};

const stageLabels: Record<string, string> = {
  new_lead: "New Lead",
  qualified: "Qualified",
  showing: "Showing",
  offer: "Offer",
  negotiation: "Negotiation",
  under_contract: "Under Contract",
  closed: "Closed",
};

interface AiAttributeChip {
  name: string;
  slug: string;
  value: string;
  confidence: number | null;
  outputType: string;
  options: string[] | null;
  computedAt: string;
}

interface ContactDetailViewProps {
  contact: Contact;
  relationshipScore?: RelationshipScoreResult;
  lastContactedDate?: string | null;
  aiAttributes?: AiAttributeChip[];
  currentUser?: { name: string; avatar: string | null };
}

export function ContactDetailView({
  contact,
  relationshipScore,
  lastContactedDate,
  aiAttributes = [],
  currentUser,
}: ContactDetailViewProps) {
  const { theme } = useColonyTheme();
  const router = useRouter();
  const [quickNote, setQuickNote] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [timelineTab, setTimelineTab] = useState<"activity" | "interactions" | "calls">("activity");
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Realtime presence
  const { others } = usePresence("contact", contact.id, {
    userName: currentUser?.name || "Unknown",
    userAvatar: currentUser?.avatar,
  });

  // Auto-refresh when another user makes changes
  useRealtimeUpdates("contact", contact.id, useCallback(() => {
    router.refresh();
  }, [router]));

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
    }
    if (showMoreMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showMoreMenu]);

  async function handleDelete() {
    setShowMoreMenu(false);
    if (!confirm(`Delete ${contact.name}? This can't be undone.`)) return;
    await deleteContact(contact.id);
    router.push("/browse/contacts");
  }

  const totalDealValue = contact.deals.reduce((sum, d) => sum + (d.value || 0), 0);
  const activeDeals = contact.deals.filter((d) => d.stage !== "closed");
  const initials = contact.name
    .split(" ")
    .map((n) => n.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const dividerColor = withAlpha(theme.text, 0.06);

  return (
    <div
      className="min-h-screen"
      style={{
        opacity: 0,
        animation: "fadeInPage 0.5s ease-out 0.05s forwards",
      }}
    >
      <style>{`
        @keyframes fadeInPage {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Top bar */}
      <div className="max-w-5xl mx-auto px-6 pt-6 flex items-center justify-between">
        <Link
          href="/browse/contacts"
          className="flex items-center gap-2 text-sm font-medium transition-colors"
          style={{ color: theme.textMuted }}
          onMouseEnter={(e) => (e.currentTarget.style.color = theme.accent)}
          onMouseLeave={(e) => (e.currentTarget.style.color = theme.textMuted)}
        >
          <ArrowLeft className="h-4 w-4" />
          Contacts
        </Link>
        <div className="flex items-center gap-1">
          <PresenceAvatars users={others} />
          {others.length > 0 && <div className="w-px h-5 mx-1" style={{ backgroundColor: withAlpha(theme.text, 0.1) }} />}
          <FavoriteContactButton
            contactId={contact.id}
            isFavorite={contact.isFavorite}
          />
          <ContactDialog contact={contact}>
            <button
              className="h-8 w-8 flex items-center justify-center rounded-lg transition-colors"
              style={{ color: theme.textMuted }}
              onMouseEnter={(e) => (e.currentTarget.style.color = theme.accent)}
              onMouseLeave={(e) => (e.currentTarget.style.color = theme.textMuted)}
            >
              <Pencil className="h-4 w-4" />
            </button>
          </ContactDialog>
          <div className="relative" ref={moreMenuRef}>
            <button
              className="h-8 w-8 flex items-center justify-center rounded-lg transition-colors"
              style={{ color: theme.textMuted }}
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              onMouseEnter={(e) => (e.currentTarget.style.color = theme.accent)}
              onMouseLeave={(e) => (e.currentTarget.style.color = theme.textMuted)}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {showMoreMenu && (
              <div
                className="absolute right-0 top-full mt-1 z-50 rounded-xl py-1 min-w-[140px] animate-in fade-in zoom-in-95 duration-150"
                style={{
                  backgroundColor: theme.bgGlow,
                  border: `1px solid ${withAlpha(theme.text, 0.1)}`,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                }}
              >
                <button
                  onClick={handleDelete}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors"
                  style={{ color: "#ef4444" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = withAlpha("#ef4444", 0.1);
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hero section */}
      <div className="max-w-5xl mx-auto px-6 pt-6 pb-4">
        <div className="flex items-start gap-5">
          {/* Avatar */}
          {contact.avatarUrl ? (
            <img
              src={contact.avatarUrl}
              alt={contact.name}
              className="h-14 w-14 rounded-full object-cover shrink-0"
            />
          ) : (
            <div
              className="h-14 w-14 rounded-full flex items-center justify-center text-lg font-medium shrink-0"
              style={{
                backgroundColor: withAlpha(theme.text, 0.08),
                color: withAlpha(theme.text, 0.5),
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {initials}
            </div>
          )}

          <div className="flex-1 min-w-0 pt-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1
                className="text-[26px] leading-tight font-semibold tracking-[-0.01em]"
                style={{
                  color: theme.text,
                  fontFamily: "'Manrope', var(--font-inter), sans-serif",
                }}
              >
                {contact.name}
              </h1>
              <span
                className="text-[11px] font-semibold uppercase tracking-[0.08em] px-2.5 py-1 rounded-full"
                style={{
                  backgroundColor: withAlpha(theme.accent, 0.15),
                  color: theme.accent,
                }}
              >
                {contact.type}
              </span>
              {relationshipScore && (
                <RelationshipScoreRing
                  score={relationshipScore.score}
                  color={relationshipScore.color}
                  label={relationshipScore.label}
                />
              )}
            </div>
            {lastContactedDate && (
              <p
                className="text-sm mt-1"
                style={{
                  color: theme.textMuted,
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Last contacted {formatLastContacted(lastContactedDate)}
              </p>
            )}
            {!lastContactedDate && (
              <p
                className="text-sm mt-1"
                style={{
                  color: theme.textMuted,
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                No interactions yet
              </p>
            )}

            <div
              className="flex items-center gap-4 mt-2 flex-wrap text-[14px]"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {contact.phone && (
                <a
                  href={`tel:${contact.phone}`}
                  className="transition-colors"
                  style={{ color: theme.textMuted }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = theme.text)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = theme.textMuted)}
                >
                  {contact.phone}
                </a>
              )}
              {contact.email && (
                <a
                  href={`mailto:${contact.email}`}
                  className="transition-colors"
                  style={{ color: theme.textMuted }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = theme.text)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = theme.textMuted)}
                >
                  {contact.email}
                </a>
              )}
              {contact.source && (
                <span style={{ color: withAlpha(theme.text, 0.35) }}>
                  via {sourceLabels[contact.source] || contact.source}
                </span>
              )}
              {activeDeals.length > 0 && (
                <span style={{ color: theme.textMuted }}>
                  · {activeDeals.length} active deal{activeDeals.length !== 1 ? "s" : ""}
                  {totalDealValue > 0 && ` · ${formatCurrency(totalDealValue)}`}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* AI Attribute Chips */}
      {aiAttributes.length > 0 && (
        <div className="max-w-5xl mx-auto px-6 pb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Sparkles className="h-3.5 w-3.5" style={{ color: withAlpha(theme.accent, 0.5) }} />
            {aiAttributes.map((attr) => (
              <AiAttributeBadge key={attr.slug} attr={attr} theme={theme} />
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="max-w-5xl mx-auto px-6 pb-6">
        <div className="flex items-center gap-2">
          <ActivityDialog contactId={contact.id} contactName={contact.name} defaultType="call">
            <ActionButton theme={theme} icon={<Phone className="h-4 w-4" />} label="Call" raised={"none"} pressed={"none"} />
          </ActivityDialog>
          {contact.email && (
            <SendEmailDialog contactEmail={contact.email} contactId={contact.id} contactName={contact.name}>
              <ActionButton theme={theme} icon={<Mail className="h-4 w-4" />} label="Email" raised={"none"} pressed={"none"} />
            </SendEmailDialog>
          )}
          <ActivityDialog contactId={contact.id} contactName={contact.name} defaultType="note">
            <ActionButton theme={theme} icon={<FileText className="h-4 w-4" />} label="Note" raised={"none"} pressed={"none"} />
          </ActivityDialog>
          <ActivityDialog contactId={contact.id} contactName={contact.name} defaultType="meeting">
            <ActionButton theme={theme} icon={<Users className="h-4 w-4" />} label="Meeting" raised={"none"} pressed={"none"} />
          </ActivityDialog>
        </div>
      </div>

      {/* Quick note */}
      <div className="max-w-5xl mx-auto px-6 pb-6">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!quickNote.trim() || isSavingNote) return;
            setIsSavingNote(true);
            try {
              await createQuickNote({
                text: quickNote.trim(),
                contactId: contact.id,
              });
              setQuickNote("");
              window.location.reload();
            } catch {
              // silent fail
            }
            setIsSavingNote(false);
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            placeholder="Add a quick note..."
            value={quickNote}
            onChange={(e) => setQuickNote(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm bg-transparent outline-none"
            style={{
              border: `1px solid ${withAlpha(theme.text, 0.1)}`,
              color: theme.text,
              fontFamily: "'DM Sans', sans-serif",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = withAlpha(theme.accent, 0.3);
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = withAlpha(theme.text, 0.1);
            }}
          />
          {quickNote.trim() && (
            <button
              type="submit"
              disabled={isSavingNote}
              className="px-3 py-2.5 rounded-xl transition-all"
              style={{
                backgroundColor: theme.accent,
                color: "#fff",
              }}
            >
              <Send className="h-4 w-4" />
            </button>
          )}
        </form>
      </div>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-6">
        <div style={{ borderBottom: `1px solid ${dividerColor}` }} />
      </div>

      {/* Content: Timeline + Sidebar */}
      <div className="max-w-5xl mx-auto px-6 py-6">
        <div className="flex gap-8 flex-col xl:flex-row">
          {/* Timeline (main column) */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-1 rounded-lg p-0.5" style={{ backgroundColor: withAlpha(theme.text, 0.05) }}>
                <button
                  className="text-[12px] font-semibold uppercase tracking-[0.06em] px-3 py-1.5 rounded-md transition-all"
                  style={{
                    color: timelineTab === "activity" ? theme.text : theme.textMuted,
                    backgroundColor: timelineTab === "activity" ? withAlpha(theme.accent, 0.12) : "transparent",
                  }}
                  onClick={() => setTimelineTab("activity")}
                >
                  Timeline
                </button>
                <button
                  className="text-[12px] font-semibold uppercase tracking-[0.06em] px-3 py-1.5 rounded-md transition-all"
                  style={{
                    color: timelineTab === "interactions" ? theme.text : theme.textMuted,
                    backgroundColor: timelineTab === "interactions" ? withAlpha(theme.accent, 0.12) : "transparent",
                  }}
                  onClick={() => setTimelineTab("interactions")}
                >
                  Interactions
                  {((contact.emailInteractions?.length ?? 0) + (contact.meetingInteractions?.length ?? 0)) > 0 && (
                    <span className="ml-1.5 font-normal" style={{ color: withAlpha(theme.text, 0.4) }}>
                      {(contact.emailInteractions?.length ?? 0) + (contact.meetingInteractions?.length ?? 0)}
                    </span>
                  )}
                </button>
                <button
                  className="text-[12px] font-semibold uppercase tracking-[0.06em] px-3 py-1.5 rounded-md transition-all"
                  style={{
                    color: timelineTab === "calls" ? theme.text : theme.textMuted,
                    backgroundColor: timelineTab === "calls" ? withAlpha(theme.accent, 0.12) : "transparent",
                  }}
                  onClick={() => setTimelineTab("calls")}
                >
                  Calls
                </button>
              </div>
              {timelineTab === "activity" && (
                <ActivityDialog contactId={contact.id} contactName={contact.name}>
                  <button
                    className="flex items-center gap-1.5 text-xs font-medium transition-colors"
                    style={{ color: theme.textMuted }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = theme.accent)}
                    onMouseLeave={(e) => (e.currentTarget.style.color = theme.textMuted)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add
                  </button>
                </ActivityDialog>
              )}
            </div>

            {timelineTab === "activity" ? (
              <>
                {contact.activities.length === 0 && contact.tasks.length === 0 ? (
                  <div className="py-16 text-center">
                    <p className="text-sm" style={{ color: theme.textMuted }}>
                      No activity yet. Start by adding a note or scheduling a follow-up.
                    </p>
                  </div>
                ) : (
                  <ThemedActivityTimeline activities={contact.activities} />
                )}
              </>
            ) : timelineTab === "interactions" ? (
              <InteractionTimeline
                emails={contact.emailInteractions ?? []}
                meetings={contact.meetingInteractions ?? []}
                theme={theme}
              />
            ) : (
              <CallHistoryTab contactId={contact.id} theme={theme} />
            )}
          </div>

          {/* Sidebar */}
          <div className="w-full xl:w-[300px] shrink-0 space-y-8">
            {/* Enriched Profile */}
            {(contact.jobTitle || contact.companyName || contact.linkedinUrl || contact.industry) && (
              <SidebarSection title="Profile" theme={theme} divider={dividerColor}>
                <div className="space-y-2.5">
                  {contact.jobTitle && (
                    <div className="flex items-center gap-2.5">
                      <Briefcase className="h-3.5 w-3.5 shrink-0" style={{ color: theme.textMuted }} />
                      <span className="text-sm" style={{ color: theme.textSoft }}>{contact.jobTitle}</span>
                    </div>
                  )}
                  {contact.companyName && (
                    <div className="flex items-center gap-2.5">
                      <Building2 className="h-3.5 w-3.5 shrink-0" style={{ color: theme.textMuted }} />
                      <span className="text-sm" style={{ color: theme.textSoft }}>
                        {contact.companyName}
                        {contact.companyDomain && (
                          <span style={{ color: withAlpha(theme.text, 0.3) }}> · {contact.companyDomain}</span>
                        )}
                      </span>
                    </div>
                  )}
                  {contact.industry && (
                    <div className="flex items-center gap-2.5">
                      <Globe className="h-3.5 w-3.5 shrink-0" style={{ color: theme.textMuted }} />
                      <span className="text-sm" style={{ color: theme.textSoft }}>{contact.industry}</span>
                    </div>
                  )}
                  {contact.linkedinUrl && (
                    <a
                      href={contact.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 transition-colors"
                      style={{ color: theme.textMuted }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#0a66c2")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = theme.textMuted)}
                    >
                      <Linkedin className="h-3.5 w-3.5 shrink-0" />
                      <span className="text-sm">LinkedIn Profile</span>
                    </a>
                  )}
                  {contact.enrichedAt && (
                    <div className="flex items-center justify-between pt-1">
                      <p className="text-[10px]" style={{ color: withAlpha(theme.text, 0.25) }}>
                        Enriched via {contact.enrichmentSource || "unknown"} on{" "}
                        {new Date(contact.enrichedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                      <button
                        onClick={async () => {
                          try {
                            await fetch("/api/enrichment/trigger", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ contactId: contact.id }),
                            });
                            await fetch("/api/enrichment/process", { method: "POST" });
                            window.location.reload();
                          } catch {}
                        }}
                        className="flex items-center gap-1 text-[10px] transition-colors"
                        style={{ color: theme.textMuted }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = theme.accent)}
                        onMouseLeave={(e) => (e.currentTarget.style.color = theme.textMuted)}
                        title="Re-enrich contact"
                      >
                        <RefreshCw className="h-3 w-3" />
                        Re-enrich
                      </button>
                    </div>
                  )}
                </div>
              </SidebarSection>
            )}

            {/* Notes */}
            {contact.notes && (
              <SidebarSection title="Notes" theme={theme} divider={dividerColor}>
                <p
                  className="text-sm whitespace-pre-wrap leading-relaxed"
                  style={{ color: theme.textSoft }}
                >
                  {contact.notes}
                </p>
              </SidebarSection>
            )}

            {/* Tasks */}
            <SidebarSection title="Tasks" theme={theme} divider={dividerColor} count={contact.tasks.filter((t) => !t.completed).length}>
              <ThemedContactTasks contactId={contact.id} tasks={contact.tasks} />
            </SidebarSection>

            {/* Deals */}
            <SidebarSection title="Deals" theme={theme} divider={dividerColor} count={contact.deals.length}>
              {contact.deals.length === 0 ? (
                <p className="text-sm py-2" style={{ color: theme.textMuted }}>
                  No deals yet
                </p>
              ) : (
                <div className="space-y-1">
                  {contact.deals.map((deal) => (
                    <Link
                      key={deal.id}
                      href={`/deals/${deal.id}`}
                      className="block py-2.5 px-3 -mx-3 rounded-lg transition-colors"
                      style={{ color: theme.text }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = withAlpha(theme.text, 0.04))}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{deal.title}</p>
                          <p className="text-xs mt-0.5" style={{ color: theme.textMuted }}>
                            {stageLabels[deal.stage] || (deal.stage ?? "").replace("_", " ")}
                          </p>
                        </div>
                        {deal.value != null && deal.value > 0 && (
                          <span className="text-sm font-medium ml-3 shrink-0">
                            {formatCurrency(deal.value)}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </SidebarSection>

            {/* Properties */}
            {contact.properties.length > 0 && (
              <SidebarSection title="Properties" theme={theme} divider={dividerColor} count={contact.properties.length}>
                <div className="space-y-1">
                  {contact.properties.map((property) => (
                    <Link
                      key={property.id}
                      href={`/properties/${property.id}`}
                      className="block py-2.5 px-3 -mx-3 rounded-lg transition-colors"
                      style={{ color: theme.text }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = withAlpha(theme.text, 0.04))}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{property.address}</p>
                          <p className="text-xs mt-0.5" style={{ color: theme.textMuted }}>
                            {property.city}
                            {property.state && `, ${property.state}`}
                          </p>
                        </div>
                        <div className="text-right ml-3 shrink-0">
                          <p className="text-sm font-medium">{formatCurrency(property.price)}</p>
                          <p className="text-xs capitalize mt-0.5" style={{ color: theme.textMuted }}>
                            {(property.status ?? "").replace("_", " ")}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </SidebarSection>
            )}

            {/* Tags */}
            {contact.tags.length > 0 && (
              <SidebarSection title="Tags" theme={theme} divider={dividerColor}>
                <div className="flex flex-wrap gap-2">
                  {contact.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2.5 py-1 rounded-full"
                      style={{
                        backgroundColor: withAlpha(theme.accent, 0.12),
                        color: theme.accent,
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </SidebarSection>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

import type { ColonyTheme } from "@/lib/themes";

const ActionButton = forwardRef<
  HTMLButtonElement,
  {
    theme: ColonyTheme;
    icon: React.ReactNode;
    label: string;
    raised: string;
    pressed: string;
    onClick?: () => void;
  }
>(function ActionButton({ theme, icon, label, raised, pressed, onClick, ...rest }, ref) {
  const [isPressed, setIsPressed] = useState(false);
  return (
    <button
      ref={ref}
      onClick={onClick}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 shrink-0 cursor-pointer"
      style={{
        backgroundColor: theme.bgGlow,
        boxShadow: isPressed ? pressed : raised,
        color: theme.textMuted,
      }}
      {...rest}
    >
      <span style={{ color: theme.accent }}>{icon}</span>
      {label}
    </button>
  );
});

function getAttrChipColor(attr: AiAttributeChip): string {
  if (attr.outputType === "select") {
    const val = attr.value.toLowerCase();
    if (val === "hot" || val === "tier 1") return "#22c55e";
    if (val === "warm" || val === "tier 2") return "#f59e0b";
    if (val === "cold" || val === "tier 3") return "#64748b";
  }
  if (attr.outputType === "number") {
    const num = parseFloat(attr.value);
    if (num >= 8) return "#22c55e";
    if (num >= 5) return "#f59e0b";
    return "#64748b";
  }
  return "#8b5cf6";
}

function AiAttributeBadge({ attr, theme }: { attr: AiAttributeChip; theme: ColonyTheme }) {
  const chipColor = getAttrChipColor(attr);
  const displayValue = attr.outputType === "text"
    ? (attr.value.length > 60 ? attr.value.slice(0, 57) + "..." : attr.value)
    : attr.value;

  return (
    <div
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium"
      style={{
        backgroundColor: withAlpha(chipColor, 0.12),
        color: chipColor,
        border: `1px solid ${withAlpha(chipColor, 0.2)}`,
      }}
      title={`${attr.name}: ${attr.value}${attr.confidence != null ? ` (${Math.round(attr.confidence * 100)}% confidence)` : ""}`}
    >
      <span style={{ color: withAlpha(theme.textMuted, 0.7), fontSize: "10px" }}>{attr.name}:</span>
      <span>{displayValue}</span>
    </div>
  );
}

function InteractionTimeline({
  emails,
  meetings,
  theme,
}: {
  emails: EmailInteractionItem[];
  meetings: MeetingInteractionItem[];
  theme: ColonyTheme;
}) {
  // Merge and sort chronologically (newest first)
  type TimelineEntry =
    | { kind: "email"; date: Date; data: EmailInteractionItem }
    | { kind: "meeting"; date: Date; data: MeetingInteractionItem };

  const timeline: TimelineEntry[] = [
    ...emails.map((e) => ({ kind: "email" as const, date: new Date(e.occurredAt), data: e })),
    ...meetings.map((m) => ({ kind: "meeting" as const, date: new Date(m.startTime), data: m })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  if (timeline.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm" style={{ color: theme.textMuted }}>
          No email or calendar interactions synced yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {timeline.map((entry) => {
        const isEmail = entry.kind === "email";
        const e = isEmail ? (entry.data as EmailInteractionItem) : null;
        const m = !isEmail ? (entry.data as MeetingInteractionItem) : null;
        const isInbound = e?.direction === "inbound";

        return (
          <div
            key={isEmail ? `e-${e!.id}` : `m-${m!.id}`}
            className="flex items-start gap-3 py-3 px-3 -mx-3 rounded-lg transition-colors"
            onMouseEnter={(el) => (el.currentTarget.style.backgroundColor = withAlpha(theme.text, 0.03))}
            onMouseLeave={(el) => (el.currentTarget.style.backgroundColor = "transparent")}
          >
            {/* Direction indicator */}
            <div
              className="mt-1 h-7 w-7 rounded-full flex items-center justify-center shrink-0"
              style={{
                backgroundColor: isEmail
                  ? withAlpha(isInbound ? "#3b82f6" : theme.accent, 0.15)
                  : withAlpha("#8b5cf6", 0.15),
              }}
            >
              {isEmail ? (
                <Mail className="h-3.5 w-3.5" style={{ color: isInbound ? "#3b82f6" : theme.accent }} />
              ) : (
                <Users className="h-3.5 w-3.5" style={{ color: "#8b5cf6" }} />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate" style={{ color: theme.text }}>
                  {isEmail
                    ? e!.subject || "(no subject)"
                    : m!.title || "Meeting"}
                </span>
                {isEmail && (
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0"
                    style={{
                      backgroundColor: withAlpha(isInbound ? "#3b82f6" : theme.accent, 0.1),
                      color: isInbound ? "#3b82f6" : theme.accent,
                    }}
                  >
                    {isInbound ? "IN" : "OUT"}
                  </span>
                )}
              </div>
              {isEmail && e!.snippet && (
                <p className="text-xs mt-0.5 truncate" style={{ color: theme.textMuted }}>
                  {e!.snippet}
                </p>
              )}
              <p className="text-[11px] mt-1" style={{ color: withAlpha(theme.text, 0.35) }}>
                {entry.date.toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: entry.date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
                })}
                {" · "}
                {entry.date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SidebarSection({
  title,
  theme,
  divider,
  count,
  children,
}: {
  title: string;
  theme: ColonyTheme;
  divider: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <div style={{ borderBottom: `1px solid ${divider}` }} className="pb-6">
      <h3
        className="text-[12px] font-semibold uppercase tracking-[0.06em] mb-4"
        style={{ color: theme.textMuted }}
      >
        {title}
        {count != null && count > 0 && (
          <span className="ml-1.5 font-normal" style={{ color: withAlpha(theme.text, 0.3) }}>
            {count}
          </span>
        )}
      </h3>
      {children}
    </div>
  );
}

// ============================================================================
// Call History Tab
// ============================================================================

interface CallRecordingItem {
  id: string;
  recordingUrl: string;
  duration: number;
  direction: string;
  status: string;
  summary: string | null;
  sentiment: string | null;
  actionItems: { text: string; priority?: string; completed?: boolean }[] | null;
  occurredAt: string;
}

function CallHistoryTab({ contactId, theme }: { contactId: string; theme: ColonyTheme }) {
  const [recordings, setRecordings] = useState<CallRecordingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/calls/recordings?contactId=${contactId}`)
      .then((r) => r.json())
      .then((data) => setRecordings(data))
      .finally(() => setLoading(false));
  }, [contactId]);

  if (loading) {
    return (
      <div className="py-12 text-center text-sm" style={{ color: theme.textMuted }}>
        Loading call history...
      </div>
    );
  }

  if (recordings.length === 0) {
    return (
      <div className="py-16 text-center">
        <Phone className="h-8 w-8 mx-auto mb-2" style={{ color: theme.textMuted }} />
        <p className="text-sm" style={{ color: theme.textMuted }}>
          No call recordings yet
        </p>
      </div>
    );
  }

  const sentimentColors: Record<string, { bg: string; text: string }> = {
    positive: { bg: "rgba(16,185,129,0.15)", text: "#10b981" },
    neutral: { bg: "rgba(156,163,175,0.15)", text: "#9ca3af" },
    negative: { bg: "rgba(239,68,68,0.15)", text: "#ef4444" },
  };

  return (
    <div className="space-y-3">
      {recordings.map((rec) => {
        const isExpanded = expanded === rec.id;
        const mins = Math.floor(rec.duration / 60);
        const secs = rec.duration % 60;
        const durationStr = `${mins}:${secs.toString().padStart(2, "0")}`;
        const sc = rec.sentiment ? sentimentColors[rec.sentiment] : null;

        return (
          <div
            key={rec.id}
            className="rounded-xl border overflow-hidden transition-all"
            style={{
              borderColor: withAlpha(theme.text, 0.06),
              backgroundColor: withAlpha(theme.text, 0.02),
            }}
          >
            {/* Header row */}
            <button
              className="w-full flex items-center gap-3 px-4 py-3 text-left"
              onClick={() => setExpanded(isExpanded ? null : rec.id)}
            >
              <div
                className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: withAlpha(theme.accent, 0.15) }}
              >
                <Phone className="h-3.5 w-3.5" style={{ color: theme.accent }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium" style={{ color: theme.text }}>
                    {rec.direction === "inbound" ? "Inbound" : "Outbound"} Call
                  </span>
                  <span className="text-[10px]" style={{ color: theme.textMuted }}>
                    {durationStr}
                  </span>
                  {sc && (
                    <span
                      className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                      style={{ backgroundColor: sc.bg, color: sc.text }}
                    >
                      {rec.sentiment}
                    </span>
                  )}
                  {rec.status !== "summarized" && (
                    <span
                      className="text-[9px] font-medium px-1.5 py-0.5 rounded-full"
                      style={{
                        backgroundColor: withAlpha(theme.textMuted, 0.15),
                        color: theme.textMuted,
                      }}
                    >
                      {rec.status}
                    </span>
                  )}
                </div>
                {rec.summary && (
                  <p
                    className="text-xs mt-0.5 truncate"
                    style={{ color: theme.textMuted }}
                  >
                    {rec.summary}
                  </p>
                )}
              </div>
              <span className="text-[10px] shrink-0" style={{ color: theme.textMuted }}>
                {new Date(rec.occurredAt).toLocaleDateString()}
              </span>
            </button>

            {/* Expanded content */}
            {isExpanded && (
              <div
                className="px-4 pb-4 space-y-3"
                style={{ borderTop: `1px solid ${withAlpha(theme.text, 0.06)}` }}
              >
                {/* Audio player */}
                <div className="pt-3">
                  <audio
                    controls
                    src={rec.recordingUrl}
                    className="w-full h-8"
                    style={{ filter: "invert(0.85)" }}
                  />
                </div>

                {/* Summary */}
                {rec.summary && (
                  <div>
                    <h4
                      className="text-[10px] font-semibold uppercase tracking-wider mb-1"
                      style={{ color: theme.textMuted }}
                    >
                      Summary
                    </h4>
                    <p className="text-xs leading-relaxed" style={{ color: theme.text }}>
                      {rec.summary}
                    </p>
                  </div>
                )}

                {/* Action Items */}
                {rec.actionItems && rec.actionItems.length > 0 && (
                  <div>
                    <h4
                      className="text-[10px] font-semibold uppercase tracking-wider mb-1.5"
                      style={{ color: theme.textMuted }}
                    >
                      Action Items
                    </h4>
                    <ul className="space-y-1">
                      {(rec.actionItems as { text: string; priority?: string }[]).map(
                        (item, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-xs"
                            style={{ color: theme.text }}
                          >
                            <span
                              className="inline-block h-1.5 w-1.5 rounded-full mt-1.5 shrink-0"
                              style={{
                                backgroundColor:
                                  item.priority === "high"
                                    ? "#ef4444"
                                    : item.priority === "medium"
                                      ? "#f59e0b"
                                      : "#10b981",
                              }}
                            />
                            {item.text}
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
