# Colony Mode Architecture

## Overview

Colony uses a mode-based UI architecture that prioritizes conversation-first interaction while keeping traditional CRM features accessible.

## App Modes

### 1. Chat Mode (`/chat`) - Default

The primary interface. A clean, messaging app-style experience with CRM context available on demand.

**Components:**
- `ChatCanvas` - Main conversation thread
- `ChatCommandBar` - Primary interaction surface (slash commands, natural language)
- `ContextDrawer` - Right-side drawer for CRM context (opens via commands)
- `ChatSuggestionChips` - Context-aware action chips (appear after assistant responses)

**What's NOT visible in Chat Mode:**
- Dashboard cards
- KPI tiles
- Charts and graphs
- Multi-column layouts

**How to access CRM context:**
- Use `/show-pipeline` to view pipeline in drawer
- Use `/show-contact <name>` to view contact details
- Use `/show-deal <id>` to view deal details
- Natural language queries trigger appropriate drawer panels

### 2. Browse Mode (`/browse`)

Traditional list-based CRM views for contacts, properties, and deals.

**Routes:**
- `/browse/contacts` - Contacts list
- `/browse/properties` - Properties list
- `/browse/deals` - Deals list

**Components:**
- `ContactsListView`
- `PropertiesListView`
- `DealsListView`

### 3. Analyze Mode (`/analyze`)

Full dashboard with charts, KPIs, and analytics. This is where the original dashboard content lives.

**Components:**
- All original dashboard components:
  - `DashboardHeader` (pipeline value, KPIs)
  - `PipelineBarChart`
  - `LeadSourcesChart`
  - `DealsTrendChart`
  - `LeadCards`
  - `TasksCalendar`
  - `ActivityFeed`
  - `PipelineChart`

## Navigation

The sidebar shows only 4 items:
1. **Chat** - Conversation-first CRM
2. **Browse** - Lists for contacts, properties, deals
3. **Analyze** - Dashboard and reports
4. **Settings** - App configuration

## Key Components

### Mode Store (`/lib/mode/store.ts`)

Manages:
- Current mode (`chat | browse | analyze`)
- Context drawer state (open/close, panel type, entity)
- Active suggestion chips

### Context Drawer (`/components/chat/ContextDrawer.tsx`)

Right-side drawer that displays CRM context. Panel types:
- `pipeline` - Pipeline overview
- `contact` - Contact details
- `deal` - Deal details
- `task` - Task details
- `property` - Property details

### Command Bar (`/components/chat/ChatCommandBar.tsx`)

Primary interaction surface. Supports:
- Plain text queries (sent to LAM)
- Slash commands (with autocomplete)
- Voice input
- Undo functionality

## Slash Commands

| Command | Action |
|---------|--------|
| `/create-contact` | Create a new contact |
| `/create-deal` | Start a new deal |
| `/create-task` | Add a new task |
| `/show-pipeline` | View pipeline in drawer |
| `/show-contact <name>` | View contact in drawer |
| `/show-deal <id>` | View deal in drawer |
| `/log-call` | Record a call note |
| `/summarize` | Get summary of current item |
| `/search` | Search across CRM |
| `/draft-email` | Compose an email |
| `/undo` | Undo last action |

## Data Flow

1. **Chat Mode** uses the same data fetching as before
2. **Analyze Mode** uses the original dashboard data queries
3. **Browse Mode** uses list-optimized queries
4. **Context Drawer panels** fetch data on-demand via API routes

## Migration Notes

- The original `/dashboard` route still works (legacy support)
- All dashboard components remain in `/components/dashboard`
- New mode-specific components are in `/components/chat` and `/components/browse`
- The home page (`/`) now redirects to `/chat` instead of `/dashboard`
