"use client";

// ============================================
// COLONY - Context Drawer
// Right-side drawer for on-demand CRM context
// Opens via commands or chat triggers
// ============================================

import { useEffect, useCallback } from "react";
import { X, ChevronRight, Users, Home, Handshake, CheckSquare, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useModeStore, type DrawerPanelType } from "@/lib/mode";

// Panel components
import { PipelinePanel } from "./panels/PipelinePanel";
import { ContactPanel } from "./panels/ContactPanel";
import { DealPanel } from "./panels/DealPanel";
import { TaskPanel } from "./panels/TaskPanel";
import { PropertyPanel } from "./panels/PropertyPanel";

const panelIcons: Record<string, typeof Users> = {
  pipeline: BarChart3,
  contact: Users,
  deal: Handshake,
  task: CheckSquare,
  property: Home,
};

const panelTitles: Record<string, string> = {
  pipeline: "Pipeline Overview",
  contact: "Contact Details",
  deal: "Deal Details",
  task: "Task Details",
  property: "Property Details",
};

export function ContextDrawer() {
  const { drawer, closeDrawer } = useModeStore();
  const { isOpen, panelType, entityId, entityName } = drawer;

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        closeDrawer();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeDrawer]);

  // Render panel content based on type
  const renderPanel = useCallback(() => {
    if (!panelType) return null;

    switch (panelType) {
      case "pipeline":
        return <PipelinePanel />;
      case "contact":
        return <ContactPanel entityId={entityId} />;
      case "deal":
        return <DealPanel entityId={entityId} />;
      case "task":
        return <TaskPanel entityId={entityId} />;
      case "property":
        return <PropertyPanel entityId={entityId} />;
      default:
        return null;
    }
  }, [panelType, entityId]);

  if (!isOpen || !panelType) {
    return null;
  }

  const Icon = panelIcons[panelType] || BarChart3;
  const title = entityName || panelTitles[panelType] || "Details";

  return (
    <>
      {/* Backdrop - subtle for context drawer */}
      <div
        className="fixed inset-0 z-40 bg-background/20 backdrop-blur-[2px] md:pl-52"
        onClick={closeDrawer}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div
        role="dialog"
        aria-label={title}
        aria-modal="true"
        className={cn(
          "fixed top-0 right-0 z-50 h-full",
          "w-full sm:w-[420px] lg:w-[480px]",
          "flex flex-col",
          "bg-card",
          "border-l border-border/50",
          "shadow-[-8px_0_32px_rgba(0,0,0,0.08)]",
          "dark:shadow-[-8px_0_32px_rgba(0,0,0,0.3)]",
          "animate-in slide-in-from-right duration-200 ease-out"
        )}
        suppressHydrationWarning
      >
        {/* Header */}
        <header className="flex items-center justify-between h-14 px-4 border-b border-border/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-muted">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-sm font-semibold truncate max-w-[200px]">{title}</h2>
              {entityId && (
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  {panelType}
                </p>
              )}
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={closeDrawer}
            aria-label="Close drawer"
          >
            <X className="h-4 w-4" />
          </Button>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {renderPanel()}
        </div>

        {/* Footer - optional actions */}
        <footer className="flex items-center justify-end gap-2 h-14 px-4 border-t border-border/50 shrink-0 bg-muted/30">
          <Button
            variant="ghost"
            size="sm"
            onClick={closeDrawer}
            className="text-muted-foreground"
          >
            Close
          </Button>
        </footer>
      </div>
    </>
  );
}
