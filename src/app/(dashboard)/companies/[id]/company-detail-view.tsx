"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import { deleteCompany, updateCompany } from "@/app/(dashboard)/companies/actions";
import { formatDate, formatCurrency } from "@/lib/date-utils";
import { CustomFieldsEditor } from "@/components/custom-fields/CustomFieldsEditor";
import {
  ArrowLeft,
  Building2,
  Globe,
  MapPin,
  Phone,
  Mail,
  Users,
  Handshake,
  Pencil,
  Trash2,
  MoreHorizontal,
  ExternalLink,
} from "lucide-react";

interface Contact {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  type: string;
  updatedAt: string;
}

interface Deal {
  id: string;
  title: string;
  value: number | null;
  stage: string;
  createdAt: string;
  contact?: { id: string; name: string } | null;
}

interface Company {
  id: string;
  name: string;
  domain?: string | null;
  industry?: string | null;
  size?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  notes?: string | null;
  logoUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  contacts: Contact[];
  deals: Deal[];
}

interface CompanyDetailViewProps {
  company: Company;
}

export function CompanyDetailView({ company: initialCompany }: CompanyDetailViewProps) {
  const { theme } = useColonyTheme();
  const router = useRouter();
  const [company, setCompany] = useState(initialCompany);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: company.name,
    domain: company.domain || "",
    industry: company.industry || "",
    size: company.size || "",
    phone: company.phone || "",
    email: company.email || "",
    website: company.website || "",
    address: company.address || "",
    city: company.city || "",
    state: company.state || "",
    zipCode: company.zipCode || "",
    notes: company.notes || "",
  });
  const [showMenu, setShowMenu] = useState(false);

  const neumorphicRaised = `4px 4px 8px rgba(0,0,0,0.4), -4px -4px 8px rgba(255,255,255,0.04)`;

  async function handleSave() {
    await updateCompany(company.id, editData);
    setCompany((prev) => ({ ...prev, ...editData }));
    setIsEditing(false);
  }

  async function handleDelete() {
    if (!confirm(`Delete ${company.name}? Contacts and deals will be unlinked.`)) return;
    await deleteCompany(company.id);
    router.push("/browse/companies");
  }

  const location = [company.address, company.city, company.state, company.zipCode]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Back */}
      <Link
        href="/browse/companies"
        className="inline-flex items-center gap-1.5 text-sm mb-6 transition-colors"
        style={{ color: theme.textMuted }}
      >
        <ArrowLeft className="h-4 w-4" />
        Companies
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <div
            className="flex items-center justify-center h-16 w-16 rounded-2xl text-xl font-semibold"
            style={{
              background: `linear-gradient(135deg, ${withAlpha(theme.accent, 0.25)}, ${withAlpha(theme.accent, 0.1)})`,
              color: theme.accent,
            }}
          >
            {company.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
          </div>
          <div>
            <h1
              className="text-2xl font-semibold"
              style={{ color: theme.text, fontFamily: "'Spectral', serif" }}
            >
              {company.name}
            </h1>
            <div className="flex items-center gap-3 mt-1 text-sm" style={{ color: theme.textMuted }}>
              {company.industry && (
                <span
                  className="px-2 py-0.5 rounded-full text-[11px] font-medium capitalize"
                  style={{ backgroundColor: withAlpha(theme.accent, 0.15), color: theme.accent }}
                >
                  {company.industry}
                </span>
              )}
              {company.size && <span>{company.size} employees</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors"
            style={{ color: theme.textMuted }}
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="h-8 w-8 flex items-center justify-center rounded-lg"
              style={{ color: theme.textMuted }}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {showMenu && (
              <div
                className="absolute right-0 top-full mt-1 z-50 rounded-xl py-1 min-w-[140px]"
                style={{
                  backgroundColor: theme.bgGlow,
                  border: `1px solid ${withAlpha(theme.text, 0.1)}`,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                }}
              >
                <button
                  onClick={handleDelete}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm"
                  style={{ color: "#ef4444" }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Form */}
      {isEditing && (
        <div
          className="rounded-2xl p-6 mb-8 space-y-4"
          style={{ backgroundColor: theme.bgGlow, boxShadow: neumorphicRaised }}
        >
          <div className="grid grid-cols-2 gap-4">
            {(
              [
                ["name", "Company Name"],
                ["domain", "Domain"],
                ["industry", "Industry"],
                ["size", "Size"],
                ["phone", "Phone"],
                ["email", "Email"],
                ["website", "Website"],
                ["address", "Address"],
                ["city", "City"],
                ["state", "State"],
                ["zipCode", "Zip Code"],
              ] as const
            ).map(([field, label]) => (
              <div key={field}>
                <label className="text-xs font-medium mb-1 block" style={{ color: theme.textMuted }}>
                  {label}
                </label>
                <input
                  value={editData[field]}
                  onChange={(e) => setEditData((prev) => ({ ...prev, [field]: e.target.value }))}
                  className="w-full h-9 px-3 rounded-lg text-sm outline-none"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.03)",
                    border: `1px solid ${withAlpha(theme.text, 0.08)}`,
                    color: theme.text,
                    caretColor: theme.accent,
                  }}
                />
              </div>
            ))}
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: theme.textMuted }}>
              Notes
            </label>
            <textarea
              value={editData.notes}
              onChange={(e) => setEditData((prev) => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
              style={{
                backgroundColor: "rgba(255,255,255,0.03)",
                border: `1px solid ${withAlpha(theme.text, 0.08)}`,
                color: theme.text,
                caretColor: theme.accent,
              }}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-1.5 text-sm rounded-lg"
              style={{ color: theme.textMuted }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 text-sm rounded-full font-medium"
              style={{ backgroundColor: theme.accent, color: theme.bg }}
            >
              Save
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info card */}
        <div
          className="rounded-2xl p-5 space-y-4"
          style={{ backgroundColor: theme.bgGlow, boxShadow: neumorphicRaised }}
        >
          <h2 className="text-sm font-semibold" style={{ color: theme.text }}>
            Details
          </h2>
          <div className="space-y-3 text-sm">
            {company.domain && (
              <div className="flex items-center gap-2" style={{ color: theme.textMuted }}>
                <Globe className="h-4 w-4 shrink-0" />
                <span className="truncate">{company.domain}</span>
              </div>
            )}
            {company.website && (
              <div className="flex items-center gap-2" style={{ color: theme.textMuted }}>
                <ExternalLink className="h-4 w-4 shrink-0" />
                <a
                  href={company.website.startsWith("http") ? company.website : `https://${company.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate hover:underline"
                  style={{ color: theme.accent }}
                >
                  {company.website}
                </a>
              </div>
            )}
            {company.phone && (
              <div className="flex items-center gap-2" style={{ color: theme.textMuted }}>
                <Phone className="h-4 w-4 shrink-0" />
                <span>{company.phone}</span>
              </div>
            )}
            {company.email && (
              <div className="flex items-center gap-2" style={{ color: theme.textMuted }}>
                <Mail className="h-4 w-4 shrink-0" />
                <span className="truncate">{company.email}</span>
              </div>
            )}
            {location && (
              <div className="flex items-center gap-2" style={{ color: theme.textMuted }}>
                <MapPin className="h-4 w-4 shrink-0" />
                <span>{location}</span>
              </div>
            )}
            {company.notes && (
              <p className="text-xs pt-2" style={{ color: theme.textMuted, borderTop: `1px solid ${withAlpha(theme.text, 0.06)}` }}>
                {company.notes}
              </p>
            )}
          </div>

          {/* Custom Fields */}
          <div className="pt-3 mt-3" style={{ borderTop: `1px solid ${withAlpha(theme.text, 0.06)}` }}>
            <CustomFieldsEditor entityType="company" entityId={company.id} />
          </div>
        </div>

        {/* Contacts */}
        <div
          className="rounded-2xl p-5"
          style={{ backgroundColor: theme.bgGlow, boxShadow: neumorphicRaised }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: theme.text }}>
              <Users className="h-4 w-4" style={{ color: theme.accent }} />
              Contacts ({company.contacts.length})
            </h2>
          </div>
          {company.contacts.length === 0 ? (
            <p className="text-xs" style={{ color: theme.textMuted }}>
              No contacts linked yet.
            </p>
          ) : (
            <div className="space-y-2">
              {company.contacts.map((contact) => (
                <Link
                  key={contact.id}
                  href={`/contacts/${contact.id}`}
                  className="flex items-center gap-3 p-2 rounded-lg transition-colors"
                  style={{ color: theme.text }}
                >
                  <div
                    className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium"
                    style={{
                      background: `linear-gradient(135deg, ${withAlpha(theme.accent, 0.2)}, ${withAlpha(theme.accent, 0.08)})`,
                      color: theme.accent,
                    }}
                  >
                    {contact.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{contact.name}</p>
                    <p className="text-xs truncate" style={{ color: theme.textMuted }}>
                      {contact.email || contact.phone || contact.type}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Deals */}
        <div
          className="rounded-2xl p-5"
          style={{ backgroundColor: theme.bgGlow, boxShadow: neumorphicRaised }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: theme.text }}>
              <Handshake className="h-4 w-4" style={{ color: theme.accent }} />
              Deals ({company.deals.length})
            </h2>
          </div>
          {company.deals.length === 0 ? (
            <p className="text-xs" style={{ color: theme.textMuted }}>
              No deals linked yet.
            </p>
          ) : (
            <div className="space-y-2">
              {company.deals.map((deal) => (
                <Link
                  key={deal.id}
                  href={`/deals/${deal.id}`}
                  className="block p-2 rounded-lg transition-colors"
                >
                  <p className="text-sm font-medium truncate" style={{ color: theme.text }}>
                    {deal.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 text-xs" style={{ color: theme.textMuted }}>
                    <span
                      className="px-1.5 py-0.5 rounded capitalize text-[10px]"
                      style={{ backgroundColor: withAlpha(theme.accent, 0.12), color: theme.accent }}
                    >
                      {deal.stage.replace(/_/g, " ")}
                    </span>
                    {deal.value != null && <span>{formatCurrency(deal.value)}</span>}
                    {deal.contact?.name && <span>{deal.contact.name}</span>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
