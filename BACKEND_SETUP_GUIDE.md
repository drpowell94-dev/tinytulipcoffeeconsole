# Backend Setup & Deployment Guide

Complete steps to deploy the business automation features to production.

---

## Phase 1: Database Migrations

### Step 1: Run Migrations

```bash
# Connect to your Supabase project
supabase link --project-ref your-project-id

# Apply migrations (runs migration files in order)
supabase migration up
```

Migrations to run:
1. `003_content_pipeline.sql` - Blog post columns, API keys table
2. `004_analytics_logistics.sql` - Event logistics history, insights cache, lead tracking

### Step 2: Verify Schema

```sql
-- Check that new columns exist
\d events
-- Should show: source_lead_form, lead_uuid, client_notes, estimated_guest_count, followup_required

\d blog_posts
-- Should show: social_caption, email_excerpt, seo_keywords_generated, wix_post_id, synced_to_wix

-- Check new tables exist
\dt event_logistics_history
\dt api_keys
\dt dashboard_insights
\dt content_generation_log
```

---

## Phase 2: Environment Configuration

### Step 1: Local `.env.local`

Create `.env.local` in project root:

```bash
# Supabase (from Supabase dashboard)
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Edge function secrets
WIX_WEBHOOK_SECRET=your-shared-secret-key
LEAD_API_KEYS=lead-api-key-1,lead-api-key-2

# (Optional) AI Integration
OPENAI_API_KEY=sk-your-openai-key
```

### Step 2: Supabase Edge Function Secrets

```bash
# Set secrets in Supabase project
supabase secrets set WIX_WEBHOOK_SECRET "your-shared-secret-key"
supabase secrets set LEAD_API_KEYS "lead-api-key-1,lead-api-key-2"

# Verify (note: values are redacted in output)
supabase secrets list
```

### Step 3: Vercel Environment Variables (if using Vercel)

Go to Vercel dashboard → Project Settings → Environment Variables:

```
WIX_WEBHOOK_SECRET=...
LEAD_API_KEYS=...
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

---

## Phase 3: Deploy Edge Functions

### Step 1: Deploy Functions Locally (Test)

```bash
# Start local Supabase (optional for testing)
supabase start

# Deploy individual functions
supabase functions deploy leads-booking
supabase functions deploy dashboard-insights
supabase functions deploy event-logistics
supabase functions deploy content-generator
```

### Step 2: Deploy to Production

```bash
# Link to production project
supabase link --project-ref your-project-id

# Deploy all functions
supabase functions deploy leads-booking
supabase functions deploy dashboard-insights
supabase functions deploy event-logistics
supabase functions deploy content-generator
```

### Step 3: Verify Deployment

```bash
# List deployed functions
supabase functions list

# Test endpoint (should return CORS preflight)
curl -X OPTIONS https://your-project-id.supabase.co/functions/v1/leads-booking \
  -H "Origin: https://your-domain.com"
```

---

## Phase 4: Service Layer Integration

### Step 1: Install New Service Modules

Copy the following files to `src/services/`:
- `analyticsService.ts` - Dashboard insights
- `leadService.ts` - Lead intake business logic
- `logisticsService.ts` - Predictive supply needs

### Step 2: Update Existing Services

Update `src/services/supabase.ts` (if needed):
```typescript
// Already configured in existing setup
export const supabase = ...;
export const isSupabaseEnabled = ...;
```

### Step 3: Test Service Functions Locally

```typescript
// In dev environment
import { generateInsights } from '@/services/analyticsService';
import { createLeadEvent } from '@/services/leadService';
import { getPredictedNeeds } from '@/services/logisticsService';

// Test locally
const insights = await generateInsights();
console.log('Insights:', insights);

const lead = await createLeadEvent({
  leadId: 'test-123',
  clientName: 'Test Client',
  clientEmail: 'test@example.com',
  eventDate: '2026-07-15',
  location: '1532 East Blvd, Portland, OR 97214',
  guestCount: 100,
});
console.log('Lead created:', lead);
```

---

## Phase 5: Frontend Integration

### Step 1: Dashboard Page Enhancement

Update `src/pages/DashboardPage.tsx`:

```typescript
import { useEffect, useState } from 'react';
import { generateInsights, type DashboardInsight } from '@/services/analyticsService';

export function DashboardPage() {
  const [insights, setInsights] = useState<DashboardInsight[]>([]);

  useEffect(() => {
    generateInsights().then(setInsights);
  }, []);

  return (
    <div className="dashboard">
      {/* Existing dashboard content */}
      
      {/* New insights section */}
      {insights.length > 0 && (
        <section className="insights mt-6">
          <h2 className="text-lg font-semibold mb-4">Actionable Insights</h2>
          {insights.map((insight) => (
            <InsightCard key={insight.type} insight={insight} />
          ))}
        </section>
      )}
    </div>
  );
}

function InsightCard({ insight }: { insight: DashboardInsight }) {
  const priorityClass = {
    low: 'border-gray-200 bg-gray-50',
    medium: 'border-yellow-200 bg-yellow-50',
    high: 'border-red-200 bg-red-50',
  }[insight.priority];

  return (
    <div className={`border-l-4 p-4 rounded ${priorityClass}`}>
      <p className="font-medium">{insight.actionableNextStep}</p>
      {insight.relatedEventId && (
        <a href={`/events/${insight.relatedEventId}`} className="text-blue-500 text-sm mt-2">
          View Event →
        </a>
      )}
    </div>
  );
}
```

### Step 2: Event Details Page Enhancement

Update `src/pages/EventsPage.tsx` or create `EventDetailPage.tsx`:

```typescript
import { useEffect, useState } from 'react';
import { getPredictedNeeds, type PredictedNeeds } from '@/services/logisticsService';
import type { TulipEvent } from '@/lib/eventStore';

export function EventDetailPage({ event }: { event: TulipEvent }) {
  const [logistics, setLogistics] = useState<PredictedNeeds | null>(null);

  useEffect(() => {
    getPredictedNeeds(event).then(setLogistics);
  }, [event.id]);

  return (
    <div className="event-detail">
      {/* Existing event content */}
      
      {logistics && (
        <section className="logistics mt-6">
          <h3 className="text-md font-semibold mb-4">Predicted Supply Needs</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="stat">
              <span className="label">Cups</span>
              <span className="value">{logistics.predictedCups}</span>
            </div>
            <div className="stat">
              <span className="label">Coffee Beans (lbs)</span>
              <span className="value">{logistics.predictedBeansLbs}</span>
            </div>
            <div className="stat">
              <span className="label">Milk (liters)</span>
              <span className="value">{logistics.predictedMilkLiters}</span>
            </div>
            <div className="stat">
              <span className="label">Napkins</span>
              <span className="value">{logistics.predictedNapkins}</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {logistics.methodology} ({logistics.confidence} confidence)
          </p>
        </section>
      )}
    </div>
  );
}
```

### Step 3: Lead Management Page (Optional)

Create `src/pages/LeadsPage.tsx`:

```typescript
import { useEffect, useState } from 'react';
import { getLeadMetrics, convertLeadToBooking, type LeadMetrics } from '@/services/leadService';
import { loadEvents } from '@/lib/eventStore';

export function LeadsPage() {
  const [metrics, setMetrics] = useState<LeadMetrics | null>(null);
  const [leads, setLeads] = useState([]);

  useEffect(() => {
    getLeadMetrics().then(setMetrics);
    const events = loadEvents().filter(e => e.status === 'inquiry' && e.notes?.includes('lead'));
    setLeads(events);
  }, []);

  return (
    <div className="leads-page">
      <h1>Lead Management</h1>
      
      {metrics && (
        <div className="metrics grid grid-cols-4 gap-4 mb-6">
          <MetricCard label="Total Leads" value={metrics.totalLeads} />
          <MetricCard label="Pending" value={metrics.pendingLeads} />
          <MetricCard label="Converted" value={metrics.convertedLeads} />
          <MetricCard
            label="Conversion Rate"
            value={`${metrics.conversionRate.toFixed(1)}%`}
          />
        </div>
      )}

      <div className="leads-list">
        {leads.map((lead) => (
          <LeadRow key={lead.id} lead={lead} onConvert={() => handleConvert(lead.id)} />
        ))}
      </div>
    </div>
  );

  async function handleConvert(leadId: string) {
    const result = await convertLeadToBooking(leadId, undefined, 'Converted from lead');
    if (result.success) {
      // Refresh leads
      const events = loadEvents().filter(e => e.status === 'inquiry');
      setLeads(events);
    }
  }
}
```

---

## Phase 6: Testing

### Unit Tests for Services

Create `src/services/__tests__/analyticsService.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { getDefaultPrediction } from '@/services/logisticsService';

describe('Logistics Service', () => {
  it('returns conservative defaults when no data', () => {
    const prediction = getDefaultPrediction(100);
    expect(prediction.confidence).toBe('low');
    expect(prediction.predictedCups).toBeGreaterThanOrEqual(100);
  });

  it('calculates cups with 10% buffer', () => {
    const prediction = getDefaultPrediction(100);
    // 1.3 * 100 * 1.1 = 143
    expect(prediction.predictedCups).toBe(143);
  });
});
```

### Integration Tests for Edge Functions

```bash
# Test leads-booking endpoint
curl -X POST https://your-project-id.supabase.co/functions/v1/leads-booking \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "leadId": "test-123",
    "clientName": "Test",
    "clientEmail": "test@example.com",
    "eventDate": "2026-07-15",
    "location": "1532 East Blvd, Portland, OR",
    "guestCount": 50
  }'

# Test dashboard-insights endpoint
curl https://your-project-id.supabase.co/functions/v1/dashboard/insights

# Test event-logistics endpoint
curl "https://your-project-id.supabase.co/functions/v1/event-logistics?eventId=your-event-id"
```

---

## Phase 7: Monitoring & Observability

### Step 1: Enable Function Logs

In Supabase dashboard:
- Functions → Logs → Filter by function name
- View real-time logs and errors

### Step 2: Set Up Alerts

Configure Supabase alerts (if available) or use external monitoring:

```bash
# Example: Monitor error rates with a cron job
# Every hour, check if error_count > 5
supabase query "
  SELECT COUNT(*) as error_count
  FROM activity_log
  WHERE action LIKE '%ERROR%'
  AND created_at > NOW() - INTERVAL '1 hour'
"
```

### Step 3: Analytics Dashboard Queries

```sql
-- Lead conversion funnel
SELECT 
  source_lead_form,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed,
  COUNT(*) FILTER (WHERE status = 'completed') as completed,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status IN ('confirmed', 'completed')) / COUNT(*), 1) as conversion_rate
FROM events
WHERE source_lead_form IS NOT NULL
GROUP BY source_lead_form;

-- Content generation success
SELECT 
  template_used,
  status,
  COUNT(*) as count
FROM content_generation_log
GROUP BY template_used, status
ORDER BY template_used, status;

-- Most common insights
SELECT 
  insight_type,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE dismissed_at IS NULL) as active
FROM dashboard_insights
GROUP BY insight_type
ORDER BY count DESC;
```

---

## Phase 8: Production Checklist

- [ ] All migrations applied successfully
- [ ] Environment variables configured in Supabase and Vercel
- [ ] Edge functions deployed and tested
- [ ] Service modules integrated and tested
- [ ] Frontend pages display insights and logistics data
- [ ] External booking form connected to leads API
- [ ] Activity logging verified (check activity_log table)
- [ ] Error handling tested for edge cases
- [ ] Rate limiting configured (if using external API gateway)
- [ ] Monitoring/alerts set up
- [ ] Team trained on lead management workflow
- [ ] Backup strategy in place

---

## Troubleshooting

### Edge Function Not Found (404)

```bash
# Verify function is deployed
supabase functions list

# Check function logs
supabase functions logs leads-booking

# Re-deploy if missing
supabase functions deploy leads-booking
```

### Database Connection Errors

```sql
-- Test database connection
SELECT version();

-- Check if new tables exist
\dt event_logistics_history;

-- Check if columns were added
ALTER TABLE events RENAME COLUMN source_lead_form TO source_lead_form;
-- If no error, column exists
```

### API Key Not Working

```bash
# Verify API key is set in Supabase secrets
supabase secrets list

# Test edge function with valid key
curl -X POST https://...leads-booking \
  -H "Authorization: Bearer <your-key-from-env>"
```

### No Insights Showing on Dashboard

1. Check if any upcoming events exist: `SELECT COUNT(*) FROM events WHERE status IN ('confirmed', 'inquiry');`
2. Check if analytics service is being called: Look at browser console for errors
3. Check edge function logs: `supabase functions logs dashboard-insights`

### Logistics Predictions Always Low Confidence

This is normal when you have < 5 historical events. The system will use defaults until more data is collected.

To test with sample data:

```sql
-- Insert sample logistics history
INSERT INTO event_logistics_history 
  (event_id, cups_used, beans_used_lbs, milk_used_liters, lids_used, napkins_used)
VALUES 
  (event_id, 150, 18, 20, 150, 300),
  (event_id, 200, 24, 27, 200, 400);
```

---

## Support & Next Steps

### Phase 2 Roadmap (After Initial Rollout)

1. **AI Integration**: Replace mock content generator with OpenAI API
2. **Email Queueing**: Integrate with SendGrid/Resend for lead confirmations
3. **Wix CMS Publishing**: Implement full Wix REST API webhook for blog sync
4. **Predictive Analytics**: Machine learning models for revenue forecasting
5. **Mobile App**: React Native companion app for field operations
6. **Slack Integration**: Real-time notifications for new leads, insights

### Getting Help

- Supabase docs: https://supabase.com/docs
- Edge Functions: https://supabase.com/docs/guides/functions
- API Design: https://api-guidelines.dev
- Postgres: https://www.postgresql.org/docs/

---

**Version:** 1.0  
**Last Updated:** 2026-06-14  
**Maintainer:** Tiny Tulip Coffee Team
