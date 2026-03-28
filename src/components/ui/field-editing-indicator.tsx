"use client";

// ============================================================================
// COLONY - Field Editing Indicator
// Shows which user is editing a field with a colored outline + name badge
// Soft lock — shows a warning but doesn't prevent editing
// ============================================================================

import { useState, useCallback } from "react";
import type { PresenceUser } from "@/lib/realtime/presence";

interface FieldEditingWrapperProps {
  fieldName: string;
  editors: PresenceUser[];
  onFocus?: () => void;
  onBlur?: () => void;
  children: React.ReactNode;
}

/**
 * Wraps an editable field to show who else is editing it.
 * When another user is editing the same field, shows a colored outline
 * and their name. Clicking through still works (soft lock).
 */
export function FieldEditingWrapper({
  fieldName,
  editors,
  onFocus,
  onBlur,
  children,
}: FieldEditingWrapperProps) {
  const [showWarning, setShowWarning] = useState(false);

  // Find if anyone else is editing this field
  const activeEditor = editors.find((e) => e.editing === fieldName);

  const handleFocus = useCallback(() => {
    if (activeEditor) {
      setShowWarning(true);
      // Auto-dismiss warning after 3s
      setTimeout(() => setShowWarning(false), 3000);
    }
    onFocus?.();
  }, [activeEditor, onFocus]);

  const handleBlur = useCallback(() => {
    setShowWarning(false);
    onBlur?.();
  }, [onBlur]);

  return (
    <div
      className="relative"
      onFocusCapture={handleFocus}
      onBlurCapture={handleBlur}
    >
      {/* Colored outline when someone else is editing */}
      {activeEditor && (
        <div
          className="absolute inset-0 rounded-lg pointer-events-none z-10"
          style={{
            border: `2px solid ${activeEditor.color}`,
            boxShadow: `0 0 0 1px ${activeEditor.color}20`,
          }}
        />
      )}

      {children}

      {/* Editor name badge */}
      {activeEditor && (
        <div
          className="absolute -top-2.5 right-2 px-1.5 py-0.5 rounded text-[9px] font-medium z-20 whitespace-nowrap"
          style={{
            backgroundColor: activeEditor.color,
            color: "#fff",
          }}
        >
          {activeEditor.name.split(" ")[0]} is editing
        </div>
      )}

      {/* Warning when you click into a field someone else is editing */}
      {showWarning && activeEditor && (
        <div
          className="absolute left-0 -bottom-8 px-2 py-1 rounded text-[10px] z-20 whitespace-nowrap"
          style={{
            backgroundColor: "#1f2937",
            color: "#fbbf24",
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
          }}
        >
          {activeEditor.name} is also editing this field
        </div>
      )}
    </div>
  );
}
