"use client";

import { useContext } from "react";
import { DialerContext, type DialerContextValue } from "@/components/dialer/DialerProvider";

export function useDialer(): DialerContextValue {
  const ctx = useContext(DialerContext);
  if (!ctx) {
    throw new Error("useDialer must be used within a DialerProvider");
  }
  return ctx;
}
