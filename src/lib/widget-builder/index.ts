/**
 * Widget Builder Module
 * Main exports for the natural language widget builder
 */

// Schema exports
export * from "./schemas";

// Parser exports
export * from "./parser";

// Registry exports
export * from "./registry";

// Persistence exports
export * from "./persistence";

// Data exports
export { dataProvider, mockLeads, mockDeals } from "./data/mock-data";
export type { Lead, Deal, LeadStatus, DealStage, CRMDataProvider } from "./data/mock-data";

