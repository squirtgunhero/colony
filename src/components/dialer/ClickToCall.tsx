"use client";

import { useContext, useCallback } from "react";
import { Phone } from "lucide-react";
import { DialerContext } from "./DialerProvider";

interface ClickToCallProps {
  phone: string;
  contactId?: string;
  contactName?: string;
  size?: "sm" | "md";
}

export function ClickToCall({ phone, contactId, contactName, size = "sm" }: ClickToCallProps) {
  const dialer = useContext(DialerContext);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (dialer?.call) {
        dialer.call(phone, contactId, contactName);
      }
    },
    [dialer, phone, contactId, contactName]
  );

  if (!dialer?.isReady) {
    // Fallback to tel: link
    return (
      <a
        href={`tel:${phone}`}
        className="inline-flex items-center justify-center rounded-md transition-colors hover:bg-white/5"
        style={{ height: size === "sm" ? 28 : 32, width: size === "sm" ? 28 : 32 }}
        title={`Call ${phone}`}
        onClick={(e) => e.stopPropagation()}
      >
        <Phone className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
      </a>
    );
  }

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center justify-center rounded-md transition-colors hover:bg-white/10"
      style={{ height: size === "sm" ? 28 : 32, width: size === "sm" ? 28 : 32 }}
      title={`Call ${contactName || phone}`}
    >
      <Phone className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
    </button>
  );
}
