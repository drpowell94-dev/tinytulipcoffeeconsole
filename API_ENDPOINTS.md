# API Endpoints Documentation

This document describes all backend API endpoints for the Tiny Tulip Coffee Console automation system.

---

## Overview

All endpoints are deployed as Supabase Edge Functions. Base URL:
```
https://<supabase-project-id>.supabase.co/functions/v1
```

---

## Authentication

### Bearer Token
Some endpoints require Bearer token authentication:
```
Authorization: Bearer <token>
```

**Token Types:**
- `WIX_WEBHOOK_SECRET` - For content generator, Wix integrations
- `LEAD_API_KEYS` - For external booking form submissions (comma-separated list in env)

---

## Endpoints

### 1. Lead Intake API

#### POST `/v1/leads/booking`

**Purpose:** Accept catering/booking requests from external website forms.

**Authentication:** Bearer token (LEAD_API_KEYS)

**Request Body:**
```json
{
  "leadId": "unique-external-form-uuid",
  "clientName": "Jane Doe",
  "clientEmail": "jane@example.com",
  "clientPhone": "+1-555-0123",
  "eventDate": "2026-07-15T14:00:00Z",
  "location": "1532 East Blvd, Portland, OR 97214",
  "guestCount": 150,
  "eventType": "catering",
  "specialNotes": "Vegan-friendly options needed"
}
```

**Response (Success - 201):**
```json
{
  "success": true,
  "eventId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "inquiry",
  "message": "Lead event created successfully"
}
```

**Response (Validation Error - 400):**
```json
{
  "error": "Validation failed",
  "details": ["Valid clientEmail required", "guestCount must be positive"]
}
```

**Required Fields:**
- `leadId` (string) - External form submission ID
- `clientName` (string) - Client name
- `clientEmail` (string) - Valid email address
- `eventDate` (ISO 8601) - Event date
- `location` (string) - Venue address
- `guestCount` (number) - Expected guest count > 0

**Optional Fields:**
- `clientPhone` - Phone number
- `eventType` - One of: catering, popup, farmers_market, other (default: catering)
- `specialNotes` - Any special requests

**Side Effects:**
- Creates event record (status: inquiry)
- Creates event_contact record with zip code extracted
- Logs activity for audit trail
- (Future) Queues confirmation email to client

**Error Cases:**
- 401: Invalid or missing API key
- 400: Validation failures (missing fields, invalid email/date format)
- 500: Database error

---

### 2. Dashboard Insights API

#### GET `/v1/dashboard/insights`

**Purpose:** Generate actionable business insights for dashboard.

**Authentication:** None (service-to-service call)

**Query Parameters:**
- `userId` (optional) - For future role-based filtering

**Response (Success - 200):**
```json
{
  "upcomingEventCount": 0,
  "insights": [
    {
      "type": "no_upcoming_events",
      "actionableNextStep": "Suggest outreach to 1532 East Blvd (previous catering for $2,100)",
      "relatedEventId": "550e8400-e29b-41d4-a716-446655440000",
      "relatedVenueName": "1532 East Blvd",
      "priority": "high"
    },
    {
      "type": "low_revenue_trend",
      "actionableNextStep": "Revenue down 35% vs last month. Consider seasonal drink launch or promotional event.",
      "priority": "high"
    },
    {
      "type": "pending_checklists",
      "actionableNextStep": "Summer Rooftop Catering is tomorrow! 4 prep items still pending.",
      "relatedEventId": "660e8400-e29b-41d4-a716-446655440000",
      "priority": "high"
    }
  ]
}
```

**Insight Types:**
- `no_upcoming_events` - No events scheduled for next 7 days
- `low_revenue_trend` - Month-over-month revenue decline > 20%
- `pending_checklists` - Uncompleted checklist items 24hrs before event
- `inventory_low` - (Future) Low inventory alerts

**Usage:**
Call this endpoint when dashboard loads to populate dynamic insights section.

---

### 3. Event Logistics Prediction API

#### GET `/v1/events/{eventId}/predicted-logistics`

**Purpose:** Predict supply needs based on historical event data.

**Authentication:** None (service-to-service)

**Query Parameters:**
- `eventId` (required) - UUID of event

**Response (Success - 200):**
```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440000",
  "guestCount": 150,
  "predictedNeeds": {
    "predictedCups": 185,
    "predictedBeansLbs": 18.5,
    "predictedMilkLiters": 22,
    "predictedLids": 185,
    "predictedNapkins": 300,
    "confidence": "high",
    "sampleSize": 12,
    "methodology": "Based on 12 past events in this zip code",
    "methodId": "zip_code"
  }
}
```

**Confidence Levels:**
- `high` - 10+ historical samples
- `medium` - 5-9 historical samples
- `low` - < 5 samples or using defaults

**Methodology:**
1. Zip-code specific (if 3+ events in same area)
2. Event-type aggregate (if 3+ events of same type)
3. Global defaults (conservative estimate)

**Error Cases:**
- 404: Event not found
- 400: Missing eventId parameter

---

### 4. Content Generator API

#### POST `/v1/content-generator`

**Purpose:** Generate AI-powered social, email, and SEO content from blog post.

**Authentication:** Bearer token (WIX_WEBHOOK_SECRET)

**Request Body:**
```json
{
  "blogPostId": "550e8400-e29b-41d4-a716-446655440000",
  "blogContent": "Lorem ipsum dolor sit amet... [full blog post text]",
  "template": "coffee_origin"
}
```

**Templates:**
- `coffee_origin` - Origin story spotlight
- `seasonal_launch` - New seasonal drink intro
- `community_update` - Community-focused story

**Response (Success - 200):**
```json
{
  "success": true,
  "generatedContent": {
    "socialCaption": "☕ Discover the story behind our beans! Ethiopian sourced with care. Read the full story: [link] #CoffeeOrigin #TinyTulip",
    "emailExcerpt": "Our new single-origin Ethiopian coffee beans come from the Yirgacheffe region, known for bright, fruity notes. Discover the farmers behind your cup...",
    "keywords": ["ethiopian", "coffee", "origin", "single-origin", "yirgacheffe"]
  },
  "stored": true,
  "message": "Content generated and stored successfully"
}
```

**Side Effects:**
- Updates blog_posts table with generated content
- Logs content generation for audit trail
- (Future) Triggers Wix CMS publishing webhook

**Error Cases:**
- 401: Invalid/missing auth token
- 400: Missing required fields
- 500: Generation failure

**Future Enhancement:**
- Integrate with OpenAI GPT-4 for real AI generation
- Add tone selector (friendly, professional, casual)
- Support batch processing

---

### 5. Activity Logging (Audit Trail)

All operations log to `activity_log` table:

**Schema:**
```sql
{
  "user_id": "optional-user-uuid",
  "action": "LEAD_CREATED|LEAD_CONVERTED|BLOG_PUBLISHED|EVENT_CREATED",
  "entity_type": "event|blog_post",
  "entity_id": "uuid",
  "changes": { /* diff object */ },
  "created_at": "ISO timestamp"
}
```

**Queryable via Supabase:**
```typescript
const { data } = await supabase
  .from('activity_log')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(50);
```

---

## Environment Variables

Configure these in `.env.local` and Supabase Edge Functions:

```bash
# Edge Function Auth
WIX_WEBHOOK_SECRET=your-shared-secret-token
LEAD_API_KEYS=key1,key2,key3  # Comma-separated valid API keys

# Supabase (auto-configured on Supabase projects)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI Integration (future)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4
```

---

## Error Handling & Retry Strategy

### HTTP Status Codes
- `200/201` - Success
- `400` - Validation error (client should fix and retry)
- `401` - Authentication failed (check credentials)
- `404` - Resource not found
- `500` - Server error (retry with exponential backoff)

### Retry Logic (Client-side)
```typescript
async function retryRequest(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      const wait = Math.pow(2, i) * 1000; // Exponential backoff
      await new Promise(r => setTimeout(r, wait));
    }
  }
}
```

---

## Rate Limiting

Recommended limits (per API key):
- **Lead API**: 10 requests/minute
- **Content Generator**: 10 requests/minute
- **Dashboard Insights**: 30 requests/minute (client-side caching recommended)
- **Logistics API**: Unlimited (lightweight query)

---

## Example Integrations

### 1. External Booking Form → Lead Creation

```html
<!-- Website form -->
<form id="booking-form" onsubmit="submitBooking(event)">
  <input type="email" name="clientEmail" required />
  <input type="text" name="clientName" required />
  <input type="date" name="eventDate" required />
  <input type="number" name="guestCount" required />
  <textarea name="specialNotes"></textarea>
  <button type="submit">Request Catering</button>
</form>

<script>
async function submitBooking(e) {
  e.preventDefault();
  const form = e.target;
  const data = {
    leadId: `form-${Date.now()}`,
    clientName: form.clientName.value,
    clientEmail: form.clientEmail.value,
    clientPhone: form.clientPhone?.value,
    eventDate: form.eventDate.value,
    location: "Venue address from form or map",
    guestCount: parseInt(form.guestCount.value),
    specialNotes: form.specialNotes?.value,
  };

  const response = await fetch(
    'https://<project>.supabase.co/functions/v1/leads/booking',
    {
      method: 'POST',
      headers: { 'Authorization': 'Bearer YOUR_LEAD_API_KEY' },
      body: JSON.stringify(data),
    }
  );

  const result = await response.json();
  if (result.success) {
    alert('Booking request received! We'll follow up soon.');
  }
}
</script>
```

### 2. Dashboard Insights Integration

```typescript
// React component
export function DashboardInsights() {
  const [insights, setInsights] = useState([]);

  useEffect(() => {
    fetch('https://<project>.supabase.co/functions/v1/dashboard/insights')
      .then(r => r.json())
      .then(data => setInsights(data.insights));
  }, []);

  return (
    <div className="insights">
      {insights.map((insight) => (
        <div key={insight.type} className={`insight-${insight.priority}`}>
          <p>{insight.actionableNextStep}</p>
          {insight.relatedEventId && (
            <a href={`/events/${insight.relatedEventId}`}>View Event →</a>
          )}
        </div>
      ))}
    </div>
  );
}
```

### 3. Content Generation Workflow

```typescript
// Server-side (after blog post published)
async function publishBlogPost(blogPostId: string, content: string) {
  // 1. Generate content variants
  const contentRes = await fetch(
    'https://<project>.supabase.co/functions/v1/content-generator',
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${WIX_WEBHOOK_SECRET}` },
      body: JSON.stringify({
        blogPostId,
        blogContent: content,
        template: 'coffee_origin', // Determined from blog metadata
      }),
    }
  );

  const { generatedContent } = await contentRes.json();

  // 2. Push to social (schedule/queue)
  // await scheduleSocialPost(generatedContent.socialCaption);

  // 3. Add to email queue
  // await queueNewsletterExcerpt(generatedContent.emailExcerpt);

  // 4. Publish to Wix CMS (via webhook)
  // await publishToWixCMS(blogPostId, content);
}
```

---

## Monitoring & Analytics

### Key Metrics to Track
- **Lead Conversion Rate** - Inquiry → Confirmed / Total Leads
- **Content Generation Success Rate** - Successful / Attempted
- **API Error Rate** - 5xx errors / Total requests
- **Dashboard Insight Relevance** - User actions on insight recommendations

### Query Examples
```sql
-- Lead metrics
SELECT 
  COUNT(*) as total_leads,
  COUNT(*) FILTER (WHERE status = 'confirmed') as converted,
  COUNT(*) FILTER (WHERE status = 'inquiry') as pending,
  AVG(estimated_revenue) as avg_lead_value
FROM events
WHERE source_lead_form = 'wix_website';

-- Content generation audit
SELECT template_used, status, COUNT(*) as count
FROM content_generation_log
GROUP BY template_used, status;

-- Activity log queries
SELECT action, COUNT(*) as count FROM activity_log
GROUP BY action ORDER BY count DESC;
```

---

**Version:** 1.0  
**Last Updated:** 2026-06-14  
**Maintainer:** Tiny Tulip Coffee Team
