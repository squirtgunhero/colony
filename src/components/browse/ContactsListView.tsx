"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Search, User, Mail, Phone, MoreHorizontal, Trash2 } from "lucide-react";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import { formatDate } from "@/lib/date-utils";
import { deleteContact } from "@/app/(dashboard)/contacts/actions";

interface Contact {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  type: string;
  source?: string | null;
  updatedAt: Date;
  deals: Array<{ id: string }>;
  properties: Array<{ id: string }>;
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

  const neumorphicRaised = `4px 4px 8px rgba(0,0,0,0.4), -4px -4px 8px rgba(255,255,255,0.04)`;
  const neumorphicRecessed = `inset 3px 3px 6px rgba(0,0,0,0.3), inset -3px -3px 6px rgba(255,255,255,0.02)`;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-[28px] leading-tight font-semibold tracking-[-0.01em]"
            style={{ color: theme.text, fontFamily: "'Spectral', serif" }}
          >
            Contacts
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: theme.textMuted, fontFamily: "'DM Sans', sans-serif" }}
          >
            {filteredContacts.length} contact{filteredContacts.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/browse/contacts/new"
          className="px-4 py-2 rounded-full text-sm font-medium transition-all duration-200"
          style={{
            backgroundColor: theme.accent,
            color: theme.bg,
            boxShadow: neumorphicRaised,
          }}
        >
          Add Contact
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
            style={{ color: theme.textMuted }}
          />
          <input
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-3 rounded-xl text-sm outline-none transition-all"
            style={{
              backgroundColor: "rgba(255,255,255,0.03)",
              boxShadow: neumorphicRecessed,
              border: `1px solid ${withAlpha(theme.text, 0.06)}`,
              color: theme.text,
              caretColor: theme.accent,
              fontFamily: "'DM Sans', sans-serif",
            }}
          />
        </div>
        <div className="flex gap-2">
          {types.map((type) => {
            const isActive = typeFilter === type;
            return (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className="px-3 py-1.5 text-sm rounded-lg capitalize transition-all duration-200"
                style={{
                  backgroundColor: isActive ? withAlpha(theme.accent, 0.15) : "transparent",
                  color: isActive ? theme.accent : theme.textMuted,
                  boxShadow: isActive ? neumorphicRaised : "none",
                }}
              >
                {type}
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      <div className="space-y-2">
        {filteredContacts.length === 0 ? (
          <div className="text-center py-12">
            <User className="h-12 w-12 mx-auto mb-4" style={{ color: theme.accent, opacity: 0.4 }} />
            <p style={{ color: theme.textMuted }}>No contacts found</p>
          </div>
        ) : (
          filteredContacts.map((contact) => (
            <Link
              key={contact.id}
              href={`/contacts/${contact.id}`}
              className="flex items-center gap-4 p-4 rounded-xl transition-all duration-200 group"
              style={{
                backgroundColor: theme.bgGlow,
                boxShadow: neumorphicRaised,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = `2px 2px 4px rgba(0,0,0,0.3), -2px -2px 4px rgba(255,255,255,0.03), 0 0 12px ${withAlpha(theme.accent, 0.1)}`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = neumorphicRaised;
              }}
            >
              {/* Avatar */}
              <div
                className="flex items-center justify-center h-12 w-12 rounded-full font-medium shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${withAlpha(theme.accent, 0.2)}, ${withAlpha(theme.accent, 0.08)})`,
                  color: theme.accent,
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
                  <h3 className="font-medium truncate" style={{ color: theme.text }}>
                    {contact.name}
                  </h3>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full capitalize font-medium"
                    style={{
                      backgroundColor: withAlpha(theme.accent, 0.15),
                      color: theme.accent,
                    }}
                  >
                    {contact.type}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-1 text-sm" style={{ color: theme.textMuted }}>
                  {contact.email && (
                    <span className="flex items-center gap-1 truncate">
                      <Mail className="h-3 w-3" />
                      {contact.email}
                    </span>
                  )}
                  {contact.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {contact.phone}
                    </span>
                  )}
                </div>
              </div>

              {/* Meta */}
              <div
                className="hidden sm:flex items-center gap-4 text-xs"
                style={{ color: theme.textMuted }}
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
                  style={{ color: theme.textMuted }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setOpenMenuId(openMenuId === contact.id ? null : contact.id);
                  }}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>

                {openMenuId === contact.id && (
                  <div
                    ref={menuRef}
                    className="absolute right-0 top-full mt-1 z-50 rounded-xl py-1 min-w-[140px] animate-in fade-in zoom-in-95 duration-150"
                    style={{
                      backgroundColor: theme.bgGlow,
                      border: `1px solid ${withAlpha(theme.text, 0.1)}`,
                      boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                    }}
                  >
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDelete(contact.id, contact.name);
                      }}
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
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
