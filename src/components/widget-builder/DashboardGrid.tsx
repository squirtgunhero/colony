"use client";

/**
 * Dashboard Grid Component
 * Three-region responsive grid layout with drag-and-drop support
 */

import { useCallback, useMemo, useRef } from "react";
import { GridLayout, type Layout } from "react-grid-layout";
import { GripVertical, X } from "lucide-react";
import { WidgetRenderer } from "./WidgetRenderer";
import { Button } from "@/components/ui/button";
import type { WidgetSpec, Region, LayoutItem } from "@/lib/widget-builder";

// Import react-grid-layout styles
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

interface DashboardGridProps {
  widgets: WidgetSpec[];
  gridLayout: {
    left: LayoutItem[];
    main: LayoutItem[];
    right: LayoutItem[];
  };
  onLayoutChange: (region: Region, layout: LayoutItem[]) => void;
  onWidgetRemove: (widgetId: string) => void;
}

// Column configuration per region
const REGION_COLS = {
  left: 3,
  main: 6,
  right: 3,
} as const;

// Row height in pixels
const ROW_HEIGHT = 80;

// Region labels
const REGION_LABELS: Record<Region, string> = {
  left: "Left Panel",
  main: "Main Area",
  right: "Right Panel",
};

/**
 * Region Grid Component
 */
function RegionGrid({
  region,
  widgets,
  layout,
  onLayoutChange,
  onWidgetRemove,
  cols,
}: {
  region: Region;
  widgets: WidgetSpec[];
  layout: LayoutItem[];
  onLayoutChange: (layout: LayoutItem[]) => void;
  onWidgetRemove: (widgetId: string) => void;
  cols: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Build layout from widgets if empty
  const gridLayout = useMemo(() => {
    if (layout.length > 0) {
      return layout.map(item => ({
        i: item.i,
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h,
        minW: item.minW || 2,
        minH: item.minH || 2,
      }));
    }
    
    // Generate layout from widgets
    let currentY = 0;
    return widgets.map((widget) => {
      const item: Layout = {
        i: widget.id,
        x: 0,
        y: currentY,
        w: Math.min(widget.placement.w, cols),
        h: widget.placement.h,
        minW: 2,
        minH: 2,
      };
      currentY += widget.placement.h;
      return item;
    });
  }, [layout, widgets, cols]);

  const handleLayoutChange = useCallback((newLayout: Layout[]) => {
    const layoutItems: LayoutItem[] = newLayout.map(item => ({
      i: item.i,
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
    }));
    onLayoutChange(layoutItems);
  }, [onLayoutChange]);

  if (widgets.length === 0) {
    return (
      <div className="h-full min-h-[200px] flex items-center justify-center border-2 border-dashed border-border/50 rounded-xl">
        <p className="text-sm text-muted-foreground">
          {REGION_LABELS[region]} - No widgets
        </p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full">
      <GridLayout
        className="layout"
        layout={gridLayout}
        cols={cols}
        rowHeight={ROW_HEIGHT}
        width={containerRef.current?.clientWidth || 400}
        margin={[12, 12]}
        containerPadding={[0, 0]}
        isDraggable={true}
        isResizable={true}
        onLayoutChange={handleLayoutChange}
        draggableHandle=".widget-drag-handle"
        useCSSTransforms={true}
      >
        {widgets.map((widget) => (
          <div key={widget.id} className="group">
            <div className="relative h-full">
              {/* Widget controls */}
              <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="widget-drag-handle p-1.5 rounded-md bg-background/80 backdrop-blur border cursor-grab hover:bg-accent active:cursor-grabbing">
                  <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 bg-background/80 backdrop-blur border hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => onWidgetRemove(widget.id)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
              
              {/* Widget content */}
              <WidgetRenderer widget={widget} />
            </div>
          </div>
        ))}
      </GridLayout>
    </div>
  );
}

/**
 * Main Dashboard Grid
 */
export function DashboardGrid({
  widgets,
  gridLayout,
  onLayoutChange,
  onWidgetRemove,
}: DashboardGridProps) {
  // Group widgets by region
  const widgetsByRegion = useMemo(() => {
    const grouped: Record<Region, WidgetSpec[]> = {
      left: [],
      main: [],
      right: [],
    };
    
    widgets.forEach((widget) => {
      const region = widget.placement.region;
      if (region in grouped) {
        grouped[region].push(widget);
      }
    });
    
    return grouped;
  }, [widgets]);

  return (
    <div className="grid grid-cols-12 gap-4 h-full min-h-[600px]">
      {/* Left Region - 3 columns */}
      <div className="col-span-12 lg:col-span-3">
        <div className="mb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {REGION_LABELS.left}
          </span>
        </div>
        <RegionGrid
          region="left"
          widgets={widgetsByRegion.left}
          layout={gridLayout.left}
          onLayoutChange={(layout) => onLayoutChange("left", layout)}
          onWidgetRemove={onWidgetRemove}
          cols={REGION_COLS.left}
        />
      </div>
      
      {/* Main Region - 6 columns */}
      <div className="col-span-12 lg:col-span-6">
        <div className="mb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {REGION_LABELS.main}
          </span>
        </div>
        <RegionGrid
          region="main"
          widgets={widgetsByRegion.main}
          layout={gridLayout.main}
          onLayoutChange={(layout) => onLayoutChange("main", layout)}
          onWidgetRemove={onWidgetRemove}
          cols={REGION_COLS.main}
        />
      </div>
      
      {/* Right Region - 3 columns */}
      <div className="col-span-12 lg:col-span-3">
        <div className="mb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {REGION_LABELS.right}
          </span>
        </div>
        <RegionGrid
          region="right"
          widgets={widgetsByRegion.right}
          layout={gridLayout.right}
          onLayoutChange={(layout) => onLayoutChange("right", layout)}
          onWidgetRemove={onWidgetRemove}
          cols={REGION_COLS.right}
        />
      </div>
    </div>
  );
}
