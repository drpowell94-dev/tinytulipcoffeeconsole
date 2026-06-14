# Backend Architecture: Business Automation & Efficiency Features

## Overview
This document outlines the backend infrastructure for scaling Tiny Tulip's operations, focusing on:
1. **Content Multiplier Pipeline** - Automated content generation and distribution
2. **Insight Engine** - Reactive dashboard analytics with actionable recommendations
3. **Lead Intake API** - Programmatic booking/catering request handling
4. **Predictive Logistics** - Historical analysis for supply planning

---

## Feature 1: Blog & Content Multiplier Pipeline

### Architecture
```
User creates blog post (Draft)
    ↓
Trigger content-generator edge function
    ↓
Generate variants (Instagram, Email, Keywords)
    ↓
Store metadata in blog_posts table
    ↓
Push to Wix CMS via webhook (if published)
    ↓
Activity log entry
```

### New Database Columns
```sql
ALTER TABLE blog_posts ADD COLUMN (
  social_caption TEXT,           -- Instagram/social media optimized
  email_excerpt TEXT,            -- Newsletter excerpt
  seo_keywords_generated TEXT[], -- AI-derived keywords
  wix_published_at TIMESTAMP,    -- Track Wix sync timestamp
  wix_post_id TEXT UNIQUE,       -- Wix content ID
  synced_to_wix BOOLEAN DEFAULT false
);

CREATE INDEX idx_blog_posts_wix_sync ON blog_posts(synced_to_wix, published_at);
```

### Edge Function: `content-generator`
- **Trigger**: POST `/v1/content-generator`
- **Auth**: Bearer token (WIX_WEBHOOK_SECRET)
- **Input**: blogPostId, blogContent, template (coffee_origin|seasonal_launch|community_update)
- **Process**:
  - Fetch blog post from Supabase
  - Call mock AI service (or integrate with OpenAI API)
  - Generate social caption, email excerpt, keywords
  - Update blog_posts table
  - Queue webhook to push to Wix CMS
- **Output**: { success, generatedContent: { social_caption, email_excerpt, keywords } }

### Edge Function: `wix-cms-publish`
- **Trigger**: Published blog post in app
- **Process**:
  - Verify blog post exists and is published
  - Format content for Wix (HTML, metadata)
  - POST to Wix REST API `/v1/items` endpoint
  - Store wix_post_id and synced_to_wix flag
  - Log activity

---

## Feature 2: Reactive Dashboard & Insight Engine

### Architecture
```
Dashboard page loads
    ↓
Backend analyzes event schedule
    ↓
If no events in next 7 days:
  → Generate "Actionable Next Step" recommendations
    (e.g., "Pitch high-revenue venues from past 90 days")
    ↓
Return insight payload to frontend
    ↓
Display as call-to-action card
```

### New Endpoint: `GET /v1/dashboard/insights`
- **Query Params**: userId (optional, for future role-based filtering)
- **Logic**:
  1. Count upcoming events (next 7 days)
  2. If count == 0:
     - Query past 90 days of completed events
     - Group by venue/zip_code
     - Find highest-revenue venues
     - Generate insight: "Suggest outreach to [Venue Name] at [Address]"
  3. If revenue trend down month-over-month:
     - Suggest: "New seasonal drink launch could boost sales"
  4. If checklist items uncompleted 24hrs before event:
     - Suggest: "4 prep items pending for [Event Name] tomorrow"
- **Response**:
  ```json
  {
    "upcomingEventCount": 0,
    "insights": [
      {
        "type": "no_upcoming_events",
        "actionable_next_step": "Pitch high-performing venue: 1532 East Blvd (avg $2.1K/event)",
        "relatedEventId": "uuid-of-highest-revenue-past-event",
        "priority": "high"
      }
    ]
  }
  ```

### Service Module: `analyticsService.ts`
Exports:
- `getUpcomingEventCount(daysAhead)` - Query events with date_start in range
- `getPastEventsByVenue(days)` - Aggregate past completed events by zip/type
- `calculateRevenueMetrics(eventId)` - Expected vs actual revenue
- `generateInsight(context)` - Logic to suggest next steps based on data

---

## Feature 3: Inbound Booking & Lead API

### Architecture
```
External website form submits POST request
    ↓
Authenticate with API key
    ↓
Validate request shape
    ↓
Insert into events table (status: 'pending_lead')
    ↓
Log source & timestamp
    ↓
Send confirmation email (optional queue)
    ↓
Return acknowledgment
```

### New Database Columns on `events`
```sql
ALTER TABLE events ADD COLUMN (
  source_lead_form TEXT,         -- 'wix_website', 'direct_form', 'phone', etc.
  lead_uuid TEXT UNIQUE,         -- External form submission ID
  client_notes TEXT,             -- Initial inquiry message from client
  estimated_guest_count INTEGER, -- From form input
  followup_required BOOLEAN DEFAULT true
);

CREATE INDEX idx_events_pending_leads ON events(status) WHERE status = 'pending_lead';
```

### Edge Function: `/v1/leads/booking` (POST)
- **Auth**: Bearer token (API key from external partner)
- **Request Body**:
  ```json
  {
    "leadId": "ext-form-uuid",
    "clientName": "Jane Doe",
    "clientEmail": "jane@company.com",
    "clientPhone": "+1-555-0123",
    "eventDate": "2026-07-15",
    "location": "1532 East Blvd, City, ST 12345",
    "guestCount": 150,
    "eventType": "catering",
    "specialNotes": "Vegan-friendly options needed"
  }
  ```
- **Validation**:
  - Required: clientName, eventDate, location, guestCount
  - Parse & validate date format
  - Extract zip code from location
  - Validate email format
- **Process**:
  1. Insert event with status='pending_lead', source_lead_form='wix_website'
  2. Create event_contact record with primary=true
  3. Queue confirmation email to client
  4. Log activity (source=API, event_id)
  5. Return event ID + status
- **Response**: { success: true, eventId: "uuid", status: "pending_lead" }

### Service Module: `leadService.ts`
Exports:
- `createLeadEvent(payload)` - Validates & inserts
- `sendLeadConfirmationEmail(email, eventName)` - Queue email (optional)
- `getLeadMetrics()` - Count pending leads, conversion rates, etc.

---

## Feature 4: Predictive Event Logistics

### Architecture
```
Event details page loads or event created
    ↓
Query historical completed events
    ↓
Filter by: venue type, zip code, season, event type
    ↓
Calculate averages: cups_per_guest, beans_per_100_cups, etc.
    ↓
Apply to current event's guest count
    ↓
Append predicted_logistics to event response
    ↓
Display in UI checklist suggestions
```

### New Table: `event_logistics_history`
```sql
CREATE TABLE event_logistics_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  cups_used INTEGER,
  beans_used_lbs DECIMAL(8, 2),
  milk_used_liters DECIMAL(8, 2),
  ice_used_lbs DECIMAL(8, 2),
  lids_used INTEGER,
  napkins_used INTEGER,
  notes TEXT,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_logistics_event ON event_logistics_history(event_id);
CREATE INDEX idx_logistics_created ON event_logistics_history(recorded_at);
```

### Service Module: `logisticsService.ts`
Exports:
- `recordActualUsage(eventId, usage)` - Post-event data capture
- `getPredictedNeeds(event)` - Calculate based on historical data
  ```typescript
  interface PredictedNeeds {
    predicted_cups: number;
    predicted_beans_lbs: number;
    predicted_milk_liters: number;
    confidence: 'high' | 'medium' | 'low'; // based on sample size
    sampleSize: number;
    methodId: string; // 'zip_code' | 'event_type' | 'default'
  }
  ```
- `getHistoricalMetrics(filters)` - Avg usage per guest by category

### Edge Function: `/v1/events/{eventId}/predicted-logistics` (GET)
- **Query Params**: eventId
- **Logic**:
  1. Load event details (guest_count, location zip, event_type)
  2. Query event_logistics_history for completed events in same zip
  3. If < 3 samples: fall back to event_type aggregate
  4. If no event_type data: use global average
  5. Calculate: `predicted_cups = avg_cups_per_guest * event.guest_count`
  6. Return with confidence level
- **Response**:
  ```json
  {
    "eventId": "uuid",
    "guestCount": 150,
    "predictedNeeds": {
      "predicted_cups": 185,
      "predicted_beans_lbs": 18.5,
      "predicted_milk_liters": 22,
      "predicted_lids": 185,
      "predicted_napkins": 300,
      "confidence": "high",
      "sampleSize": 12,
      "methodology": "Based on 12 past events in this zip code"
    }
  }
  ```

---

## Implementation Roadmap

### Phase 1: Foundations (Week 1)
- [ ] Create new edge functions directory structure
- [ ] Add database columns & migrations
- [ ] Create service modules (analyticsService, leadService, logisticsService)
- [ ] Implement `/v1/leads/booking` endpoint
- [ ] Implement `/v1/dashboard/insights` endpoint

### Phase 2: Content Pipeline (Week 2)
- [ ] Design mock AI content generator
- [ ] Create `/v1/content-generator` edge function
- [ ] Integrate Wix CMS publishing webhook
- [ ] Add blog post publishing workflow
- [ ] Test content variant generation

### Phase 3: Logistics & Analytics (Week 3)
- [ ] Create `/v1/events/{eventId}/predicted-logistics` endpoint
- [ ] Build historical usage recording system
- [ ] Implement analytics calculations
- [ ] Connect insights to dashboard page
- [ ] Add activity logging for all operations

### Phase 4: Testing & Polish (Week 4)
- [ ] Unit tests for service logic
- [ ] Integration tests for edge functions
- [ ] Performance optimization (query indexes)
- [ ] Documentation & runbook
- [ ] Deploy to staging → production

---

## API Key Management

### Auth Scheme
- **Blog/Content**: WIX_WEBHOOK_SECRET (existing)
- **Lead API**: Create new `LEAD_API_KEYS` table
  ```sql
  CREATE TABLE api_keys (
    id UUID PRIMARY KEY,
    key_hash TEXT UNIQUE NOT NULL,
    name TEXT,
    description TEXT,
    partner_name TEXT,
    last_used_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
  );
  ```
- **Dashboard/Internal**: JWT via Supabase Auth (existing)

---

## Error Handling & Observability

### Logging
- All edge functions log to Supabase `activity_log` table
- Include: user_id (if available), action, status, error_message, timestamp

### Retry Strategy
- Lead API: Queue failed submissions (retry after 60s)
- Content Generator: Queue failed generations (retry with backoff)
- Wix Publish: Exponential backoff (1s, 2s, 4s, 8s)

### Monitoring
- Track "Leads Created" daily metric
- Monitor "Content Generation Success Rate"
- Alert on "0 upcoming events" state (triggers insights)
- Track "Logistics Prediction Accuracy" (vs actual post-event)

---

## Security Considerations

1. **Lead API**: Validate domain/referrer on public endpoints
2. **Content Generator**: Rate limit (10 req/min per API key)
3. **All Edge Functions**: Log all auth failures
4. **Wix Publishing**: Sign requests with HMAC (future Wix webhook verification)

---

## File Structure

```
supabase/
  functions/
    leads-booking/
      index.ts                    -- POST /v1/leads/booking
    content-generator/
      index.ts                    -- POST /v1/content-generator
    wix-cms-publish/
      index.ts                    -- Triggered by blog publish
    dashboard-insights/
      index.ts                    -- GET /v1/dashboard/insights
    event-logistics/
      index.ts                    -- GET /v1/events/{eventId}/predicted-logistics

src/
  services/
    analyticsService.ts           -- Insights & metrics
    leadService.ts                -- Lead intake business logic
    logisticsService.ts           -- Predictive supply calculations
    contentService.ts             -- Content generation helpers (optional)
  lib/
    (existing event/checklist stores)

supabase/migrations/
  003_content_pipeline.sql        -- blog_posts columns
  004_analytics_tables.sql        -- event_logistics_history, api_keys
```

---

**Status**: Architecture finalized. Ready for implementation.
**Last Updated**: 2026-06-14
