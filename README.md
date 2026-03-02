# Colony

An AI-powered CRM and small business operating system. Talk to it, text it, or let it run on autopilot. Colony handles contacts, deals, referrals, marketing, and communications through a single conversational interface powered by a proprietary Large Action Model (LAM).

Built by [Jersey Proper](https://jerseyproper.com).

## How It Works

Colony is conversation-first. The default interface is a chat — not a dashboard. You tell Colony what you need in plain English, and the LAM (Large Action Model) interprets your request, executes actions across the system, and responds with results. No forms, no dropdowns, no 12-step workflows.

**Example:**
> "Add Sarah Chen as a lead — she called about a bathroom remodel, budget around $25k"

Colony creates the contact, opens a deal, tags it, and schedules a follow-up. One sentence, four actions.

The LAM supports 23 action types across leads, deals, tasks, notes, email, SMS, referrals, and ad campaigns — with risk-tiered execution, undo support, and approval gates for destructive or high-stakes operations.

## Architecture

Colony is built around three modes and three platforms:

### Modes

| Mode | Route | Purpose |
|------|-------|---------|
| **Chat** | `/chat` | Default. Conversational CRM with slash commands, voice input, and context drawers |
| **Browse** | `/browse` | Traditional list views for contacts, properties, and deals |
| **Analyze** | `/analyze` | Dashboard with charts, KPIs, pipeline visualization, and reports |

### Platforms

| Platform | Description |
|----------|-------------|
| **Colony CRM** | Contact management, deal pipeline, tasks, unified inbox, documents, calendar |
| **Honeycomb** | Marketing suite — campaigns, creatives, audience segments, publishers, billing, keyword planner, Chat Studio |
| **Referral Network** | Industry-agnostic referral marketplace with claims, conversations, and visibility controls |

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL via Prisma ORM
- **Auth**: Supabase (SSR)
- **Styling**: Tailwind CSS 4
- **UI**: shadcn/ui + Radix primitives
- **State**: Zustand
- **Forms**: React Hook Form + Zod
- **Email**: Gmail OAuth + Resend
- **SMS**: Twilio
- **Ads**: Meta (Facebook/Instagram) Ads API
- **Files**: UploadThing
- **Testing**: Vitest + Playwright
- **Deployment**: Vercel

## LAM (Large Action Model)

The LAM is Colony's AI engine. It converts natural language into structured action plans, executes them, verifies results, and summarizes outcomes conversationally.

### Pipeline

```
User message > Planner (LLM) > ActionPlan > Runtime > Verifier > Summarizer > Response
                                                |
                                          Audit + Change Log (undo support)
```

### Action Types

| Domain | Actions |
|--------|---------|
| **Leads** | `lead.create`, `lead.update`, `lead.delete`, `lead.deleteAll` |
| **Deals** | `deal.create`, `deal.update`, `deal.moveStage`, `deal.delete`, `deal.deleteAll` |
| **Tasks** | `task.create`, `task.complete`, `task.delete`, `task.deleteAll` |
| **Notes** | `note.append`, `note.delete` |
| **Search** | `crm.search` (contacts, deals, tasks, properties, referrals) |
| **Comms** | `email.send`, `sms.send` |
| **Referrals** | `referral.create` |
| **Ads** | `ads.create_campaign`, `ads.check_performance`, `ads.pause_campaign`, `ads.resume_campaign` |

### Risk Tiers

| Tier | Behavior | Examples |
|------|----------|---------|
| **0** | Auto-execute | Search, read, check performance |
| **1** | Auto-execute + undo | Create, update, single delete |
| **2** | Requires approval | Bulk delete, send email/SMS, create ad campaign |

### Safety Features

- **Idempotency keys** prevent duplicate operations
- **Change logs** capture before/after state for every mutation
- **Undo** reverses Tier 1 actions
- **Approval gates** require confirmation for Tier 2 actions
- **Verification** checks execution results against expected outcomes

## Features

### CRM Core

- **Contacts**: CRUD, tagging (lead/client/agent/vendor), source tracking, favorites, relationship scoring
- **Deals Pipeline**: Kanban board with stages (New Lead > Qualified > Showing > Offer > Negotiation > Closed), drag-and-drop, value tracking
- **Tasks**: Linked to contacts/properties/deals, priority levels, due date tracking, completion toggle
- **Properties**: Grid view, status tracking (pre-listing through sold), linked to owners and deals
- **Documents**: Upload and attach to properties and deals
- **Activities**: Automatic timeline logging across all entity interactions

### Unified Inbox

Follow Up Boss-style communications hub with thread-based conversations.

- Multi-channel: email, SMS, calls
- Split-pane layout with thread list and conversation detail
- Per-user read/unread tracking
- Thread actions: assign, archive, snooze, internal notes
- Auto-matching by email/phone to contacts
- Inbox zero workflow

### Honeycomb (Marketing Suite)

- **Campaigns**: Create, manage, and track marketing campaigns
- **Creatives**: Image, video, carousel, and HTML ad creative management
- **Audience Segments**: Custom, saved, and lookalike segment builder
- **Targeting**: Demographic and interest-based targeting configuration
- **Publishers**: Ad network and direct publisher integrations
- **Keyword Planner**: Keyword research and planning tools
- **Chat Studio**: AI-powered chatbot builder
- **Analytics**: Campaign performance dashboards
- **Billing**: Budget tracking and spend management
- **Meta Integration**: Full Facebook/Instagram Ads API — accounts, campaigns, ad sets, ads, insights syncing

### Referral Network

Industry-agnostic referral marketplace. Conversation lives inside each referral — no standalone DMs.

- **Visibility levels**: Public, network, or org-only
- **Claim workflow**: Request > accept/reject > assign > close
- **Embedded conversation**: Public comments, private messages, system events per referral
- **Categories**: Real estate, plumbing, finance, legal, contractor, and custom

### Autopilot / Invisibleware

Colony can run silently in the background via SMS.

- **Daily digest**: Cron job sends end-of-day summary via text
- **Overdue task reminders**: Automated nudges for missed follow-ups
- **Configurable**: Per-user autopilot toggle, quiet hours, digest time
- **Inbound SMS to LAM**: Users text Colony and get actions executed without logging in

### Teams

- Multi-user CRM with role-based access (owner, admin, member, viewer)
- Team invitations via email with token-based acceptance
- All CRM entities scoped to teams

### Onboarding

- Phone verification via SMS
- Business type selection
- Conversational setup — Colony asks questions and configures itself

### Chat Interface

- Slash commands with autocomplete
- Voice input with waveform visualization
- Context drawers for inline CRM data
- Suggestion chips after assistant responses
- Themeable UI (multiple color schemes)
- Conversation history and summaries

## Project Structure

```
/src
  /app
    /(auth)              Sign in, sign up, password reset
    /(dashboard)         Legacy dashboard routes + CRM modules
      /contacts          Contact management
      /deals             Sales pipeline
      /properties        Property listings
      /tasks             Task management
      /inbox             Unified communications
      /referrals         Referral marketplace
      /reports           Analytics and reporting
      /settings          App configuration
      /email             Email management
      /documents         Document management
      /activities        Activity timeline
      /favorites         Favorited entities
      /notifications     Notification center
      /search            Global search
      /export            Data export
    /(honeycomb)         Marketing suite
      /honeycomb
        /analytics       Campaign analytics
        /billing         Budget and spend
        /campaigns       Campaign management
        /chat-studio     AI chatbot builder
        /creatives       Ad creative management
        /keyword-planner Keyword research
        /publishers      Ad network integrations
        /settings        Honeycomb configuration
        /targeting       Audience targeting
    /(modes)             Mode-based UI
      /chat              Conversational interface (default)
      /browse            List views
      /analyze           Dashboard and charts
    /api
      /assistant         Assistant API
      /auth              Auth + Gmail OAuth
      /calendar          iCal export
      /chat              Chat history, suggestions, summaries, themes
      /cron              Daily digest, overdue task reminders
      /honeycomb         Full marketing API
      /inbox             Thread management, unread counts
      /lam               LAM run, approve, undo, usage
      /meta              Meta Ads integration
      /onboarding        Phone verification, profile setup
      /pipeline          Pipeline summary
      /referrals         Referral CRUD + categories
      /settings          Autopilot configuration
      /sms               Inbound/outbound SMS
      /teams             Team management + invitations
      /uploadthing       File uploads
      /voice             Voice transcription
      /widget            Embeddable widget
  /components
    /assistant           Command bar, message bubbles, action previews, voice input
    /browse              List views for contacts, deals, properties
    /chat                Chat canvas, command bar, panels, onboarding, themes
    /contacts            Contact dialogs, tables, relationship scoring
    /dashboard           Charts, metrics, activity feed, pipeline
    /deals               Deal dialogs, Kanban board, pipeline stats
    /documents           Document list and uploader
    /email               Email history and compose dialog
    /favorites           Favorite buttons per entity type
    /honeycomb           Honeycomb sidebar and page shell
    /inbox               Thread list, thread detail, filters
    /layout              Mode sidebar, top nav, view toggle
    /properties          Property dialogs and grid
    /quick-capture       Floating action button, quick capture sheet
    /referrals           Referral cards, feed, filters, conversation, claims
    /reports             Analytics cards (revenue, leads, conversion, activity)
    /settings            Email accounts, settings panel
    /tasks               Task dialogs and list
    /team                Team creation, invitations, member list, switcher
    /widget-builder      Command palette for widget configuration
    /ui                  shadcn/ui primitives
  /lam
    actionSchema.ts      23 action types with Zod validation
    planner.ts           LLM-powered natural language to ActionPlan
    runtime.ts           Action execution engine (2000+ lines)
    verifier.ts          Post-execution verification
    audit.ts             Run recording and change tracking
    undo.ts              Undo support via change logs
    llm.ts               LLM provider abstraction
    llmParser.ts         Response parsing utilities
    rateLimit.ts         Rate limiting for LAM runs
    index.ts             Orchestration: plan > execute > verify > summarize
  /lib
    /assistant           Assistant store, actions, types
    /db                  Data access layers (honeycomb, inbox, referrals, user-data)
    /honeycomb           Honeycomb API client, hooks, types
    /lam/actions         LAM action implementations
    /meta                Meta Ads client, sync, types
    /mode                Mode state management
    /supabase            Auth, client, middleware, server
    /team                Team state management
    /widget-builder      Widget parser, persistence, registry, schemas
    prisma.ts            Prisma client
    twilio.ts            Twilio SMS client
    gmail.ts             Gmail API client
    resend.ts            Resend email client
    themes.ts            UI theme definitions
    utils.ts             Utility functions
    date-utils.ts        Date formatting
    relationship-score.ts Contact relationship scoring
    email-templates.ts   Email template definitions
/prisma
  schema.prisma          30+ models across CRM, inbox, referrals, honeycomb, LAM, meta, SMS
/supabase
  /migrations            Database migrations
/docs
  MODE_ARCHITECTURE.md   Mode-based UI architecture documentation
  referrals.md           Referral system design documentation
/scripts
  seed-lam.ts            LAM seed data
  check-contacts.mjs     Contact verification utility
/e2e
  example.spec.ts        Playwright end-to-end tests
```

## License

Proprietary. All rights reserved.
