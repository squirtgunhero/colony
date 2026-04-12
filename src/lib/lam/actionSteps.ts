// ============================================================================
// COLONY LAM - Action Step Definitions (Presentation Layer)
// Maps each LAM action type to its UI execution steps.
// These describe what Tara shows in the ActionExecutionCard while working.
// ============================================================================

export interface ActionStepDef {
  id: string;
  label: string;
  detail: string;
  estimatedDuration: number; // ms — used for progress indication timing
}

export interface ActionUIDef {
  actionType: string;
  label: string;
  icon: string;
  steps: ActionStepDef[];
  resultRenderer: string; // Component name for rendering the result
}

// ============================================================================
// CRM Actions
// ============================================================================

const LEAD_CREATE: ActionUIDef = {
  actionType: "lead.create",
  label: "Creating Contact",
  icon: "UserPlus",
  steps: [
    { id: "parse", label: "Parsing input", detail: "Extracting name, email, phone, and tags from your message...", estimatedDuration: 600 },
    { id: "dedup", label: "Checking for duplicates", detail: "Scanning your contacts for existing records with matching details...", estimatedDuration: 800 },
    { id: "create", label: "Creating record", detail: "Adding the new contact to your CRM with all provided details...", estimatedDuration: 700 },
    { id: "log", label: "Logging activity", detail: "Recording this creation in the activity timeline...", estimatedDuration: 400 },
  ],
  resultRenderer: "CRMResult",
};

const LEAD_UPDATE: ActionUIDef = {
  actionType: "lead.update",
  label: "Updating Contact",
  icon: "UserCog",
  steps: [
    { id: "locate", label: "Locating contact", detail: "Finding the right contact in your database...", estimatedDuration: 600 },
    { id: "validate", label: "Validating changes", detail: "Checking that the updates are consistent with existing data...", estimatedDuration: 500 },
    { id: "update", label: "Updating record", detail: "Applying changes to the contact record...", estimatedDuration: 700 },
    { id: "log", label: "Logging activity", detail: "Recording the update in the activity timeline...", estimatedDuration: 400 },
  ],
  resultRenderer: "CRMResult",
};

const LEAD_DELETE: ActionUIDef = {
  actionType: "lead.delete",
  label: "Deleting Contact",
  icon: "UserMinus",
  steps: [
    { id: "locate", label: "Locating contact", detail: "Finding the contact record to remove...", estimatedDuration: 600 },
    { id: "check", label: "Checking dependencies", detail: "Verifying no active deals or tasks are linked to this contact...", estimatedDuration: 800 },
    { id: "delete", label: "Removing record", detail: "Deleting the contact and associated data...", estimatedDuration: 700 },
    { id: "log", label: "Logging activity", detail: "Recording the deletion in the audit trail...", estimatedDuration: 400 },
  ],
  resultRenderer: "CRMResult",
};

const LEAD_SCORE: ActionUIDef = {
  actionType: "lead.score",
  label: "Scoring Leads",
  icon: "TrendingUp",
  steps: [
    { id: "gather", label: "Gathering contact data", detail: "Loading activity, deals, and engagement data for each contact...", estimatedDuration: 800 },
    { id: "compute", label: "Computing scores", detail: "Evaluating engagement, fit, recency, and activity signals...", estimatedDuration: 1200 },
    { id: "rank", label: "Ranking results", detail: "Sorting contacts by score and assigning grades...", estimatedDuration: 600 },
    { id: "save", label: "Saving scores", detail: "Updating lead scores in the database...", estimatedDuration: 500 },
  ],
  resultRenderer: "LeadScoreResult",
};

const COMPANY_CREATE: ActionUIDef = {
  actionType: "company.create",
  label: "Creating Company",
  icon: "Building2",
  steps: [
    { id: "parse", label: "Parsing input", detail: "Extracting company name, domain, industry, and details...", estimatedDuration: 600 },
    { id: "dedup", label: "Checking for duplicates", detail: "Scanning your companies for existing records with matching name or domain...", estimatedDuration: 800 },
    { id: "create", label: "Creating record", detail: "Adding the new company to your CRM...", estimatedDuration: 700 },
    { id: "log", label: "Logging activity", detail: "Recording this creation in the audit trail...", estimatedDuration: 400 },
  ],
  resultRenderer: "CRMResult",
};

const COMPANY_UPDATE: ActionUIDef = {
  actionType: "company.update",
  label: "Updating Company",
  icon: "Building2",
  steps: [
    { id: "locate", label: "Locating company", detail: "Finding the right company in your database...", estimatedDuration: 600 },
    { id: "validate", label: "Validating changes", detail: "Checking that the updates are consistent...", estimatedDuration: 500 },
    { id: "update", label: "Updating record", detail: "Applying changes to the company record...", estimatedDuration: 700 },
    { id: "log", label: "Logging activity", detail: "Recording the update in the audit trail...", estimatedDuration: 400 },
  ],
  resultRenderer: "CRMResult",
};

const COMPANY_DELETE: ActionUIDef = {
  actionType: "company.delete",
  label: "Deleting Company",
  icon: "Building2",
  steps: [
    { id: "locate", label: "Locating company", detail: "Finding the company record to remove...", estimatedDuration: 600 },
    { id: "unlink", label: "Unlinking records", detail: "Detaching contacts and deals from this company...", estimatedDuration: 800 },
    { id: "delete", label: "Deleting record", detail: "Removing the company from your CRM...", estimatedDuration: 700 },
    { id: "log", label: "Logging activity", detail: "Recording the deletion in the audit trail...", estimatedDuration: 400 },
  ],
  resultRenderer: "CRMResult",
};

const CRM_SEARCH: ActionUIDef = {
  actionType: "crm.search",
  label: "Searching CRM",
  icon: "Search",
  steps: [
    { id: "parse", label: "Parsing search criteria", detail: "Understanding what you're looking for and building the right query...", estimatedDuration: 600 },
    { id: "query", label: "Querying database", detail: "Searching contacts, deals, and tasks for matching records...", estimatedDuration: 1000 },
    { id: "rank", label: "Ranking results", detail: "Sorting by relevance and recent activity...", estimatedDuration: 500 },
    { id: "format", label: "Formatting response", detail: "Preparing a clear summary of what I found...", estimatedDuration: 400 },
  ],
  resultRenderer: "CRMResult",
};

const DEAL_CREATE: ActionUIDef = {
  actionType: "deal.create",
  label: "Creating Deal",
  icon: "DollarSign",
  steps: [
    { id: "parse", label: "Parsing deal info", detail: "Extracting deal name, value, and stage from your message...", estimatedDuration: 600 },
    { id: "link", label: "Linking contact", detail: "Connecting this deal to the right contact in your pipeline...", estimatedDuration: 700 },
    { id: "stage", label: "Setting pipeline stage", detail: "Placing the deal in the correct pipeline stage...", estimatedDuration: 500 },
    { id: "log", label: "Logging activity", detail: "Recording the new deal in your activity timeline...", estimatedDuration: 400 },
  ],
  resultRenderer: "CRMResult",
};

const DEAL_UPDATE: ActionUIDef = {
  actionType: "deal.update",
  label: "Updating Deal",
  icon: "RefreshCw",
  steps: [
    { id: "locate", label: "Locating deal", detail: "Finding the deal in your pipeline...", estimatedDuration: 600 },
    { id: "validate", label: "Validating changes", detail: "Checking that the stage transition and values are valid...", estimatedDuration: 500 },
    { id: "update", label: "Updating record", detail: "Applying your changes to the deal...", estimatedDuration: 700 },
    { id: "notify", label: "Updating timeline", detail: "Logging the change and notifying relevant parties...", estimatedDuration: 400 },
  ],
  resultRenderer: "CRMResult",
};

const DEAL_MOVE_STAGE: ActionUIDef = {
  actionType: "deal.moveStage",
  label: "Moving Deal Stage",
  icon: "ArrowRight",
  steps: [
    { id: "locate", label: "Locating deal", detail: "Finding the deal in your pipeline...", estimatedDuration: 600 },
    { id: "validate", label: "Validating transition", detail: "Confirming the stage move is allowed based on your pipeline rules...", estimatedDuration: 600 },
    { id: "move", label: "Moving to new stage", detail: "Updating the deal's pipeline position...", estimatedDuration: 700 },
    { id: "log", label: "Logging activity", detail: "Recording the stage change in the timeline...", estimatedDuration: 400 },
  ],
  resultRenderer: "CRMResult",
};

const DEAL_DELETE: ActionUIDef = {
  actionType: "deal.delete",
  label: "Deleting Deal",
  icon: "Trash2",
  steps: [
    { id: "locate", label: "Locating deal", detail: "Finding the deal record to remove...", estimatedDuration: 600 },
    { id: "check", label: "Checking dependencies", detail: "Verifying no active tasks or documents are linked...", estimatedDuration: 700 },
    { id: "delete", label: "Removing deal", detail: "Deleting the deal from your pipeline...", estimatedDuration: 700 },
    { id: "log", label: "Logging activity", detail: "Recording the deletion in the audit trail...", estimatedDuration: 400 },
  ],
  resultRenderer: "CRMResult",
};

const TASK_CREATE: ActionUIDef = {
  actionType: "task.create",
  label: "Creating Task",
  icon: "CheckSquare",
  steps: [
    { id: "parse", label: "Parsing task", detail: "Extracting title, priority, and context from your message...", estimatedDuration: 600 },
    { id: "schedule", label: "Setting due date", detail: "Determining the right due date and assigning the task...", estimatedDuration: 500 },
    { id: "create", label: "Creating record", detail: "Adding the task to your task list...", estimatedDuration: 700 },
    { id: "remind", label: "Scheduling reminder", detail: "Setting up a reminder so nothing falls through the cracks...", estimatedDuration: 400 },
  ],
  resultRenderer: "CRMResult",
};

const TASK_COMPLETE: ActionUIDef = {
  actionType: "task.complete",
  label: "Completing Task",
  icon: "CheckCircle",
  steps: [
    { id: "locate", label: "Locating task", detail: "Finding the task in your list...", estimatedDuration: 600 },
    { id: "complete", label: "Marking complete", detail: "Checking off the task as done...", estimatedDuration: 500 },
    { id: "linked", label: "Updating linked records", detail: "Syncing completion status with related deals and contacts...", estimatedDuration: 600 },
    { id: "log", label: "Logging activity", detail: "Recording the completion in your timeline...", estimatedDuration: 400 },
  ],
  resultRenderer: "CRMResult",
};

const TASK_DELETE: ActionUIDef = {
  actionType: "task.delete",
  label: "Deleting Task",
  icon: "Trash2",
  steps: [
    { id: "locate", label: "Locating task", detail: "Finding the task to remove...", estimatedDuration: 600 },
    { id: "delete", label: "Removing task", detail: "Deleting the task from your list...", estimatedDuration: 700 },
    { id: "log", label: "Logging activity", detail: "Recording the deletion...", estimatedDuration: 400 },
  ],
  resultRenderer: "CRMResult",
};

const NOTE_APPEND: ActionUIDef = {
  actionType: "note.append",
  label: "Adding Note",
  icon: "FileText",
  steps: [
    { id: "locate", label: "Locating contact", detail: "Finding the right contact to attach this note to...", estimatedDuration: 600 },
    { id: "write", label: "Writing note", detail: "Formatting and saving your note...", estimatedDuration: 500 },
    { id: "log", label: "Logging activity", detail: "Adding the note to the contact's timeline...", estimatedDuration: 400 },
  ],
  resultRenderer: "CRMResult",
};

// ============================================================================
// Communication Actions
// ============================================================================

const EMAIL_SEND: ActionUIDef = {
  actionType: "email.send",
  label: "Sending Email",
  icon: "Mail",
  steps: [
    { id: "context", label: "Analyzing context", detail: "Reviewing contact history and conversation context...", estimatedDuration: 800 },
    { id: "draft", label: "Drafting email", detail: "Writing the email based on your instructions...", estimatedDuration: 1200 },
    { id: "template", label: "Applying template", detail: "Formatting with your email template and branding...", estimatedDuration: 600 },
    { id: "send", label: "Sending via Gmail", detail: "Delivering the email through your connected Gmail account...", estimatedDuration: 800 },
    { id: "log", label: "Logging activity", detail: "Recording the email in the contact's timeline...", estimatedDuration: 400 },
  ],
  resultRenderer: "EmailResult",
};

const EMAIL_DRAFT: ActionUIDef = {
  actionType: "email.draft",
  label: "Drafting Email",
  icon: "Mail",
  steps: [
    { id: "context", label: "Analyzing context", detail: "Reviewing contact history and conversation context...", estimatedDuration: 800 },
    { id: "draft", label: "Writing draft", detail: "Composing the email based on your instructions...", estimatedDuration: 1200 },
    { id: "template", label: "Formatting", detail: "Applying your email template and styling...", estimatedDuration: 600 },
    { id: "ready", label: "Ready for review", detail: "Draft prepared — awaiting your approval before sending...", estimatedDuration: 400 },
  ],
  resultRenderer: "EmailResult",
};

const EMAIL_SEND_CAMPAIGN: ActionUIDef = {
  actionType: "email.send_campaign",
  label: "Creating Email Campaign",
  icon: "Send",
  steps: [
    { id: "analyze", label: "Analyzing listing details", detail: "Pulling property data, photos, and key selling features...", estimatedDuration: 1000 },
    { id: "research", label: "Researching market context", detail: "Pulling open rate data from your last 30 campaigns to optimize subject lines...", estimatedDuration: 1200 },
    { id: "subjects", label: "Generating subject lines", detail: "Testing multiple subject line variations for maximum open rates...", estimatedDuration: 800 },
    { id: "body", label: "Writing email body", detail: "Crafting compelling copy with your brand voice and listing highlights...", estimatedDuration: 1500 },
    { id: "template", label: "Assembling template", detail: "Building a responsive HTML template with photos and CTAs...", estimatedDuration: 1000 },
    { id: "review", label: "Reviewing deliverability", detail: "Checking spam score, link validation, and image optimization...", estimatedDuration: 800 },
  ],
  resultRenderer: "EmailResult",
};

const SMS_SEND: ActionUIDef = {
  actionType: "sms.send",
  label: "Sending SMS",
  icon: "MessageSquare",
  steps: [
    { id: "locate", label: "Locating contact", detail: "Finding the contact's phone number...", estimatedDuration: 600 },
    { id: "draft", label: "Drafting message", detail: "Writing a concise text message from your instructions...", estimatedDuration: 800 },
    { id: "optin", label: "Checking opt-in status", detail: "Verifying the contact has opted in to receive SMS...", estimatedDuration: 500 },
    { id: "send", label: "Sending via Twilio", detail: "Delivering the message through your Twilio number...", estimatedDuration: 800 },
    { id: "log", label: "Logging activity", detail: "Recording the SMS in the contact's timeline...", estimatedDuration: 400 },
  ],
  resultRenderer: "CRMResult",
};

// ============================================================================
// Marketing / Ads Actions (Honeycomb)
// ============================================================================

const ADS_CREATE_CAMPAIGN: ActionUIDef = {
  actionType: "ads.create_campaign",
  label: "Creating Ad Campaign",
  icon: "Megaphone",
  steps: [
    { id: "analyze", label: "Analyzing objective", detail: "Understanding your campaign goal and target audience...", estimatedDuration: 800 },
    { id: "audience", label: "Selecting audience", detail: "Building targeting based on your service area and demographics...", estimatedDuration: 1000 },
    { id: "creative", label: "Generating creatives", detail: "Designing ad copy and visual assets for maximum engagement...", estimatedDuration: 1500 },
    { id: "budget", label: "Setting budget & schedule", detail: "Configuring daily budget, bid strategy, and campaign schedule...", estimatedDuration: 600 },
    { id: "submit", label: "Submitting to Meta", detail: "Publishing the campaign to Facebook and Instagram...", estimatedDuration: 1000 },
    { id: "monitor", label: "Monitoring delivery", detail: "Checking initial delivery status and ad review progress...", estimatedDuration: 800 },
  ],
  resultRenderer: "CRMResult",
};

const ADS_CHECK_PERFORMANCE: ActionUIDef = {
  actionType: "ads.check_performance",
  label: "Checking Ad Performance",
  icon: "BarChart3",
  steps: [
    { id: "pull", label: "Pulling campaign data", detail: "Fetching latest metrics from Meta Ads API...", estimatedDuration: 1000 },
    { id: "analyze", label: "Analyzing performance", detail: "Calculating CPL, ROAS, CTR, and conversion rates...", estimatedDuration: 800 },
    { id: "insights", label: "Generating insights", detail: "Identifying top performers and areas for improvement...", estimatedDuration: 700 },
    { id: "format", label: "Formatting report", detail: "Building a clear performance summary...", estimatedDuration: 500 },
  ],
  resultRenderer: "ReportResult",
};

const ADS_ANALYZE_PERFORMANCE: ActionUIDef = {
  actionType: "ads.analyze_performance",
  label: "Analyzing Ad Performance",
  icon: "TrendingUp",
  steps: [
    { id: "pull", label: "Pulling campaign data", detail: "Fetching metrics across all active campaigns...", estimatedDuration: 1000 },
    { id: "analyze", label: "Running deep analysis", detail: "Comparing performance across audiences, creatives, and placements...", estimatedDuration: 1200 },
    { id: "insights", label: "Generating insights", detail: "Identifying trends, anomalies, and optimization opportunities...", estimatedDuration: 800 },
    { id: "format", label: "Building report", detail: "Preparing actionable recommendations...", estimatedDuration: 600 },
  ],
  resultRenderer: "ReportResult",
};

const ADS_SUGGEST_OPTIMIZATIONS: ActionUIDef = {
  actionType: "ads.suggest_optimizations",
  label: "Optimizing Ads",
  icon: "Sparkles",
  steps: [
    { id: "pull", label: "Pulling performance data", detail: "Gathering recent campaign metrics and spend data...", estimatedDuration: 800 },
    { id: "analyze", label: "Analyzing patterns", detail: "Looking at what's working and what's underperforming...", estimatedDuration: 1000 },
    { id: "suggest", label: "Generating suggestions", detail: "Building optimization recommendations based on your data...", estimatedDuration: 1200 },
    { id: "format", label: "Formatting recommendations", detail: "Preparing clear, actionable optimization steps...", estimatedDuration: 500 },
  ],
  resultRenderer: "ReportResult",
};

const ADS_APPLY_OPTIMIZATION: ActionUIDef = {
  actionType: "ads.apply_optimization",
  label: "Applying Optimization",
  icon: "Zap",
  steps: [
    { id: "review", label: "Reviewing optimization", detail: "Confirming the changes to apply to your campaign...", estimatedDuration: 600 },
    { id: "apply", label: "Applying changes", detail: "Updating campaign settings through the Meta Ads API...", estimatedDuration: 1000 },
    { id: "verify", label: "Verifying changes", detail: "Confirming the optimizations are live...", estimatedDuration: 700 },
    { id: "log", label: "Logging changes", detail: "Recording what was changed for future reference...", estimatedDuration: 400 },
  ],
  resultRenderer: "CRMResult",
};

const ADS_PAUSE_CAMPAIGN: ActionUIDef = {
  actionType: "ads.pause_campaign",
  label: "Pausing Campaign",
  icon: "PauseCircle",
  steps: [
    { id: "locate", label: "Locating campaign", detail: "Finding the campaign in your Meta Ads account...", estimatedDuration: 600 },
    { id: "pause", label: "Pausing delivery", detail: "Stopping ad delivery through the Meta API...", estimatedDuration: 800 },
    { id: "verify", label: "Confirming status", detail: "Verifying the campaign is paused...", estimatedDuration: 500 },
  ],
  resultRenderer: "CRMResult",
};

const ADS_RESUME_CAMPAIGN: ActionUIDef = {
  actionType: "ads.resume_campaign",
  label: "Resuming Campaign",
  icon: "PlayCircle",
  steps: [
    { id: "locate", label: "Locating campaign", detail: "Finding the paused campaign...", estimatedDuration: 600 },
    { id: "resume", label: "Resuming delivery", detail: "Restarting ad delivery through the Meta API...", estimatedDuration: 800 },
    { id: "verify", label: "Confirming status", detail: "Verifying the campaign is active again...", estimatedDuration: 500 },
  ],
  resultRenderer: "CRMResult",
};

const ADS_LAUNCH_CAMPAIGN: ActionUIDef = {
  actionType: "ads.launch_campaign",
  label: "Launching Campaign",
  icon: "Rocket",
  steps: [
    { id: "review", label: "Final review", detail: "Checking campaign settings, targeting, and budget...", estimatedDuration: 800 },
    { id: "launch", label: "Launching campaign", detail: "Submitting to Meta for review and delivery...", estimatedDuration: 1000 },
    { id: "monitor", label: "Monitoring launch", detail: "Watching for initial delivery confirmation...", estimatedDuration: 800 },
  ],
  resultRenderer: "CRMResult",
};

const ADS_RESEARCH_COMPETITORS: ActionUIDef = {
  actionType: "ads.research_competitors",
  label: "Researching Competitors",
  icon: "Eye",
  steps: [
    { id: "search", label: "Searching competitors", detail: "Finding active advertisers in your market...", estimatedDuration: 1000 },
    { id: "analyze", label: "Analyzing strategies", detail: "Reviewing competitor ad copy, targeting, and spend patterns...", estimatedDuration: 1200 },
    { id: "insights", label: "Generating insights", detail: "Identifying gaps and opportunities for your campaigns...", estimatedDuration: 800 },
    { id: "format", label: "Building report", detail: "Preparing competitive intelligence summary...", estimatedDuration: 500 },
  ],
  resultRenderer: "ReportResult",
};

const ADS_WATCH_COMPETITOR: ActionUIDef = {
  actionType: "ads.watch_competitor",
  label: "Watching Competitor",
  icon: "Bell",
  steps: [
    { id: "setup", label: "Setting up watch", detail: "Configuring monitoring for the competitor's ad activity...", estimatedDuration: 800 },
    { id: "baseline", label: "Capturing baseline", detail: "Recording their current ad library and active campaigns...", estimatedDuration: 1000 },
    { id: "confirm", label: "Confirming watch", detail: "You'll be notified when they launch or change campaigns...", estimatedDuration: 400 },
  ],
  resultRenderer: "CRMResult",
};

// ============================================================================
// Google Ads Actions
// ============================================================================

const GOOGLE_ANALYZE_KEYWORDS: ActionUIDef = {
  actionType: "google.analyze_keywords",
  label: "Analyzing Keywords",
  icon: "Search",
  steps: [
    { id: "research", label: "Researching keywords", detail: "Pulling search volume, competition, and CPC data...", estimatedDuration: 1000 },
    { id: "analyze", label: "Analyzing relevance", detail: "Scoring keywords by intent and conversion potential...", estimatedDuration: 800 },
    { id: "recommend", label: "Building recommendations", detail: "Grouping keywords into ad groups with bid suggestions...", estimatedDuration: 700 },
    { id: "format", label: "Formatting results", detail: "Preparing keyword analysis report...", estimatedDuration: 400 },
  ],
  resultRenderer: "ReportResult",
};

const GOOGLE_CREATE_CAMPAIGN: ActionUIDef = {
  actionType: "google.create_campaign",
  label: "Creating Google Campaign",
  icon: "Globe",
  steps: [
    { id: "analyze", label: "Analyzing objective", detail: "Understanding your campaign goal and keyword strategy...", estimatedDuration: 800 },
    { id: "keywords", label: "Building keyword list", detail: "Selecting high-intent keywords for your market...", estimatedDuration: 1000 },
    { id: "ads", label: "Writing ad copy", detail: "Creating responsive search ads with compelling headlines...", estimatedDuration: 1200 },
    { id: "budget", label: "Setting budget & bids", detail: "Configuring daily budget and bidding strategy...", estimatedDuration: 600 },
    { id: "submit", label: "Submitting to Google", detail: "Publishing the campaign to Google Ads...", estimatedDuration: 1000 },
  ],
  resultRenderer: "CRMResult",
};

const GOOGLE_CHECK_PERFORMANCE: ActionUIDef = {
  actionType: "google.check_performance",
  label: "Checking Google Performance",
  icon: "BarChart3",
  steps: [
    { id: "pull", label: "Pulling campaign data", detail: "Fetching latest metrics from Google Ads API...", estimatedDuration: 1000 },
    { id: "analyze", label: "Analyzing metrics", detail: "Calculating quality scores, CTR, CPC, and conversions...", estimatedDuration: 800 },
    { id: "format", label: "Building report", detail: "Preparing a clear performance summary...", estimatedDuration: 600 },
  ],
  resultRenderer: "ReportResult",
};

const GOOGLE_PAUSE_CAMPAIGN: ActionUIDef = {
  actionType: "google.pause_campaign",
  label: "Pausing Google Campaign",
  icon: "PauseCircle",
  steps: [
    { id: "locate", label: "Locating campaign", detail: "Finding the campaign in your Google Ads account...", estimatedDuration: 600 },
    { id: "pause", label: "Pausing campaign", detail: "Stopping ad delivery through the Google Ads API...", estimatedDuration: 800 },
    { id: "verify", label: "Confirming status", detail: "Verifying the campaign is paused...", estimatedDuration: 500 },
  ],
  resultRenderer: "CRMResult",
};

const GOOGLE_RESUME_CAMPAIGN: ActionUIDef = {
  actionType: "google.resume_campaign",
  label: "Resuming Google Campaign",
  icon: "PlayCircle",
  steps: [
    { id: "locate", label: "Locating campaign", detail: "Finding the paused campaign...", estimatedDuration: 600 },
    { id: "resume", label: "Resuming campaign", detail: "Restarting ad delivery through the Google Ads API...", estimatedDuration: 800 },
    { id: "verify", label: "Confirming status", detail: "Verifying the campaign is active again...", estimatedDuration: 500 },
  ],
  resultRenderer: "CRMResult",
};

const GOOGLE_ADD_NEGATIVES: ActionUIDef = {
  actionType: "google.add_negatives",
  label: "Adding Negative Keywords",
  icon: "MinusCircle",
  steps: [
    { id: "locate", label: "Locating campaign", detail: "Finding the target campaign or ad group...", estimatedDuration: 600 },
    { id: "add", label: "Adding negatives", detail: "Applying negative keywords to block irrelevant searches...", estimatedDuration: 800 },
    { id: "verify", label: "Confirming changes", detail: "Verifying the negative keywords are active...", estimatedDuration: 500 },
  ],
  resultRenderer: "CRMResult",
};

const GOOGLE_ADJUST_BID: ActionUIDef = {
  actionType: "google.adjust_bid",
  label: "Adjusting Budget",
  icon: "DollarSign",
  steps: [
    { id: "locate", label: "Locating campaign", detail: "Finding the campaign to adjust...", estimatedDuration: 600 },
    { id: "adjust", label: "Adjusting budget", detail: "Updating daily budget and bid modifiers...", estimatedDuration: 800 },
    { id: "verify", label: "Confirming changes", detail: "Verifying the new budget is active...", estimatedDuration: 500 },
  ],
  resultRenderer: "CRMResult",
};

const GOOGLE_LAUNCH_CAMPAIGN: ActionUIDef = {
  actionType: "google.launch_campaign",
  label: "Launching Google Campaign",
  icon: "Rocket",
  steps: [
    { id: "review", label: "Final review", detail: "Checking campaign settings, keywords, and budget...", estimatedDuration: 800 },
    { id: "launch", label: "Launching campaign", detail: "Submitting to Google for review and delivery...", estimatedDuration: 1000 },
    { id: "monitor", label: "Monitoring launch", detail: "Watching for initial delivery confirmation...", estimatedDuration: 800 },
  ],
  resultRenderer: "CRMResult",
};

// ============================================================================
// Marketing Content Actions
// ============================================================================

const MARKETING_GENERATE_IMAGE: ActionUIDef = {
  actionType: "marketing.generate_image",
  label: "Generating Image",
  icon: "Image",
  steps: [
    { id: "analyze", label: "Analyzing brief", detail: "Understanding the visual style and content requirements...", estimatedDuration: 600 },
    { id: "generate", label: "Generating image", detail: "Creating the visual asset with AI...", estimatedDuration: 2000 },
    { id: "optimize", label: "Optimizing", detail: "Adjusting dimensions and quality for your platform...", estimatedDuration: 500 },
  ],
  resultRenderer: "SocialResult",
};

const MARKETING_GENERATE_LANDING_PAGE: ActionUIDef = {
  actionType: "marketing.generate_landing_page",
  label: "Building Landing Page",
  icon: "Globe",
  steps: [
    { id: "context", label: "Loading agent data", detail: "Pulling your profile, properties, and branding...", estimatedDuration: 600 },
    { id: "design", label: "Designing page", detail: "AI is building a premium lead capture page...", estimatedDuration: 3000 },
    { id: "publish", label: "Publishing", detail: "Making the page live at your custom URL...", estimatedDuration: 500 },
  ],
  resultRenderer: "CRMResult",
};

// Composite: Full campaign builder flow (research + image + landing page + campaign)
const CAMPAIGN_BUILDER_COMPOSITE: ActionUIDef = {
  actionType: "__campaign_builder",
  label: "Building Your Campaign",
  icon: "Rocket",
  steps: [
    { id: "research", label: "Researching competitors", detail: "Scanning the Meta Ad Library for competitor ads in your area...", estimatedDuration: 2000 },
    { id: "differentiate", label: "Finding your angle", detail: "Identifying gaps and differentiation opportunities...", estimatedDuration: 1500 },
    { id: "image", label: "Generating ad creative", detail: "Creating a professional ad image with headline and CTA...", estimatedDuration: 3000 },
    { id: "landing", label: "Building landing page", detail: "Designing a premium lead capture page for your campaign...", estimatedDuration: 4000 },
    { id: "copy", label: "Writing ad copy", detail: "Crafting differentiated headlines and body text...", estimatedDuration: 1500 },
    { id: "campaign", label: "Assembling campaign", detail: "Setting up targeting, budget, and schedule on Facebook...", estimatedDuration: 1000 },
    { id: "review", label: "Ready for review", detail: "Your campaign is built — review and approve to publish.", estimatedDuration: 500 },
  ],
  resultRenderer: "CRMResult",
};

const MARKETING_GENERATE_CONTENT: ActionUIDef = {
  actionType: "marketing.generate_content",
  label: "Generating Content",
  icon: "PenTool",
  steps: [
    { id: "angle", label: "Selecting content angle", detail: "Choosing the best approach based on your audience and goals...", estimatedDuration: 800 },
    { id: "copy", label: "Writing copy variations", detail: "Drafting multiple versions to test and optimize...", estimatedDuration: 1200 },
    { id: "layout", label: "Designing visual layout", detail: "Structuring the content for maximum visual impact...", estimatedDuration: 800 },
    { id: "hashtags", label: "Optimizing hashtags", detail: "Selecting trending and relevant hashtags for reach...", estimatedDuration: 500 },
    { id: "schedule", label: "Preparing to schedule", detail: "Content ready for your review and scheduling...", estimatedDuration: 400 },
  ],
  resultRenderer: "SocialResult",
};

// ============================================================================
// Referral Actions
// ============================================================================

const REFERRAL_CREATE: ActionUIDef = {
  actionType: "referral.create",
  label: "Creating Referral",
  icon: "Users",
  steps: [
    { id: "parse", label: "Parsing referral info", detail: "Extracting referrer and referee details...", estimatedDuration: 600 },
    { id: "link", label: "Linking contacts", detail: "Connecting the referral to both contact records...", estimatedDuration: 700 },
    { id: "create", label: "Creating referral", detail: "Recording the referral relationship...", estimatedDuration: 600 },
    { id: "log", label: "Logging activity", detail: "Adding the referral to both contacts' timelines...", estimatedDuration: 400 },
  ],
  resultRenderer: "CRMResult",
};

// ============================================================================
// Import Actions
// ============================================================================

const CONTACTS_IMPORT: ActionUIDef = {
  actionType: "contacts.import",
  label: "Importing Contacts",
  icon: "Upload",
  steps: [
    { id: "parse", label: "Parsing import source", detail: "Reading the file and mapping columns to fields...", estimatedDuration: 800 },
    { id: "validate", label: "Validating data", detail: "Checking for duplicates, missing fields, and formatting issues...", estimatedDuration: 1000 },
    { id: "import", label: "Importing records", detail: "Creating contact records in your CRM...", estimatedDuration: 1500 },
    { id: "log", label: "Logging activity", detail: "Recording the import in your audit trail...", estimatedDuration: 400 },
  ],
  resultRenderer: "CRMResult",
};

// ============================================================================
// Saved Search Actions
// ============================================================================

const SAVED_SEARCH_CREATE: ActionUIDef = {
  actionType: "savedSearch.create",
  label: "Creating Saved Search",
  icon: "BookmarkPlus",
  steps: [
    { id: "parse", label: "Parsing search criteria", detail: "Understanding your search parameters...", estimatedDuration: 600 },
    { id: "create", label: "Saving search", detail: "Creating the saved search with your criteria...", estimatedDuration: 700 },
    { id: "confirm", label: "Confirming", detail: "Your saved search is ready to use...", estimatedDuration: 400 },
  ],
  resultRenderer: "CRMResult",
};

// ============================================================================
// DocuSign Actions
// ============================================================================

const DOCUSIGN_SEND_ENVELOPE: ActionUIDef = {
  actionType: "docusign.send_envelope",
  label: "Sending Document",
  icon: "FileSignature",
  steps: [
    { id: "prepare", label: "Preparing document", detail: "Setting up the envelope with recipients and signing fields...", estimatedDuration: 800 },
    { id: "send", label: "Sending for signature", detail: "Delivering the document via DocuSign...", estimatedDuration: 1000 },
    { id: "confirm", label: "Confirming delivery", detail: "Verifying the envelope was sent to all recipients...", estimatedDuration: 500 },
  ],
  resultRenderer: "CRMResult",
};

const DOCUSIGN_CHECK_STATUS: ActionUIDef = {
  actionType: "docusign.check_status",
  label: "Checking Document Status",
  icon: "FileSearch",
  steps: [
    { id: "lookup", label: "Looking up envelope", detail: "Finding the document in DocuSign...", estimatedDuration: 600 },
    { id: "check", label: "Checking status", detail: "Reviewing signing status for all recipients...", estimatedDuration: 700 },
    { id: "format", label: "Formatting response", detail: "Preparing a status summary...", estimatedDuration: 400 },
  ],
  resultRenderer: "CRMResult",
};

// ============================================================================
// Automation Actions
// ============================================================================

const AUTOMATION_CREATE: ActionUIDef = {
  actionType: "automation.create",
  label: "Creating Automation",
  icon: "Workflow",
  steps: [
    { id: "scan", label: "Scanning contact history", detail: "Reviewing past interactions to build the right sequence...", estimatedDuration: 1000 },
    { id: "timing", label: "Identifying optimal timing", detail: "Analyzing engagement patterns to pick the best send times...", estimatedDuration: 800 },
    { id: "plan", label: "Generating touchpoint plan", detail: "Building a sequence of personalized follow-ups...", estimatedDuration: 1200 },
    { id: "messages", label: "Writing messages", detail: "Drafting personalized content for each touchpoint...", estimatedDuration: 1000 },
    { id: "triggers", label: "Setting triggers", detail: "Configuring automation triggers and conditions...", estimatedDuration: 600 },
  ],
  resultRenderer: "SequenceResult",
};

const AUTOMATION_LIST: ActionUIDef = {
  actionType: "automation.list",
  label: "Listing Automations",
  icon: "List",
  steps: [
    { id: "query", label: "Fetching automations", detail: "Pulling all active and paused automation workflows...", estimatedDuration: 800 },
    { id: "format", label: "Formatting list", detail: "Organizing automations by status and type...", estimatedDuration: 500 },
  ],
  resultRenderer: "CRMResult",
};

// ============================================================================
// Bulk Delete Actions
// ============================================================================

const LEAD_DELETE_ALL: ActionUIDef = {
  actionType: "lead.deleteAll",
  label: "Deleting All Contacts",
  icon: "Trash2",
  steps: [
    { id: "count", label: "Counting contacts", detail: "Calculating how many records will be affected...", estimatedDuration: 800 },
    { id: "check", label: "Checking dependencies", detail: "Reviewing linked deals, tasks, and documents...", estimatedDuration: 1000 },
    { id: "delete", label: "Removing all records", detail: "Deleting contacts and associated data...", estimatedDuration: 1500 },
    { id: "log", label: "Logging activity", detail: "Recording the bulk deletion in the audit trail...", estimatedDuration: 400 },
  ],
  resultRenderer: "CRMResult",
};

const DEAL_DELETE_ALL: ActionUIDef = {
  actionType: "deal.deleteAll",
  label: "Deleting All Deals",
  icon: "Trash2",
  steps: [
    { id: "count", label: "Counting deals", detail: "Calculating how many deals will be affected...", estimatedDuration: 800 },
    { id: "check", label: "Checking dependencies", detail: "Reviewing linked tasks and documents...", estimatedDuration: 1000 },
    { id: "delete", label: "Removing all deals", detail: "Deleting deals from your pipeline...", estimatedDuration: 1500 },
    { id: "log", label: "Logging activity", detail: "Recording the bulk deletion in the audit trail...", estimatedDuration: 400 },
  ],
  resultRenderer: "CRMResult",
};

const TASK_DELETE_ALL: ActionUIDef = {
  actionType: "task.deleteAll",
  label: "Deleting All Tasks",
  icon: "Trash2",
  steps: [
    { id: "count", label: "Counting tasks", detail: "Calculating how many tasks will be affected...", estimatedDuration: 800 },
    { id: "delete", label: "Removing all tasks", detail: "Deleting all tasks from your list...", estimatedDuration: 1200 },
    { id: "log", label: "Logging activity", detail: "Recording the bulk deletion in the audit trail...", estimatedDuration: 400 },
  ],
  resultRenderer: "CRMResult",
};

const DEAL_ADD_MILESTONES: ActionUIDef = {
  actionType: "deal.addMilestones",
  label: "Adding Deal Milestones",
  icon: "Flag",
  steps: [
    { id: "locate", label: "Locating deal", detail: "Finding the deal in your pipeline...", estimatedDuration: 600 },
    { id: "create", label: "Creating milestones", detail: "Adding milestone checkpoints to the deal timeline...", estimatedDuration: 800 },
    { id: "log", label: "Logging activity", detail: "Recording the milestones in the deal timeline...", estimatedDuration: 400 },
  ],
  resultRenderer: "CRMResult",
};

// ============================================================================
// Registry: action type → UI definition
// ============================================================================

const ALL_ACTIONS: ActionUIDef[] = [
  // CRM
  LEAD_CREATE, LEAD_UPDATE, LEAD_DELETE, LEAD_DELETE_ALL,
  COMPANY_CREATE, COMPANY_UPDATE, COMPANY_DELETE,
  LEAD_SCORE,
  CRM_SEARCH,
  DEAL_CREATE, DEAL_UPDATE, DEAL_MOVE_STAGE, DEAL_DELETE, DEAL_DELETE_ALL, DEAL_ADD_MILESTONES,
  TASK_CREATE, TASK_COMPLETE, TASK_DELETE, TASK_DELETE_ALL,
  NOTE_APPEND,
  // Communication
  EMAIL_SEND, EMAIL_DRAFT, EMAIL_SEND_CAMPAIGN,
  SMS_SEND,
  // Marketing / Ads
  ADS_CREATE_CAMPAIGN, ADS_CHECK_PERFORMANCE, ADS_ANALYZE_PERFORMANCE,
  ADS_SUGGEST_OPTIMIZATIONS, ADS_APPLY_OPTIMIZATION,
  ADS_PAUSE_CAMPAIGN, ADS_RESUME_CAMPAIGN, ADS_LAUNCH_CAMPAIGN,
  ADS_RESEARCH_COMPETITORS, ADS_WATCH_COMPETITOR,
  // Google Ads
  GOOGLE_ANALYZE_KEYWORDS, GOOGLE_CREATE_CAMPAIGN, GOOGLE_CHECK_PERFORMANCE,
  GOOGLE_PAUSE_CAMPAIGN, GOOGLE_RESUME_CAMPAIGN,
  GOOGLE_ADD_NEGATIVES, GOOGLE_ADJUST_BID, GOOGLE_LAUNCH_CAMPAIGN,
  // Marketing Content
  MARKETING_GENERATE_IMAGE, MARKETING_GENERATE_LANDING_PAGE, MARKETING_GENERATE_CONTENT,
  CAMPAIGN_BUILDER_COMPOSITE,
  // Referrals
  REFERRAL_CREATE,
  // Import
  CONTACTS_IMPORT,
  // Saved Searches
  SAVED_SEARCH_CREATE,
  // DocuSign
  DOCUSIGN_SEND_ENVELOPE, DOCUSIGN_CHECK_STATUS,
  // Automations
  AUTOMATION_CREATE, AUTOMATION_LIST,
];

export const ACTION_UI_REGISTRY = new Map<string, ActionUIDef>(
  ALL_ACTIONS.map((def) => [def.actionType, def])
);

/**
 * Look up the UI step definition for a given LAM action type.
 * Returns undefined for action types with no defined steps (conversational, etc.)
 */
export function getActionUIDef(actionType: string): ActionUIDef | undefined {
  return ACTION_UI_REGISTRY.get(actionType);
}

/**
 * Returns true if the given action type has a defined execution UI.
 */
export function hasExecutionUI(actionType: string): boolean {
  return ACTION_UI_REGISTRY.has(actionType);
}
