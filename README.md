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
    /contacts         # Contact management
    /properties       # Property listings
    /deals            # Sales pipeline
    /tasks            # Task management
  /components
    /ui               # shadcn components
    /layout           # Sidebar, page header
    /dashboard        # Dashboard-specific components
    /contacts         # Contact components
    /properties       # Property components
    /deals            # Deal/pipeline components
    /tasks            # Task components
  /lib
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
