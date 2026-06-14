# Backend Quick Reference Card

Fast lookup for developers and ops team.

---

## Endpoints at a Glance

```
POST   /v1/leads/booking                      Create booking from form
GET    /v1/dashboard/insights                 Get dashboard recommendations
GET    /v1/events/{id}/predicted-logistics   Predict supply needs
POST   /v1/content-generator                 Generate social/email/SEO content
```

---

## Service Functions Quick Access

### Analytics
```typescript
import { generateInsights } from '@/services/analyticsService';
const insights = await generateInsights();
// Returns: { type, actionableNextStep, priority }
```

### Leads
```typescript
import { createLeadEvent, getLeadMetrics, convertLeadToBooking } from '@/services/leadService';
await createLeadEvent({ leadId, clientName, clientEmail, eventDate, location, guestCount });
const metrics = await getLeadMetrics(); // { totalLeads, conversionRate, etc }
await convertLeadToBooking(eventId, depositAmount);
```

### Logistics
```typescript
import { getPredictedNeeds, recordActualUsage } from '@/services/logisticsService';
const prediction = await getPredictedNeeds(event);
// { predictedCups, predictedBeansLbs, confidence, methodology }
await recordActualUsage(eventId, { cupsUsed: 150, beansUsedLbs: 18, ... });
```

---

## Database Queries

### Find Pending Leads
```sql
SELECT id, name, date_start, estimated_guest_count
FROM events
WHERE status = 'inquiry' AND source_lead_form = 'wix_website'
ORDER BY created_at DESC;
```

### Lead Conversion Metrics
```sql
SELECT 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status IN ('confirmed', 'completed')) as converted,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status IN ('confirmed', 'completed')) / COUNT(*), 1) as rate
FROM events
WHERE source_lead_form = 'wix_website';
```

### High-Revenue Venues
```sql
SELECT 
  ec.zip_code,
  COUNT(*) as event_count,
  ROUND(AVG(e.estimated_revenue), 2) as avg_revenue
FROM events e
JOIN event_contacts ec ON e.id = ec.event_id
WHERE e.status = 'completed'
  AND e.date_start > NOW() - INTERVAL '90 days'
GROUP BY ec.zip_code
ORDER BY avg_revenue DESC;
```

### Recent Insights
```sql
SELECT insight_type, actionable_next_step, priority, created_at
FROM dashboard_insights
WHERE dismissed_at IS NULL
ORDER BY created_at DESC
LIMIT 5;
```

### Content Generation Log
```sql
SELECT template_used, status, COUNT(*) as count
FROM content_generation_log
GROUP BY template_used, status;
```

---

## Environment Setup

### `.env.local` (Local Development)
```bash
WIX_WEBHOOK_SECRET=your-secret-token
LEAD_API_KEYS=key1,key2
VITE_SUPABASE_URL=https://...supabase.co
VITE_SUPABASE_ANON_KEY=...
```

### Supabase Secrets (Deployment)
```bash
supabase secrets set WIX_WEBHOOK_SECRET "token"
supabase secrets set LEAD_API_KEYS "key1,key2"
```

### Vercel Environment (Optional)
Same as `.env.local` in Vercel dashboard → Settings → Environment Variables

---

## Common Tasks

### Deploy a New Edge Function
```bash
supabase functions deploy function-name
```

### Test Edge Function
```bash
# With auth
curl -X POST https://...supabase.co/functions/v1/endpoint \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{ ... }'

# Without auth
curl https://...supabase.co/functions/v1/endpoint
```

### View Function Logs
```bash
supabase functions logs function-name --tail
```

### Record Actual Event Usage
```typescript
await recordActualUsage('event-id', {
  cupsUsed: 180,
  beansUsedLbs: 18.5,
  milkUsedLiters: 22,
  lidsUsed: 180,
  napkinsUsed: 350,
  notes: 'Typical summer event'
});
```

### Get Insights for Dashboard
```typescript
// In React component
const [insights, setInsights] = useState([]);
useEffect(() => {
  generateInsights().then(setInsights);
}, []);
```

### Convert a Pending Lead
```typescript
const result = await convertLeadToBooking('event-id', 500, 'Deposit paid');
if (result.success) {
  console.log('Lead converted to booking');
}
```

---

## Debugging

### "Lead API returns 401"
Check: `LEAD_API_KEYS` env var in Supabase secrets. Must match token in header.

### "No upcoming events insight showing"
Query: `SELECT COUNT(*) FROM events WHERE status IN ('confirmed', 'inquiry') AND date_start > NOW();`
If 0: This is expected, add upcoming events.

### "Logistics predictions always say 'low confidence'"
Normal until you have 5+ historical events. Insert sample data:
```sql
INSERT INTO event_logistics_history (event_id, cups_used, beans_used_lbs, ...)
VALUES (event_id, 150, 18, ...);
```

### "Edge function not found (404)"
Check: `supabase functions list` — function must be deployed.
Deploy: `supabase functions deploy function-name`

### "Database migration failed"
Check: `supabase db reset` (dev only!) or rerun migration.
Verify: `supabase migration list` to see applied migrations.

---

## HTTP Status Codes

| Code | Meaning | When |
|------|---------|------|
| 200 | Success | GET requests, data retrieved |
| 201 | Created | POST requests, resource created |
| 400 | Bad Request | Validation failed (missing/invalid fields) |
| 401 | Unauthorized | Missing/invalid auth token |
| 404 | Not Found | Resource doesn't exist |
| 500 | Server Error | Database/unexpected error |

---

## Performance Tips

1. **Cache insights** on dashboard for 5 minutes (expensive query)
2. **Lazy load logistics** only when viewing event details
3. **Batch lead imports** if accepting many forms (queue them)
4. **Archive old data** (1yr+) to separate table for queries

---

## Integration Checklist

Before launching to users:
- [ ] `.env.local` has all required secrets
- [ ] Edge functions deployed: `supabase functions list`
- [ ] Database migrations applied: `supabase migration list`
- [ ] External form points to `/v1/leads/booking` endpoint
- [ ] Dashboard shows insights (no console errors)
- [ ] Event details show predicted logistics
- [ ] Activity log has recent entries
- [ ] Team trained on lead conversion workflow

---

## Support Links

| Topic | Link |
|-------|------|
| Supabase Docs | https://supabase.com/docs |
| Edge Functions | https://supabase.com/docs/guides/functions |
| Postgres Docs | https://www.postgresql.org/docs/14/ |
| Vite Guide | https://vitejs.dev/guide/ |
| React Hooks | https://react.dev/reference/react |

---

## Useful Supabase CLI Commands

```bash
# Initialize local project
supabase init

# Start local dev environment
supabase start

# Stop local environment
supabase stop

# List all functions
supabase functions list

# Deploy function
supabase functions deploy function-name

# View function logs (real-time)
supabase functions logs function-name --tail

# Create new migration
supabase migration new migration_name

# Apply migrations
supabase migration up

# Reset database (dev only!)
supabase db reset

# Pull latest schema from production
supabase db pull

# Set environment variable
supabase secrets set KEY "value"

# List all secrets
supabase secrets list
```

---

## TypeScript Types Reference

```typescript
// Service types
interface DashboardInsight {
  type: 'no_upcoming_events' | 'low_revenue_trend' | 'pending_checklists';
  actionableNextStep: string;
  relatedEventId?: string;
  priority: 'low' | 'medium' | 'high';
}

interface LeadBookingPayload {
  leadId: string;
  clientName: string;
  clientEmail: string;
  eventDate: string;
  location: string;
  guestCount: number;
}

interface PredictedNeeds {
  predictedCups: number;
  predictedBeansLbs: number;
  predictedMilkLiters: number;
  confidence: 'high' | 'medium' | 'low';
  sampleSize: number;
  methodology: string;
}

interface ActualUsage {
  cupsUsed: number;
  beansUsedLbs: number;
  milkUsedLiters: number;
  lidsUsed: number;
  napkinsUsed: number;
}
```

---

## Response Format

All endpoints return JSON:
```json
{
  "success": true,
  "data": { /* specific to endpoint */ },
  "message": "Human-readable status"
}
```

Error responses:
```json
{
  "error": "Error type",
  "message": "Details about what went wrong",
  "details": [ /* validation errors if applicable */ ]
}
```

---

**Version:** 1.0 | **Last Updated:** 2026-06-14 | **Keep This Handy!**
