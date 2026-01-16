"use client";

// ============================================
// COLONY - Contacts List View for Browse Mode
// ============================================

import { useState } from "react";
import Link from "next/link";
import { Search, User, Mail, Phone, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/date-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

export function ContactsListView({ contacts }: ContactsListViewProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch = 
      contact.name.toLowerCase().includes(search.toLowerCase()) ||
      (contact.email?.toLowerCase() || "").includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || contact.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const types = ["all", ...new Set(contacts.map((c) => c.type))];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Contacts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filteredContacts.length} contact{filteredContacts.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button asChild>
          <Link href="/browse/contacts/new">Add Contact</Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          {types.map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={cn(
                "px-3 py-1.5 text-sm rounded-lg capitalize transition-colors",
                typeFilter === type
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="space-y-2">
        {filteredContacts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-4 opacity-40" />
            <p>No contacts found</p>
          </div>
        ) : (
          filteredContacts.map((contact) => (
            <Link
              key={contact.id}
              href={`/contacts/${contact.id}`}
              className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border/50 hover:border-border hover:shadow-sm transition-all group"
            >
              {/* Avatar */}
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 text-primary font-medium shrink-0">
                {contact.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium truncate">{contact.name}</h3>
                  <span className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full capitalize",
                    contact.type === "lead" && "bg-blue-500/10 text-blue-600 dark:text-blue-400",
                    contact.type === "client" && "bg-green-500/10 text-green-600 dark:text-green-400",
                    contact.type === "prospect" && "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  )}>
                    {contact.type}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
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
              <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground">
                {contact.deals.length > 0 && (
                  <span>{contact.deals.length} deal{contact.deals.length !== 1 ? "s" : ""}</span>
                )}
                <span>{formatDate(contact.updatedAt)}</span>
              </div>

              {/* Actions */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.preventDefault()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
