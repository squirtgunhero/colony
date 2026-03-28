"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Search, User, Users, Mail, Phone, MapPin, MoreHorizontal, Trash2, Plus } from "lucide-react";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import { formatDate } from "@/lib/date-utils";
import { deleteContact } from "@/app/(dashboard)/contacts/actions";
import { LeadScoreBadge } from "@/components/contacts/LeadScoreBadge";
import { DuplicatesPanel } from "@/components/contacts/DuplicatesPanel";
import { PageHeader } from "@/components/ui/page-header";
import { ActionButton } from "@/components/ui/action-button";
import { EmptyState } from "@/components/ui/empty-state";

interface Contact {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  type: string;
  source?: string | null;
  updatedAt: Date;
  deals: Array<{ id: string }>;
  properties: Array<{ id: string; city?: string | null; state?: string | null }>;
  leadScore?: { score: number; grade: string } | null;
  _count: {
    activities: number;
    tasks: number;
  };
}

interface ContactsListViewProps {
  contacts: Contact[];
}

export function ContactsListView({ contacts: initialContacts }: ContactsListViewProps) {
  const { theme } = useColonyTheme();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [contacts, setContacts] = useState(initialContacts);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    }
    if (openMenuId) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [openMenuId]);

  async function handleDelete(contactId: string, contactName: string) {
    setOpenMenuId(null);
    if (!confirm(`Delete ${contactName}? This can't be undone.`)) return;
    await deleteContact(contactId);
    setContacts((prev) => prev.filter((c) => c.id !== contactId));
  }

  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch =
      contact.name.toLowerCase().includes(search.toLowerCase()) ||
      (contact.email?.toLowerCase() || "").includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || contact.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const types = ["all", ...new Set(contacts.map((c) => c.type))];

  return (
    <div className="p-6 sm:p-8 max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="People"
        subtitle={`${filteredContacts.length} contact${filteredContacts.length !== 1 ? "s" : ""}`}
        icon={Users}
        actions={
          <ActionButton
            label="Add Contact"
            icon={Plus}
            onClick={() => window.location.href = "/browse/contacts/new"}
          />
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4"
            style={{ color: withAlpha(theme.text, 0.25) }}
            strokeWidth={1.5}
          />
          <input
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-3 rounded-xl text-[13px] outline-none transition-all"
            style={{
              backgroundColor: withAlpha(theme.text, 0.05),
              color: theme.text,
              caretColor: theme.accent,
            }}
            aria-label="Search contacts"
          />
        </div>
        {/* Segmented filter */}
        <div
          className="inline-flex rounded-xl p-1 self-start"
          style={{ backgroundColor: withAlpha(theme.text, 0.05) }}
        >
          {types.map((type) => {
            const isActive = typeFilter === type;
            return (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className="px-3 py-1.5 text-[12px] font-medium rounded-lg capitalize transition-all duration-200"
                style={{
                  backgroundColor: isActive ? withAlpha(theme.text, 0.1) : "transparent",
                  color: isActive ? theme.text : withAlpha(theme.text, 0.4),
                }}
              >
                {type}
              </button>
            );
          })}
        </div>
      </div>

      <DuplicatesPanel />

      {/* List */}
      {filteredContacts.length === 0 ? (
        <EmptyState
          icon={User}
          title="No contacts found"
          description="Try adjusting your search or filters."
        />
      ) : (
        <div className="space-y-0.5">
          {filteredContacts.map((contact) => (
            <Link
              key={contact.id}
              href={`/contacts/${contact.id}`}
              className="flex items-center gap-4 p-4 rounded-2xl transition-colors group"
              style={{ backgroundColor: "transparent" }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = withAlpha(theme.text, 0.03)}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
            >
              {/* Avatar */}
              <div
                className="flex items-center justify-center h-10 w-10 rounded-full font-semibold text-[13px] shrink-0"
                style={{
                  backgroundColor: withAlpha(theme.text, 0.07),
                  color: withAlpha(theme.text, 0.5),
                }}
              >
                {contact.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-[14px] font-medium truncate" style={{ color: theme.text }}>
                    {contact.name}
                  </h3>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full capitalize font-medium"
                    style={{
                      backgroundColor: withAlpha(theme.text, 0.06),
                      color: withAlpha(theme.text, 0.5),
                    }}
                  >
                    {contact.type}
                  </span>
                  {contact.leadScore && (
                    <LeadScoreBadge score={contact.leadScore.score} grade={contact.leadScore.grade} compact />
                  )}
                </div>
                <div className="flex items-center gap-4 mt-0.5 text-[12px]" style={{ color: withAlpha(theme.text, 0.4) }}>
                  {contact.email && (
                    <span className="flex items-center gap-1 truncate">
                      <Mail className="h-3 w-3" strokeWidth={1.5} />
                      {contact.email}
                    </span>
                  )}
                  {contact.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" strokeWidth={1.5} />
                      {contact.phone}
                    </span>
                  )}
                  {(() => {
                    const prop = contact.properties?.[0];
                    const loc = prop ? [prop.city, prop.state].filter(Boolean).join(", ") : null;
                    return loc ? (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" strokeWidth={1.5} />
                        {loc}
                      </span>
                    ) : null;
                  })()}
                  {!contact.email && !contact.phone && (
                    <span className="italic text-[11px]" style={{ color: withAlpha(theme.text, 0.25) }}>
                      No contact info
                    </span>
                  )}
                </div>
              </div>

              {/* Meta */}
              <div
                className="hidden sm:flex items-center gap-4 text-[11px]"
                style={{ color: withAlpha(theme.text, 0.35) }}
              >
                {contact.deals.length > 0 && (
                  <span>
                    {contact.deals.length} deal{contact.deals.length !== 1 ? "s" : ""}
                  </span>
                )}
                <span>{formatDate(contact.updatedAt)}</span>
              </div>

              {/* Actions */}
              <div className="relative">
                <button
                  className="h-8 w-8 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: withAlpha(theme.text, 0.35) }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setOpenMenuId(openMenuId === contact.id ? null : contact.id);
                  }}
                >
                  <MoreHorizontal className="h-4 w-4" strokeWidth={1.5} />
                </button>

                {openMenuId === contact.id && (
                  <div
                    ref={menuRef}
                    className="absolute right-0 top-full mt-1 z-50 rounded-xl py-1 min-w-[140px] animate-in fade-in zoom-in-95 duration-150"
                    style={{
                      backgroundColor: theme.bg,
                      boxShadow: "var(--shadow-lg)",
                      border: `0.5px solid ${withAlpha(theme.text, 0.08)}`,
                    }}
                  >
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDelete(contact.id, contact.name);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-left transition-colors rounded-lg"
                      style={{ color: "#ff453a" }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = withAlpha("#ff453a", 0.08)}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
