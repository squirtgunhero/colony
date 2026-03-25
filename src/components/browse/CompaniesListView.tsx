"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Search, Building2, Globe, MapPin, MoreHorizontal, Trash2, Users, Handshake } from "lucide-react";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import { formatDate } from "@/lib/date-utils";
import { deleteCompany } from "@/app/(dashboard)/companies/actions";

interface Company {
  id: string;
  name: string;
  domain?: string | null;
  industry?: string | null;
  size?: string | null;
  city?: string | null;
  state?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  updatedAt: Date;
  _count: {
    contacts: number;
    deals: number;
  };
}

interface CompaniesListViewProps {
  companies: Company[];
}

export function CompaniesListView({ companies: initialCompanies }: CompaniesListViewProps) {
  const { theme } = useColonyTheme();
  const [search, setSearch] = useState("");
  const [industryFilter, setIndustryFilter] = useState<string>("all");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [companies, setCompanies] = useState(initialCompanies);
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

  async function handleDelete(companyId: string, companyName: string) {
    setOpenMenuId(null);
    if (!confirm(`Delete ${companyName}? Contacts and deals will be unlinked.`)) return;
    await deleteCompany(companyId);
    setCompanies((prev) => prev.filter((c) => c.id !== companyId));
  }

  const filteredCompanies = companies.filter((company) => {
    const matchesSearch =
      company.name.toLowerCase().includes(search.toLowerCase()) ||
      (company.domain?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (company.industry?.toLowerCase() || "").includes(search.toLowerCase());
    const matchesIndustry = industryFilter === "all" || company.industry === industryFilter;
    return matchesSearch && matchesIndustry;
  });

  const industries = ["all", ...new Set(companies.map((c) => c.industry).filter(Boolean) as string[])];

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
            Companies
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: theme.textMuted, fontFamily: "'DM Sans', sans-serif" }}
          >
            {filteredCompanies.length} compan{filteredCompanies.length !== 1 ? "ies" : "y"}
          </p>
        </div>
        <Link
          href="/browse/companies/new"
          className="px-4 py-2 rounded-full text-sm font-medium transition-all duration-200"
          style={{
            backgroundColor: theme.accent,
            color: theme.bg,
            boxShadow: neumorphicRaised,
          }}
        >
          Add Company
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
            placeholder="Search companies..."
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
        {industries.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            {industries.map((ind) => {
              const isActive = industryFilter === ind;
              return (
                <button
                  key={ind}
                  onClick={() => setIndustryFilter(ind)}
                  className="px-3 py-1.5 text-sm rounded-lg capitalize transition-all duration-200"
                  style={{
                    backgroundColor: isActive ? withAlpha(theme.accent, 0.15) : "transparent",
                    color: isActive ? theme.accent : theme.textMuted,
                    boxShadow: isActive ? neumorphicRaised : "none",
                  }}
                >
                  {ind}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* List */}
      <div className="space-y-2">
        {filteredCompanies.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 mx-auto mb-4" style={{ color: theme.accent, opacity: 0.4 }} />
            <p style={{ color: theme.textMuted }}>No companies found</p>
          </div>
        ) : (
          filteredCompanies.map((company) => (
            <Link
              key={company.id}
              href={`/companies/${company.id}`}
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
                className="flex items-center justify-center h-12 w-12 rounded-xl font-medium shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${withAlpha(theme.accent, 0.2)}, ${withAlpha(theme.accent, 0.08)})`,
                  color: theme.accent,
                }}
              >
                {company.name
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
                    {company.name}
                  </h3>
                  {company.industry && (
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full capitalize font-medium"
                      style={{
                        backgroundColor: withAlpha(theme.accent, 0.15),
                        color: theme.accent,
                      }}
                    >
                      {company.industry}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-1 text-sm" style={{ color: theme.textMuted }}>
                  {company.domain && (
                    <span className="flex items-center gap-1 truncate">
                      <Globe className="h-3 w-3" />
                      {company.domain}
                    </span>
                  )}
                  {(company.city || company.state) && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {[company.city, company.state].filter(Boolean).join(", ")}
                    </span>
                  )}
                  {!company.domain && !company.city && (
                    <span className="italic opacity-50 text-xs">No details</span>
                  )}
                </div>
              </div>

              {/* Meta */}
              <div
                className="hidden sm:flex items-center gap-4 text-xs"
                style={{ color: theme.textMuted }}
              >
                {company._count.contacts > 0 && (
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {company._count.contacts}
                  </span>
                )}
                {company._count.deals > 0 && (
                  <span className="flex items-center gap-1">
                    <Handshake className="h-3 w-3" />
                    {company._count.deals}
                  </span>
                )}
                <span>{formatDate(company.updatedAt)}</span>
              </div>

              {/* Actions */}
              <div className="relative">
                <button
                  className="h-8 w-8 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: theme.textMuted }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setOpenMenuId(openMenuId === company.id ? null : company.id);
                  }}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>

                {openMenuId === company.id && (
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
                        handleDelete(company.id, company.name);
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
