# Security Review: Wix Event Imports

## Summary
**Risk Level: MEDIUM** — Several important fixes needed before production.

---

## Critical Issues

### 1. ⚠️ Token Comparison Vulnerable to Timing Attacks
**File:** `supabase/functions/wix-receiver/index.ts:85`

```typescript
if (token !== expectedToken) {  // ❌ VULNERABLE
```

**Issue:** String comparison timing can leak token information. An attacker can measure response time to guess the token character-by-character.

**Fix:**
```typescript
// Use constant-time comparison
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

if (!constantTimeCompare(token, expectedToken)) {
  // ...
}
```

---

### 2. ⚠️ CORS Too Permissive
**File:** `supabase/functions/wix-receiver/index.ts:4`

```typescript
"Access-Control-Allow-Origin": "*",  // ❌ TOO BROAD
```

**Issue:** Allows any domain to call the webhook. An attacker could trigger webhooks from their own site.

**Fix:**
```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "https://www.wixapis.com",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
```

---

## High Priority Issues

### 3. 🔴 No Rate Limiting on Webhook Endpoint
**File:** `supabase/functions/wix-receiver/index.ts`

**Issue:** Endpoint accepts unlimited requests. Attacker could DoS the database with thousands of webhook calls.

**Fix:** Implement rate limiting per IP:
```typescript
// In production Supabase, use:
// - Supabase Functions built-in rate limiting
// - Or middleware rate limiter (e.g., redis-backed)

// Example: 100 webhooks per minute per IP
const rateLimitKey = req.headers.get("x-forwarded-for") || "unknown";
// Check against Redis or in-memory store
if (requests[rateLimitKey] > 100 / 60) {
  return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
    status: 429,
    headers: corsHeaders,
  });
}
```

---

### 4. 🔴 Insufficient Input Validation
**File:** `supabase/functions/wix-receiver/index.ts:104-114`

**Issue:** Only checks field presence, not format. Invalid dates silently convert to "Invalid Date".

```typescript
// Current: weak validation
if (!payload[field as keyof WixEventPayload]) { }

// Better:
const isValidISO8601 = (date: string) => !isNaN(new Date(date).getTime());

if (!payload.startDate || !isValidISO8601(payload.startDate)) {
  return new Response(
    JSON.stringify({ error: "Invalid startDate format" }),
    { status: 400, headers: corsHeaders }
  );
}
```

---

### 5. 🔴 Logging Sensitive Event Data
**File:** `supabase/functions/wix-receiver/index.ts:198-199`

```typescript
logWebhookEvent("info", payload.wixEventId, "sync_complete", {
  action: existingEvent ? "updated" : "created",
  title: payload.title,  // ❌ Event titles may be sensitive
  status: appStatus,
});
```

**Issue:** Event titles logged to Supabase function logs (may contain client names, sensitive details).

**Fix:**
```typescript
logWebhookEvent("info", payload.wixEventId, "sync_complete", {
  action: existingEvent ? "updated" : "created",
  // Don't log the title/description
});
```

---

## Medium Priority Issues

### 6. 🟡 No Request Body Size Limit
**File:** `supabase/functions/wix-receiver/index.ts:94`

**Issue:** `await req.json()` could load massive payloads into memory (DoS vector).

**Fix:**
```typescript
const contentLength = req.headers.get("content-length");
const maxSize = 1024 * 100; // 100KB max

if (contentLength && parseInt(contentLength) > maxSize) {
  return new Response(
    JSON.stringify({ error: "Payload too large" }),
    { status: 413, headers: corsHeaders }
  );
}
```

---

### 7. 🟡 Wix Signature Verification Missing
**File:** `supabase/functions/wix-receiver/index.ts`

**Issue:** Only validates bearer token. Wix webhooks should also verify request signature (HMAC).

**Current flow:** Bearer token only
```
POST /v1/wix-receiver
Authorization: Bearer YOUR_SECRET
```

**Better flow:** Bearer token + signature
```
POST /v1/wix-receiver
Authorization: Bearer YOUR_SECRET
X-Wix-Signature: sha256=...
```

**Fix:** Ask Wix for webhook signature details and verify:
```typescript
import { createHmac } from "https://deno.land/std@0.208.0/crypto/mod.ts";

const wixSignature = req.headers.get("x-wix-signature");
const body = await req.text();
const expectedSig = createHmac("sha256", SECRET)
  .update(body)
  .digest("hex");

if (wixSignature !== expectedSig) {
  return new Response("Unauthorized", { status: 401 });
}
```

---

### 8. 🟡 Error Messages Could Leak Info
**File:** `supabase/functions/wix-receiver/index.ts:110`

```typescript
return new Response(
  JSON.stringify({ error: `Missing required field: ${field}` }),
  { status: 400, headers: corsHeaders }
);
```

**Issue:** Reveals API schema (e.g., "Missing required field: wixEventId").

**Fix:**
```typescript
// In production, don't reveal field names
return new Response(
  JSON.stringify({ error: "Invalid request" }),
  { status: 400, headers: corsHeaders }
);
// Log the real error internally:
console.error(`Validation failed for field: ${field}`);
```

---

## Low Priority / Best Practices

### 9. 🔵 Supabase RLS Not Verified
**Issue:** Code doesn't verify Row-Level Security policies. If RLS is misconfigured, anyone could read/write events.

**Check:**
```sql
-- In Supabase SQL editor, verify policies exist:
SELECT * FROM pg_policies WHERE tablename = 'events';

-- Should see policies like:
-- - SELECT allowed for anon users
-- - INSERT/UPDATE/DELETE only for authenticated users (or never for anon)
```

**Recommendation:** Ensure RLS prevents unauthenticated users from directly modifying events:
```sql
-- Example (adjust based on your needs):
CREATE POLICY "Allow read for anon" ON events
  FOR SELECT USING (true);

CREATE POLICY "Prevent anon writes" ON events
  FOR INSERT, UPDATE, DELETE
  USING (auth.role() = 'authenticated');
```

---

### 10. 🔵 No Request ID Tracking
**Issue:** Hard to correlate logs if request processing spans multiple systems.

**Fix:**
```typescript
const requestId = crypto.randomUUID();
logWebhookEvent("info", payload.wixEventId, "request_start", {
  requestId,
});
```

---

### 11. 🔵 Missing Idempotency Key
**Issue:** If Wix retries the same webhook, event could be duplicated (though upsert prevents it).

**Better:**
```typescript
// Wix may send Idempotency-ID header
const idempotencyKey = req.headers.get("idempotency-id");
// Store processed keys to detect retries
```

---

## Recommended Fixes (Priority Order)

1. **CRITICAL** (do before production):
   - [ ] Fix token comparison (constant-time)
   - [ ] Restrict CORS to Wix domain only
   - [ ] Add request body size limit
   - [ ] Verify Supabase RLS policies

2. **HIGH** (do soon):
   - [ ] Add rate limiting
   - [ ] Validate ISO8601 dates
   - [ ] Stop logging sensitive titles
   - [ ] Add Wix signature verification

3. **MEDIUM** (nice to have):
   - [ ] Sanitize error messages
   - [ ] Add request ID tracking
   - [ ] Implement idempotency key handling

---

## Code Quality Notes

✅ **Good practices:**
- Proper error handling with try/catch
- Logging for audit trail
- Merge strategy preserves user data
- Parameterized Supabase queries (no SQL injection risk)
- Optional error logging (no throw in services)

⚠️ **Could improve:**
- No TypeScript strict mode validation
- Limited input schema validation
- No API versioning
- Timestamp formats not consistently ISO8601

---

## Testing Recommendations

```bash
# Test with invalid token
curl -X POST https://your-function-url \
  -H "Authorization: Bearer WRONG_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"wixEventId":"123",...}'
# Should return 401

# Test with missing fields
curl -X POST https://your-function-url \
  -H "Authorization: Bearer YOUR_SECRET" \
  -H "Content-Type: application/json" \
  -d '{}'
# Should return 400

# Test with oversized payload
# Should return 413 (after fix)

# Test from different origin
# Should return 403 (after CORS fix)
```

---

## Deployment Checklist

- [ ] Fix token comparison vulnerability
- [ ] Set CORS to Wix domain only
- [ ] Add rate limiting
- [ ] Validate all date inputs
- [ ] Remove sensitive data from logs
- [ ] Add request size limits
- [ ] Configure Supabase RLS policies
- [ ] Set WIX_WEBHOOK_SECRET in production env
- [ ] Test with real Wix webhooks in staging
- [ ] Enable Supabase function monitoring/alerts

