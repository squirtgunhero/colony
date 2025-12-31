# Referral Feed System

## Overview

The Referral Feed is an industry-agnostic system for sharing and claiming referral opportunities. Unlike traditional inbox/messaging systems, **conversation lives inside the referral** - there are no standalone DMs or separate chat products.

## Core Concept

A **Referral** is the primary object. Every conversation, message, and interaction is tied to a specific referral. This keeps all context in one place and ensures conversations are always about something concrete.

```
┌─────────────────────────────────────────────┐
│                 REFERRAL                     │
├─────────────────────────────────────────────┤
│  - title, category, location, value         │
│  - status: open → claimed → assigned → closed│
│  - visibility: public | network | org       │
├─────────────────────────────────────────────┤
│  PARTICIPANTS                                │
│  - creator (who posted)                      │
│  - claimant (who claimed and was accepted)  │
│  - collaborators, observers                  │
├─────────────────────────────────────────────┤
│  CONVERSATION                                │
│  - public comments (visible to all viewers) │
│  - private messages (participants only)      │
│  - system messages (state changes)           │
├─────────────────────────────────────────────┤
│  CLAIMS                                      │
│  - pending claims from interested parties    │
│  - accepted/rejected history                 │
└─────────────────────────────────────────────┘
```

## Data Model

### Referrals

```typescript
interface Referral {
  id: string;
  createdByUserId: string;  // The user who posted
  orgId?: string;           // For team/org support (future)
  visibility: 'org' | 'network' | 'public';
  status: 'open' | 'claimed' | 'assigned' | 'closed';
  category: string;         // e.g., 'real_estate', 'plumbing', 'finance'
  title: string;
  description?: string;
  locationText?: string;
  valueEstimate?: number;
  currency?: string;
  metadata?: object;
  createdAt: Date;
  updatedAt: Date;
}
```

### Participants

Every user involved with a referral has a participant record with a role:

- **creator**: The user who posted the referral (added automatically)
- **claimant**: A user whose claim was accepted
- **collaborator**: Added by creator to help with the referral
- **observer**: Interested party (e.g., pending claimant)

### Messages

Messages belong to the referral and have visibility rules:

```typescript
interface ReferralMessage {
  id: string;
  referralId: string;
  createdByUserId: string;
  messageType: 'comment' | 'system' | 'private';
  bodyText: string;
  visibility: 'public' | 'participants_only';
  createdAt: Date;
}
```

- **public comments**: Visible to anyone who can see the referral
- **private messages**: Visible only to participants
- **system messages**: Automatic notifications (claim requested, accepted, closed)

### Claims

```typescript
interface ReferralClaim {
  id: string;
  referralId: string;
  claimantUserId: string;
  message?: string;         // Optional intro message
  status: 'requested' | 'accepted' | 'rejected';
  createdAt: Date;
  resolvedAt?: Date;
}
```

## Status Flow

```
┌──────┐     claim      ┌─────────┐    accept    ┌──────────┐    close    ┌────────┐
│ OPEN │ ─────────────▶ │ CLAIMED │ ───────────▶ │ ASSIGNED │ ──────────▶ │ CLOSED │
└──────┘                └─────────┘              └──────────┘             └────────┘
    ▲                        │                                                 ▲
    │                        │ reject (if no other claims pending)             │
    └────────────────────────┘                                                 │
                                                     creator closes at any time─┘
```

## Visibility Rules

### Referral Visibility

- **public**: Anyone can see (logged-in users)
- **network**: Future - only connections can see
- **org**: Future - only organization members can see

### Message Visibility

| User Type | Public Comments | Private Messages | System Messages |
|-----------|-----------------|------------------|-----------------|
| Creator | ✅ | ✅ | ✅ |
| Claimant/Participant | ✅ | ✅ | ✅ |
| Observer (pending claimant) | ✅ | ✅ | ✅ |
| Non-participant | ✅ | ❌ | ❌ |

### Posting Rules

| User Type | Can Post Public | Can Post Private |
|-----------|-----------------|------------------|
| Creator | ✅ | ✅ |
| Participant | ✅ | ✅ |
| Non-participant | ✅ (while open) | ❌ |

Closed referrals are read-only - no new messages.

## API Endpoints

### Referrals

```
GET    /api/referrals              # List referrals (with filters)
POST   /api/referrals              # Create referral
GET    /api/referrals/:id          # Get referral details
PATCH  /api/referrals/:id          # Update referral (creator only)
POST   /api/referrals/:id/close    # Close referral (creator only)
```

### Claims

```
POST   /api/referrals/:id/claim                      # Claim a referral
POST   /api/referrals/:id/claims/:claimId/accept     # Accept claim (creator)
POST   /api/referrals/:id/claims/:claimId/reject     # Reject claim (creator)
```

### Messages

```
GET    /api/referrals/:id/messages    # Get messages (filtered by visibility)
POST   /api/referrals/:id/messages    # Send message
```

## UI Structure

### Feed Page (`/referrals`)

- Grid of referral cards with status, category, value badges
- Filters: status, category, view (all/mine/participating), search
- "Post Referral" button opens creation dialog

### Detail Page (`/referrals/:id`)

- Header with status, actions (Claim/Close)
- Tabs:
  - **Details**: Description, metadata
  - **Conversation**: Mixed timeline of comments, private messages, system events
  - **Claims** (creator only): Manage pending/past claims
  - **Participants**: List of people involved

### Conversation Panel

- Messages displayed in chat bubble format
- System messages shown as centered notifications
- Private messages marked with lock icon
- Visibility toggle for participants (public/private)

## Usage Patterns

### Posting a Referral

1. User clicks "Post Referral"
2. Fills in title, category, description, location, value estimate
3. Referral created with status `open`
4. User automatically added as `creator` participant

### Claiming a Referral

1. User viewing an `open` referral clicks "Claim"
2. Optionally writes an intro message
3. Claim created with status `requested`
4. User added as `observer` participant
5. Referral status changes to `claimed`
6. System message posted

### Accepting a Claim

1. Creator views Claims tab
2. Reviews pending claim(s)
3. Clicks "Accept" on chosen claim
4. Claim status → `accepted`
5. Claimant role upgrades to `claimant`
6. Other pending claims → `rejected`
7. Referral status → `assigned`
8. Private conversation now possible

### Continuing Privately

1. After claim acceptance, both parties are full participants
2. Can toggle messages between public/private
3. Conversation continues until creator closes referral

## Key Design Decisions

### Why No Standalone Inbox?

- **Context**: Every message has context (the referral)
- **Simplicity**: One unified system instead of two
- **Focus**: Keeps conversations goal-oriented
- **Discoverability**: All activity tied to visible referrals

### Why Embedded Conversation?

- **Everything in one place**: No jumping between screens
- **Mixed visibility**: Public and private in same timeline
- **State awareness**: System messages show status changes
- **Audit trail**: Full history preserved

### Industry Agnostic

The category field is a simple string, supporting any industry:
- Real estate, plumbing, electrical
- Finance, legal, insurance
- Contractors, landscaping, moving
- Custom categories as needed

## Performance Considerations

### Indexes

- `(visibility, status, updated_at)` - Feed queries
- `(created_by_user_id, status)` - My referrals
- `(category, status)` - Category filtering
- `(referral_id, created_at)` - Message ordering

