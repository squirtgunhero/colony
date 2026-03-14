"use client";

import { useRouter } from "next/navigation";
import { User, Building2, Handshake, CheckSquare, ExternalLink } from "lucide-react";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import { useModeStore } from "@/lib/mode";

type CRMCardType = "contact" | "deal" | "property" | "task";

interface CRMCardData {
  type: CRMCardType;
  id: string;
  title: string;
  subtitle?: string;
  fields: { label: string; value: string }[];
  route?: string; // e.g. /contacts/abc123
}

interface InlineCRMCardProps {
  data: CRMCardData;
}

const iconMap: Record<CRMCardType, typeof User> = {
  contact: User,
  deal: Handshake,
  property: Building2,
  task: CheckSquare,
};

export function InlineCRMCard({ data }: InlineCRMCardProps) {
  const { theme } = useColonyTheme();
  const router = useRouter();
  const { setViewMode } = useModeStore();
  const Icon = iconMap[data.type];

  const handleOpenInClassic = () => {
    if (data.route) {
      setViewMode("classic");
      router.push(data.route);
    }
  };

  return (
    <div
      className="rounded-xl p-4 mt-2 mb-1 max-w-md transition-colors duration-300"
      style={{
        backgroundColor: withAlpha(theme.accent, 0.06),
        border: `1px solid ${withAlpha(theme.accent, 0.15)}`,
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-3">
        <div
          className="flex items-center justify-center h-8 w-8 rounded-lg"
          style={{ backgroundColor: withAlpha(theme.accent, 0.12) }}
        >
          <Icon className="h-4 w-4" style={{ color: theme.accent }} />
        </div>
        <div className="flex-1 min-w-0">
          <p
            className="text-sm font-medium truncate"
            style={{ color: theme.text }}
          >
            {data.title}
          </p>
          {data.subtitle && (
            <p
              className="text-[11px] truncate"
              style={{ color: theme.textMuted }}
            >
              {data.subtitle}
            </p>
          )}
        </div>
        {data.route && (
          <button
            onClick={handleOpenInClassic}
            className="flex items-center justify-center h-7 w-7 rounded-lg transition-colors hover:opacity-80"
            style={{ backgroundColor: withAlpha(theme.accent, 0.1) }}
            title="Open in Classic View"
          >
            <ExternalLink
              className="h-3.5 w-3.5"
              style={{ color: theme.accent }}
            />
          </button>
        )}
      </div>

      {/* Fields */}
      <div className="space-y-1.5">
        {data.fields.map((field) => (
          <div key={field.label} className="flex items-baseline justify-between gap-2">
            <span
              className="text-[11px] uppercase tracking-wider shrink-0"
              style={{ color: theme.textMuted, opacity: 0.7 }}
            >
              {field.label}
            </span>
            <span
              className="text-[13px] text-right truncate"
              style={{ color: theme.text }}
            >
              {field.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
