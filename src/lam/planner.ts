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
20. ads.create_campaign - Create a complete Facebook/Instagram ad campaign with targeting and creative. Campaign starts PAUSED for approval. IMPORTANT: Do NOT use this immediately — use the guided builder flow (Rule 0) to collect info first. Only create this action after user has specified area, budget, copy, and image. Requires: objective (LEADS, TRAFFIC, AWARENESS). Optional: daily_budget (default 15), name, channel (meta, native, llm, google, bing, local — default "native"), target_city, target_radius, lead_type, listing_focus, target_price_max, target_price_min, target_bedrooms_min, website (landing page URL — defaults to /valuation for seller leads). User-provided creative fields (skip auto-generation when set): ad_headline (max 40 chars), ad_body (max 125 chars), ad_description (max 30 chars), image_prompt (description for AI image generation). REQUIRES APPROVAL.
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
36. savedSearch.create - Set a buyer up on a saved property search with their criteria. Use when agent says things like "set John up on search", "add buyer criteria", "John wants 3 beds, Westside, $400-600k". Fields: contactName (to link to buyer), priceMin, priceMax, bedsMin, bathsMin, neighborhoods (array), cities (array), propertyTypes (array), mustHaves (array e.g. ["garage","no_hoa"]), name (optional label).
37. savedSearch.update - Update an existing buyer's search criteria. Use when agent says "John also wants X" or "update John's search". Fields: contactName (to find the search), patch (object with fields to change).
38. savedSearch.list - View saved searches. Use for "show John's search", "what is John looking for", "show all active searches". Fields: contactName (optional filter), active (optional boolean).
39. deal.addMilestones - Auto-create all milestone tasks when a deal goes under contract or a listing is created. Use when agent says "we're under contract", "just listed", "create milestones for". Fields: dealTitle (to find deal), milestoneType (buyer_under_contract | seller_listing | seller_under_contract), closingDate (ISO — used to calculate all other task dates if not specified), inspectionDate, appraisalDate, loanContingencyDate, walkThroughDate.
40. marketing.generate_image - Generate a marketing image using AI (DALL-E). Use when user says "create an image for my ad", "generate a marketing image", "make me an ad image". Optional: type (new_listing, open_house, just_sold, market_update, lead_generation, general — default "general"), propertyId (for property-specific images), custom_prompt (user's own image description), size (1024x1024, 1792x1024, 1024x1792 — default "1024x1024"). Returns a URL to the generated image.
41. marketing.generate_content - Generate marketing copy using AI. Use when user says "write me a social post", "create ad copy", "write a listing description". Optional: type (new_listing, open_house, just_sold, market_update, ad_copy, general), platform (facebook, instagram, linkedin, email, generic), propertyId, prompt.

## Risk Tiers
- Tier 0: Read-only actions (crm.search, ads.check_performance, ads.analyze_performance, ads.suggest_optimizations, ads.research_competitors, google.analyze_keywords, savedSearch.list, marketing.generate_image, marketing.generate_content) - auto-execute
- Tier 1: Mutations (create/update/single delete, ads.pause_campaign, ads.resume_campaign, ads.watch_competitor, google.pause_campaign, google.resume_campaign, google.add_negatives, savedSearch.create, savedSearch.update, deal.addMilestones) - auto-execute with undo capability
- Tier 2: Bulk deletes (deleteAll), external communications (email/sms), spending money (ads.create_campaign, ads.launch_campaign, ads.apply_optimization, google.adjust_bid), and bulk import (contacts.import) - requires user approval

## Critical Rules
0. AD CAMPAIGN FLOW — INTERACTIVE BUILDER (HIGHEST PRIORITY):
   When the user wants to create ads ("run an ad", "I need leads", "advertise", "promote my listings"), NEVER immediately create ads.create_campaign. Instead, use the GUIDED STEP-BY-STEP flow:

   A) FIRST REQUEST — Start the guided builder. Generate ZERO actions. Set follow_up_question to ask the FIRST missing piece (in this order):
      Step 1: Lead type — "What kind of leads are you looking for?" with options: Seller leads, Buyer leads, or Both.
      Step 2: Target area (skip if known from profile service area or conversation) — "Which area should I target?"
      Step 3: Daily budget (skip if already mentioned) — "What daily budget works for you?"
      Step 4: Ad image — "What image should I use? Describe what you want and I'll generate it with AI, or say 'use my listing photos'."
      Step 5: Ad copy — "What should the ad say? Give me a headline and body text, or I can write it for you."
      ONLY create ads.create_campaign AFTER the user has answered all steps (or said "just do it" / "auto" to skip).

   B) MID-FLOW QUESTIONS — If the user asks ABOUT the ad during setup (e.g. "what about the audience targeting?", "can I change the headline?", "what image will it use?", "how does targeting work?"), respond CONVERSATIONALLY with ZERO actions. Answer their question and continue the guided flow.

   C) GENERATE IMAGE PREVIEW — When the user describes an image they want (e.g. "generate a home valuation image", "make an image of a modern home with pool"), use marketing.generate_image with custom_prompt set to their description. This shows them the image in chat BEFORE it's used in the ad. After they see it, ask "Want to use this for your ad?" — if yes, proceed to create the campaign with image_prompt set to the same description.

   D) FINAL EXECUTION — Only create ads.create_campaign when ALL of these are true:
      - Area/city is known (from profile, conversation, or user input)
      - Budget is known (from conversation or default)
      - Copy decision made (user provided text OR said "write it for me")
      - Image decision made (user described image OR said "use listing photos" OR said "auto")
      Include all collected info: ad_headline, ad_body, image_prompt, target_city, daily_budget, etc.

   E) SHORTCUT — If the user says "just do it", "auto", "you pick everything", or "create it now" at ANY point, immediately create ads.create_campaign with whatever info you have + defaults for the rest. Also if the user provides ALL info in one message (e.g. "run an ad targeting Miami, $15/day, headline 'Dream Homes in Miami', image of luxury condo at sunset"), create the campaign immediately.

   F) NEVER use lead.create for advertising/lead generation requests. lead.create is ONLY for adding a specific person to the CRM.
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
15. For "I need new business", "run some ads", "get me leads", "advertise" — start the GUIDED AD BUILDER (Rule 0). Generate zero actions and begin asking step-by-step questions. Do NOT immediately create ads.create_campaign.
16. For "run a Facebook ad", "advertise on Instagram", "Meta ads" — start the GUIDED AD BUILDER (Rule 0) with channel "meta". Generate zero actions and begin step-by-step setup.
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
34. LEAD GENERATION vs CONTACT CREATION: Ad/lead generation requests (see Rule 0) always use the guided ad builder flow — NEVER lead.create. The ONLY time you use lead.create is when the user gives a SPECIFIC person's name and info to add (like "add John Smith as a lead").
35. MULTI-TURN AWARENESS: When in the middle of the guided ad builder flow (Rule 0), check the ENTIRE conversation history (including "Previous conversation:" context) for previously provided info. NEVER re-ask for budget, area, lead type, copy, or image if already stated. Extract and use what's already known. If the user's profile has a service area, use it as the default — don't ask again.
   - IMAGE PREVIEW: When user says "generate an image of...", "create a home valuation image", "make me a picture of...", use marketing.generate_image with custom_prompt. The image will display inline in chat. Then ask if they want to use it for the ad. When they confirm, proceed to ads.create_campaign with image_prompt set to the same description.
   - INTERACTIVE AD CONTENT MAPPING:
     * "headline should be ..." / "use this headline: ..." → ad_headline
     * "the text should say ..." / "body: ..." → ad_body
     * "use an image of ..." / "picture of ..." → image_prompt
     * "target [city]" / "audience in [city]" → target_city
     * "write it for me" / no copy provided → leave ad_headline/ad_body empty (auto-generated)
     * "use my listing photos" / no image specified → leave image_prompt empty
   - LANDING PAGE: For seller lead gen ads, the default landing page is the agent's personalized home valuation page at /valuation/[agentId]. Mention to the user: "The ad will link to your personal home valuation page where sellers can request a free valuation."
36. AD ACCOUNT ONBOARDING: The runtime will check for a connected Meta ad account when executing ads.create_campaign. If no account is connected, it returns a helpful error guiding the user to Settings. However, to give a smoother experience: if the user asks to run ads and you suspect they may not have connected their account yet (e.g. they're a new user or this is their first ads request), you can proactively include in the follow_up_question a note like "Make sure you've connected your Facebook account in Settings > Integrations first — it takes about 30 seconds. Once connected, I can set everything up."
37. For "set [name] up on search", "add buyer criteria", "[name] wants [beds/price/area]" — use savedSearch.create. Always include contactName so the system links the search to the buyer.
38. For "John also wants X", "update [name]'s search", "add [feature] to [name]'s criteria" — use savedSearch.update with contactName and only the changed fields in patch.
39. For "show [name]'s search", "what is [name] looking for", "show buyer criteria" — use savedSearch.list.
40. For "we're under contract", "just went under contract on [address]", "create milestones for [deal]" — use deal.addMilestones. Set milestoneType=buyer_under_contract for buyer deals. Include closingDate if mentioned — the system will calculate inspection/appraisal/contingency deadlines automatically.
41. For "just listed [address]", "create listing milestones" — use deal.addMilestones with milestoneType=seller_listing.
42. For neighborhoods/areas, store as an array: "Westside and Culver City" → ["Westside", "Culver City"]. For mustHaves, normalize to snake_case array: "no HOA, garage, pool" → ["no_hoa", "garage", "pool"].
44. LISTING-FOCUSED ADS — CRITICAL: When user mentions "listings", "homes", or properties in a city with a price (e.g. "listings in Parsippany under $400k", "homes in Miami under $500,000", "I want the ad to be listings in X city under X dollars", "advertise homes under $600k"), you MUST use ads.create_campaign with listing_focus=true, target_city=[city], target_price_max=[price as number], channel="meta". NEVER use lead.create for this. The system will query matching properties from the user's inventory and build ad copy around those listings. Extract the price as a raw number (e.g. "$500k" → 500000, "$400K" → 400000, "$1M" → 1000000). If bedrooms are mentioned ("3+ bed homes under $400k in Miami"), include target_bedrooms_min. Examples:
   - "I want the ad to be listings in Parsippany under 400k" → ads.create_campaign with listing_focus=true, target_city="Parsippany", target_price_max=400000
   - "advertise my homes in Miami under $500,000" → ads.create_campaign with listing_focus=true, target_city="Miami", target_price_max=500000
   - "run an ad for 3-bed homes under $600k in Austin" → ads.create_campaign with listing_focus=true, target_city="Austin", target_price_max=600000, target_bedrooms_min=3
43. SELF-INTRODUCTION / BUSINESS INFO: When the user tells you about THEMSELVES or their own business (e.g., "I'm a real estate agent in Parsippany", "I run a plumbing company in Miami", "I'm a photographer based in LA"), this is NOT a contact to create or update. Do NOT use lead.create or lead.update. Instead, generate ZERO actions and set follow_up_question to acknowledge their info and ask how you can help. Example: "Got it — real estate in Parsippany, NJ! How can I help you today? I can run ads, manage your contacts, track deals, and more." The system will automatically save their business type and location to their profile.

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
    "deal.addMilestones",
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
    "savedSearch.create", "savedSearch.update", "savedSearch.list",
    "marketing.generate_image", "marketing.generate_content",
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
    "savedsearch.create": "savedSearch.create",
    "savedsearch.update": "savedSearch.update",
    "savedsearch.list": "savedSearch.list",
    "saved_search.create": "savedSearch.create",
    "saved_search.update": "savedSearch.update",
    "saved_search.list": "savedSearch.list",
    "deal.addmilestones": "deal.addMilestones",
    "deal.add_milestones": "deal.addMilestones",
    "marketing.generateimage": "marketing.generate_image",
    "marketing.generate.image": "marketing.generate_image",
    "generate_image": "marketing.generate_image",
    "generateimage": "marketing.generate_image",
    "marketing.generatecontent": "marketing.generate_content",
    "marketing.generate.content": "marketing.generate_content",
    "generate_content": "marketing.generate_content",
    "generatecontent": "marketing.generate_content",
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
        channel: payload.channel,
        target_city: payload.target_city || payload.city || payload.area,
        target_radius: payload.target_radius || payload.radius,
        lead_type: payload.lead_type || payload.audience,
        business_name: payload.business_name,
        category: payload.category,
        description: payload.description,
        service_area: payload.service_area,
        listing_focus: payload.listing_focus,
        target_price_max: payload.target_price_max || payload.price_max || payload.max_price,
        target_price_min: payload.target_price_min || payload.price_min || payload.min_price,
        target_bedrooms_min: payload.target_bedrooms_min || payload.bedrooms_min || payload.min_bedrooms,
        ad_headline: payload.ad_headline || payload.headline,
        ad_body: payload.ad_body || payload.body || payload.primary_text || payload.ad_text,
        ad_description: payload.ad_description,
        image_prompt: payload.image_prompt,
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
    case "savedSearch.create":
      return {
        contactId:     payload.contactId,
        contactName:   payload.contactName || payload.buyerName || payload.name,
        name:          payload.name,
        priceMin:      payload.priceMin ?? payload.price_min ?? payload.budgetMin,
        priceMax:      payload.priceMax ?? payload.price_max ?? payload.budgetMax,
        bedsMin:       payload.bedsMin ?? payload.beds_min ?? payload.beds ?? payload.bedrooms,
        bathsMin:      payload.bathsMin ?? payload.baths_min ?? payload.baths ?? payload.bathrooms,
        propertyTypes: payload.propertyTypes ?? payload.property_types,
        neighborhoods: payload.neighborhoods,
        cities:        payload.cities,
        zipCodes:      payload.zipCodes ?? payload.zip_codes,
        mustHaves:     payload.mustHaves ?? payload.must_haves ?? payload.features,
        notes:         payload.notes,
      };
    case "savedSearch.update": {
      const patch = (payload.patch || {}) as Record<string, unknown>;
      return {
        id:          payload.id,
        contactName: payload.contactName || payload.buyerName || payload.name,
        patch: {
          name:          patch.name,
          priceMin:      patch.priceMin ?? patch.price_min,
          priceMax:      patch.priceMax ?? patch.price_max,
          bedsMin:       patch.bedsMin ?? patch.beds_min ?? patch.beds,
          bathsMin:      patch.bathsMin ?? patch.baths_min ?? patch.baths,
          propertyTypes: patch.propertyTypes ?? patch.property_types,
          neighborhoods: patch.neighborhoods,
          cities:        patch.cities,
          zipCodes:      patch.zipCodes ?? patch.zip_codes,
          mustHaves:     patch.mustHaves ?? patch.must_haves ?? patch.features,
          notes:         patch.notes,
          isActive:      patch.isActive ?? patch.is_active,
        },
      };
    }
    case "savedSearch.list":
      return {
        contactName: payload.contactName || payload.buyerName || payload.name,
        contactId:   payload.contactId,
        active:      payload.active ?? true,
      };
    case "deal.addMilestones":
      return {
        dealId:              payload.dealId ?? payload.id,
        dealTitle:           payload.dealTitle ?? payload.title ?? payload.deal,
        milestoneType:       payload.milestoneType ?? payload.type ?? "buyer_under_contract",
        closingDate:         payload.closingDate ?? payload.closing_date ?? payload.close_date,
        inspectionDate:      payload.inspectionDate ?? payload.inspection_date,
        appraisalDate:       payload.appraisalDate ?? payload.appraisal_date,
        loanContingencyDate: payload.loanContingencyDate ?? payload.loan_contingency_date,
        walkThroughDate:     payload.walkThroughDate ?? payload.walk_through_date,
      };
    case "marketing.generate_image":
      return {
        type: payload.type || payload.image_type || "general",
        propertyId: payload.propertyId || payload.property_id,
        custom_prompt: payload.custom_prompt || payload.prompt || payload.description,
        size: payload.size || "1024x1024",
      };
    case "marketing.generate_content":
      return {
        type: payload.type || payload.content_type || "general",
        platform: payload.platform || "generic",
        propertyId: payload.propertyId || payload.property_id,
        prompt: payload.prompt || payload.description,
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
    case "savedSearch.create":
      return { entity_type: "saved_search", created: true };
    case "savedSearch.update":
      return { entity_type: "saved_search", updated: true };
    case "savedSearch.list":
      return { entity_type: "saved_search", results_returned: true };
    case "deal.addMilestones":
      return { entity_type: "deal", tasks_created: true };
    case "marketing.generate_image":
      return { entity_type: "image", generated: true };
    case "marketing.generate_content":
      return { entity_type: "content", generated: true };
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
 * Detect if the user's message is about ads/listings and force-reroute
 * misclassified lead.create actions to ads.create_campaign.
 * This is a deterministic guard because the LLM sometimes ignores routing rules.
 *
 * IMPORTANT: This should only fire on the INITIAL ad creation request,
 * NOT on mid-flow answers during the guided ad builder (e.g., user providing
 * image descriptions, copy text, targeting preferences, lead type, etc.).
 */
function forceAdRouting(plan: ActionPlan, input: PlannerInput): ActionPlan {
  const fullMsg = input.user_message.toLowerCase();

  // ── Extract only the ACTUAL user message (after "New message: " prefix) ──
  // The input includes conversation history prepended by the route handler.
  // We must only analyze the user's latest message, not the entire history.
  const newMsgMarker = "new message: ";
  const newMsgIdx = fullMsg.lastIndexOf(newMsgMarker);
  const msg = newMsgIdx >= 0
    ? fullMsg.slice(newMsgIdx + newMsgMarker.length).trim()
    : fullMsg;

  // ── Detect if we're in a GUIDED AD BUILDER flow ──
  // If the conversation history shows Tara already asked about budget, image,
  // copy, targeting, lead type, or audience — the user is answering a guided
  // flow question, NOT making a new ad request. Skip force-routing entirely.
  const historySection = newMsgIdx >= 0 ? fullMsg.slice(0, newMsgIdx) : "";
  const guidedFlowIndicators = [
    /what.*budget/i,
    /what.*image/i,
    /what.*headline/i,
    /what.*copy/i,
    /what.*text/i,
    /what.*audience/i,
    /what.*targeting/i,
    /what kind of leads/i,
    /what type of leads/i,
    /seller.*leads.*buyer.*leads/i,
    /service area/i,
    /which area/i,
    /guided ad builder/i,
    /let me help you.*campaign/i,
    /step.*of.*ad/i,
    /would you like.*image/i,
    /describe.*image/i,
    /what should the ad say/i,
    /choose.*location/i,
    /select.*area/i,
  ];
  const isInGuidedFlow = guidedFlowIndicators.some(p => p.test(historySection));
  if (isInGuidedFlow) return plan;

  // ── Also skip if the user's message looks like a mid-flow ANSWER ──
  // Short answers providing content (image descriptions, copy, area names,
  // budget amounts, lead type selections) should not be force-routed.
  const midFlowAnswerPatterns = [
    /^(an? image|image of|image that|image with|photo of|picture of)/i,
    /^(seller|buyer|both)\s*(leads?)?$/i,
    /^\$?\d+(\.\d{2})?\s*(\/\s*day|per day|daily)?$/i,  // budget like "$10/day"
    /^(free home valuation|home valuation|valuation)/i,
    /^(use|go with|i('d| would) like|let'?s? (use|go))/i,
    /^(yes|no|sure|okay|ok|sounds good|perfect|that works|looks good)/i,
    /^(my service area|around|near|within)/i,
  ];
  const isMidFlowAnswer = midFlowAnswerPatterns.some(p => p.test(msg.trim()));
  if (isMidFlowAnswer) return plan;

  // Skip re-routing if the user is asking a QUESTION about ads/targeting/copy
  // (not requesting campaign creation)
  const questionPatterns = [
    /^what about/i, /^how does/i, /^how do/i, /^can i/i, /^what will/i,
    /^what text/i, /^what image/i, /^tell me about/i, /^explain/i,
    /\?$/, // ends with question mark
  ];
  const isQuestion = questionPatterns.some(p => p.test(msg.trim()));
  const isAboutAdSetup = /targeting|audience|copy|headline|image|creative|text|budget/i.test(msg);
  if (isQuestion && isAboutAdSetup) return plan;

  // Detect listing/ad intent keywords
  const adKeywords = [
    "listing", "listings", "advertise", "promote", "campaign",
    "run an ad", "run ads", "create an ad", "make an ad",
    "homes in", "houses in", "properties in", "homes under",
    "under $", "under $",
  ];
  const hasAdIntent = adKeywords.some(kw => msg.includes(kw));

  // Also detect "X in Y under Z" pattern (city + price)
  const cityPricePattern = /(?:listings?|homes?|houses?|properties)\s+in\s+(\w[\w\s]*?)\s+under\s+\$?([\d,.]+)\s*(k|m|K|M)?/i;
  const cityPriceMatch = msg.match(cityPricePattern);

  if (!hasAdIntent && !cityPriceMatch) return plan;

  // Check if the LLM incorrectly routed to lead.create
  const hasLeadCreate = plan.actions.some(a => a.type === "lead.create");
  const hasAdsCampaign = plan.actions.some(a => a.type === "ads.create_campaign");

  if (!hasLeadCreate || hasAdsCampaign) return plan;

  // Force re-route: replace lead.create with ads.create_campaign
  // Extract city and price from the message
  let targetCity: string | undefined;
  let targetPriceMax: number | undefined;
  let targetBedroomsMin: number | undefined;

  if (cityPriceMatch) {
    targetCity = cityPriceMatch[1].trim();
    let price = parseFloat(cityPriceMatch[2].replace(/,/g, ""));
    const multiplier = cityPriceMatch[3];
    if (multiplier?.toLowerCase() === "k") price *= 1000;
    if (multiplier?.toLowerCase() === "m") price *= 1000000;
    targetPriceMax = price;
  } else {
    // Try to extract city from simpler patterns
    const cityMatch = msg.match(/in\s+(\w[\w\s]*?)(?:\s+under|\s+below|\s+for|\s*$)/i);
    if (cityMatch) targetCity = cityMatch[1].trim();

    // Try to extract price
    const priceMatch = msg.match(/under\s+\$?([\d,.]+)\s*(k|m|K|M)?/i);
    if (priceMatch) {
      let price = parseFloat(priceMatch[1].replace(/,/g, ""));
      if (priceMatch[2]?.toLowerCase() === "k") price *= 1000;
      if (priceMatch[2]?.toLowerCase() === "m") price *= 1000000;
      targetPriceMax = price;
    }
  }

  // Check for bedroom mentions
  const bedMatch = msg.match(/(\d+)\+?\s*(?:bed|br|bedroom)/i);
  if (bedMatch) targetBedroomsMin = parseInt(bedMatch[1]);

  // Replace all lead.create actions with a single ads.create_campaign
  const newActionId = generateUUID();
  const adAction = {
    action_id: newActionId,
    idempotency_key: `${input.user_id}:ads.create_campaign:${Date.now()}`,
    type: "ads.create_campaign" as ActionType,
    risk_tier: getRiskTier("ads.create_campaign"),
    requires_approval: requiresApproval("ads.create_campaign"),
    payload: normalizePayload("ads.create_campaign", {
      objective: "LEADS",
      daily_budget: 10,
      channel: "meta",
      listing_focus: true,
      target_city: targetCity,
      target_price_max: targetPriceMax,
      target_bedrooms_min: targetBedroomsMin,
    }),
    expected_outcome: normalizeExpectedOutcome("ads.create_campaign", {}),
  } as ActionPlan["actions"][0];

  plan.actions = [adAction];
  plan.plan_steps = [{
    step_number: 1,
    description: "Create listing-focused ad campaign",
    action_refs: [newActionId],
  }];
  plan.requires_approval = true;
  plan.highest_risk_tier = 2;
  plan.user_summary = `I'll create a Facebook ad campaign promoting your${targetCity ? ` ${targetCity}` : ""} listings${targetPriceMax ? ` under $${targetPriceMax.toLocaleString()}` : ""}. The ad will feature your matching properties with AI-generated copy. Budget: $10/day (you can change this). The campaign starts paused — you'll approve before any money is spent.`;

  return plan;
}

/**
 * Post-process plan to ensure consistency and fill in derived fields
 */
function postProcessPlan(plan: ActionPlan, input: PlannerInput): ActionPlan {
  // FIRST: Force-reroute misclassified ad/listing requests
  plan = forceAdRouting(plan, input);

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

