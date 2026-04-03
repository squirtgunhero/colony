"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import {
  ListChecks,
  Plus,
  Search,
  Trash2,
  ArrowLeft,
  Phone,
  Users,
  CheckCircle,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ActionButton } from "@/components/ui/action-button";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import { SmartListBuilder } from "./smart-list-builder";

interface CallList {
  id: string;
  name: string;
  description: string | null;
  status: string;
  sortOrder: string;
  totalEntries: number;
  completedEntries: number;
  createdAt: string;
  updatedAt: string;
}

interface Contact {
  id: string;
  name: string;
  phone: string | null;
  type: string;
  leadScore: number | null;
  leadGrade: string | null;
}

interface Props {
  lists: CallList[];
  contacts: Contact[];
}

export function CallListsPage({ lists, contacts }: Props) {
  const { theme } = useColonyTheme();
  const borderColor = withAlpha(theme.text, 0.06);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showCreate, setShowCreate] = useState(false);
  const [listType, setListType] = useState<"manual" | "smart">("manual");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [smartFilters, setSmartFilters] = useState<{ field: string; operator: string; value: string }[]>([]);
  const [smartContactIds, setSmartContactIds] = useState<string[]>([]);
  const [contactSearch, setContactSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  const filteredContacts = contacts.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(contactSearch.toLowerCase());
    const matchesType = filterType === "all" || c.type === filterType;
    const hasPhone = !!c.phone;
    return matchesSearch && matchesType && hasPhone;
  });

  const handleCreate = () => {
    const ids = listType === "smart" ? smartContactIds : selectedContacts;
    if (!name.trim() || ids.length === 0) return;
    startTransition(async () => {
      const res = await fetch("/api/dialer/call-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          contactIds: ids,
          filterJson: listType === "smart" ? smartFilters : null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setShowCreate(false);
        setName("");
        setDescription("");
        setSelectedContacts([]);
        setSmartFilters([]);
        setSmartContactIds([]);
        setListType("manual");
        router.push(`/browse/dialer/lists/${data.id}`);
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Archive this call list?")) return;
    startTransition(async () => {
      await fetch(`/api/dialer/call-lists/${id}`, { method: "DELETE" });
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
    const allSelected = ids.every((id) => selectedContacts.includes(id));
    if (allSelected) {
      setSelectedContacts((prev) => prev.filter((id) => !ids.includes(id)));
    } else {
      setSelectedContacts((prev) => [...new Set([...prev, ...ids])]);
    }
  };

  const inputStyle: React.CSSProperties = {
    backgroundColor: withAlpha(theme.text, 0.04),
    border: `1px solid ${borderColor}`,
    color: theme.text,
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Call Lists"
        subtitle="Organize contacts into lists for efficient power dialing"
        icon={ListChecks}
        overline="Dialer"
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/browse/dialer"
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[13px] font-medium transition-all duration-150 hover:opacity-90"
              style={{
                backgroundColor: withAlpha(theme.text, 0.06),
                color: withAlpha(theme.text, 0.7),
                border: `1px solid ${withAlpha(theme.text, 0.08)}`,
              }}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
            <ActionButton
              label={showCreate ? "Cancel" : "New List"}
              icon={Plus}
              variant={showCreate ? "secondary" : "primary"}
              onClick={() => setShowCreate(!showCreate)}
            />
          </div>
        }
      />

      {/* Create form */}
      {showCreate && (
        <SectionCard title="Create Call List">
          <div className="space-y-4">
            {/* List type toggle */}
            <div>
              <label
                className="text-[11px] uppercase tracking-wider block mb-1.5"
                style={{ color: withAlpha(theme.text, 0.5) }}
              >
                List Type
              </label>
              <div
                className="inline-flex rounded-xl p-1"
                style={{ backgroundColor: withAlpha(theme.text, 0.05) }}
              >
                {(["manual", "smart"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setListType(t)}
                    className="h-8 px-4 rounded-lg text-[12px] font-medium capitalize transition-all duration-200"
                    style={{
                      backgroundColor: listType === t ? withAlpha(theme.text, 0.1) : "transparent",
                      color: listType === t ? theme.text : withAlpha(theme.text, 0.45),
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  className="text-[11px] uppercase tracking-wider block mb-1.5"
                  style={{ color: withAlpha(theme.text, 0.5) }}
                >
                  List Name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Hot Leads Q1"
                  className="w-full h-10 px-3 rounded-lg text-[13px] outline-none"
                  style={inputStyle}
                />
              </div>
              <div>
                <label
                  className="text-[11px] uppercase tracking-wider block mb-1.5"
                  style={{ color: withAlpha(theme.text, 0.5) }}
                >
                  Description (optional)
                </label>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description"
                  className="w-full h-10 px-3 rounded-lg text-[13px] outline-none"
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Smart list filter builder */}
            {listType === "smart" && (
              <SmartListBuilder
                onChange={setSmartFilters}
                onContactIdsResolved={setSmartContactIds}
              />
            )}

            {/* Manual contact selector */}
            {listType === "manual" && (
            <>{/* Contact selector */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  className="text-[11px] uppercase tracking-wider"
                  style={{ color: withAlpha(theme.text, 0.5) }}
                >
                  Select Contacts ({selectedContacts.length} selected)
                </label>
                <button
                  onClick={selectAll}
                  className="text-[11px] font-medium"
                  style={{ color: theme.accent }}
                >
                  {filteredContacts.every((c) => selectedContacts.includes(c.id))
                    ? "Deselect all"
                    : "Select all"}
                </button>
              </div>

              <div className="flex gap-2 mb-2">
                <div className="relative flex-1">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5"
                    style={{ color: withAlpha(theme.text, 0.3) }}
                  />
                  <input
                    value={contactSearch}
                    onChange={(e) => setContactSearch(e.target.value)}
                    placeholder="Search contacts..."
                    className="w-full h-9 pl-8 pr-3 rounded-lg text-[12px] outline-none"
                    style={inputStyle}
                  />
                </div>
                <div className="flex gap-1">
                  {["all", "lead", "client"].map((t) => (
                    <button
                      key={t}
                      onClick={() => setFilterType(t)}
                      className="px-2.5 h-9 rounded-lg text-[11px] font-medium capitalize transition-colors"
                      style={{
                        backgroundColor:
                          filterType === t ? withAlpha(theme.accent, 0.12) : "transparent",
                        color: filterType === t ? theme.accent : withAlpha(theme.text, 0.4),
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div
                className="max-h-64 overflow-y-auto rounded-lg"
                style={{ border: `1px solid ${borderColor}` }}
              >
                {filteredContacts.length === 0 ? (
                  <p
                    className="text-[12px] text-center py-6"
                    style={{ color: withAlpha(theme.text, 0.4) }}
                  >
                    No contacts with phone numbers found
                  </p>
                ) : (
                  filteredContacts.map((contact, i) => {
                    const selected = selectedContacts.includes(contact.id);
                    return (
                      <button
                        key={contact.id}
                        onClick={() => toggleContact(contact.id)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.02]"
                        style={{
                          borderBottom:
                            i < filteredContacts.length - 1
                              ? `1px solid ${borderColor}`
                              : undefined,
                          backgroundColor: selected
                            ? withAlpha(theme.accent, 0.06)
                            : "transparent",
                        }}
                      >
                        <div
                          className="h-4 w-4 rounded border-2 flex items-center justify-center shrink-0"
                          style={{
                            borderColor: selected ? theme.accent : withAlpha(theme.text, 0.2),
                            backgroundColor: selected ? theme.accent : "transparent",
                          }}
                        >
                          {selected && (
                            <CheckCircle className="h-3 w-3" style={{ color: theme.bg }} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-[13px] font-medium truncate"
                            style={{ color: theme.text }}
                          >
                            {contact.name}
                          </p>
                          <p
                            className="text-[11px] truncate"
                            style={{ color: withAlpha(theme.text, 0.4) }}
                          >
                            {contact.phone}
                          </p>
                        </div>
                        <span
                          className="text-[10px] capitalize px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: withAlpha(theme.text, 0.06),
                            color: withAlpha(theme.text, 0.5),
                          }}
                        >
                          {contact.type}
                        </span>
                        {contact.leadGrade && (
                          <span
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                            style={{
                              backgroundColor: withAlpha(theme.accent, 0.12),
                              color: theme.accent,
                            }}
                          >
                            {contact.leadGrade}
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            </>
            )}

            <div className="flex justify-end">
              <ActionButton
                label={isPending ? "Creating..." : `Create List (${listType === "smart" ? smartContactIds.length : selectedContacts.length} contacts)`}
                icon={Plus}
                onClick={handleCreate}
                disabled={!name.trim() || (listType === "smart" ? smartContactIds.length === 0 : selectedContacts.length === 0) || isPending}
              />
            </div>
          </div>
        </SectionCard>
      )}

      {/* Existing lists */}
      {lists.length === 0 && !showCreate ? (
        <EmptyState
          icon={ListChecks}
          title="No call lists yet"
          description="Create a call list to organize your contacts for efficient power dialing."
          action={
            <ActionButton
              label="Create Your First List"
              icon={Plus}
              variant="secondary"
              onClick={() => setShowCreate(true)}
            />
          }
        />
      ) : (
        <div className="space-y-2">
          {lists.map((list) => {
            const progress =
              list.totalEntries > 0
                ? Math.round((list.completedEntries / list.totalEntries) * 100)
                : 0;
            return (
              <div
                key={list.id}
                className="flex items-center gap-4 rounded-2xl p-4 transition-all duration-150 hover:translate-y-[-1px] group"
                style={{
                  backgroundColor: withAlpha(theme.text, 0.02),
                  border: `1px solid ${borderColor}`,
                }}
              >
                <Link
                  href={`/browse/dialer/lists/${list.id}`}
                  className="flex items-center gap-4 flex-1 min-w-0"
                >
                  <div
                    className="flex items-center justify-center h-10 w-10 rounded-xl shrink-0"
                    style={{ backgroundColor: withAlpha(theme.accent, 0.08) }}
                  >
                    <ListChecks className="h-5 w-5" style={{ color: theme.accent }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[14px] font-medium truncate"
                      style={{ color: theme.text }}
                    >
                      {list.name}
                    </p>
                    <div
                      className="flex items-center gap-3 text-[12px] mt-0.5"
                      style={{ color: withAlpha(theme.text, 0.4) }}
                    >
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {list.totalEntries} contacts
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {list.completedEntries} called
                      </span>
                      <span
                        className="px-1.5 py-0.5 rounded text-[10px] font-medium capitalize"
                        style={{
                          backgroundColor: withAlpha(
                            list.status === "active" ? "#22c55e" : "#eab308",
                            0.15
                          ),
                          color: list.status === "active" ? "#22c55e" : "#eab308",
                        }}
                      >
                        {list.status}
                      </span>
                    </div>
                  </div>
                </Link>

                {/* Progress */}
                <div className="w-28 shrink-0">
                  <div
                    className="h-1.5 rounded-full overflow-hidden"
                    style={{ backgroundColor: withAlpha(theme.text, 0.08) }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${progress}%`,
                        backgroundColor: progress === 100 ? "#22c55e" : theme.accent,
                      }}
                    />
                  </div>
                  <p
                    className="text-[10px] text-right mt-1"
                    style={{ color: withAlpha(theme.text, 0.3) }}
                  >
                    {progress}%
                  </p>
                </div>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(list.id)}
                  className="h-8 w-8 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: withAlpha(theme.text, 0.3) }}
                  title="Archive list"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
