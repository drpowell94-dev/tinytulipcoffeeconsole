# Security Review Report
## Tiny Tulip Coffee Console - Production Branch `claude/wizardly-hypatia-hy56qv`

**Review Date**: 2026-06-21  
**Status**: 11 Issues Found (3 Critical, 4 High, 2 Medium, 2 Low)

---

## CRITICAL ISSUES

### 1. ⚠️ CRITICAL: Overly Permissive CORS Policy
**Files**: 
- `supabase/functions/wix-receiver/index.ts` (line 4-6)
- `supabase/functions/send-campaign-email/index.ts` (line 3-6)
- `supabase/functions/instagram-webhook/index.ts` (line 3-6)
- `supabase/functions/instagram-callback/index.ts` (line 3-6)

**Issue**: All edge functions set `"Access-Control-Allow-Origin": "*"`, allowing any domain to make requests. Combined with POST operations, this enables Cross-Site Request Forgery (CSRF) attacks.

**Impact**: 
- External websites can trigger email sending
- Webhooks can be spoofed from any origin
- Potential for abuse and unauthorized operations

**Fix**:
```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "https://yourdomain.com", // Whitelist specific domain
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};
```

---

### 2. 🔓 CRITICAL: Client Secret Exposed to Frontend
**File**: `src/services/instagramService.ts` (line 72)

**Issue**: 
```typescript
const clientSecret = process.env.VITE_INSTAGRAM_CLIENT_SECRET;
```
The `VITE_` prefix exposes this to browser JavaScript. Instagram client secrets are production credentials that grant API access.

**Impact**:
- Attackers can intercept the secret from browser memory or network
- Unauthorized OAuth token exchanges
- Account takeover via OAuth abuse

**Fix**: Move secret operations to edge functions only. Never use `VITE_` for secrets:
```typescript
// Frontend - only handles authorization code
const response = await fetch('/api/instagram/exchange-token', {
  method: 'POST',
  body: JSON.stringify({ code })
});

// Edge function (instagram-exchange-token) - handles secret exchange
const clientSecret = Deno.env.get("INSTAGRAM_CLIENT_SECRET"); // No VITE_ prefix
```

---

### 3. 🔓 CRITICAL: Access Token in URL Query String
**File**: `supabase/functions/instagram-callback/index.ts` (line 66)

**Issue**:
```typescript
const userDetailsResponse = await fetch(
  `https://graph.instagram.com/me?fields=username,name,profile_picture_url&access_token=${accessToken}`
);
```

Access tokens in URLs are logged in:
- Browser history
- HTTP referer headers
- Server logs
- Proxy logs

**Impact**:
- Token compromise through logs
- Unintended token leakage to third parties

**Fix**: Use Authorization header instead:
```typescript
const userDetailsResponse = await fetch(
  `https://graph.instagram.com/me?fields=username,name,profile_picture_url`,
  {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  }
);
```

---

## HIGH SEVERITY ISSUES

### 4. 🔑 HIGH: Instagram Webhook Not Properly Verified
**File**: `supabase/functions/instagram-webhook/index.ts` (line 114-115)

**Issue**: 
```typescript
if (mode === "subscribe" && token === verifyToken) {
  // No signature verification of the actual webhook payload
}
```

The verification only checks a simple token, not Instagram's HMAC signature. Webhook payloads can be forged.

**Impact**:
- Attackers can send fake webhook events
- Unauthorized DMs sent to customers
- Reputation damage and compliance violations

**Fix**: Verify Instagram's X-Hub-Signature header:
```typescript
function verifyInstagramSignature(payload: string, signature: string, verifyToken: string): boolean {
  const crypto = await import("crypto");
  const hmac = crypto.createHmac('sha256', verifyToken);
  const expectedSignature = 'sha256=' + hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

---

### 5. 🔑 HIGH: Insufficient Access Control on Email Campaigns
**File**: `supabase/functions/send-campaign-email/index.ts`

**Issue**: 
```typescript
const { data: campaign, error: campaignError } = await supabase
  .from("email_campaigns")
  .select("*")
  .eq("id", campaignId)
  .single();
```

There's no verification that the current user owns this campaign. Any user can send emails using any campaign.

**Impact**:
- One user can send emails on behalf of another
- Unauthorized email spoofing
- Compliance violations (CAN-SPAM)

**Fix**: Add user ownership check:
```typescript
const { data: campaign, error: campaignError } = await supabase
  .from("email_campaigns")
  .select("*")
  .eq("id", campaignId)
  .eq("user_id", userId) // Add user ownership verification
  .single();
```

---

### 6. 🔑 HIGH: Weak Input Validation on Sensitive Operations
**File**: `src/services/emailCampaignService.ts` (line 218)

**Issue**: 
```typescript
export async function sendEmailViaCampaign(
  campaignId: string,
  recipientEmail: string,
  // ...
): Promise<...> {
  // No email format validation before calling edge function
}
```

Similar issues in:
- `leadService.ts` line 57: Email validation only checks for `@` symbol
- `wix-receiver` webhook: No date format validation before database insert

**Impact**:
- Invalid data in database
- XSS if email addresses are displayed
- Email delivery failures and bounce rates

**Fix**: Use strict validation library:
```typescript
import { z } from 'zod';

const emailSchema = z.string().email();
const validatedEmail = emailSchema.parse(recipientEmail);
```

---

### 7. ⏱️ HIGH: Missing Rate Limiting on Edge Functions
**Affected Files**: All edge functions

**Issue**: No rate limiting on API endpoints that perform sensitive operations:
- Email sending
- Webhook processing
- OAuth callbacks

**Impact**:
- Abuse through automated requests
- DoS attacks
- Email sending spam
- Credential stuffing on OAuth endpoints

**Fix**: Add rate limiting middleware:
```typescript
// Use Deno's rate limiting or Supabase's built-in
const { rateLimit } = await import("https://esm.sh/@supabase/edge-runtime");
// Or implement with request headers + database checks
```

---

## MEDIUM SEVERITY ISSUES

### 8. 🔐 MEDIUM: Unencrypted Sensitive Token Storage
**File**: `supabase/functions/instagram-callback/index.ts` (line 93-108)

**Issue**: Instagram access tokens stored in plaintext in database:
```typescript
instagram_access_token: accessToken, // No encryption
```

**Impact**:
- If database is breached, access tokens are compromised
- No way to revoke compromised tokens
- Instagram account takeover possible

**Fix**: Encrypt tokens at rest:
```typescript
// Use Supabase's encryption features or field-level encryption
// Store encrypted token with key in separate secure location
const encryptedToken = await encrypt(accessToken, encryptionKey);
await supabase.from("instagram_integrations").upsert({
  instagram_access_token: encryptedToken,
  // ...
});
```

---

### 9. 🔐 MEDIUM: Missing Security Headers in Edge Functions
**Affected Files**: All edge functions

**Issue**: No security headers in responses:
```typescript
return new Response(json, {
  status: 200,
  headers: corsHeaders // Missing security headers
});
```

**Missing Headers**:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000`

**Fix**:
```typescript
const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Content-Security-Policy": "default-src 'self'",
};

const responseHeaders = { ...corsHeaders, ...securityHeaders };
```

---

## LOW SEVERITY ISSUES

### 10. 📝 LOW: Sensitive Information in Debug Logs
**File**: Multiple locations
- `instagramService.ts` line 99: `console.error("Token exchange failed:", await response.text());`
- `instagram-callback/index.ts` line 52: Logs token data
- `wix-receiver/index.ts` line 124: Database errors logged without sanitization

**Issue**: Logs may contain sensitive data that gets shipped to monitoring services.

**Impact**:
- Log aggregation services may expose secrets
- Stack traces reveal implementation details

**Fix**:
```typescript
console.error("Token exchange failed"); // Don't log response body
// Or sanitize:
const safeError = error instanceof Error ? error.message : "Unknown error";
console.error("Error:", safeError);
```

---

### 11. 🔄 LOW: CSRF Token Missing on Form Submissions
**File**: `src/pages/ContentPage.tsx` (line 71-79)

**Issue**: While edge functions are the primary concern (issue #1), frontend state changes don't use CSRF tokens.

**Impact**: Low for SPA, but good practice for defense-in-depth.

---

## SUMMARY & RECOMMENDATIONS

### Immediate Actions (Before Production):
1. **Fix CORS policies** - Whitelist specific domains
2. **Move client secret** - Use edge function for OAuth token exchange  
3. **Fix token in URL** - Use Authorization header
4. **Add webhook signature verification** - Implement HMAC-SHA256 validation
5. **Add user ownership checks** - Verify resource ownership in all operations

### Short-term (Within 1 week):
6. Add comprehensive input validation using Zod
7. Implement rate limiting on all edge functions
8. Encrypt sensitive tokens in database
9. Add security headers to all responses
10. Sanitize debug logs

### Long-term:
11. Add automated security testing (SAST/DAST)
12. Implement audit logging for sensitive operations
13. Set up regular dependency updates and vulnerability scanning
14. Conduct security training for team
15. Implement field-level encryption for PII (email, phone, etc.)

---

## Files Requiring Changes

| Priority | File | Issue |
|----------|------|-------|
| 🔴 Critical | `supabase/functions/*/index.ts` | CORS Policy |
| 🔴 Critical | `src/services/instagramService.ts` | Client Secret |
| 🔴 Critical | `supabase/functions/instagram-callback/index.ts` | Token in URL |
| 🟠 High | `supabase/functions/instagram-webhook/index.ts` | No Signature Verification |
| 🟠 High | `supabase/functions/send-campaign-email/index.ts` | No User Ownership Check |
| 🟠 High | Multiple | Input Validation |
| 🟠 High | Multiple | Rate Limiting |
| 🟡 Medium | `supabase/functions/instagram-callback/index.ts` | Token Encryption |
| 🟡 Medium | Multiple | Security Headers |
| 🔵 Low | Multiple | Debug Logs |
| 🔵 Low | `src/pages/ContentPage.tsx` | CSRF Protection |

---

**Status**: Ready for remediation  
**Next Step**: Create GitHub issues for each fix and track progress
