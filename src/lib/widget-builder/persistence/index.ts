/**
 * Persistence Layer Exports
 * Single point of access for layout persistence
 */

export type { LayoutPersistence } from "./types";
export { inMemoryPersistence, clearAllLayouts, getStoreSize } from "./in-memory";

// Export the current persistence implementation
// Change this to switch storage backends
import { inMemoryPersistence } from "./in-memory";
export const persistence = inMemoryPersistence;

