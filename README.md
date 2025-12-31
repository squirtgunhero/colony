# Regganism CRM

A modern real estate CRM built with Next.js 14, featuring contact management, property listings, deal pipeline tracking, and task management.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: SQLite with Prisma ORM
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Icons**: Lucide React
- **Forms**: React Hook Form + Zod validation

## Features

### Dashboard
- Overview metrics (contacts, properties, deals, tasks)
- Recent activity feed
- Upcoming tasks list

### Contacts
- CRUD operations for contacts
- Contact types: Lead, Client, Agent, Vendor
- Search and filter capabilities
- Contact detail with email and phone

### Properties
- Property listings with grid view
- Status tracking: Available, Under Contract, Sold, Off Market
- Property details: bedrooms, bathrooms, square footage
- Link properties to contact owners

### Deals Pipeline
- Kanban-style board for deal stages
- Stages: New Lead → Qualified → Showing → Offer → Negotiation → Closed
- Drag-and-drop deal movement
- Quick navigation buttons to move deals between stages
- Deal value tracking

### Tasks
- Create tasks linked to contacts, properties, or deals
- Due date tracking with overdue highlighting
- Priority levels: Low, Medium, High
- Task completion with checkbox toggle
- Separate tabs for pending and completed tasks

### Inbox (Unified Communications Hub)
A Follow Up Boss–style inbox that centralizes all communication with contacts.

**Features:**
- **Multi-channel support**: Email, SMS (Phase 2), and Call events (Phase 2)
- **Thread-based conversations**: Messages grouped by contact into conversation threads
- **Split-pane layout**: Thread list on left, conversation detail on right
- **Read/unread tracking**: Per-user read state for accurate unread counts
- **Thread actions**:
  - Mark as read/unread
  - Assign to user
  - Archive (remove from default view)
  - Snooze until specific date/time
  - Add internal notes
- **Filtering**: By status (open/archived/snoozed), channel, unread only
- **Search**: Search across contact names, emails, phones, and message content
- **Inbox Zero workflow**: Replying, archiving, or snoozing clears threads from default view

**Thread Matching:**
- Email messages match by sender/recipient email → contact email
- SMS/Call messages match by phone number (E.164 normalized)
- Unknown senders create threads labeled "Unknown" until linked to a contact
- Archived/snoozed threads auto-reopen on new inbound messages

**Integration:**
- Outbound emails sent from anywhere in the CRM automatically create inbox messages
- Activities are logged to contact timeline when messages are sent

**Data Model:**
- `inbox_threads`: Conversation threads linked to contacts
- `inbox_messages`: Individual messages (email, SMS, call events)
- `inbox_participants`: Per-user read state tracking

## Getting Started

### Prerequisites
- Node.js 18+
- npm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up the database:
```bash
npx prisma migrate dev
```

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
/src
  /app
    /dashboard        # Main dashboard
    /inbox            # Unified communications inbox
    /contacts         # Contact management
    /properties       # Property listings
    /deals            # Sales pipeline
    /tasks            # Task management
    /api/inbox        # Inbox API routes
  /components
    /ui               # shadcn components
    /layout           # Sidebar, page header
    /inbox            # Inbox components (ThreadList, ThreadDetail, etc.)
    /dashboard        # Dashboard-specific components
    /contacts         # Contact components
    /properties       # Property components
    /deals            # Deal/pipeline components
    /tasks            # Task components
  /lib
    /db
      inbox.ts        # Inbox data access layer
      user-data.ts    # User-scoped database operations
    prisma.ts         # Prisma client
    utils.ts          # Utility functions
    date-utils.ts     # Date formatting utilities
/prisma
  schema.prisma       # Database schema
```

## Database Schema

- **Contact**: Stores leads, clients, agents, and vendors
- **Property**: Property listings with details
- **Deal**: Sales opportunities linked to contacts and properties
- **Task**: To-dos and follow-ups linked to contacts, properties, or deals

## UI Theme

Dark mode with amber/gold accents for a luxurious real estate feel. The color scheme evokes elegance while maintaining excellent readability and accessibility.
