# Wix Events Sync Integration Setup

This document guides you through setting up the Wix Events bidirectional sync receiver endpoint.

## Architecture Overview

- **Endpoint Type**: Supabase Edge Function (serverless)
- **Route**: `POST /functions/v1/wix-receiver`
- **Authentication**: Bearer Token in Authorization header
- **Database**: Supabase PostgreSQL

## Prerequisites

1. **Supabase Project** - Already set up ✓
2. **Supabase CLI** - Install if not already installed:
   ```bash
   npm install -g supabase
   ```
3. **Wix Events App Access** - Admin access to your Wix site

## Step 1: Set Up Environment Variables

### 1a. Generate a Secure Webhook Secret

Generate a random token to use as your webhook secret:

```bash
# macOS/Linux
openssl rand -hex 32

# Windows (PowerShell)
[Convert]::ToHexString((1..32 | ForEach-Object { [byte](Get-Random -Minimum 0 -Maximum 256) }))
```

This will output something like: `abc123def456...` (a 64-character hex string)

### 1b. Update Your Local Environment

Add the generated secret to your `.env` file:

```bash
# .env (local development only - never commit this)
WIX_WEBHOOK_SECRET=your-generated-secret-here
```

### 1c. Configure in Supabase Dashboard

For your deployed Supabase project:

1. Go to **Supabase Dashboard** → Your Project → **Settings** → **Edge Functions**
2. Click on the **Secrets** tab
3. Add a new secret:
   - **Name**: `WIX_WEBHOOK_SECRET`
   - **Value**: Your generated secret from Step 1a

## Step 2: Deploy Database Migration

### 2a. Apply the Migration to Your Supabase Database

**Option A: Using Supabase Dashboard (Easiest for non-developers)**

1. Go to **Supabase Dashboard** → Your Project → **SQL Editor**
2. Create a new query
3. Copy and paste the contents of `supabase/migrations/002_add_wix_sync.sql`
4. Click **Run**

**Option B: Using Supabase CLI**

```bash
# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-id

# Run migrations
supabase migration up
```

**What this migration does:**
- Adds `wix_event_id` column to events table (unique, for upsert matching)
- Adds `synced_from_wix` boolean flag
- Adds `description` column
- Creates indexes for efficient lookups

## Step 3: Deploy the Supabase Edge Function

### 3a. Using Supabase CLI (Recommended)

```bash
# Navigate to your project root
cd /path/to/tinytulipcoffeeconsole

# Deploy the function
supabase functions deploy wix-receiver --no-verify-jwt

# Note: --no-verify-jwt allows unauthenticated POST requests
# (we verify the Bearer token instead)
```

### 3b: Get Your Function URL

After deployment, your function will be available at:

```
https://<project-id>.supabase.co/functions/v1/wix-receiver
```

Find your project ID in the Supabase Dashboard URL or settings.

### 3c: Verify the Deployment

Test the endpoint with curl:

```bash
# Replace with your actual URL and secret
curl -X POST https://your-project-id.supabase.co/functions/v1/wix-receiver \
  -H "Authorization: Bearer your-wix-webhook-secret" \
  -H "Content-Type: application/json" \
  -d '{
    "wixEventId": "test-event-123",
    "title": "Test Event",
    "startDate": "2026-07-01T10:00:00Z",
    "location": "Coffee Shop",
    "status": "published"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Event synced successfully",
  "data": [...]
}
```

## Step 4: Configure Wix Webhook

### 4a: Generate or Find Your Wix API Key

1. Log into your **Wix Dashboard**
2. Go to **Settings** → **Integrations & Apps** → **API & Extensions**
3. Under **REST API**, create or copy your API key

### 4b: Set Up the Webhook in Wix

1. In Wix Admin, go to **Settings** → **Integrations & Apps** → **Webhooks**
2. Click **Create Webhook**
3. Configure:
   - **Event**: Event Created OR Event Updated
   - **URL**: `https://your-project-id.supabase.co/functions/v1/wix-receiver`
   - **Headers**: Add custom header:
     - **Name**: `Authorization`
     - **Value**: `Bearer your-wix-webhook-secret`

### 4c: Test the Webhook

1. Create or update a test event in Wix
2. Check the **Webhook Logs** in Wix Dashboard
3. Verify the request was received (status 200)
4. Check your Supabase database to confirm the event was created/updated

## Step 5: Monitor and Troubleshoot

### View Function Logs

```bash
# Show real-time logs
supabase functions get-logs wix-receiver --follow
```

### Debug Database Issues

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Query your events:
   ```sql
   SELECT id, wix_event_id, name, synced_from_wix, created_at 
   FROM events 
   WHERE synced_from_wix = true 
   ORDER BY created_at DESC;
   ```

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | Wrong Bearer token | Verify `WIX_WEBHOOK_SECRET` matches exactly |
| 400 Missing required field | Incomplete Wix payload | Check Wix webhook configuration |
| 500 Server error | Database issue | Check function logs and database permissions |

## Payload Format Reference

### Incoming Request from Wix

```http
POST /functions/v1/wix-receiver HTTP/1.1
Authorization: Bearer your-wix-webhook-secret
Content-Type: application/json

{
  "wixEventId": "string (unique Wix event identifier)",
  "title": "string (event name)",
  "description": "string (optional)",
  "startDate": "ISO 8601 timestamp",
  "endDate": "ISO 8601 timestamp (optional)",
  "location": "string",
  "status": "draft | published | cancelled"
}
```

### Response on Success (200 OK)

```json
{
  "success": true,
  "message": "Event synced successfully",
  "data": [
    {
      "id": "uuid",
      "wix_event_id": "string",
      "name": "string",
      "date_start": "ISO timestamp",
      "date_end": "ISO timestamp or null",
      "location": "string",
      "status": "inquiry | confirmed | cancelled",
      "synced_from_wix": true
    }
  ]
}
```

## Security Considerations

1. **Bearer Token**: Generate a strong, random secret (at least 32 characters)
2. **Environment Variables**: Never commit `.env` files to Git
3. **HTTPS**: Wix webhooks and Supabase functions always use HTTPS
4. **Token Rotation**: Plan to rotate the secret periodically
5. **CORS**: The function allows all origins (can be restricted if needed)

## Database Upsert Behavior

The endpoint uses PostgreSQL's `UPSERT` (INSERT ... ON CONFLICT) to:

- **Create** a new event if `wix_event_id` doesn't exist
- **Update** an existing event if `wix_event_id` matches

This ensures no duplicate events and keeps data in sync automatically.

## Next Steps

1. Repeat for reverse sync (Tiny Tulip → Wix) - future phase
2. Set up monitoring/alerts for sync failures
3. Create a sync audit log table
4. Handle timezone conversions if needed

## Support

For issues:
1. Check function logs: `supabase functions get-logs wix-receiver`
2. Test with curl (see Step 3c above)
3. Verify environment variables are set correctly
4. Check database schema matches migration
