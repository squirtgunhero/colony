"use client";

import { useState } from "react";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import { Monitor, Tablet, Smartphone } from "lucide-react";

interface SitePreviewProps {
  html: string | null;
  isGenerating: boolean;
}

const DEVICE_WIDTHS = {
  desktop: "100%",
  tablet: "768px",
  mobile: "375px",
} as const;

type DeviceMode = keyof typeof DEVICE_WIDTHS;

export function SitePreview({ html, isGenerating }: SitePreviewProps) {
  const { theme } = useColonyTheme();
  const [device, setDevice] = useState<DeviceMode>("desktop");

  const devices: { mode: DeviceMode; icon: typeof Monitor; label: string }[] = [
    { mode: "desktop", icon: Monitor, label: "Desktop" },
    { mode: "tablet", icon: Tablet, label: "Tablet" },
    { mode: "mobile", icon: Smartphone, label: "Mobile" },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Device toggle toolbar */}
      <div
        className="flex items-center justify-center gap-1 py-2 px-4 shrink-0"
        style={{ borderBottom: `1px solid ${withAlpha(theme.text, 0.06)}` }}
      >
        {devices.map(({ mode, icon: Icon, label }) => (
          <button
            key={mode}
            onClick={() => setDevice(mode)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{
              backgroundColor:
                device === mode ? withAlpha(theme.text, 0.08) : "transparent",
              color:
                device === mode ? theme.text : withAlpha(theme.text, 0.4),
            }}
            title={label}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Preview area */}
      <div className="flex-1 flex items-start justify-center p-4 overflow-auto min-h-0">
        {isGenerating ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div
              className="h-8 w-8 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: withAlpha(theme.accent, 0.3), borderTopColor: "transparent" }}
            />
            <p className="text-sm" style={{ color: theme.textMuted }}>
              Generating your site...
            </p>
          </div>
        ) : html ? (
          <div
            className="h-full transition-all duration-300 bg-white rounded-lg overflow-hidden"
            style={{
              width: DEVICE_WIDTHS[device],
              maxWidth: "100%",
              boxShadow: theme.isDark
                ? "0 8px 32px rgba(0,0,0,0.5)"
                : "0 8px 32px rgba(0,0,0,0.1)",
            }}
          >
            <iframe
              srcDoc={html}
              sandbox="allow-scripts"
              className="w-full h-full border-0"
              title="Site preview"
              style={{ minHeight: "600px" }}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <Monitor
              className="h-12 w-12"
              style={{ color: withAlpha(theme.text, 0.15) }}
              strokeWidth={1}
            />
            <p className="text-sm" style={{ color: theme.textMuted }}>
              Describe your site to get started
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
