/**
 * Persistence Layer Types
 * Interface definitions for layout persistence
 */

import type { LayoutSpec, SaveLayoutRequest } from "../schemas";

/**
 * Persistence interface - implement this for different storage backends
 * Currently using in-memory storage, can be swapped for:
 * - Prisma/PostgreSQL
 * - Redis
 * - LocalStorage (client-side)
 * - etc.
 */
export interface LayoutPersistence {
  /**
   * Load layout for a specific user and page
   */
  loadLayout(userId: string, pageId: string): Promise<LayoutSpec | null>;
  
  /**
   * Save layout for a specific user and page
   */
  saveLayout(
    userId: string, 
    pageId: string, 
    layout: SaveLayoutRequest
  ): Promise<LayoutSpec>;
  
  /**
   * Delete layout for a specific user and page
   */
  deleteLayout(userId: string, pageId: string): Promise<boolean>;
  
  /**
   * List all layouts for a user
   */
  listLayouts(userId: string): Promise<LayoutSpec[]>;
}

