"use client";

import { useState, forwardRef } from "react";
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
  MessageSquare,
  CheckSquare,
  Plus,
  Send,
} from "lucide-react";
import { RelationshipScoreRing } from "@/components/contacts/RelationshipScoreRing";
import type { RelationshipScoreResult } from "@/lib/relationship-score";
import { createQuickNote } from "@/components/quick-capture/actions";

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

interface ContactDetailViewProps {
  contact: Contact;
  relationshipScore?: RelationshipScoreResult;
  lastContactedDate?: string | null;
}

export function ContactDetailView({
  contact,
  relationshipScore,
  lastContactedDate,
}: ContactDetailViewProps) {
  const { theme } = useColonyTheme();
  const [quickNote, setQuickNote] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);

  const totalDealValue = contact.deals.reduce((sum, d) => sum + (d.value || 0), 0);
  const activeDeals = contact.deals.filter((d) => d.stage !== "closed");
  const initials = contact.name
    .split(" ")
    .map((n) => n.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const dividerColor = withAlpha(theme.text, 0.06);
  const neumorphicRaised = `4px 4px 8px rgba(0,0,0,0.4), -4px -4px 8px rgba(255,255,255,0.04)`;
  const neumorphicPressed = `inset 3px 3px 6px rgba(0,0,0,0.4), inset -3px -3px 6px rgba(255,255,255,0.04)`;

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
          <button
            className="h-8 w-8 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: theme.textMuted }}
            onMouseEnter={(e) => (e.currentTarget.style.color = theme.accent)}
            onMouseLeave={(e) => (e.currentTarget.style.color = theme.textMuted)}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Hero section */}
      <div className="max-w-5xl mx-auto px-6 pt-8 pb-6">
        <div className="flex items-start gap-5">
          {/* Avatar */}
          <div
            className="h-20 w-20 rounded-full flex items-center justify-center text-2xl font-medium shrink-0"
            style={{
              background: `linear-gradient(135deg, ${withAlpha(theme.accent, 0.20)}, ${withAlpha(theme.accent, 0.08)})`,
              color: theme.accent,
              border: `2px solid ${withAlpha(theme.accent, 0.3)}`,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {initials}
          </div>

          <div className="flex-1 min-w-0 pt-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1
                className="text-[32px] leading-tight font-semibold tracking-[-0.01em]"
                style={{
                  color: theme.text,
                  fontFamily: "'Spectral', serif",
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

      {/* Action buttons */}
      <div className="max-w-5xl mx-auto px-6 pb-8">
        <div className="flex items-center gap-3 overflow-x-auto pb-1 -mb-1">
          <ActivityDialog contactId={contact.id} contactName={contact.name} defaultType="call">
            <ActionButton theme={theme} icon={<Phone className="h-4 w-4" />} label="Call" raised={neumorphicRaised} pressed={neumorphicPressed} />
          </ActivityDialog>
          {contact.email && (
            <SendEmailDialog contactEmail={contact.email} contactId={contact.id} contactName={contact.name}>
              <ActionButton theme={theme} icon={<Mail className="h-4 w-4" />} label="Email" raised={neumorphicRaised} pressed={neumorphicPressed} />
            </SendEmailDialog>
          )}
          <ActivityDialog contactId={contact.id} contactName={contact.name} defaultType="meeting">
            <ActionButton theme={theme} icon={<Users className="h-4 w-4" />} label="Meeting" raised={neumorphicRaised} pressed={neumorphicPressed} />
          </ActivityDialog>
          <ActivityDialog contactId={contact.id} contactName={contact.name} defaultType="note">
            <ActionButton theme={theme} icon={<FileText className="h-4 w-4" />} label="Note" raised={neumorphicRaised} pressed={neumorphicPressed} />
          </ActivityDialog>
          <ActivityDialog contactId={contact.id} contactName={contact.name} defaultType="call">
            <ActionButton theme={theme} icon={<MessageSquare className="h-4 w-4" />} label="Text" raised={neumorphicRaised} pressed={neumorphicPressed} />
          </ActivityDialog>
          <ActionButton theme={theme} icon={<CheckSquare className="h-4 w-4" />} label="Task" raised={neumorphicRaised} pressed={neumorphicPressed} />
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
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex gap-8 flex-col xl:flex-row">
          {/* Timeline (main column) */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-6">
              <h2
                className="text-[13px] font-semibold uppercase tracking-[0.06em]"
                style={{ color: theme.textMuted }}
              >
                Timeline
              </h2>
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
            </div>

            {contact.activities.length === 0 && contact.tasks.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-sm" style={{ color: theme.textMuted }}>
                  No activity yet. Start by adding a note or scheduling a follow-up.
                </p>
              </div>
            ) : (
              <ThemedActivityTimeline activities={contact.activities} />
            )}
          </div>

          {/* Sidebar */}
          <div className="w-full xl:w-[300px] shrink-0 space-y-8">
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
