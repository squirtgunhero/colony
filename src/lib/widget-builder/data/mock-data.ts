/**
 * Mock CRM Data
 * Local mock data for leads and deals - designed to be easily swapped for DB
 */

import { subDays } from "date-fns";

// Lead status types
export type LeadStatus = "new" | "contacted" | "qualified" | "unqualified";

// Lead interface
export interface Lead {
  id: string;
  name: string;
  borough: "Manhattan" | "Brooklyn" | "Queens" | "Bronx" | "Staten Island";
  createdAt: Date;
  status: LeadStatus;
  email?: string;
  phone?: string;
}

// Deal stage types
export type DealStage = "discovery" | "proposal" | "negotiation" | "closed_won" | "closed_lost";

// Deal interface
export interface Deal {
  id: string;
  name: string;
  stage: DealStage;
  createdAt: Date;
  value: number;
  leadId?: string;
}

// Helper to generate random dates within a range
function randomDate(daysAgo: number): Date {
  const start = subDays(new Date(), daysAgo);
  const end = new Date();
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Generate mock leads
export const mockLeads: Lead[] = [
  // Manhattan leads
  { id: "lead-1", name: "John Smith", borough: "Manhattan", createdAt: randomDate(5), status: "new", email: "john@example.com" },
  { id: "lead-2", name: "Sarah Johnson", borough: "Manhattan", createdAt: randomDate(3), status: "contacted", email: "sarah@example.com" },
  { id: "lead-3", name: "Michael Chen", borough: "Manhattan", createdAt: randomDate(15), status: "qualified", email: "michael@example.com" },
  { id: "lead-4", name: "Emily Davis", borough: "Manhattan", createdAt: randomDate(25), status: "new", email: "emily@example.com" },
  { id: "lead-5", name: "David Wilson", borough: "Manhattan", createdAt: randomDate(8), status: "contacted" },
  
  // Brooklyn leads
  { id: "lead-6", name: "Jessica Brown", borough: "Brooklyn", createdAt: randomDate(2), status: "new", email: "jessica@example.com" },
  { id: "lead-7", name: "Robert Taylor", borough: "Brooklyn", createdAt: randomDate(12), status: "qualified" },
  { id: "lead-8", name: "Amanda Martinez", borough: "Brooklyn", createdAt: randomDate(7), status: "contacted", email: "amanda@example.com" },
  { id: "lead-9", name: "Christopher Lee", borough: "Brooklyn", createdAt: randomDate(20), status: "unqualified" },
  
  // Queens leads
  { id: "lead-10", name: "Jennifer Garcia", borough: "Queens", createdAt: randomDate(4), status: "new" },
  { id: "lead-11", name: "William Rodriguez", borough: "Queens", createdAt: randomDate(10), status: "contacted" },
  { id: "lead-12", name: "Ashley Thompson", borough: "Queens", createdAt: randomDate(18), status: "qualified", email: "ashley@example.com" },
  
  // Bronx leads
  { id: "lead-13", name: "Daniel White", borough: "Bronx", createdAt: randomDate(6), status: "new" },
  { id: "lead-14", name: "Stephanie Harris", borough: "Bronx", createdAt: randomDate(14), status: "contacted", email: "stephanie@example.com" },
  
  // Staten Island leads
  { id: "lead-15", name: "Kevin Clark", borough: "Staten Island", createdAt: randomDate(9), status: "new" },
  { id: "lead-16", name: "Nicole Lewis", borough: "Staten Island", createdAt: randomDate(22), status: "qualified" },
];

// Generate mock deals
export const mockDeals: Deal[] = [
  // Discovery stage
  { id: "deal-1", name: "Upper East Side Condo", stage: "discovery", createdAt: randomDate(5), value: 850000, leadId: "lead-1" },
  { id: "deal-2", name: "Brooklyn Heights Brownstone", stage: "discovery", createdAt: randomDate(3), value: 2100000, leadId: "lead-6" },
  { id: "deal-3", name: "Astoria 2BR Apartment", stage: "discovery", createdAt: randomDate(8), value: 425000, leadId: "lead-10" },
  
  // Proposal stage
  { id: "deal-4", name: "Tribeca Loft", stage: "proposal", createdAt: randomDate(12), value: 1750000, leadId: "lead-2" },
  { id: "deal-5", name: "Park Slope Duplex", stage: "proposal", createdAt: randomDate(10), value: 1200000, leadId: "lead-7" },
  { id: "deal-6", name: "Long Island City Studio", stage: "proposal", createdAt: randomDate(15), value: 350000 },
  
  // Negotiation stage
  { id: "deal-7", name: "Chelsea Penthouse", stage: "negotiation", createdAt: randomDate(20), value: 3200000, leadId: "lead-3" },
  { id: "deal-8", name: "Williamsburg Conversion", stage: "negotiation", createdAt: randomDate(18), value: 890000, leadId: "lead-8" },
  
  // Closed won
  { id: "deal-9", name: "Financial District 1BR", stage: "closed_won", createdAt: randomDate(25), value: 650000, leadId: "lead-4" },
  { id: "deal-10", name: "DUMBO Waterfront", stage: "closed_won", createdAt: randomDate(28), value: 1450000 },
  
  // Closed lost
  { id: "deal-11", name: "Midtown East Office", stage: "closed_lost", createdAt: randomDate(22), value: 520000 },
  { id: "deal-12", name: "Bushwick Loft", stage: "closed_lost", createdAt: randomDate(30), value: 380000 },
];

// Data access interface - designed for easy DB swap
export interface CRMDataProvider {
  getLeads(filters?: {
    borough?: string;
    dateRange?: { days: number };
    status?: LeadStatus[];
  }): Lead[];
  
  getDeals(filters?: {
    stage?: DealStage[];
    dateRange?: { days: number };
  }): Deal[];
  
  getLeadCount(filters?: {
    dateRange?: { days: number };
  }): number;
  
  getDealsValue(filters?: {
    stage?: DealStage[];
    dateRange?: { days: number };
  }): number;
}

// In-memory implementation
export const mockDataProvider: CRMDataProvider = {
  getLeads(filters) {
    let leads = [...mockLeads];
    
    if (filters?.borough) {
      leads = leads.filter(l => l.borough === filters.borough);
    }
    
    if (filters?.dateRange) {
      const cutoff = subDays(new Date(), filters.dateRange.days);
      leads = leads.filter(l => l.createdAt >= cutoff);
    }
    
    if (filters?.status) {
      leads = leads.filter(l => filters.status!.includes(l.status));
    }
    
    // Sort by createdAt descending
    return leads.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },
  
  getDeals(filters) {
    let deals = [...mockDeals];
    
    if (filters?.stage) {
      deals = deals.filter(d => filters.stage!.includes(d.stage));
    }
    
    if (filters?.dateRange) {
      const cutoff = subDays(new Date(), filters.dateRange.days);
      deals = deals.filter(d => d.createdAt >= cutoff);
    }
    
    // Sort by createdAt descending
    return deals.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },
  
  getLeadCount(filters) {
    let leads = [...mockLeads];
    
    if (filters?.dateRange) {
      const cutoff = subDays(new Date(), filters.dateRange.days);
      leads = leads.filter(l => l.createdAt >= cutoff);
    }
    
    return leads.length;
  },
  
  getDealsValue(filters) {
    let deals = [...mockDeals];
    
    if (filters?.stage) {
      deals = deals.filter(d => filters.stage!.includes(d.stage));
    }
    
    if (filters?.dateRange) {
      const cutoff = subDays(new Date(), filters.dateRange.days);
      deals = deals.filter(d => d.createdAt >= cutoff);
    }
    
    return deals.reduce((sum, d) => sum + d.value, 0);
  },
};

// Export the current provider (can be swapped for DB implementation)
export const dataProvider = mockDataProvider;

