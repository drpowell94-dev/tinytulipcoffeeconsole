# Instagram Integration API Reference

Quick reference for developers using the Instagram integration backend.

---

## Service Functions

### `instagramService.ts`

#### Auth Functions
```typescript
// Get OAuth authorization URL
const authUrl = generateInstagramAuthUrl();

// Exchange auth code for token (called in callback)
const token = await exchangeCodeForToken(code);

// Store token in database
const stored = await storeInstagramToken(userId, token);

// Retrieve active token for user
const integration = await getInstagramIntegration(userId);
```

#### Webhook Functions
```typescript
// Process incoming webhook from Instagram
const result = await processWebhookEvent(userId, payload);

// Verify webhook token matches
const valid = verifyInstagramWebhook(token);
```

#### Messaging Functions
```typescript
// Send DM to Instagram user
const dmResult = await sendInstagramDM(
  userId,
  recipientInstagramId,
  recipientUsername,
  triggerMessage
);
// Returns: { success, messageId?, error? }
```

#### Story Functions
```typescript
// Trigger story post for event
const storyResult = await triggerInstagramStoryUpdate(userId, eventId);
// Returns: { success, storyId?, error? }
```

---

## Edge Function Endpoints

### GET `/v1/instagram-webhook`
**Webhook verification** (Instagram sends during webhook setup)
```
GET /instagram-webhook?
  hub.mode=subscribe&
  hub.verify_token=YOUR_TOKEN&
  hub.challenge=CHALLENGE
```
Response: Challenge string (if verified)

---

### POST `/v1/instagram-webhook`
**Receive webhook events** from Instagram

Headers:
```
Content-Type: application/json
```

Payload:
```json
{
  "object": "instagram",
  "entry": [
    {
      "id": "page-id",
      "changes": [
        {
          "field": "comments",
          "value": {
            "from": {"id": "user-id", "username": "handle"},
            "text": "Comment text"
          }
        }
      ]
    }
  ]
}
```

Response: `{ success: true }`

---

### POST `/v1/instagram-auth`
**Get OAuth authorization URL**

Request:
```json
{
  "action": "get-auth-url"
}
```

Response:
```json
{
  "authUrl": "https://www.instagram.com/oauth/authorize?..."
}
```

---

### POST `/v1/instagram-callback`
**Handle OAuth callback and token exchange**

Request:
```json
{
  "code": "auth-code-from-instagram",
  "userId": "user-uuid",
  "state": "optional"
}
```

Response:
```json
{
  "success": true,
  "username": "@handle",
  "businessAccountId": "12345...",
  "message": "Instagram account connected"
}
```

---

### POST `/v1/instagram-story-publish`
**Publish event as Instagram Story**

Headers:
```
Authorization: Bearer {token}
Content-Type: application/json
```

Request:
```json
{
  "eventId": "event-uuid",
  "userId": "user-uuid"
}
```

Response:
```json
{
  "success": true,
  "storyId": "story-...",
  "message": "Story published to Instagram"
}
```

---

## Database Tables

### `instagram_integrations`
```sql
SELECT * FROM instagram_integrations WHERE user_id = 'uuid';
```

Fields:
- `user_id` - Tiny Tulip user
- `instagram_business_account_id` - Instagram account ID
- `instagram_access_token` - OAuth token
- `instagram_username` - Handle (e.g., @tinytulip)
- `token_expiry` - Token expiration date
- `is_active` - Whether integration is active
- `connected_at` - When connected
- `last_token_refresh` - Last refresh timestamp

---

### `instagram_webhook_events`
```sql
SELECT * FROM instagram_webhook_events 
WHERE user_id = 'uuid'
ORDER BY created_at DESC;
```

Fields:
- `event_type` - 'comment', 'mention', etc.
- `webhook_payload` - Full JSON from Instagram
- `processed` - Whether we processed it
- `action_taken` - 'dm_sent', 'story_posted', etc.

---

### `instagram_story_publishes`
```sql
SELECT * FROM instagram_story_publishes 
WHERE user_id = 'uuid'
ORDER BY created_at DESC;
```

Fields:
- `event_id` - Related Tiny Tulip event
- `story_id` - Instagram story ID
- `status` - 'draft', 'pending', 'published', 'failed'
- `expires_at` - When story expires (24h)
- `text_content` - Story text

---

### `instagram_dm_conversations`
```sql
SELECT * FROM instagram_dm_conversations 
WHERE user_id = 'uuid';
```

Fields:
- `instagram_user_id` - Instagram user who DMed
- `instagram_username` - Their handle
- `conversation_history` - JSON array of messages
- `last_message_at` - Most recent message

---

## Common Workflows

### 1. Connect Instagram Account

**Frontend:**
```typescript
// Get auth URL
const { authUrl } = await fetch('/v1/instagram-auth', {
  method: 'POST',
  body: JSON.stringify({ action: 'get-auth-url' })
}).then(r => r.json());

// Redirect
window.location.href = authUrl;

// After Instagram redirect with code:
const result = await fetch('/v1/instagram-callback', {
  method: 'POST',
  body: JSON.stringify({
    code: urlParams.get('code'),
    userId: currentUserId
  })
}).then(r => r.json());
```

**Backend:**
- Verifies auth code
- Exchanges for access token
- Fetches user profile
- Stores in `instagram_integrations`
- Returns success

---

### 2. Handle Comment → Send DM

**Instagram → Webhook:**
```
Comment: "Is catering available?"
  ↓
POST /instagram-webhook
  ↓
Check for keywords: CATERING ✓
  ↓
sendInstagramDM() → "Check booking link: ..."
  ↓
Log to instagram_webhook_events
  ↓
Store conversation
```

---

### 3. Publish Event Story

**Frontend (future UI):**
```typescript
await fetch('/v1/instagram-story-publish', {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: JSON.stringify({ eventId, userId })
}).then(r => r.json());
```

**Backend:**
- Fetches event details
- Formats story text (date, location, guests)
- Posts to Instagram (mocked for now)
- Logs to `instagram_story_publishes`
- Returns story ID

---

## Environment Variables Checklist

```bash
# Required for Instagram OAuth
☐ INSTAGRAM_CLIENT_ID
☐ INSTAGRAM_CLIENT_SECRET
☐ INSTAGRAM_REDIRECT_URI

# Required for Webhook
☐ INSTAGRAM_WEBHOOK_VERIFY_TOKEN

# Already configured (from main setup)
☐ SUPABASE_URL
☐ SUPABASE_SERVICE_ROLE_KEY
```

---

## Error Responses

### 401 Unauthorized
```json
{ "error": "Missing authorization header" }
```
**Fix:** Add `Authorization: Bearer token` header

### 400 Bad Request
```json
{ "error": "Missing eventId or userId" }
```
**Fix:** Include required fields in request body

### 404 Not Found
```json
{ "error": "No Instagram integration found" }
```
**Fix:** User hasn't connected Instagram account yet

### 500 Internal Server Error
```json
{ "error": "Internal server error" }
```
**Fix:** Check Supabase connection, logs for details

---

## Rate Limits

**Instagram Graph API:**
- 200 API calls per hour (business accounts)
- 10,000 DMs per day per account

**Supabase:**
- Unlimited reads/writes (unless on free tier)

**Recommendations:**
- Implement exponential backoff for retries
- Batch webhook processing if needed
- Cache token data to reduce API calls

---

## Testing Checklist

- [ ] Auth flow: Connect Instagram account
- [ ] Webhook: Receive comment event
- [ ] Keyword matching: Trigger on "CATERING"
- [ ] DM sending: Mock sends successfully
- [ ] Story publishing: Event formatted correctly
- [ ] Database: Records created/updated
- [ ] Error handling: Invalid tokens handled

---

## Logs & Debugging

### Check webhook events
```sql
SELECT event_type, action_taken, created_at
FROM instagram_webhook_events
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC;
```

### Check story publishes
```sql
SELECT status, text_content, error_message
FROM instagram_story_publishes
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC;
```

### Check DM conversations
```sql
SELECT instagram_username, conversation_history, last_message_at
FROM instagram_dm_conversations
WHERE user_id = 'YOUR_USER_ID';
```

---

**Version:** 1.0  
**Last Updated:** 2026-06-14
