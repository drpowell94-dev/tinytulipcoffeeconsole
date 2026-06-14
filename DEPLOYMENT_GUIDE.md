# Deployment Guide - Tiny Tulip Coffee Console

This guide walks you through deploying the app to production, configuring backend services, and enabling all features.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Supabase Setup](#supabase-setup)
3. [Edge Functions Deployment](#edge-functions-deployment)
4. [Vercel Deployment](#vercel-deployment)
5. [Instagram Integration](#instagram-integration)
6. [Testing Features](#testing-features)

---

## Prerequisites

- Git and Node.js 18+ installed
- Supabase account (free tier works)
- Vercel account (for hosting)
- Meta (Facebook) Business account (for Instagram integration)

---

## Supabase Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Enter project name: `tiny-tulip-coffee`
4. Create database password (save this)
5. Wait for project to be created

### 2. Get API Credentials

1. Go to **Settings → API** in your Supabase dashboard
2. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **Anon Public Key** → `VITE_SUPABASE_ANON_KEY`
   - **Service Role Key** → `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)

### 3. Run Database Migrations

1. In Supabase dashboard, go to **SQL Editor**
2. Click **"New Query"**
3. Paste and run each migration file in order:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/003_content_pipeline.sql`
   - `supabase/migrations/004_analytics_logistics.sql`
   - `supabase/migrations/005_instagram_integration.sql`

Wait for each to complete before running the next.

### 4. Enable Row-Level Security (RLS)

This is optional but recommended for security:

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_contacts ENABLE ROW LEVEL SECURITY;
-- ... etc for all tables

-- Create basic policy (allow authenticated users to read/write their own data)
CREATE POLICY "Users can read their own data" ON events
  FOR SELECT USING (auth.uid() = user_id);
```

---

## Edge Functions Deployment

Edge Functions are serverless API endpoints that run on Supabase. They're already created in your repo.

### 1. Deploy Functions Locally (Test)

```bash
# Install Supabase CLI
npm install -g @supabase/cli

# Login to Supabase
supabase login

# Link to your Supabase project
supabase link

# Deploy functions
supabase functions deploy
```

### 2. Set Edge Function Environment Variables

In Supabase dashboard → **Functions** → each function → **Edit settings**:

**For all functions:**
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Your service role key (from API settings)

**For Instagram functions specifically:**
- `INSTAGRAM_WEBHOOK_VERIFY_TOKEN`: Your webhook verify token
- `INSTAGRAM_CLIENT_ID`: Your Instagram client ID
- `INSTAGRAM_CLIENT_SECRET`: Your Instagram client secret

### 3. Verify Deployments

In Supabase dashboard, you should see these functions:

- `wix-receiver` - POST endpoint for Wix event imports
- `leads-booking` - POST endpoint for booking form submissions
- `dashboard-insights` - GET endpoint for AI insights
- `event-logistics` - GET endpoint for supply predictions
- `content-generator` - POST endpoint for content variants
- `instagram-auth` - POST endpoint for OAuth
- `instagram-callback` - POST endpoint for OAuth callback
- `instagram-webhook` - POST/GET endpoint for webhook events
- `instagram-story-publish` - POST endpoint to publish stories

---

## Vercel Deployment

### 1. Connect Repository

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Connect your GitHub repository
4. Select `tinytulipcoffeeconsole` repository

### 2. Configure Environment Variables

In Vercel dashboard → **Settings** → **Environment Variables**, add:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
WIX_WEBHOOK_SECRET=your-secret-token
VITE_INSTAGRAM_CLIENT_ID=your-instagram-client-id
VITE_INSTAGRAM_CLIENT_SECRET=your-instagram-secret
VITE_INSTAGRAM_REDIRECT_URI=https://your-vercel-domain.vercel.app/instagram-callback
VITE_INSTAGRAM_WEBHOOK_VERIFY_TOKEN=your-webhook-token
```

### 3. Deploy

1. Click "Deploy" in Vercel
2. Wait for build to complete
3. Your app is live at `https://your-project-name.vercel.app`

---

## Instagram Integration

### 1. Set Up Meta App

1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Click "My Apps" → "Create App"
3. Choose "Business" type
4. Fill in app details
5. Add "Instagram Graph API" product

### 2. Get Instagram Credentials

1. Go to **App Settings** → **Basic**
2. Copy **App ID** and **App Secret**
3. In **Roles** → **Test Users**, create test user with Instagram account access
4. Go to **Instagram Graph API** product settings
5. Generate **Access Token** (choose "User Token")

### 3. Create OAuth Redirect URI

1. In Meta app, go to **Settings** → **Basic**
2. Add Redirect URI: `https://your-vercel-domain.vercel.app/instagram-callback`
3. Save

### 4. Generate Webhook Verify Token

Create a random token for webhook verification:

```bash
# Linux/Mac
openssl rand -hex 32

# Or use any random string generator
```

Add this to your environment variables as `VITE_INSTAGRAM_WEBHOOK_VERIFY_TOKEN`

### 5. Configure Instagram Webhook

1. In Meta app, go to **Messenger** → **Settings**
2. Add Webhook:
   - **Callback URL**: `https://your-supabase-id.supabase.co/functions/v1/instagram-webhook`
   - **Verify Token**: Your webhook token
   - **Subscribe Fields**: `comments`, `mentions`

3. Click "Verify and Save"

---

## Testing Features

### 1. Test Leads Feature

1. Go to **Events** page
2. Click "+ Add a New Lead"
3. Fill in lead details
4. Click "Add Lead"
5. See it appear in "Pending Leads" section
6. Click "Accept" to convert to confirmed event

### 2. Test Content Variants

1. Go to **Content** page
2. Write a blog post
3. Click "Generate variants"
4. See AI-generated social caption, email excerpt, and keywords

### 3. Test Dashboard Insights

1. Go to **Dashboard**
2. If no upcoming events, you'll see insights section
3. Insights include: revenue trends, venue recommendations, checklist reminders

### 4. Test Event Logistics

1. Go to **Events** page
2. Click on an upcoming event
3. Expand "Predicted Supply Needs"
4. See AI predictions for cups, beans, milk needed

### 5. Test Instagram Integration

1. Go to **Content** page
2. Click "Connect Instagram"
3. Authorize Tiny Tulip app
4. Token is saved in your Supabase database
5. Instagram comments with keywords will trigger automatic DMs

---

## Troubleshooting

### Edge Functions Not Working

**Problem**: Getting 404 errors when calling edge functions

**Solution**:
1. Verify functions are deployed: `supabase functions list`
2. Check environment variables are set in Supabase
3. Check CORS headers in function response
4. Look at function logs: Supabase → Functions → function name → Logs tab

### Environment Variables Not Loading

**Problem**: Variables show as undefined in browser

**Solution**:
1. Variables must start with `VITE_` to be exposed to frontend
2. Restart dev server after adding variables: `npm run dev`
3. Verify in Vercel dashboard → Settings → Environment Variables

### Instagram Token Expired

**Problem**: "No Instagram integration found" error

**Solution**:
1. Instagram tokens expire after 60 days
2. Re-authorize Instagram connection: Content → Connect Instagram
3. Implement token refresh in production (see `instagramService.ts` for notes)

### Supabase Connection Issues

**Problem**: Getting "Database not available" errors

**Solution**:
1. Verify `VITE_SUPABASE_URL` is correct
2. Verify `VITE_SUPABASE_ANON_KEY` is correct
3. Check Supabase is running: go to dashboard and look at health
4. Check browser console for CORS errors

---

## Monitoring & Maintenance

### View Edge Function Logs

Supabase Dashboard → **Functions** → Select function → **Logs** tab

### Monitor Webhook Events

Supabase Dashboard → **SQL Editor**:

```sql
SELECT event_type, processed, created_at
FROM instagram_webhook_events
ORDER BY created_at DESC
LIMIT 10;
```

### Check Token Expiry

```sql
SELECT instagram_username, token_expiry, is_active
FROM instagram_integrations
WHERE user_id = 'YOUR_USER_ID';
```

---

## Production Checklist

- [ ] Supabase project created and migrated
- [ ] Edge functions deployed
- [ ] Environment variables configured in Vercel
- [ ] Instagram app created (if using Instagram features)
- [ ] Instagram webhook callback URL configured
- [ ] Wix webhook receiver tested
- [ ] RLS policies configured (optional but recommended)
- [ ] Backups configured in Supabase
- [ ] Domain configured in Vercel
- [ ] Custom email domain configured (if sending emails)

---

## Next Steps

1. **Test all features** in production
2. **Set up monitoring** - check Supabase logs regularly
3. **Configure backups** - Supabase → Settings → Backups
4. **Add custom domain** - Vercel → Settings → Domains
5. **Set up CI/CD** - Enable auto-deploy on push to main

---

**Need help?**
- Supabase docs: https://supabase.com/docs
- Vercel docs: https://vercel.com/docs
- Instagram API: https://developers.facebook.com/docs/instagram-api
- Check logs in both Supabase and Vercel dashboards
