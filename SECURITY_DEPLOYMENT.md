# Security Deployment Guide

This guide documents all security fixes implemented and how to verify them.

## ✅ Fixed Issues

All 11 security issues have been addressed. See `SECURITY_REVIEW.md` for detailed descriptions.

---

## 🚀 Pre-Deployment Checklist

- [ ] **Secrets configured in Supabase Functions env:**
  ```
  WIX_WEBHOOK_SECRET=<random-32-char-secret>
  SUPABASE_URL=<your-supabase-url>
  SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
  ```

- [ ] **RLS policies verified** (see "🔒 Supabase Row-Level Security" section below)

- [ ] **CORS domain matches Wix** (`https://www.wixapis.com`)

- [ ] **Rate limit appropriate for expected webhook volume**
  - Currently: 100 req/min per IP
  - For 50 events/day: 0.03/min (well under limit)
  - Adjust `limit` variable in `wix-receiver/index.ts` if needed

- [ ] **Logs monitored** in Supabase Dashboard → Functions → wix-receiver
  - Check for `authorization_failed` (token theft)
  - Check for `rate_limit_exceeded` (DoS attempts)

- [ ] **Webhook secret strong**
  - Generate with: `openssl rand -hex 32`
  - Not reused elsewhere
  - Never logged or exposed

- [ ] **Test with real Wix webhook or simulator:**
  ```bash
  npx tsx scripts/post-wix-events.ts
  ```

---

## 🔒 Supabase Row-Level Security (RLS)

**Status:** Requires manual verification (database level)

### Verification Checklist

Run in Supabase SQL Editor:

```sql
-- 1. Check policies exist
SELECT * FROM pg_policies WHERE tablename = 'events';

-- 2. Verify anon users can SELECT
SELECT * FROM events LIMIT 1;  -- Should work as anon

-- 3. Verify anon cannot INSERT
INSERT INTO events (name, date_start, location, status, event_type, deposit_status)
VALUES ('Test', now(), 'Test', 'confirmed', 'other', 'pending');
-- Should fail with permission denied
```

### Recommended RLS Policy

If using anon key only (recommended for this app):

```sql
-- Allow anon to read all events
CREATE POLICY "Allow anon read events" ON events
  FOR SELECT USING (true);

-- Prevent anon from writing (optional, for safety)
CREATE POLICY "Prevent anon write events" ON events
  FOR INSERT, UPDATE, DELETE USING (false);

-- Allow service role (webhook receiver) to write
CREATE POLICY "Allow service role write" ON events
  FOR INSERT, UPDATE, DELETE USING (auth.role() = 'service_role');
```

### Enable RLS

```sql
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
```

---

## 🧪 Testing

### Unit Tests

All security functions are inline in `wix-receiver/index.ts`:
- `constantTimeCompare()` — timing-safe token comparison
- `isValidISO8601()` — date format validation
- `checkRateLimit()` — rate limiting logic
- `deriveStatus()` — status determination based on dates

### Integration Tests

```bash
# 1. Valid webhook
curl -X POST https://your-function-url \
  -H "Authorization: Bearer YOUR_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "wixEventId": "test-123",
    "title": "Coffee at Park",
    "startDate": "2026-07-15T10:00:00Z",
    "endDate": "2026-07-15T14:00:00Z",
    "location": "Central Park",
    "status": "published"
  }'
# Should return 200

# 2. Invalid token
curl -X POST https://your-function-url \
  -H "Authorization: Bearer WRONG_SECRET" \
  -H "Content-Type: application/json" \
  -d '...'
# Should return 401

# 3. Oversized payload
# Create 101KB payload, should return 413

# 4. Invalid date
# startDate = "2026-13-45", should return 400

# 5. Missing field
# Omit wixEventId, should return 400

# 6. Rate limit
# Send 101 requests in 60 seconds, 101st should return 429
```

---

## 🔍 Monitoring & Alerting

### Critical Events to Monitor

1. **Authorization failures** — May indicate token theft
   ```sql
   SELECT COUNT(*) FROM logs 
   WHERE action = 'unauthorized_webhook' 
   AND timestamp > now() - interval '1 hour';
   ```

2. **Rate limit hits** — May indicate DoS attack
   ```sql
   SELECT client_ip, COUNT(*) 
   FROM logs 
   WHERE action = 'rate_limit_exceeded' 
   AND timestamp > now() - interval '1 hour'
   GROUP BY client_ip;
   ```

3. **Validation failures** — May indicate malformed Wix payloads
   ```sql
   SELECT action, COUNT(*) 
   FROM logs 
   WHERE level = 'warn' 
   AND timestamp > now() - interval '1 hour'
   GROUP BY action;
   ```

### Set Up Alerts (via Supabase or third-party)

- Alert if `unauthorized_webhook` > 5 in 1 hour
- Alert if `rate_limit_exceeded` > 10 in 1 hour
- Alert if `handler_error` > 1 in 1 hour

---

## 📋 Implementation Notes

### Rate Limiter

Current implementation uses in-memory store. For production with multiple function instances:

```typescript
// Option 1: Supabase Functions Redis extension
import { createClient } from "@supabase/supabase-js";
const redis = new Redis(Deno.env.get("REDIS_URL"));

// Option 2: External service (e.g., PostHog, Cloudflare)
// Rely on API Gateway rate limiting instead

// Option 3: Use standard HTTP `Retry-After` header
// Return 429 with `Retry-After: 60`
```

### Token Comparison

The `constantTimeCompare()` function uses bitwise XOR to prevent timing attacks:
- Time to compare is constant regardless of where chars differ
- Only checks result at end (not early return)
- Works for any-length strings

---

## 🚢 Deployment Steps

1. **Deploy Supabase Function:**
   ```bash
   supabase functions deploy wix-receiver
   ```

2. **Set environment variables in Supabase:**
   - Go to Supabase Dashboard → Functions → wix-receiver
   - Add `WIX_WEBHOOK_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

3. **Test the endpoint:**
   ```bash
   npx tsx scripts/post-wix-events.ts
   ```

4. **Verify in Supabase:**
   - Check Functions → wix-receiver logs
   - Look for `sync_complete` entries (success)
   - Check for `unauthorized_webhook` (failed attempts)

5. **Monitor for 24 hours:**
   - Watch for rate limit errors
   - Ensure no `handler_error` entries
   - Confirm events are syncing

---

## 📞 Support

If security issues are found:
1. Document the issue
2. Create private security report (do not commit to public)
3. Fix in private branch
4. Deploy to production
5. Monitor for any signs of exploitation
