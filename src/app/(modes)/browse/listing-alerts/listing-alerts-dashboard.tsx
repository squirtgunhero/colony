"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import {
  Bell,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ActionButton } from "@/components/ui/action-button";
import { EmptyState } from "@/components/ui/empty-state";

interface Alert {
  id: string;
  name: string;
  isActive: boolean;
  channel: string;
  frequency: string;
  cities: string[];
  states: string[];
  zipCodes: string[];
  minPrice: number | null;
  maxPrice: number | null;
  minBedrooms: number | null;
  maxBedrooms: number | null;
  minBathrooms: number | null;
  minSqft: number | null;
  maxSqft: number | null;
  matchCount: number;
  sentCount: number;
  lastSentAt: string | null;
  createdAt: string;
  contact: { id: string; name: string; email: string | null; phone: string | null };
}

interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  type: string;
}

interface Props {
  alerts: Alert[];
  contacts: Contact[];
  availableCities: string[];
  totalListed: number;
}

function formatPrice(n: number): string {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${Math.round(n / 1000)}k`;
  return `$${n}`;
}

export function ListingAlertsDashboard({ alerts, contacts, availableCities, totalListed }: Props) {
  const { theme } = useColonyTheme();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showCreate, setShowCreate] = useState(false);

  const [contactId, setContactId] = useState("");
  const [alertName, setAlertName] = useState("");
  const [channel, setChannel] = useState("email");
  const [frequency, setFrequency] = useState("instant");
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minBedrooms, setMinBedrooms] = useState("");
  const [minBathrooms, setMinBathrooms] = useState("");

  const inputStyle: React.CSSProperties = {
    backgroundColor: withAlpha(theme.text, 0.04),
    color: theme.text,
  };
  const labelStyle: React.CSSProperties = { color: withAlpha(theme.text, 0.45) };

  const handleCreate = () => {
    if (!contactId || !alertName.trim()) return;
    startTransition(async () => {
      await fetch("/api/listing-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId,
          name: alertName,
          channel,
          frequency,
          cities: selectedCities,
          minPrice: minPrice ? parseFloat(minPrice) : undefined,
          maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
          minBedrooms: minBedrooms ? parseInt(minBedrooms) : undefined,
          minBathrooms: minBathrooms ? parseFloat(minBathrooms) : undefined,
        }),
      });
      setShowCreate(false);
      setAlertName("");
      setContactId("");
      setSelectedCities([]);
      setMinPrice("");
      setMaxPrice("");
      setMinBedrooms("");
      setMinBathrooms("");
      router.refresh();
    });
  };

  const toggleActive = (id: string, current: boolean) => {
    startTransition(async () => {
      await fetch(`/api/listing-alerts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !current }),
      });
      router.refresh();
    });
  };

  const deleteAlert = (id: string) => {
    startTransition(async () => {
      await fetch(`/api/listing-alerts/${id}`, { method: "DELETE" });
      router.refresh();
    });
  };

  const toggleCity = (city: string) => {
    setSelectedCities((prev) =>
      prev.includes(city) ? prev.filter((c) => c !== city) : [...prev, city]
    );
  };

  return (
    <div className="p-6 sm:p-8 max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Listing Alerts"
        subtitle={`Automatically notify contacts when properties match their criteria${totalListed > 0 ? ` \u00b7 ${totalListed} active listing${totalListed !== 1 ? "s" : ""}` : ""}`}
        icon={Bell}
        actions={
          <ActionButton
            label={showCreate ? "Cancel" : "New Alert"}
            icon={Plus}
            variant={showCreate ? "secondary" : "primary"}
            onClick={() => setShowCreate(!showCreate)}
          />
        }
      />

      {/* Create form */}
      {showCreate && (
        <div
          className="rounded-2xl p-5 space-y-4"
          style={{ backgroundColor: withAlpha(theme.text, 0.03) }}
        >
          <h3 className="text-[15px] font-semibold" style={{ color: theme.text }}>Create Listing Alert</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-medium uppercase tracking-[0.06em] block mb-1.5" style={labelStyle}>Contact</label>
              <select
                value={contactId}
                onChange={(e) => setContactId(e.target.value)}
                className="w-full h-10 px-3.5 rounded-xl text-[13px] outline-none"
                style={inputStyle}
              >
                <option value="" style={{ backgroundColor: theme.bg }}>Select contact...</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id} style={{ backgroundColor: theme.bg }}>
                    {c.name} {c.email ? `(${c.email})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-medium uppercase tracking-[0.06em] block mb-1.5" style={labelStyle}>Alert Name</label>
              <input
                type="text"
                value={alertName}
                onChange={(e) => setAlertName(e.target.value)}
                placeholder="e.g. 3BR homes under $500k"
                className="w-full h-10 px-3.5 rounded-xl text-[13px] outline-none"
                style={inputStyle}
              />
            </div>

            {/* Channel — segmented control */}
            <div>
              <label className="text-[11px] font-medium uppercase tracking-[0.06em] block mb-1.5" style={labelStyle}>Notify Via</label>
              <div
                className="inline-flex rounded-xl p-1 w-full"
                style={{ backgroundColor: withAlpha(theme.text, 0.05) }}
              >
                {["email", "sms", "both"].map((ch) => (
                  <button
                    key={ch}
                    onClick={() => setChannel(ch)}
                    className="flex-1 h-8 rounded-lg text-[12px] font-medium capitalize transition-all duration-200"
                    style={{
                      backgroundColor: channel === ch ? withAlpha(theme.text, 0.1) : "transparent",
                      color: channel === ch ? theme.text : withAlpha(theme.text, 0.4),
                    }}
                  >
                    {ch}
                  </button>
                ))}
              </div>
            </div>

            {/* Frequency — segmented control */}
            <div>
              <label className="text-[11px] font-medium uppercase tracking-[0.06em] block mb-1.5" style={labelStyle}>Frequency</label>
              <div
                className="inline-flex rounded-xl p-1 w-full"
                style={{ backgroundColor: withAlpha(theme.text, 0.05) }}
              >
                {["instant", "daily", "weekly"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFrequency(f)}
                    className="flex-1 h-8 rounded-lg text-[12px] font-medium capitalize transition-all duration-200"
                    style={{
                      backgroundColor: frequency === f ? withAlpha(theme.text, 0.1) : "transparent",
                      color: frequency === f ? theme.text : withAlpha(theme.text, 0.4),
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Price range */}
          <div>
            <label className="text-[11px] font-medium uppercase tracking-[0.06em] block mb-1.5" style={labelStyle}>Price Range</label>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder="Min"
                className="flex-1 h-10 px-3.5 rounded-xl text-[13px] outline-none"
                style={inputStyle}
              />
              <span className="text-[12px]" style={{ color: withAlpha(theme.text, 0.3) }}>to</span>
              <input
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="Max"
                className="flex-1 h-10 px-3.5 rounded-xl text-[13px] outline-none"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Bedrooms / Bathrooms */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-medium uppercase tracking-[0.06em] block mb-1.5" style={labelStyle}>Min Bedrooms</label>
              <select
                value={minBedrooms}
                onChange={(e) => setMinBedrooms(e.target.value)}
                className="w-full h-10 px-3.5 rounded-xl text-[13px] outline-none"
                style={inputStyle}
              >
                <option value="" style={{ backgroundColor: theme.bg }}>Any</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n} style={{ backgroundColor: theme.bg }}>{n}+</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-medium uppercase tracking-[0.06em] block mb-1.5" style={labelStyle}>Min Bathrooms</label>
              <select
                value={minBathrooms}
                onChange={(e) => setMinBathrooms(e.target.value)}
                className="w-full h-10 px-3.5 rounded-xl text-[13px] outline-none"
                style={inputStyle}
              >
                <option value="" style={{ backgroundColor: theme.bg }}>Any</option>
                {[1, 1.5, 2, 2.5, 3, 4].map((n) => (
                  <option key={n} value={n} style={{ backgroundColor: theme.bg }}>{n}+</option>
                ))}
              </select>
            </div>
          </div>

          {/* Cities */}
          {availableCities.length > 0 && (
            <div>
              <label className="text-[11px] font-medium uppercase tracking-[0.06em] block mb-1.5" style={labelStyle}>
                Cities ({selectedCities.length} selected)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {availableCities.map((city) => {
                  const selected = selectedCities.includes(city);
                  return (
                    <button
                      key={city}
                      onClick={() => toggleCity(city)}
                      className="h-7 px-3 rounded-full text-[11px] font-medium transition-all duration-200"
                      style={{
                        backgroundColor: selected ? withAlpha(theme.accent, 0.12) : withAlpha(theme.text, 0.05),
                        color: selected ? theme.accent : withAlpha(theme.text, 0.45),
                      }}
                    >
                      {city}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={() => setShowCreate(false)}
              className="h-9 px-4 rounded-xl text-[13px] font-medium transition-opacity hover:opacity-70"
              style={{ color: withAlpha(theme.text, 0.5) }}
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={isPending || !contactId || !alertName.trim()}
              className="flex items-center gap-2 h-9 px-5 rounded-xl text-[13px] font-medium transition-all active:scale-[0.97]"
              style={{
                backgroundColor: theme.accent,
                color: theme.bg,
                opacity: (!contactId || !alertName.trim()) ? 0.4 : 1,
              }}
            >
              <Bell className="h-3.5 w-3.5" strokeWidth={1.5} />
              {isPending ? "Creating..." : "Create Alert"}
            </button>
          </div>
        </div>
      )}

      {/* Alerts list */}
      {alerts.length === 0 && !showCreate ? (
        <EmptyState
          icon={Bell}
          title="No listing alerts yet"
          description="Create alerts to automatically notify contacts when new listings match their criteria."
        />
      ) : (
        <div className="space-y-1.5">
          {alerts.map((alert) => {
            const criteria: string[] = [];
            if (alert.cities.length > 0) criteria.push(alert.cities.join(", "));
            if (alert.minPrice || alert.maxPrice) {
              const min = alert.minPrice ? formatPrice(alert.minPrice) : "";
              const max = alert.maxPrice ? formatPrice(alert.maxPrice) : "";
              criteria.push(min && max ? `${min}\u2013${max}` : min ? `${min}+` : `Up to ${max}`);
            }
            if (alert.minBedrooms) criteria.push(`${alert.minBedrooms}+ BR`);
            if (alert.minBathrooms) criteria.push(`${alert.minBathrooms}+ BA`);

            return (
              <div
                key={alert.id}
                className="rounded-2xl p-4 transition-colors"
                style={{
                  backgroundColor: withAlpha(theme.text, 0.02),
                  opacity: alert.isActive ? 1 : 0.5,
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = withAlpha(theme.text, 0.04)}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = withAlpha(theme.text, 0.02)}
              >
                <div className="flex items-start gap-4">
                  <Bell
                    className="h-4 w-4 mt-0.5 shrink-0"
                    style={{ color: alert.isActive ? theme.accent : withAlpha(theme.text, 0.3) }}
                    strokeWidth={1.5}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[14px] font-medium" style={{ color: theme.text }}>{alert.name}</p>
                      <span
                        className="text-[10px] font-medium px-2 py-0.5 rounded-full capitalize"
                        style={{ backgroundColor: withAlpha(theme.text, 0.05), color: withAlpha(theme.text, 0.45) }}
                      >
                        {alert.frequency}
                      </span>
                      <span
                        className="text-[10px] font-medium px-2 py-0.5 rounded-full uppercase"
                        style={{ backgroundColor: withAlpha(theme.text, 0.05), color: withAlpha(theme.text, 0.45) }}
                      >
                        {alert.channel}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      <Link
                        href={`/browse/contacts/${alert.contact.id}`}
                        className="text-[12px] hover:underline"
                        style={{ color: withAlpha(theme.text, 0.5) }}
                      >
                        {alert.contact.name}
                      </Link>
                      {criteria.length > 0 && (
                        <span className="text-[11px]" style={{ color: withAlpha(theme.text, 0.35) }}>
                          · {criteria.join(" · ")}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mt-1.5 text-[11px]" style={{ color: withAlpha(theme.text, 0.3) }}>
                      <span>{alert.matchCount} matches</span>
                      <span>{alert.sentCount} sent</span>
                      {alert.lastSentAt && (
                        <span>Last: {new Date(alert.lastSentAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => toggleActive(alert.id, alert.isActive)}
                      disabled={isPending}
                      className="h-8 w-8 flex items-center justify-center rounded-lg transition-opacity hover:opacity-70"
                      title={alert.isActive ? "Pause" : "Activate"}
                    >
                      {alert.isActive ? (
                        <ToggleRight className="h-5 w-5" style={{ color: "#30d158" }} />
                      ) : (
                        <ToggleLeft className="h-5 w-5" style={{ color: withAlpha(theme.text, 0.25) }} />
                      )}
                    </button>
                    <button
                      onClick={() => deleteAlert(alert.id)}
                      disabled={isPending}
                      className="h-8 w-8 flex items-center justify-center rounded-lg transition-opacity hover:opacity-70"
                      style={{ color: withAlpha(theme.text, 0.25) }}
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </button>
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
