# Importing Existing Events from Wix

This guide helps you bulk import all your existing Wix events into the Tiny Tulip console and keep them synced.

## Understanding the Three Import Paths

**Bundled JSON** (`src/data/wixEvents.json`) — Test/demo data. Use this for development. Safe to leave as-is for production (unused unless explicitly imported).

**Bulk Import Script** (`scripts/import-wix-events.ts`) — One-time historical import. Fetches all events from Wix and upserts them to Supabase. Run this once to load your existing events.

**Webhook Receiver** (live sync) — Recommended for production. Whenever you create/update an event in Wix, it automatically syncs to the console.

---

## Event Persistence & Sync

Once imported, events **persist in Supabase** and sync to your device automatically:

- **On app load**: Device syncs latest events from Supabase
- **On Wix update**: Webhook receiver updates Supabase instantly
- **Offline mode**: Events stay in localStorage; sync resumes when back online
- **User edits preserved**: If you edit an event locally (add notes, change type), Wix webhook updates won't overwrite your changes
  
**No login required.** Uses Supabase's public/anon access (same user for all devices).

---

## Quick Start (Easiest)

### Option 1: Using the Import Script

#### Step 1: Get Your Wix Credentials

1. **Wix API Key**:
   - Go to [Wix Developer Dashboard](https://dev.wix.com)
   - Select your site
   - Go to **API & Extensions** → **REST API**
   - Copy your API key (starts with `wix_` or similar)

2. **Wix Site ID**:
   - In the Wix Admin, go to **Settings** → **General**
   - Look for "Site ID" or find it in the URL: `https://www.wixapis.com/sites/{SITE_ID}`
   - Alternatively, it's in the Wix Dashboard URL

#### Step 2: Add Credentials to `.env`

```bash
# .env (local file - never commit this)
WIX_API_KEY=your-wix-api-key-here
WIX_SITE_ID=your-wix-site-id-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
VITE_SUPABASE_URL=https://your-project-id.supabase.co
```

#### Step 3: Run the Import

```bash
# Install ts-node if not already installed
npm install -D ts-node

# Run the import script
npx ts-node scripts/import-wix-events.ts
```

**Expected output:**
```
🚀 Wix Events Bulk Import

📡 Fetching events from Wix...
  ✓ Fetched 12 events (total: 12)
🔍 Looking for system user...
  ✓ Found existing system user
📦 Importing 12 events to Supabase...
  ✓ Imported 50/50 events
✅ Successfully imported 50 events!
🎉 Import complete!
```

---

## Option 2: Manual Import via Supabase Dashboard

If you prefer not to use the script, you can import events manually:

### Step 1: Get Events from Wix

Use the Wix API directly via **API Tester**:

1. Go to [Wix Sandbox/API Tester](https://dev.wix.com/api/rest)
2. Search for **Events API**
3. Select **List Events** endpoint
4. Add headers:
   ```
   Authorization: {YOUR_WIX_API_KEY}
   X-Wix-Site-Id: {YOUR_SITE_ID}
   ```
5. Click **Test** to see your events in JSON format

### Step 2: Format and Import

Copy the response and format it for Supabase:

```sql
-- Get or create system user first
INSERT INTO users (email, full_name, role) 
VALUES ('system@tinytulipcoffee.internal', 'System Import', 'admin')
ON CONFLICT (email) DO UPDATE SET role = 'admin'
RETURNING id;

-- Then insert events (replace USER_ID with the ID from above)
INSERT INTO events (
  wix_event_id,
  name,
  description,
  date_start,
  date_end,
  location,
  status,
  event_type,
  synced_from_wix,
  created_by
) VALUES
  ('wix-event-123', 'Coffee at the Park', 'Summer coffee event', 
   '2026-07-15T10:00:00Z', '2026-07-15T14:00:00Z', 'Central Park', 
   'confirmed', 'other', true, 'USER_ID'),
  -- Add more rows as needed
ON CONFLICT (wix_event_id) 
DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  date_start = EXCLUDED.date_start,
  date_end = EXCLUDED.date_end,
  location = EXCLUDED.location,
  status = EXCLUDED.status;
```

---

## Wix API Response Format Reference

The import script expects Wix events in this format:

```json
{
  "events": [
    {
      "id": "00000000-0000-0000-0000-000000000001",
      "title": "Coffee at the Park",
      "description": "Join us for an outdoor coffee event",
      "startsAt": "2026-07-15T10:00:00.000Z",
      "endsAt": "2026-07-15T14:00:00.000Z",
      "location": {
        "address": "Central Park, New York"
      },
      "status": "READY"
    }
  ],
  "pageToken": "next-page-token"
}
```

### Field Mapping

| Wix Field | App Field | Notes |
|-----------|-----------|-------|
| `id` | `wix_event_id` | Unique identifier (always required) |
| `title` | `name` | Event name |
| `description` | `description` | Nullable |
| `startsAt` | `date_start` | ISO 8601 timestamp |
| `endsAt` | `date_end` | ISO 8601 timestamp (nullable) |
| `location.address` | `location` | Full address string |
| `status` | `status` | READY→confirmed, CANCELLED→cancelled, DRAFT→inquiry |

---

## Handling Duplicates

The import is **safe to run multiple times**. It uses `ON CONFLICT` logic:

- **New events** from Wix are inserted
- **Existing events** (matching `wix_event_id`) are updated with latest data
- **No duplicates** are created

---

## Troubleshooting

### Error: "Failed to fetch Wix events"

**Check:**
1. WIX_API_KEY is correct and not expired
2. WIX_SITE_ID matches your actual site
3. Your Wix account has access to the Events API

**Solution:**
```bash
# Test your Wix credentials
curl https://www.wixapis.com/v1/events/events \
  -H "Authorization: {YOUR_API_KEY}" \
  -H "X-Wix-Site-Id: {YOUR_SITE_ID}"
```

### Error: "Missing Supabase credentials"

**Check:**
1. .env file exists in project root
2. VITE_SUPABASE_URL is set correctly
3. SUPABASE_SERVICE_ROLE_KEY (not anon key) is set

**Solution:**
Get service role key from Supabase Dashboard → Settings → API → Service Role (Secret)

### Error: "Missing required field"

The import script might be failing on malformed events. Check:
1. Event has required fields (id, title, startsAt)
2. Dates are valid ISO 8601 format
3. Consider filtering events in Wix (delete drafts before importing)

### Partial Import Succeeded

If some events imported but others failed, check the batch size. Try reducing `batchSize` in the script from 50 to 25.

---

## Next Steps

After import:

1. **Verify in Supabase**:
   ```sql
   SELECT COUNT(*) FROM events WHERE synced_from_wix = true;
   SELECT name, date_start, status FROM events WHERE synced_from_wix = true LIMIT 5;
   ```

2. **Check the Dashboard**: Events should appear in the calendar/list views

3. **Set Up Live Sync**: Configure the Wix webhook (see `WIX_INTEGRATION_SETUP.md`) so future events auto-sync

4. **Add Manual Details**: Events imported from Wix won't have:
   - `deposit_amount` or `deposit_status`
   - `guest_count` estimates
   - `event_type` specificity (all default to "other")
   
   You can edit these in the app later.

---

## Security Note

⚠️ **Never commit your Wix API key or Service Role key to Git!**

Add to `.gitignore`:
```
.env
.env.local
.env.*.local
```

The `.env.example` file shows which variables you need without exposing secrets.
