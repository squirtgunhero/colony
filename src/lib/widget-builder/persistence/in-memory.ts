/**
 * In-Memory Persistence Implementation
 * Stores layouts in memory - data lost on server restart
 * Perfect for development and MVP testing
 */

import type { LayoutSpec, SaveLayoutRequest } from "../schemas";
import type { LayoutPersistence } from "./types";

// Storage key format: userId:pageId
type StorageKey = `${string}:${string}`;

// In-memory storage map
const layoutStore = new Map<StorageKey, LayoutSpec>();

/**
 * Create a storage key from userId and pageId
 */
function makeKey(userId: string, pageId: string): StorageKey {
  return `${userId}:${pageId}`;
}

/**
 * In-memory persistence implementation
 */
export const inMemoryPersistence: LayoutPersistence = {
  async loadLayout(userId: string, pageId: string): Promise<LayoutSpec | null> {
    const key = makeKey(userId, pageId);
    const layout = layoutStore.get(key);
    return layout ?? null;
  },
  
  async saveLayout(
    userId: string,
    pageId: string,
    layout: SaveLayoutRequest
  ): Promise<LayoutSpec> {
    const key = makeKey(userId, pageId);
    
    const fullLayout: LayoutSpec = {
      ...layout,
      userId,
      pageId,
      updatedAt: new Date().toISOString(),
    };
    
    layoutStore.set(key, fullLayout);
    return fullLayout;
  },
  
  async deleteLayout(userId: string, pageId: string): Promise<boolean> {
    const key = makeKey(userId, pageId);
    return layoutStore.delete(key);
  },
  
  async listLayouts(userId: string): Promise<LayoutSpec[]> {
    const layouts: LayoutSpec[] = [];
    
    for (const [key, layout] of layoutStore.entries()) {
      if (key.startsWith(`${userId}:`)) {
        layouts.push(layout);
      }
    }
    
    return layouts;
  },
};

// Utility function to clear all layouts (useful for testing)
export function clearAllLayouts(): void {
  layoutStore.clear();
}

// Utility function to get the current store size (useful for debugging)
export function getStoreSize(): number {
  return layoutStore.size;
}

