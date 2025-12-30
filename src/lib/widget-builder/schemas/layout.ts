/**
 * Layout Schema Definitions
 * Zod schemas for dashboard layout persistence
 */

import { z } from "zod";
import { WidgetSpecSchema } from "./widget";

// Layout item for react-grid-layout compatibility
export const LayoutItemSchema = z.object({
  i: z.string(), // Widget ID
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  w: z.number().int().min(1),
  h: z.number().int().min(1),
  minW: z.number().int().min(1).optional(),
  minH: z.number().int().min(1).optional(),
  maxW: z.number().int().optional(),
  maxH: z.number().int().optional(),
  static: z.boolean().optional(),
});
export type LayoutItem = z.infer<typeof LayoutItemSchema>;

// Full layout specification for a page
export const LayoutSpecSchema = z.object({
  pageId: z.string(),
  userId: z.string(),
  widgets: z.array(WidgetSpecSchema),
  gridLayout: z.object({
    left: z.array(LayoutItemSchema),
    main: z.array(LayoutItemSchema),
    right: z.array(LayoutItemSchema),
  }),
  updatedAt: z.string(),
});
export type LayoutSpec = z.infer<typeof LayoutSpecSchema>;

// Request/response schemas for API
export const SaveLayoutRequestSchema = z.object({
  pageId: z.string(),
  widgets: z.array(WidgetSpecSchema),
  gridLayout: z.object({
    left: z.array(LayoutItemSchema),
    main: z.array(LayoutItemSchema),
    right: z.array(LayoutItemSchema),
  }),
});
export type SaveLayoutRequest = z.infer<typeof SaveLayoutRequestSchema>;

export const LoadLayoutResponseSchema = LayoutSpecSchema.nullable();
export type LoadLayoutResponse = z.infer<typeof LoadLayoutResponseSchema>;

