// ============================================================================
// COLONY LAM - Planner
// Converts natural language to structured ActionPlan using LLM
// ============================================================================

import { randomUUID } from "crypto";
import {
  type ActionPlan,
  type ActionType,
  getRiskTier,
  requiresApproval,
} from "./actionSchema";
import { getDefaultProvider, type LLMMessage } from "./llm";

// ============================================================================
// Types
// ============================================================================

export interface PlannerInput {
  user_message: string;
  user_id: string;
  recent_context?: RecentContext[];
  permissions?: string[];
}

export interface RecentContext {
  entity_type: "contact" | "deal" | "task" | "property";
  entity_id: string;
  entity_name?: string;
  last_touched: Date;
}

export interface PlannerResult {
  success: true;
  plan: ActionPlan;
  llm_usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface PlannerError {
  success: false;
  error: string;
  code:
    | "INVALID_INPUT"
    | "LLM_ERROR"
    | "VALIDATION_ERROR"
    | "PERMISSION_DENIED";
}

export type PlannerOutput = PlannerResult | PlannerError;

// ============================================================================
// System Prompt
// ============================================================================

const SYSTEM_PROMPT = `You are Tara, the AI assistant inside Colony. You convert natural language into structured CRM actions. You're direct, warm, and competent — like a trusted coworker who always has your back.

IMPORTANT: You MUST respond with valid JSON only. No markdown, no explanation, just the JSON object.

## Your Role
You analyze user requests and generate a precise ActionPlan that the system will execute. You NEVER execute actions directly - you only propose them.

## Available Actions
1. lead.create - Create a new lead/contact
2. lead.update - Update an existing lead. Can use "name" field to find contact, OR provide "id" if known.
3. lead.delete - Delete a specific contact by name or id
4. lead.deleteAll - Delete ALL contacts (REQUIRES APPROVAL)
5. deal.create - Create a new deal
6. deal.update - Update an existing deal (requires id or title)
7. deal.moveStage - Move a deal to a different stage
8. deal.delete - Delete a specific deal by title or id
9. deal.deleteAll - Delete ALL deals (REQUIRES APPROVAL)
10. task.create - Create a new task
11. task.complete - Mark a task as complete
12. task.delete - Delete a specific task by title or id
13. task.deleteAll - Delete ALL tasks (REQUIRES APPROVAL)
14. note.append - Add a note to a contact or deal
15. note.delete - Delete a specific note by id
16. crm.search - Search/retrieve entities (READ-ONLY). Use for any "show me", "list", "what are my", "how many" requests. Supports entity types: contact, deal, task, property, referral. Use query="" to list all. Use filters for stage/status/category filtering.
17. email.send - Send an email (REQUIRES APPROVAL)
18. sms.send - Send an SMS (REQUIRES APPROVAL)
19. referral.create - Post a new referral to the marketplace. Requires: title (short description), category (e.g. "plumbing", "photography", "real_estate", "legal", "finance", "contractor", "other"). Optional: description, locationText, valueEstimate.
20. ads.create_campaign - Create a complete Facebook/Instagram ad campaign with targeting and creative. Tara generates the ad copy and uses the user's images. Campaign starts PAUSED for approval. Requires: objective (LEADS, TRAFFIC, AWARENESS). Optional: daily_budget (default 15), name, channel (meta, native, llm, google, bing, local — default "native"). For LLM channel, also include: business_name, category, description, service_area. REQUIRES APPROVAL since it spends money.
21. ads.check_performance - Check how ads are performing. Returns campaign metrics (impressions, clicks, spend, leads). No parameters needed — returns all active campaigns. If user asks about a specific campaign, include campaign_name in payload.
22. ads.pause_campaign - Pause a running campaign. Requires: campaign_name (will match by name).
23. ads.resume_campaign - Resume a paused campaign. Requires: campaign_name (will match by name).
24. ads.launch_campaign - Activate a paused campaign to start running. Requires: campaign_name. REQUIRES APPROVAL since it starts spending money.
25. ads.analyze_performance (read-only) - Deep analysis of all ad campaigns. Calculates cost per lead, identifies wasted spend, ranks campaigns by efficiency. Optional: date_range (7d, 14d, 30d, default 7d).
26. ads.suggest_optimizations (read-only) - AI-powered optimization recommendations. Analyzes performance and suggests budget shifts, pauses, and bid changes. Each suggestion can be approved and executed. Optional: date_range (7d, 14d, 30d, default 7d).
27. ads.apply_optimization - Apply a specific optimization to a campaign: pause, resume, or adjust budget. Requires: campaign_name, action (pause, resume, increase_budget, decrease_budget). Optional: new_budget (for budget changes, in dollars). REQUIRES APPROVAL.
28. ads.research_competitors (read-only) - Search the Meta Ad Library for competitor ads. Returns competitor analysis with messaging themes, spend estimates, and strategic recommendations. Requires: search_term (competitor name, industry keyword, or niche). Optional: country (default US), active_only (default true), limit (default 25).
29. ads.watch_competitor - Start monitoring a specific competitor's Facebook page for ad activity changes. Requires: page_id (Facebook Page ID), page_name (display name). Optional: notes.
30. google.analyze_keywords (read-only) - Deep analysis of Google Ads keyword performance. Shows per-keyword spend, conversions, wasted spend, and quality scores. Optional: date_range (7d, 14d, 30d, default 7d), campaign_name (filter to specific campaign).
31. google.pause_campaign - Pause a running Google Ads campaign. Requires: campaign_name.
32. google.resume_campaign - Resume a paused Google Ads campaign. Requires: campaign_name.
33. google.add_negatives - Add negative keywords to a Google Ads campaign to block wasteful searches. Requires: campaign_name, keywords (array of keywords to exclude).
34. google.adjust_bid - Change the daily budget for a Google Ads campaign. Requires: campaign_name, new_budget (daily budget in dollars). REQUIRES APPROVAL since it changes spend.
35. contacts.import - Bulk import contacts from CSV, paste, or HubSpot. Requires: source ("csv", "hubspot", or "paste"). Optional: raw_csv (for paste source), dedup_strategy ("skip", "update", "create" — default "skip"). REQUIRES APPROVAL. The UI opens the import panel automatically.

## Risk Tiers
- Tier 0: Read-only actions (crm.search, ads.check_performance, ads.analyze_performance, ads.suggest_optimizations, ads.research_competitors, google.analyze_keywords) - auto-execute
- Tier 1: Mutations (create/update/single delete, ads.pause_campaign, ads.resume_campaign, ads.watch_competitor, google.pause_campaign, google.resume_campaign, google.add_negatives) - auto-execute with undo capability
- Tier 2: Bulk deletes (deleteAll), external communications (email/sms), spending money (ads.create_campaign, ads.launch_campaign, ads.apply_optimization, google.adjust_bid), and bulk import (contacts.import) - requires user approval

## Critical Rules
1. For lead.update: Include "name" in payload to identify the contact. System will auto-lookup by name. NO crm.search needed before an update!
2. Generate ONLY ONE action when possible. Don't generate search+update, just generate update with the name.
3. If required fields are missing, ask ONE follow-up question (set follow_up_question).
4. Set requires_approval=true for Tier 2 actions.
5. Be conservative - if unsure, ask rather than guess.
6. The user_summary should clearly state what will happen in plain language.
7. When the user asks to SEE, SHOW, LIST, or VIEW any data (contacts, deals, tasks, referrals, pipeline), ALWAYS use crm.search. The system will return actual data and present it conversationally.
8. For "show my pipeline" or "pipeline summary" — use crm.search with entity="deal" and query="" to retrieve all deals. The system will summarize by stage.
9. For "show my referrals" — use crm.search with entity="referral" and query="".
10. For "upcoming tasks" or "what do I need to do" — use crm.search with entity="task" and query="" with filters.status="pending".
11. For "I need a [service]" or "post a referral for" — use referral.create. Infer the category from the service type. If location is mentioned, include it in locationText.
12. For "delete [name]" or "remove [name]" — use the appropriate .delete action (lead.delete, deal.delete, task.delete). Use name/title to identify. NEVER refuse a delete request — the system supports it.
13. For "delete all contacts/deals/tasks" or "clear all [entity]" or "remove everything" — use the appropriate .deleteAll action. Set confirm: true. These require user approval before executing.
14. For "delete" requests, ALWAYS generate the delete action. NEVER respond saying deletion is not supported.
15. For "I need new business", "run some ads", "get me leads", "advertise" — use ads.create_campaign with channel "native" and objective LEADS. Ask about budget if not specified.
16. For "run a Facebook ad", "advertise on Instagram", "Meta ads" — use ads.create_campaign with channel "meta".
17. For "get recommended by AI", "show up in ChatGPT", "LLM ads" — use ads.create_campaign with channel "llm". Ask for business description and service area.
18. For "cross promote", "local exchange", "trade ads with other businesses" — use ads.create_campaign with channel "local".
19. For "how are my ads doing", "ad performance", "what's my spend" — use ads.check_performance.
20. For "pause my ads", "stop the campaign" — use ads.pause_campaign.
21. For "turn my ads back on", "resume the campaign" — use ads.resume_campaign.
22. When user approves launching a campaign (says "go ahead", "take it live", "start it", "launch it", "yes run it", etc.) after seeing a campaign preview, use ads.launch_campaign with the campaign name.
23. For "how are my ads really doing", "which ads are wasting money", "am I wasting money on ads", "analyze my ad performance", "deep dive on my ads" — use ads.analyze_performance. This is more detailed than ads.check_performance.
24. For "what should I change about my ads", "optimize my ads", "any suggestions for my campaigns", "help me improve my ads" — use ads.suggest_optimizations.
25. When user approves an optimization suggestion (says "do it", "approve", "yes go ahead", "apply that" in response to a suggestion), use ads.apply_optimization with the suggested parameters.
26. For "what are my competitors doing", "competitor ads", "spy on [name] ads", "research [name] advertising", "who else is advertising [keyword]" — use ads.research_competitors with the competitor name or keyword as search_term.
27. For "watch [competitor name]", "monitor [competitor name] ads", "track [competitor]" — if the user provides a Facebook Page ID, use ads.watch_competitor. If they only provide a name, first use ads.research_competitors to find the page, then suggest watching specific pages from the results.
28. For "analyze my Google keywords", "which Google keywords are wasting money", "keyword performance" — use google.analyze_keywords. If user mentions a specific campaign, include campaign_name.
29. For "pause my Google campaign", "stop Google ads" — use google.pause_campaign with campaign_name.
30. For "resume my Google campaign", "turn Google ads back on" — use google.resume_campaign with campaign_name.
31. For "block these keywords on Google", "add negative keywords", "exclude [keywords] from Google" — use google.add_negatives with campaign_name and keywords array.
32. For "change Google budget", "adjust my Google ad spend", "increase/decrease Google budget" — use google.adjust_bid with campaign_name and new_budget (in dollars).
33. For "import contacts", "load this CSV", "upload my spreadsheet", "import this file", "bring in my contacts" — use contacts.import with source "csv". For "import from HubSpot", "sync HubSpot", "pull my HubSpot leads" — use contacts.import with source "hubspot". For pasted tabular data — use contacts.import with source "paste". REQUIRES APPROVAL. The UI opens the import panel automatically — do NOT ask for the file in follow_up_question. Set user_summary to "I'll open the import panel so you can upload your contacts file and preview the data before anything is saved."

## CRITICAL ROUTING RULES
34. LEAD GENERATION vs CONTACT CREATION: When the user says "I need leads", "get me leads", "I need seller leads", "I need buyer leads", "get me more business", "I need new clients", "run ads", "advertise", or any variation of requesting lead generation — this is an ADS request, NOT a contact creation request. Use ads.create_campaign. The ONLY time you use lead.create is when the user gives you a specific person's name and info to add to the CRM (like "add John Smith as a lead").
35. CONVERSATIONAL CAMPAIGN CREATION: When the user triggers ads.create_campaign but hasn't specified budget, targeting area, or audience type, DO NOT just create a campaign with defaults. Instead, set the plan's follow_up_question to ask what they need. Example flow: User says "I need seller leads" → set follow_up_question to "I can set up a Facebook/Instagram campaign targeting homeowners likely to sell in your area. A few quick questions:\n\n1. What's your daily budget? ($10, $15, $25, or custom?)\n2. What area should we target — just your city or a wider radius?\n\nOnce I know that, I'll build the campaign and show you a preview before anything goes live." — When the user provides budget and targeting info in a follow-up, THEN execute ads.create_campaign with those values in the payload.
36. AD ACCOUNT ONBOARDING: The runtime will check for a connected Meta ad account when executing ads.create_campaign. If no account is connected, it returns a helpful error guiding the user to Settings. However, to give a smoother experience: if the user asks to run ads and you suspect they may not have connected their account yet (e.g. they're a new user or this is their first ads request), you can proactively include in the follow_up_question a note like "Make sure you've connected your Facebook account in Settings > Integrations first — it takes about 30 seconds. Once connected, I can set everything up."

## Output Format
Return a JSON object matching this schema:
{
  "plan_id": "<uuid>",
  "intent": "<one-line description of what user wants>",
  "confidence": <0.0-1.0>,
  "plan_steps": [
    {"step_number": 1, "description": "<what this step does>", "action_refs": ["<action_id>"]}
  ],
  "actions": [
    {
      "action_id": "<uuid>",
      "idempotency_key": "<unique key>",
      "type": "<action type>",
      "risk_tier": <0|1|2>,
      "requires_approval": <boolean>,
      "payload": {<action-specific payload>},
      "expected_outcome": {<expected result>}
    }
  ],
  "verification_steps": [
    {"step_number": 1, "description": "<what to verify>", "query": "<db query>", "expected": "<result>"}
  ],
  "user_summary": "<plain language summary for user>",
  "follow_up_question": "<question if info needed, or null>",
  "requires_approval": <true if any action is Tier 2>,
  "highest_risk_tier": <max risk tier of all actions>
}`;

// ============================================================================
// Planner Implementation
// ============================================================================

function generateUUID(): string {
  return randomUUID();
}

// ============================================================================
// Manual LLM Response Normalizer (no Zod to avoid version issues)
// ============================================================================

function normalizeLLMResponseManual(
  raw: Record<string, unknown>,
  userId: string
): ActionPlan {
  const actions = Array.isArray(raw.actions) ? raw.actions : [];
  
  // Build normalized actions
  const normalizedActions: ActionPlan["actions"] = actions.map((action: Record<string, unknown>, index: number) => {
    const actionType = normalizeActionType(String(action.type || "lead.create"));
    const payload = (action.payload || {}) as Record<string, unknown>;
    
    return {
      action_id: generateUUID(),
      idempotency_key: String(action.idempotency_key || `${userId}:${actionType}:${Date.now()}:${index}`),
      type: actionType,
      risk_tier: getRiskTier(actionType),
      requires_approval: requiresApproval(actionType),
      payload: normalizePayload(actionType, payload),
      expected_outcome: normalizeExpectedOutcome(actionType, payload),
    } as ActionPlan["actions"][0];
  });

  // Build plan steps
  const planSteps = normalizedActions.map((action, i) => ({
    step_number: i + 1,
    description: `Execute ${action.type}`,
    action_refs: [action.action_id],
  }));

  // Calculate risk
  let highestRiskTier: 0 | 1 | 2 = 0;
  let needsApproval = false;
  for (const action of normalizedActions) {
    if (action.risk_tier > highestRiskTier) {
      highestRiskTier = action.risk_tier as 0 | 1 | 2;
    }
    if (action.requires_approval) {
      needsApproval = true;
    }
  }

  return {
    plan_id: generateUUID(),
    intent: String(raw.intent || "Execute user request"),
    confidence: Number(raw.confidence) || 0.8,
    plan_steps: planSteps,
    actions: normalizedActions,
    verification_steps: [{
      step_number: 1,
      description: "Verify actions completed",
      query: "Check entities exist",
      expected: "success",
    }],
    user_summary: String(raw.user_summary || "I will execute your request."),
    follow_up_question: raw.follow_up_question ? String(raw.follow_up_question) : null,
    requires_approval: needsApproval,
    highest_risk_tier: highestRiskTier,
  };
}

function normalizeActionType(type: string): ActionType {
  const validTypes: ActionType[] = [
    "lead.create", "lead.update", "lead.delete", "lead.deleteAll",
    "deal.create", "deal.update", "deal.moveStage", "deal.delete", "deal.deleteAll",
    "task.create", "task.complete", "task.delete", "task.deleteAll",
    "note.append", "note.delete",
    "crm.search",
    "email.send", "sms.send",
    "referral.create",
    "ads.create_campaign", "ads.check_performance", "ads.pause_campaign", "ads.resume_campaign", "ads.launch_campaign",
    "ads.analyze_performance", "ads.suggest_optimizations", "ads.apply_optimization",
    "ads.research_competitors", "ads.watch_competitor",
    "google.analyze_keywords", "google.pause_campaign", "google.resume_campaign", "google.add_negatives", "google.adjust_bid",
    "contacts.import",
  ];

  const normalized = type.toLowerCase().replace(/_/g, ".");
  if (validTypes.includes(normalized as ActionType)) {
    return normalized as ActionType;
  }

  const typeMap: Record<string, ActionType> = {
    "create_lead": "lead.create",
    "createlead": "lead.create",
    "contact.create": "lead.create",
    "contact.delete": "lead.delete",
    "contact.deleteall": "lead.deleteAll",
    "lead.deleteall": "lead.deleteAll",
    "deal.deleteall": "deal.deleteAll",
    "task.deleteall": "task.deleteAll",
    "delete_lead": "lead.delete",
    "delete_contact": "lead.delete",
    "delete_deal": "deal.delete",
    "delete_task": "task.delete",
    "delete_note": "note.delete",
    "ads.createcampaign": "ads.create_campaign",
    "ads.checkperformance": "ads.check_performance",
    "ads.pausecampaign": "ads.pause_campaign",
    "ads.resumecampaign": "ads.resume_campaign",
    "create_campaign": "ads.create_campaign",
    "check_performance": "ads.check_performance",
    "pause_campaign": "ads.pause_campaign",
    "resume_campaign": "ads.resume_campaign",
    "ads.launchcampaign": "ads.launch_campaign",
    "launch_campaign": "ads.launch_campaign",
    "ads.analyzeperformance": "ads.analyze_performance",
    "analyze_performance": "ads.analyze_performance",
    "ads.suggestoptimizations": "ads.suggest_optimizations",
    "suggest_optimizations": "ads.suggest_optimizations",
    "ads.applyoptimization": "ads.apply_optimization",
    "apply_optimization": "ads.apply_optimization",
    "ads.researchcompetitors": "ads.research_competitors",
    "research_competitors": "ads.research_competitors",
    "ads.watchcompetitor": "ads.watch_competitor",
    "watch_competitor": "ads.watch_competitor",
    "google.analyzekeywords": "google.analyze_keywords",
    "analyze_keywords": "google.analyze_keywords",
    "google.pausecampaign": "google.pause_campaign",
    "google.resumecampaign": "google.resume_campaign",
    "google.addnegatives": "google.add_negatives",
    "add_negatives": "google.add_negatives",
    "google.adjustbid": "google.adjust_bid",
    "adjust_bid": "google.adjust_bid",
    "contacts.import": "contacts.import",
    "import_contacts": "contacts.import",
    "contact.import": "contacts.import",
    "importcontacts": "contacts.import",
  };

  return typeMap[type.toLowerCase()] || "lead.create";
}

function normalizePayload(actionType: ActionType, payload: Record<string, unknown>): Record<string, unknown> {
  switch (actionType) {
    case "lead.create":
      return {
        name: payload.name || payload.fullName || "Unknown",
        email: payload.email,
        phone: payload.phone,
        source: payload.source,
        type: payload.type || "lead",
        tags: payload.tags,
        notes: payload.notes || payload.note || payload.description,
      };
    case "lead.update": {
      // Handle nested patch or flat payload
      const patch = (payload.patch || {}) as Record<string, unknown>;
      const contactId = payload.id || payload.leadId || payload.lead_id || payload.contactId || payload.contact_id;
      const contactName = payload.contactName || payload.name || patch.name;
      
      return {
        id: contactId,
        // Include name so runtime can look up contact if ID is missing
        name: contactName,
        contactName: contactName,
        patch: {
          // Don't include name in patch unless we're actually changing the name
          email: patch.email || payload.email,
          phone: patch.phone || payload.phone,
          source: patch.source || payload.source,
          type: patch.type,
          tags: patch.tags || payload.tags,
          notes: patch.notes || payload.notes,
          isFavorite: patch.isFavorite ?? payload.isFavorite,
        },
      };
    }
    case "task.create":
      return {
        title: payload.title || payload.name || "New Task",
        description: payload.description,
        priority: payload.priority || "medium",
      };
    case "deal.create":
      return {
        title: payload.title || payload.name || "New Deal",
        value: payload.value,
        stage: payload.stage || "new_lead",
      };
    case "note.append":
      return {
        body: payload.body || payload.content || payload.note || String(payload.notes || ""),
        contactId: payload.contactId || payload.leadId,
      };
    case "crm.search":
      return {
        entity: payload.entity || payload.entityType || "contact",
        query: payload.query || payload.search || payload.name || "",
        filters: payload.filters,
        limit: payload.limit || 10,
      };
    case "referral.create":
      return {
        title: payload.title || "Referral",
        category: payload.category || "other",
        description: payload.description,
        locationText: payload.locationText || payload.location,
        valueEstimate: payload.valueEstimate || payload.value,
        visibility: payload.visibility || "public",
      };
    case "lead.delete":
      return {
        id: payload.id || payload.contactId,
        name: payload.name || payload.contactName,
      };
    case "lead.deleteAll":
      return { confirm: true };
    case "deal.delete":
      return {
        id: payload.id || payload.dealId,
        title: payload.title || payload.name,
      };
    case "deal.deleteAll":
      return { confirm: true };
    case "task.delete":
      return {
        id: payload.id || payload.taskId,
        title: payload.title || payload.name,
      };
    case "task.deleteAll":
      return { confirm: true };
    case "note.delete":
      return {
        id: payload.id || payload.noteId || "",
      };
    case "ads.create_campaign":
      return {
        objective: payload.objective || "LEADS",
        daily_budget: payload.daily_budget || payload.budget || 10,
        name: payload.name || payload.campaign_name,
      };
    case "ads.check_performance":
      return {
        campaign_name: payload.campaign_name || payload.name,
      };
    case "ads.pause_campaign":
      return {
        campaign_name: payload.campaign_name || payload.name,
      };
    case "ads.resume_campaign":
      return {
        campaign_name: payload.campaign_name || payload.name,
      };
    case "ads.launch_campaign":
      return {
        campaign_name: payload.campaign_name || payload.name,
      };
    case "ads.analyze_performance":
      return {
        date_range: payload.date_range || "7d",
      };
    case "ads.suggest_optimizations":
      return {
        date_range: payload.date_range || "7d",
      };
    case "ads.apply_optimization":
      return {
        campaign_name: payload.campaign_name || payload.name,
        action: payload.action,
        new_budget: payload.new_budget || payload.budget,
      };
    case "ads.research_competitors":
      return {
        search_term: payload.search_term || payload.query || payload.keyword || payload.competitor,
        country: payload.country || "US",
        active_only: payload.active_only !== undefined ? payload.active_only : true,
        limit: payload.limit || 25,
      };
    case "ads.watch_competitor":
      return {
        page_id: payload.page_id,
        page_name: payload.page_name || payload.name,
        notes: payload.notes,
      };
    case "google.analyze_keywords":
      return {
        date_range: payload.date_range || "7d",
        campaign_name: payload.campaign_name || payload.name,
      };
    case "google.pause_campaign":
      return {
        campaign_name: payload.campaign_name || payload.name,
      };
    case "google.resume_campaign":
      return {
        campaign_name: payload.campaign_name || payload.name,
      };
    case "google.add_negatives":
      return {
        campaign_name: payload.campaign_name || payload.name,
        keywords: payload.keywords || [],
      };
    case "google.adjust_bid":
      return {
        campaign_name: payload.campaign_name || payload.name,
        new_budget: payload.new_budget || payload.budget,
      };
    case "contacts.import":
      return {
        source: payload.source || "csv",
        raw_csv: payload.raw_csv,
        dedup_strategy: payload.dedup_strategy || "skip",
      };
    default:
      return payload;
  }
}

function normalizeExpectedOutcome(actionType: ActionType, payload: Record<string, unknown>): Record<string, unknown> {
  switch (actionType) {
    case "lead.create":
      return { entity_type: "contact", name: String(payload.name || "Unknown"), created: true };
    case "lead.update": {
      const patch = (payload.patch || {}) as Record<string, unknown>;
      return { 
        entity_type: "contact", 
        entity_id: String(payload.id || ""),
        updated_fields: Object.keys(patch).filter(k => patch[k] !== undefined),
      };
    }
    case "deal.create":
      return { entity_type: "deal", title: String(payload.title || "New Deal"), created: true };
    case "task.create":
      return { entity_type: "task", title: String(payload.title || "New Task"), created: true };
    case "note.append":
      return { entity_type: "note", created: true };
    case "crm.search":
      return { entity_type: String(payload.entity || "contact"), results_returned: true };
    case "referral.create":
      return { entity_type: "referral", title: String(payload.title || "Referral"), created: true };
    case "lead.delete":
      return { entity_type: "contact", deleted: true };
    case "lead.deleteAll":
      return { entity_type: "contact", deleted_all: true };
    case "deal.delete":
      return { entity_type: "deal", deleted: true };
    case "deal.deleteAll":
      return { entity_type: "deal", deleted_all: true };
    case "task.delete":
      return { entity_type: "task", deleted: true };
    case "task.deleteAll":
      return { entity_type: "task", deleted_all: true };
    case "note.delete":
      return { entity_type: "note", deleted: true };
    case "ads.create_campaign":
      return { entity_type: "campaign", created: true };
    case "ads.check_performance":
      return { entity_type: "campaign", results_returned: true };
    case "ads.pause_campaign":
      return { entity_type: "campaign", paused: true };
    case "ads.resume_campaign":
      return { entity_type: "campaign", resumed: true };
    case "ads.launch_campaign":
      return { entity_type: "campaign", launched: true };
    case "ads.analyze_performance":
      return { entity_type: "campaign", analysis_returned: true };
    case "ads.suggest_optimizations":
      return { entity_type: "campaign", suggestions_returned: true };
    case "ads.apply_optimization":
      return { entity_type: "campaign", optimization_applied: true };
    case "ads.research_competitors":
      return { entity_type: "competitor_research", research_returned: true };
    case "ads.watch_competitor":
      return { entity_type: "competitor_watch", created: true };
    case "google.analyze_keywords":
      return { entity_type: "google_campaign", analysis_returned: true };
    case "google.pause_campaign":
      return { entity_type: "google_campaign", paused: true };
    case "google.resume_campaign":
      return { entity_type: "google_campaign", resumed: true };
    case "google.add_negatives":
      return { entity_type: "google_campaign", negatives_added: true };
    case "google.adjust_bid":
      return { entity_type: "google_campaign", budget_adjusted: true };
    case "contacts.import":
      return { entity_type: "contact", imported: true };
    default:
      return { entity_type: actionType.split(".")[0], success: true };
  }
}

function buildContextMessage(input: PlannerInput): string {
  let contextMsg = "";

  if (input.recent_context && input.recent_context.length > 0) {
    contextMsg += "\n\n## Recent Context\n";
    contextMsg += "Recently touched entities (use these IDs if relevant):\n";
    for (const ctx of input.recent_context.slice(0, 20)) {
      contextMsg += `- ${ctx.entity_type}: ${ctx.entity_name || ctx.entity_id} (ID: ${ctx.entity_id})\n`;
    }
  }

  if (input.permissions && input.permissions.length > 0) {
    contextMsg += "\n\n## User Permissions\n";
    contextMsg += `Allowed: ${input.permissions.join(", ")}\n`;
  }

  return contextMsg;
}

/**
 * Generate an ActionPlan from a natural language message
 */
export async function planFromMessage(
  input: PlannerInput
): Promise<PlannerOutput> {
  // Validate input
  if (!input.user_message || input.user_message.trim().length === 0) {
    return {
      success: false,
      error: "User message is required",
      code: "INVALID_INPUT",
    };
  }

  if (!input.user_id) {
    return {
      success: false,
      error: "User ID is required",
      code: "INVALID_INPUT",
    };
  }

  try {
    const llm = getDefaultProvider();

    const contextMessage = buildContextMessage(input);

    const messages: LLMMessage[] = [
      { role: "system", content: SYSTEM_PROMPT + contextMessage },
      { role: "user", content: input.user_message + "\n\nRespond with a valid JSON object only." },
    ];

    // Get raw JSON from LLM (don't use schema validation at LLM level)
    const response = await llm.complete(messages, { temperature: 0.1 });
    
    // Extract JSON from response
    let jsonContent = response.content.trim();
    if (jsonContent.startsWith("```json")) {
      jsonContent = jsonContent.slice(7);
    }
    if (jsonContent.startsWith("```")) {
      jsonContent = jsonContent.slice(3);
    }
    if (jsonContent.endsWith("```")) {
      jsonContent = jsonContent.slice(0, -3);
    }
    jsonContent = jsonContent.trim();

    // Parse JSON
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonContent);
    } catch {
      throw new Error(`Failed to parse LLM JSON response: ${jsonContent.slice(0, 200)}...`);
    }

    // Normalize LLM output to strict ActionPlan (no Zod, just manual parsing)
    const normalizedPlan = normalizeLLMResponseManual(parsed, input.user_id);

    // Post-process to ensure consistency
    const plan = postProcessPlan(normalizedPlan, input);

    return {
      success: true,
      plan,
      llm_usage: response.usage,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message.includes("validation failed")) {
      return {
        success: false,
        error: `Plan validation error: ${message}`,
        code: "VALIDATION_ERROR",
      };
    }

    return {
      success: false,
      error: `LLM error: ${message}`,
      code: "LLM_ERROR",
    };
  }
}

/**
 * Post-process plan to ensure consistency and fill in derived fields
 */
function postProcessPlan(plan: ActionPlan, input: PlannerInput): ActionPlan {
  // Ensure plan_id exists
  if (!plan.plan_id) {
    plan.plan_id = generateUUID();
  }

  // Calculate highest risk tier
  let highestRisk: 0 | 1 | 2 = 0;
  let needsApproval = false;

  for (const action of plan.actions) {
    // Ensure action has proper risk tier
    const correctRiskTier = getRiskTier(action.type as ActionType);
    action.risk_tier = correctRiskTier;
    action.requires_approval = requiresApproval(action.type as ActionType);

    if (correctRiskTier > highestRisk) {
      highestRisk = correctRiskTier as 0 | 1 | 2;
    }
    if (action.requires_approval) {
      needsApproval = true;
    }

    // Ensure idempotency key includes user context
    if (!action.idempotency_key.includes(input.user_id)) {
      action.idempotency_key = `${input.user_id}:${action.idempotency_key}`;
    }
  }

  plan.highest_risk_tier = highestRisk;
  plan.requires_approval = needsApproval;

  return plan;
}

/**
 * Create a simple plan for a single action (utility function)
 */
export function createSimplePlan(
  actionType: ActionType,
  payload: Record<string, unknown>,
  userId: string
): ActionPlan {
  const actionId = generateUUID();
  const planId = generateUUID();
  const riskTier = getRiskTier(actionType);
  const needsApproval = requiresApproval(actionType);

  return {
    plan_id: planId,
    intent: `Execute ${actionType}`,
    confidence: 1.0,
    plan_steps: [
      {
        step_number: 1,
        description: `Execute ${actionType}`,
        action_refs: [actionId],
      },
    ],
    actions: [
      {
        action_id: actionId,
        idempotency_key: `${userId}:${actionType}:${Date.now()}`,
        type: actionType,
        risk_tier: riskTier,
        requires_approval: needsApproval,
        payload,
        expected_outcome: { entity_type: actionType.split(".")[0] },
      } as ActionPlan["actions"][0],
    ],
    verification_steps: [
      {
        step_number: 1,
        description: `Verify ${actionType} completed`,
        query: `Check ${actionType.split(".")[0]} exists`,
        expected: "Entity should exist",
      },
    ],
    user_summary: `Will execute ${actionType}`,
    follow_up_question: null,
    requires_approval: needsApproval,
    highest_risk_tier: riskTier,
  };
}

/**
 * Create a plan that only asks a follow-up question
 */
export function createFollowUpPlan(
  question: string,
  intent: string,
  userId: string
): ActionPlan {
  return {
    plan_id: generateUUID(),
    intent,
    confidence: 0.5,
    plan_steps: [],
    actions: [],
    verification_steps: [],
    user_summary: "I need more information to proceed.",
    follow_up_question: question,
    requires_approval: false,
    highest_risk_tier: 0,
  };
}

