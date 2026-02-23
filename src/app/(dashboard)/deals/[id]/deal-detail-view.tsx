"use client";

import { useState } from "react";
import Link from "next/link";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import { ActivityTimeline } from "@/components/activities/activity-timeline";
import { ActivityDialog } from "@/components/activities/activity-dialog";
import { DealDialog } from "@/components/deals/deal-dialog";
import { DocumentList } from "@/components/documents/document-list";
import { DocumentUploader } from "@/components/documents/document-uploader";
import { RelationshipScoreRing } from "@/components/contacts/RelationshipScoreRing";
import { createQuickNote } from "@/components/quick-capture/actions";
import { formatCurrency, formatDistanceToNow } from "@/lib/date-utils";
import type { RelationshipScoreResult } from "@/lib/relationship-score";
import {
  ArrowLeft,
  Pencil,
  DollarSign,
  User,
  Building2,
  Calendar,
  TrendingUp,
  ClipboardList,
  Plus,
  Send,
  ArrowRight,
} from "lucide-react";

interface Activity {
  id: string;
  type: string;
  title: string;
  description: string | null;
  metadata: string | null;
  createdAt: string;
  contact?: { id: string; name: string } | null;
}

interface Task {
  id: string;
  title: string;
  dueDate: string | null;
}

interface Deal {
  id: string;
  title: string;
  stage: string;
  value: number | null;
  notes: string | null;
  isFavorite: boolean;
  expectedCloseDate: string | null;
  createdAt: string;
  updatedAt: string;
  contact: { id: string; name: string; email: string | null; phone: string | null } | null;
  property: { id: string; address: string; city: string; state: string | null } | null;
  documents: { id: string; name: string; type: string; url: string; size: number | null; createdAt: string }[];
  tasks: Task[];
  activities: Activity[];
}

interface DealDetailViewProps {
  deal: Deal;
  contacts: { id: string; name: string }[];
  properties: { id: string; address: string; city: string }[];
  stageHistory: { stage: string; date: string }[];
  contactScore?: RelationshipScoreResult | null;
}

const stageLabels: Record<string, string> = {
  new_lead: "New Lead",
  qualified: "Qualified",
  showing: "Showing",
  offer: "Offer",
  negotiation: "Negotiation",
  closed: "Closed",
};

const STAGES = ["new_lead", "qualified", "showing", "offer", "negotiation", "closed"];

export function DealDetailView({
  deal,
  contacts,
  properties,
  stageHistory,
  contactScore,
}: DealDetailViewProps) {
  const { theme } = useColonyTheme();
  const [quickNote, setQuickNote] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);

  const neumorphicRaised = `4px 4px 8px rgba(0,0,0,0.4), -4px -4px 8px rgba(255,255,255,0.04)`;
  const dividerColor = withAlpha(theme.text, 0.06);
  const currentStageIndex = STAGES.indexOf(deal.stage);

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
          href="/browse/deals"
          className="flex items-center gap-2 text-sm font-medium transition-colors"
          style={{ color: theme.textMuted }}
          onMouseEnter={(e) => (e.currentTarget.style.color = theme.accent)}
          onMouseLeave={(e) => (e.currentTarget.style.color = theme.textMuted)}
        >
          <ArrowLeft className="h-4 w-4" />
          Deals
        </Link>
        <DealDialog deal={deal} contacts={contacts} properties={properties}>
          <button
            className="h-8 w-8 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: theme.textMuted }}
            onMouseEnter={(e) => (e.currentTarget.style.color = theme.accent)}
            onMouseLeave={(e) => (e.currentTarget.style.color = theme.textMuted)}
          >
            <Pencil className="h-4 w-4" />
          </button>
        </DealDialog>
      </div>

      {/* Hero section */}
      <div className="max-w-5xl mx-auto px-6 pt-8 pb-6">
        <div className="flex items-start gap-5">
          <div
            className="h-16 w-16 rounded-xl flex items-center justify-center text-xl font-medium shrink-0"
            style={{
              background: `linear-gradient(135deg, ${withAlpha(theme.accent, 0.20)}, ${withAlpha(theme.accent, 0.08)})`,
              color: theme.accent,
            }}
          >
            <DollarSign className="h-7 w-7" />
          </div>

          <div className="flex-1 min-w-0 pt-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1
                className="text-[28px] leading-tight font-semibold tracking-[-0.01em]"
                style={{ color: theme.text, fontFamily: "'Spectral', serif" }}
              >
                {deal.title}
              </h1>
              <span
                className="text-[11px] font-semibold uppercase tracking-[0.08em] px-2.5 py-1 rounded-full"
                style={{
                  backgroundColor: withAlpha(theme.accent, 0.15),
                  color: theme.accent,
                }}
              >
                {stageLabels[deal.stage] || deal.stage}
              </span>
            </div>

            <div
              className="flex items-center gap-4 mt-2 flex-wrap text-[14px]"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {deal.value && (
                <span className="font-semibold" style={{ color: theme.accent }}>
                  {formatCurrency(deal.value)}
                </span>
              )}
              {deal.contact && (
                <Link
                  href={`/contacts/${deal.contact.id}`}
                  className="flex items-center gap-1 transition-colors"
                  style={{ color: theme.textMuted }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = theme.accent)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = theme.textMuted)}
                >
                  <User className="h-3.5 w-3.5" />
                  {deal.contact.name}
                  {contactScore && (
                    <RelationshipScoreRing
                      score={contactScore.score}
                      color={contactScore.color}
                      label={contactScore.label}
                      size={28}
                    />
                  )}
                </Link>
              )}
              {deal.property && (
                <Link
                  href={`/properties/${deal.property.id}`}
                  className="flex items-center gap-1 transition-colors"
                  style={{ color: theme.textMuted }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = theme.accent)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = theme.textMuted)}
                >
                  <Building2 className="h-3.5 w-3.5" />
                  {deal.property.address}
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stage progress bar */}
      <div className="max-w-5xl mx-auto px-6 pb-6">
        <div className="flex items-center gap-1">
          {STAGES.map((stage, i) => (
            <div key={stage} className="flex-1 flex items-center gap-1">
              <div
                className="h-1.5 rounded-full flex-1 transition-all"
                style={{
                  backgroundColor:
                    i <= currentStageIndex
                      ? theme.accent
                      : withAlpha(theme.text, 0.1),
                }}
              />
              {i < STAGES.length - 1 && (
                <ArrowRight
                  className="h-3 w-3 shrink-0"
                  style={{
                    color:
                      i < currentStageIndex
                        ? theme.accent
                        : withAlpha(theme.text, 0.15),
                  }}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-1">
          {STAGES.map((stage, i) => (
            <span
              key={stage}
              className="text-[9px] uppercase tracking-wider"
              style={{
                color:
                  i <= currentStageIndex
                    ? theme.accent
                    : withAlpha(theme.text, 0.3),
              }}
            >
              {stageLabels[stage]?.split(" ")[0]}
            </span>
          ))}
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
                contactId: deal.contact?.id,
              });
              setQuickNote("");
              window.location.reload();
            } catch { /* silent */ }
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
          />
          {quickNote.trim() && (
            <button
              type="submit"
              disabled={isSavingNote}
              className="px-3 py-2.5 rounded-xl"
              style={{ backgroundColor: theme.accent, color: "#fff" }}
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

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex gap-8 flex-col xl:flex-row">
          {/* Main column */}
          <div className="flex-1 min-w-0 space-y-8">
            {/* Stage History Timeline */}
            {stageHistory.length > 0 && (
              <div>
                <h2
                  className="text-xs font-medium uppercase tracking-widest mb-4"
                  style={{ color: theme.textMuted }}
                >
                  Stage History
                </h2>
                <div className="space-y-3">
                  {stageHistory.map((entry, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: theme.accent }}
                      />
                      <span className="text-sm" style={{ color: theme.text }}>
                        {stageLabels[entry.stage] || entry.stage}
                      </span>
                      <span className="text-xs" style={{ color: theme.textMuted }}>
                        {new Date(entry.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {deal.notes && (
              <div>
                <h2
                  className="text-xs font-medium uppercase tracking-widest mb-4"
                  style={{ color: theme.textMuted }}
                >
                  Notes
                </h2>
                <p
                  className="text-sm whitespace-pre-wrap"
                  style={{ color: theme.text, opacity: 0.8 }}
                >
                  {deal.notes}
                </p>
              </div>
            )}

            {/* Activity Timeline */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2
                  className="text-xs font-medium uppercase tracking-widest"
                  style={{ color: theme.textMuted }}
                >
                  Activity
                </h2>
                {deal.contact && (
                  <ActivityDialog
                    contactId={deal.contact.id}
                    contactName={deal.contact.name}
                  >
                    <button
                      className="flex items-center gap-1 text-xs transition-colors"
                      style={{ color: theme.accent }}
                    >
                      <Plus className="h-3 w-3" />
                      Log Activity
                    </button>
                  </ActivityDialog>
                )}
              </div>
              {deal.activities.length === 0 ? (
                <p className="text-sm" style={{ color: theme.textMuted }}>
                  No activities logged yet
                </p>
              ) : (
                <ActivityTimeline activities={deal.activities as never} />
              )}
            </div>

            {/* Documents */}
            <DocumentList documents={deal.documents as never} title="Documents" />
            <DocumentUploader dealId={deal.id} />
          </div>

          {/* Sidebar */}
          <div className="w-full xl:w-72 shrink-0 space-y-6">
            {/* Contact */}
            {deal.contact && (
              <div
                className="p-4 rounded-xl"
                style={{ backgroundColor: theme.bgGlow, boxShadow: neumorphicRaised }}
              >
                <p className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: theme.textMuted }}>
                  Contact
                </p>
                <Link href={`/contacts/${deal.contact.id}`} className="flex items-center gap-3 group">
                  <div
                    className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-medium"
                    style={{
                      background: `linear-gradient(135deg, ${withAlpha(theme.accent, 0.2)}, ${withAlpha(theme.accent, 0.08)})`,
                      color: theme.accent,
                    }}
                  >
                    {deal.contact.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium group-hover:underline" style={{ color: theme.text }}>
                      {deal.contact.name}
                    </p>
                    {deal.contact.email && (
                      <p className="text-xs" style={{ color: theme.textMuted }}>{deal.contact.email}</p>
                    )}
                  </div>
                </Link>
              </div>
            )}

            {/* Property */}
            {deal.property && (
              <div
                className="p-4 rounded-xl"
                style={{ backgroundColor: theme.bgGlow, boxShadow: neumorphicRaised }}
              >
                <p className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: theme.textMuted }}>
                  Property
                </p>
                <Link href={`/properties/${deal.property.id}`} className="group">
                  <p className="text-sm font-medium group-hover:underline" style={{ color: theme.text }}>
                    {deal.property.address}
                  </p>
                  <p className="text-xs" style={{ color: theme.textMuted }}>
                    {deal.property.city}{deal.property.state ? `, ${deal.property.state}` : ""}
                  </p>
                </Link>
              </div>
            )}

            {/* Tasks */}
            {deal.tasks.length > 0 && (
              <div
                className="p-4 rounded-xl"
                style={{ backgroundColor: theme.bgGlow, boxShadow: neumorphicRaised }}
              >
                <p className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: theme.textMuted }}>
                  Open Tasks
                </p>
                <div className="space-y-2">
                  {deal.tasks.map((task) => (
                    <div key={task.id} className="flex items-start gap-2">
                      <ClipboardList className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: theme.accent }} />
                      <div>
                        <p className="text-sm" style={{ color: theme.text }}>{task.title}</p>
                        {task.dueDate && (
                          <p className="text-xs" style={{ color: theme.textMuted }}>
                            Due {formatDistanceToNow(task.dueDate)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Deal Details */}
            <div
              className="p-4 rounded-xl"
              style={{ backgroundColor: theme.bgGlow, boxShadow: neumorphicRaised }}
            >
              <p className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: theme.textMuted }}>
                Details
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span style={{ color: theme.textMuted }}>Stage</span>
                  <span style={{ color: theme.accent }}>{stageLabels[deal.stage] || deal.stage}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: theme.textMuted }}>Value</span>
                  <span style={{ color: theme.text }}>{deal.value ? formatCurrency(deal.value) : "—"}</span>
                </div>
                {deal.expectedCloseDate && (
                  <div className="flex justify-between">
                    <span style={{ color: theme.textMuted }}>Expected Close</span>
                    <span style={{ color: theme.text }}>
                      {new Date(deal.expectedCloseDate).toLocaleDateString()}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span style={{ color: theme.textMuted }}>Created</span>
                  <span style={{ color: theme.text }}>{formatDistanceToNow(deal.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
