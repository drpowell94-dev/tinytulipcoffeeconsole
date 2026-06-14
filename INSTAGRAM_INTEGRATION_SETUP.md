# Instagram Graph API Integration - Backend Setup Guide

Complete backend architecture for Instagram integration with Tiny Tulip Coffee Console.

---

## Overview

This integration enables:
1. **Instagram Authentication** - OAuth2 login flow to connect Instagram Business Account
2. **Comment Monitoring & DM Response** - Automatically reply to comments with booking links
3. **Event Story Publishing** - Post event details to Instagram Stories
4. **Conversation Tracking** - Log DM conversations for reference

---

## Architecture

```
User → Instagram Auth Flow
         ↓
    OAuth Callback
         ↓
    Store Token (DB)
         ↓
    ✅ Connected

Instagram Webhook Events → Webhook Handler
                              ↓
                          Process Comment
                              ↓
                          Check Keywords
                              ↓
                          Send DM Reply
                              ↓
                          Log Activity

Event Created → Trigger Story Publish
                     ↓
                Format Event Text
                     ↓
                Post to Instagram
                     ↓
                Log Story Publish
```

---

## Database Schema

### `instagram_integrations`
Stores user's Instagram business account connection

```sql
CREATE TABLE instagram_integrations (
  id UUID PRIMARY KEY,
  user_id UUID UNIQUE,           -- Tiny Tulip user
  instagram_business_account_id TEXT UNIQUE,
  instagram_access_token TEXT,   -- OAuth token
  token_expiry TIMESTAMP,        -- Token expiration
  token_refresh_available BOOLEAN,
  instagram_username TEXT,
  business_name TEXT,
  business_category TEXT,
  profile_picture_url TEXT,
  connected_at TIMESTAMP,
  last_token_refresh TIMESTAMP,
  is_active BOOLEAN,
  created_at, updated_at
);
```

### `instagram_webhook_events`
Audit trail for incoming Instagram events

```sql
CREATE TABLE instagram_webhook_events (
  id UUID PRIMARY KEY,
  user_id UUID,
  event_type TEXT,              -- 'comment', 'mention', etc.
  webhook_payload JSONB,        -- Full payload from Instagram
  processed BOOLEAN,
  processing_result TEXT,
  action_taken TEXT,            -- 'dm_sent', 'story_posted', etc.
  created_at, processed_at
);
```

### `instagram_story_publishes`
Track published stories for events

```sql
CREATE TABLE instagram_story_publishes (
  id UUID PRIMARY KEY,
  user_id UUID,
  event_id UUID,
  story_id TEXT,
  story_type TEXT,              -- 'event_checkin', 'announcement'
  media_url TEXT,
  text_content TEXT,
  published_at TIMESTAMP,
  expires_at TIMESTAMP,         -- Stories expire in 24h
  status TEXT,                  -- 'draft', 'pending', 'published', 'failed'
  error_message TEXT,
  created_at, updated_at
);
```

### `instagram_dm_conversations`
Log DM exchanges for reference

```sql
CREATE TABLE instagram_dm_conversations (
  id UUID PRIMARY KEY,
  user_id UUID,
  instagram_user_id TEXT,
  instagram_username TEXT,
  last_message_id TEXT,
  conversation_history JSONB,   -- Array of message objects
  last_message_at TIMESTAMP,
  created_at, updated_at
);
```

---

## Edge Functions

### 1. `/v1/instagram-auth`
**Purpose:** Initiate OAuth flow
**Method:** POST
**Request:**
```json
{
  "action": "get-auth-url"
}
```
**Response:**
```json
{
  "authUrl": "https://www.instagram.com/oauth/authorize?..."
}
```

**Usage:**
```typescript
const response = await fetch('/v1/instagram-auth', {
  method: 'POST',
  body: JSON.stringify({ action: 'get-auth-url' })
});
const { authUrl } = await response.json();
window.location.href = authUrl;
```

---

### 2. `/v1/instagram-callback`
**Purpose:** Handle OAuth callback and token exchange
**Method:** POST
**Request:**
```json
{
  "code": "authorization-code-from-instagram",
  "userId": "user-uuid",
  "state": "optional-state-param"
}
```
**Response:**
```json
{
  "success": true,
  "username": "@tinytulipco",
  "businessAccountId": "17841409...",
  "message": "Instagram account connected"
}
```

**Flow:**
1. Instagram redirects to app with `code`
2. Frontend sends code to callback endpoint
3. Backend exchanges code for access token
4. Token stored in `instagram_integrations` table
5. Returns success with account details

---

### 3. `/v1/instagram-webhook`
**Purpose:** Receive and process Instagram webhook events
**Method:** POST & GET

**Webhook Verification (GET):**
```
GET /v1/instagram-webhook?
  hub.mode=subscribe&
  hub.verify_token=YOUR_VERIFY_TOKEN&
  hub.challenge=challenge_code
```

Returns `challenge_code` if token matches.

**Event Processing (POST):**
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
            "from": {
              "id": "user-id",
              "username": "commenter-handle"
            },
            "text": "Is catering available?",
            "timestamp": "2026-06-14T18:30:00Z"
          }
        }
      ]
    }
  ]
}
```

**Webhook Processing Logic:**
1. Verify webhook token
2. Find user associated with Instagram account
3. Parse event (comments, mentions, etc.)
4. Check for trigger keywords: `CATER`, `CATERING`, `MENU`, `BOOKING`, `EVENT`, `AVAILABILITY`
5. If match: send DM reply with booking link
6. Log event and action in database

---

### 4. `/v1/instagram-story-publish`
**Purpose:** Publish event details to Instagram Story
**Method:** POST
**Request:**
```json
{
  "eventId": "event-uuid",
  "userId": "user-uuid"
}
```
**Response:**
```json
{
  "success": true,
  "storyId": "story-...",
  "message": "Story published to Instagram"
}
```

**Story Format:**
```
☕ Event Name

📍 123 Main St, Portland, OR

📅 Jun 15, 2026 at 2:00 PM

👥 150 guests

🔗 Link in bio to book! 🎉
```

---

## Service Module: `instagramService.ts`

**Exports:**

### Authentication
- `generateInstagramAuthUrl()` → URL string
- `exchangeCodeForToken(code)` → InstagramToken
- `storeInstagramToken(userId, token)` → boolean
- `getInstagramIntegration(userId)` → InstagramToken | null

### Webhooks
- `processWebhookEvent(userId, payload)` → { success, action?, error? }
- `verifyInstagramWebhook(token)` → boolean

### Messaging
- `sendInstagramDM(userId, recipientId, username, trigger)` → { success, messageId?, error? }

### Stories
- `triggerInstagramStoryUpdate(userId, eventId)` → { success, storyId?, error? }

### Utilities
- `formatEventForStory(event)` → formatted text

---

## Environment Variables

### Required

```bash
# Instagram OAuth
INSTAGRAM_CLIENT_ID=your-app-id
INSTAGRAM_CLIENT_SECRET=your-app-secret
INSTAGRAM_REDIRECT_URI=https://your-domain/auth/instagram/callback

# Webhook
INSTAGRAM_WEBHOOK_VERIFY_TOKEN=your-custom-verify-token

# Supabase (already configured)
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### Optional
```bash
# For future: Scheduled story posts
INSTAGRAM_SCHEDULE_TIMEZONE=America/Los_Angeles
```

---

## Setup Steps

### 1. Create Instagram App

1. Go to [Meta Developers](https://developers.facebook.com/)
2. Create new app → "Business"
3. Add "Instagram" product
4. Configure:
   - **App Roles:** Admin, Developer
   - **Business Use Case:** Catering/Events

### 2. Get Credentials

- App ID → `INSTAGRAM_CLIENT_ID`
- App Secret → `INSTAGRAM_CLIENT_SECRET`
- Generate webhook token (random string) → `INSTAGRAM_WEBHOOK_VERIFY_TOKEN`

### 3. Configure OAuth

**Settings → Basic:**
- Add Redirect URIs: `https://yourdomain.com/auth/instagram/callback`

**Settings → App Roles:**
- Add test users with role "Admin"

### 4. Set Up Webhook

**Products → Instagram → Webhooks:**
- Callback URL: `https://yourdomain.supabase.co/functions/v1/instagram-webhook`
- Verify Token: Your custom token
- Subscribe to fields: `comments`, `mentions`

### 5. Deploy Functions

```bash
supabase functions deploy instagram-auth
supabase functions deploy instagram-callback
supabase functions deploy instagram-webhook
supabase functions deploy instagram-story-publish
```

### 6. Set Secrets

```bash
supabase secrets set INSTAGRAM_CLIENT_ID "your-id"
supabase secrets set INSTAGRAM_CLIENT_SECRET "your-secret"
supabase secrets set INSTAGRAM_REDIRECT_URI "https://..."
supabase secrets set INSTAGRAM_WEBHOOK_VERIFY_TOKEN "your-token"
```

### 7. Run Migration

```bash
supabase migration up
```

---

## Data Flow Examples

### Example 1: User Connects Instagram

```
User clicks "Connect Instagram" button
    ↓
Frontend calls GET `/v1/instagram-auth?action=get-auth-url`
    ↓
Redirects to Instagram OAuth screen
    ↓
User authorizes app
    ↓
Instagram redirects with code parameter
    ↓
Frontend captures code, calls POST `/v1/instagram-callback`
    ↓
Backend exchanges code for token
    ↓
Token stored in `instagram_integrations`
    ↓
Success screen shows: "@tinytulipco connected ✅"
```

### Example 2: Comment Triggers DM

```
User comments on Instagram post: "Is catering available?"
    ↓
Instagram webhook POST `/v1/instagram-webhook`
    ↓
Webhook handler receives event
    ↓
Finds keyword "CATERING" in comment
    ↓
Calls sendInstagramDM()
    ↓
DM sent: "Hi! Thanks for interest. Check out: [booking-link]"
    ↓
Logged in `instagram_webhook_events` (processed=true, action_taken='dm_sent')
    ↓
Conversation stored in `instagram_dm_conversations`
```

### Example 3: Event Story Published

```
Barista creates event: "Summer Pop-up June 15, 150 guests"
    ↓
Barista clicks "Share to Instagram Story" (future UI)
    ↓
Frontend calls POST `/v1/instagram-story-publish`
    ↓
Backend fetches event details from database
    ↓
Formats: "☕ Summer Pop-up 📍 123 Main St..."
    ↓
Calls Instagram Content Publishing API (mocked for now)
    ↓
Story created: expires in 24 hours
    ↓
Logged in `instagram_story_publishes` (status='published')
    ↓
Activity log entry created
```

---

## API Integration Points (Future)

### Instagram Graph API Endpoints
- **Auth:** `https://api.instagram.com/oauth/authorize`
- **Token:** `https://graph.instagram.com/v18.0/oauth/access_token`
- **Me:** `https://graph.instagram.com/me?fields=...`
- **Comments:** `https://graph.instagram.com/{media-id}/comments`
- **Messaging:** `https://graph.instagram.com/{ig-user-id}/messages`
- **Story Publish:** `https://graph.instagram.com/{ig-user-id}/media`

### Current Implementation
- Auth: ✅ Implemented (real API calls)
- Webhooks: ✅ Implemented (real webhook handler)
- DM Sending: 🔄 Mocked (ready for real API)
- Story Publishing: 🔄 Mocked (ready for real API)

---

## Testing

### 1. Test OAuth Flow (Local)

```typescript
// In browser console
const authUrl = await fetch('/v1/instagram-auth', {
  method: 'POST',
  body: JSON.stringify({ action: 'get-auth-url' })
}).then(r => r.json());
window.location.href = authUrl.authUrl;
```

### 2. Test Webhook

```bash
# Using curl to simulate webhook
curl -X POST https://your-function-url/instagram-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "object": "instagram",
    "entry": [{
      "id": "123",
      "changes": [{
        "field": "comments",
        "value": {
          "from": {"id": "user", "username": "testuser"},
          "text": "Is catering available?"
        }
      }]
    }]
  }'
```

### 3. Test Story Publish

```bash
curl -X POST https://your-function-url/instagram-story-publish \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -d '{
    "eventId": "event-uuid",
    "userId": "user-uuid"
  }'
```

---

## Monitoring

### Key Metrics
- **Webhook Events Received:** Count from `instagram_webhook_events`
- **DM Success Rate:** Count where `action_taken = 'dm_sent'`
- **Story Publishing Rate:** Count from `instagram_story_publishes`
- **Token Refresh Needed:** Check `instagram_integrations` where `token_expiry < NOW()`

### Queries

```sql
-- Recent comments processed
SELECT * FROM instagram_webhook_events
WHERE event_type = 'comment'
ORDER BY created_at DESC
LIMIT 10;

-- Active integrations
SELECT COUNT(*), is_active
FROM instagram_integrations
GROUP BY is_active;

-- Failed stories
SELECT * FROM instagram_story_publishes
WHERE status = 'failed'
ORDER BY created_at DESC;
```

---

## Security Considerations

1. **Token Storage:** Encrypted at rest in Supabase
2. **Webhook Verification:** Always verify token before processing
3. **Scope Limiting:** Only request necessary Instagram permissions
4. **Rate Limiting:** Instagram has rate limits; implement backoff strategy
5. **Token Refresh:** Implement 60-day refresh cycle (future)
6. **CORS:** Webhook endpoint allows POST from Instagram only

---

## Future Enhancements

1. ✅ Token refresh flow (when token expires in 60 days)
2. ✅ Scheduled story posts (not just on-demand)
3. ✅ Analytics: Track which comments → DMs → bookings
4. ✅ Image-based stories (use event photos)
5. ✅ Hashtag automation (#TinyTulipCoffee)
6. ✅ Multi-account support (multiple Instagram accounts per user)

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | Invalid client ID/secret | Verify credentials in Supabase secrets |
| Webhook 403 | Wrong verify token | Check `INSTAGRAM_WEBHOOK_VERIFY_TOKEN` matches Meta config |
| Token expired | Past 60-day limit | Implement token refresh flow |
| DM not sent | API rate limit | Add exponential backoff retry |
| Story not published | Invalid event data | Check event has location & date |

---

**Status:** Backend infrastructure complete, ready for frontend UI integration  
**Version:** 1.0  
**Last Updated:** 2026-06-14
