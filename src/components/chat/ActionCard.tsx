"use client";

import { CheckCircle2, XCircle, Facebook, Link2, BarChart3, Rocket } from "lucide-react";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import { useAssistantStore } from "@/lib/assistant/store";
import { getActionTypeLabel } from "@/lib/assistant/types";

interface ActionCardProps {
  card: { type: string; data: Record<string, unknown> };
}

// ---- Base Card Wrapper ----
function CardWrapper({ children }: { children: React.ReactNode }) {
  const { theme } = useColonyTheme();
  return (
    <div
      className="mt-3"
      style={{
        background: theme.surface,
        border: `1px solid ${withAlpha(theme.accent, 0.08)}`,
        borderRadius: 16,
        padding: "16px 20px",
        fontFamily: "var(--font-dm-sans), sans-serif",
      }}
    >
      {children}
    </div>
  );
}

// ---- A) Campaign Card ----
function CampaignCard({ data }: { data: Record<string, unknown> }) {
  const { theme } = useColonyTheme();
  const { sendToLam } = useAssistantStore();

  const name = String(data.name || "Campaign");
  const budget = data.budget as number | undefined;
  const area = String(data.area || "your area");
  const objective = String(data.objective || "Leads");
  const status = String(data.status || "PAUSED");
  const headline = data.headline as string | null;
  const description = data.description as string | null;
  const isPaused = status.toUpperCase() === "PAUSED";

  return (
    <CardWrapper>
      {/* Top row */}
      <div className="flex items-center gap-2.5 mb-3">
        <div
          className="flex items-center justify-center w-7 h-7 rounded-full text-white text-xs font-bold"
          style={{ backgroundColor: "#1877F2" }}
        >
          f
        </div>
        <span className="text-sm font-medium flex-1" style={{ color: theme.text }}>
          {name}
        </span>
        <span
          className="text-[11px] font-medium px-2.5 py-0.5 rounded-full"
          style={{
            backgroundColor: isPaused ? withAlpha("#EAB308", 0.15) : withAlpha("#22C55E", 0.15),
            color: isPaused ? "#EAB308" : "#22C55E",
          }}
        >
          {isPaused ? "Paused" : "Live"}
        </span>
      </div>

      {/* Grid row */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        {[
          { label: "Budget", value: budget ? `$${budget}/day` : "—" },
          { label: "Targeting", value: area },
          { label: "Objective", value: objective },
        ].map((item) => (
          <div key={item.label}>
            <div className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: theme.textMuted }}>
              {item.label}
            </div>
            <div className="text-[13px] font-medium" style={{ color: theme.textSoft }}>
              {item.value}
            </div>
          </div>
        ))}
      </div>

      {/* Ad Preview */}
      {headline && (
        <div
          className="rounded-xl p-3 mb-3"
          style={{ backgroundColor: theme.bgGlow }}
        >
          <div className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: theme.textMuted }}>
            Ad Preview
          </div>
          <div className="text-sm font-medium mb-0.5" style={{ color: theme.text }}>
            {headline}
          </div>
          {description && (
            <div className="text-xs" style={{ color: theme.textSoft }}>
              {description}
            </div>
          )}
        </div>
      )}

      {/* Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => sendToLam(`launch my campaign ${name}`)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-opacity hover:opacity-90"
          style={{ backgroundColor: theme.accent, color: theme.bg }}
        >
          <Rocket className="h-3.5 w-3.5" />
          Launch Campaign
        </button>
        <button
          className="px-4 py-2 rounded-xl text-sm font-medium transition-opacity hover:opacity-80"
          style={{
            color: theme.textSoft,
            border: `1px solid ${withAlpha(theme.accent, 0.15)}`,
            backgroundColor: "transparent",
          }}
        >
          Edit
        </button>
      </div>
    </CardWrapper>
  );
}

// ---- B) Connect Account Card ----
function ConnectAccountCard({ data }: { data: Record<string, unknown> }) {
  const { theme } = useColonyTheme();
  const provider = String(data.provider || "meta");
  const isMeta = provider === "meta";

  return (
    <CardWrapper>
      <div className="flex items-center gap-2 mb-2">
        <Link2 className="h-4 w-4" style={{ color: "#EAB308" }} />
        <span className="text-sm font-medium" style={{ color: theme.text }}>
          Connect Your Ad Account
        </span>
      </div>
      <p className="text-xs mb-3" style={{ color: theme.textMuted }}>
        {isMeta
          ? "To create real campaigns, I need access to your Facebook Ads account."
          : "To manage Google campaigns, connect your Google Ads account."}
      </p>
      <a
        href={isMeta ? "/api/meta/auth" : "/api/google-ads/auth"}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: isMeta ? "#1877F2" : "#34A853" }}
      >
        <Facebook className="h-3.5 w-3.5" />
        {isMeta ? "Connect Facebook Ads" : "Connect Google Ads"}
      </a>
    </CardWrapper>
  );
}

// ---- C) Performance Card ----
function PerformanceCard({ data }: { data: Record<string, unknown> }) {
  const { theme } = useColonyTheme();

  const campaigns = (data.campaigns as Array<Record<string, unknown>>) || [];
  const totalSpend = Number(data.total_spend || data.totalSpend || 0);
  const totalLeads = Number(data.total_leads || data.totalLeads || 0);
  const avgCpl = Number(data.avg_cpl || data.avgCpl || 0);
  const wasteTotal = Number(data.waste_total || data.wasteTotal || 0);
  const dateRange = String(data.date_range || "7d");

  const dateLabel = dateRange === "7d" ? "Last 7 Days" : dateRange === "14d" ? "Last 14 Days" : "Last 30 Days";

  return (
    <CardWrapper>
      <div className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: theme.textMuted }}>
        <BarChart3 className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5" />
        Ad Performance — {dateLabel}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          { label: "Spend", value: `$${totalSpend.toFixed(2)}` },
          { label: "Leads", value: String(totalLeads) },
          { label: "Avg CPL", value: avgCpl > 0 ? `$${avgCpl.toFixed(2)}` : "—" },
          ...(wasteTotal > 0
            ? [{ label: "Wasted", value: `$${wasteTotal.toFixed(2)}` }]
            : [{ label: "", value: "" }]),
        ]
          .filter((s) => s.label)
          .map((stat) => (
            <div key={stat.label}>
              <div className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: theme.textMuted }}>
                {stat.label}
              </div>
              <div
                className="text-sm font-medium"
                style={{
                  color: stat.label === "Wasted" ? "#EF4444" : theme.text,
                }}
              >
                {stat.value}
              </div>
            </div>
          ))}
      </div>

      {/* Campaign list */}
      {campaigns.length > 0 && (
        <div className="space-y-1.5">
          {campaigns.slice(0, 5).map((c, i) => {
            const cName = String(c.campaign_name || c.name || "Campaign");
            const cSpend = Number(c.spend || 0);
            const cLeads = Number(c.leads || 0);
            const cCpl = cLeads > 0 ? cSpend / cLeads : null;
            const flags = (c.flags as string[]) || [];
            const isWaste = flags.includes("waste");

            return (
              <div
                key={i}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
                style={{ backgroundColor: theme.bgGlow }}
              >
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: isWaste ? "#EF4444" : "#22C55E" }}
                />
                <span className="flex-1 font-medium truncate" style={{ color: theme.textSoft }}>
                  {cName}
                </span>
                <span style={{ color: theme.textMuted }}>${cSpend.toFixed(2)}</span>
                <span style={{ color: theme.textMuted }}>{cLeads} leads</span>
                <span style={{ color: isWaste ? "#EF4444" : theme.textMuted }}>
                  {cCpl !== null ? `$${cCpl.toFixed(2)}` : "—"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </CardWrapper>
  );
}

// ---- D) Default Action Card ----
function DefaultActionCard({ data }: { data: Record<string, unknown> }) {
  const { theme } = useColonyTheme();

  const actionType = String(data.actionType || data.action_type || "");
  const status = String(data.status || "success");
  const summary = String(data.summary || "");
  const isSuccess = status === "success";

  return (
    <CardWrapper>
      <div className="flex items-center gap-2">
        {isSuccess ? (
          <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: "#22C55E" }} />
        ) : (
          <XCircle className="h-4 w-4 shrink-0" style={{ color: "#EF4444" }} />
        )}
        <span className="text-xs font-medium" style={{ color: theme.textSoft }}>
          {getActionTypeLabel(actionType)}
        </span>
      </div>
      {summary && (
        <p className="text-xs mt-1.5 ml-6" style={{ color: theme.textMuted }}>
          {summary}
        </p>
      )}
    </CardWrapper>
  );
}

// ---- Main ActionCard Router ----
export function ActionCard({ card }: ActionCardProps) {
  switch (card.type) {
    case "campaign_created":
      return <CampaignCard data={card.data} />;
    case "connect_required":
      return <ConnectAccountCard data={card.data} />;
    case "performance_report":
      return <PerformanceCard data={card.data} />;
    default:
      return <DefaultActionCard data={card.data} />;
  }
}
