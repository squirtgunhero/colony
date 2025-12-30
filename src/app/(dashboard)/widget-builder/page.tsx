"use client";

/**
 * Widget Builder Dashboard Page
 * Natural language widget builder with drag-and-drop grid layout
 */

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Layers, RefreshCw, Trash2 } from "lucide-react";
import { CommandBar } from "@/components/widget-builder/CommandBar";
import { DashboardGrid } from "@/components/widget-builder/DashboardGrid";
import { Button } from "@/components/ui/button";
import type { WidgetSpec, Region, LayoutItem, LayoutSpec } from "@/lib/widget-builder";

// Page ID for this dashboard
const PAGE_ID = "home";

export default function WidgetBuilderPage() {
  // State for widgets and layout
  const [widgets, setWidgets] = useState<WidgetSpec[]>([]);
  const [gridLayout, setGridLayout] = useState<{
    left: LayoutItem[];
    main: LayoutItem[];
    right: LayoutItem[];
  }>({
    left: [],
    main: [],
    right: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load layout on mount
  useEffect(() => {
    loadLayout();
  }, []);

  // Load layout from API
  const loadLayout = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/layout?pageId=${PAGE_ID}`);
      const data: LayoutSpec = await response.json();
      
      if (data.widgets) {
        setWidgets(data.widgets);
      }
      if (data.gridLayout) {
        setGridLayout(data.gridLayout);
      }
    } catch (error) {
      console.error("Failed to load layout:", error);
      toast.error("Failed to load dashboard layout");
    } finally {
      setIsLoading(false);
    }
  };

  // Save layout to API
  const saveLayout = useCallback(async (
    newWidgets: WidgetSpec[],
    newGridLayout: typeof gridLayout
  ) => {
    try {
      setIsSaving(true);
      const response = await fetch("/api/layout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageId: PAGE_ID,
          widgets: newWidgets,
          gridLayout: newGridLayout,
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to save layout");
      }
    } catch (error) {
      console.error("Failed to save layout:", error);
      toast.error("Failed to save layout changes");
    } finally {
      setIsSaving(false);
    }
  }, []);

  // Handle new widget creation from command bar
  const handleWidgetCreated = useCallback((widgetSpec: unknown) => {
    const widget = widgetSpec as WidgetSpec;
    
    // Add widget to list
    const newWidgets = [...widgets, widget];
    setWidgets(newWidgets);
    
    // Add to appropriate region's layout
    const region = widget.placement.region;
    const regionLayout = gridLayout[region];
    
    // Calculate Y position (stack at bottom)
    const maxY = regionLayout.reduce((max, item) => Math.max(max, item.y + item.h), 0);
    
    const newLayoutItem: LayoutItem = {
      i: widget.id,
      x: 0,
      y: maxY,
      w: widget.placement.w,
      h: widget.placement.h,
    };
    
    const newGridLayout = {
      ...gridLayout,
      [region]: [...regionLayout, newLayoutItem],
    };
    
    setGridLayout(newGridLayout);
    
    // Save to persistence
    saveLayout(newWidgets, newGridLayout);
    
    toast.success(`Created ${widget.widgetType.replace("_", " ")} widget`);
  }, [widgets, gridLayout, saveLayout]);

  // Handle layout changes from drag/resize
  const handleLayoutChange = useCallback((region: Region, layout: LayoutItem[]) => {
    const newGridLayout = {
      ...gridLayout,
      [region]: layout,
    };
    setGridLayout(newGridLayout);
    
    // Debounced save would be better here, but for MVP we save immediately
    saveLayout(widgets, newGridLayout);
  }, [widgets, gridLayout, saveLayout]);

  // Handle widget removal
  const handleWidgetRemove = useCallback((widgetId: string) => {
    const widget = widgets.find(w => w.id === widgetId);
    if (!widget) return;
    
    // Remove widget from list
    const newWidgets = widgets.filter(w => w.id !== widgetId);
    setWidgets(newWidgets);
    
    // Remove from layout
    const region = widget.placement.region;
    const newGridLayout = {
      ...gridLayout,
      [region]: gridLayout[region].filter(item => item.i !== widgetId),
    };
    setGridLayout(newGridLayout);
    
    // Save to persistence
    saveLayout(newWidgets, newGridLayout);
    
    toast.success("Widget removed");
  }, [widgets, gridLayout, saveLayout]);

  // Clear all widgets
  const handleClearAll = useCallback(async () => {
    try {
      await fetch(`/api/layout?pageId=${PAGE_ID}`, { method: "DELETE" });
      setWidgets([]);
      setGridLayout({ left: [], main: [], right: [] });
      toast.success("Dashboard cleared");
    } catch (error) {
      console.error("Failed to clear dashboard:", error);
      toast.error("Failed to clear dashboard");
    }
  }, []);

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-14 z-30">
        <div className="px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Layers className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-semibold">Widget Builder</h1>
                <p className="text-sm text-muted-foreground">
                  Build your dashboard with natural language commands
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {isSaving && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  Saving...
                </span>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={loadLayout}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              
              {widgets.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearAll}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear All
                </Button>
              )}
            </div>
          </div>
          
          {/* Command Bar */}
          <CommandBar onWidgetCreated={handleWidgetCreated} />
        </div>
      </div>
      
      {/* Dashboard Grid */}
      <div className="flex-1 px-6 lg:px-8 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-96">
            <div className="flex flex-col items-center gap-3">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading dashboard...</p>
            </div>
          </div>
        ) : (
          <DashboardGrid
            widgets={widgets}
            gridLayout={gridLayout}
            onLayoutChange={handleLayoutChange}
            onWidgetRemove={handleWidgetRemove}
          />
        )}
      </div>
      
      {/* Help footer */}
      {widgets.length === 0 && !isLoading && (
        <div className="px-6 lg:px-8 pb-8">
          <div className="bg-muted/50 rounded-xl p-6 text-center">
            <h3 className="text-sm font-medium mb-2">Get Started</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Try these example commands to add widgets to your dashboard:
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                "Add a KPI card on the left showing new leads last 7 days",
                "Create a leads table in the main area filtered to Manhattan",
                "Add a pipeline kanban on the right grouped by stage last 30 days",
              ].map((example, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    // Trigger command bar with this text
                    const input = document.querySelector('input[placeholder*="command"]') as HTMLInputElement;
                    if (input) {
                      input.value = example;
                      input.focus();
                      // Trigger React's onChange
                      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                        window.HTMLInputElement.prototype,
                        "value"
                      )?.set;
                      nativeInputValueSetter?.call(input, example);
                      const event = new Event("input", { bubbles: true });
                      input.dispatchEvent(event);
                    }
                  }}
                  className="px-4 py-2 text-xs rounded-full bg-background border hover:bg-accent transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

