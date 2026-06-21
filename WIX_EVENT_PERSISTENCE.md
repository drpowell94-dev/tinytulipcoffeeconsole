# Event Persistence & Sync Architecture

This document explains how Tiny Tulip Console handles event storage, persistence, and synchronization with Wix.

## Overview

Events are **stored locally in localStorage** for offline capability, and **automatically synced to Supabase** when available. No login required — all data is shared across devices using the public/anon Supabase API key.

```
Wix Events API
     ↓
[1] Bulk Import Script  OR  [2] Webhook Receiver
     ↓
Supabase (persistent events table)
     ↓
Device (on app load, sync to localStorage)
     ↓
User Creates/Edits Events
     ↓
App persists back to Supabase
```

---

## Three Types of Events

### 1. Wix-Sourced Events
- Imported from Wix (either bulk script or webhook)
- Have `wixEventId` field to link to Wix source
- Status auto-derived from dates (completed if past, confirmed if future, cancelled if marked)
- Wix description → app notes field
- **When Wix webhook arrives**: Preserves user edits (notes, event_type), updates Wix fields (title, dates, location)

### 2. Manually-Created Events
- Created in the app (no Wix source)
- Stored in Supabase with `synced_from_wix = false`
- Persist to Supabase when created/edited

### 3. Offline Events
- Created/edited while offline (no Supabase connection)
- Stored only in localStorage initially
- Synced to Supabase when back online

---

## Event Sync Flows

### On App Load
```typescript
syncEventsFromSupabase()
  ↓ (if Supabase enabled)
Pull all events from Supabase table
  ↓
Merge into localStorage (preserves local ID, updates from Supabase)
  ↓
UI renders merged events
```

### When User Creates Event
```typescript
handleCreate()
  ↓
createEvent()  // Save to localStorage
  ↓
persistEventToSupabase()  // Also save to Supabase (async, no-op if offline)
  ↓
Toast success
```

### When Wix Webhook Arrives
```typescript
/v1/wix-receiver endpoint
  ↓
Fetch existing event from Supabase (if any)
  ↓
Merge strategy:
  - Wix fields (title, dates, location, status) → updated
  - User fields (notes, event_type) → preserved
  ↓
Upsert to Supabase
  ↓
Device syncs on next load OR via realtime subscription
```

### When User Edits Event
```typescript
handleConvertLead() / other updates
  ↓
updateEvent()  // Save to localStorage
  ↓
persistEventToSupabase()  // Sync to Supabase
  ↓
Toast success
```

### When User Deletes Event
```typescript
handleDelete()
  ↓
deleteEvent()  // Remove from localStorage
  ↓
deleteEventFromSupabase()  // Also remove from Supabase
```

---

## Field Mapping: Wix → App

| Wix Field | App Field | Direction | Notes |
|-----------|-----------|-----------|-------|
| `title` | `name` | ← Wix overwrites | Event name |
| `description` | `notes` | Wix → app initially | User can edit separately |
| `startsAt` | `dateStart` | ← Wix overwrites | ISO timestamp |
| `endsAt` | `dateEnd` | ← Wix overwrites | ISO timestamp |
| `location` | `location` | ← Wix overwrites | Venue address |
| `status` | `status` | ← Wix + date logic | READY/DRAFT → confirmed/inquiry; CANCELLED → cancelled; past → completed |
| `eventId` | `wixEventId` | Immutable | Links to Wix source |

**User-editable fields (preserved during Wix sync):**
- `notes` (user's own notes)
- `event_type` (catering, popup, farmers_market, other)
- `contactName`, `contactEmail`, `contactPhone`
- `guestCount`, `preOrders`, `estimatedRevenue`
- `depositStatus`

---

## Status Derivation Logic

Applied consistently in webhook receiver and bulk import script:

```typescript
function deriveStatus(record: {
  status: string;
  startDate: string;
  endDate?: string;
}): EventStatus {
  if (record.status === "cancelled") return "cancelled";
  const end = new Date(record.endDate || record.startDate).getTime();
  return end < Date.now() ? "completed" : "confirmed";
}
```

This ensures:
- ✅ Old events with `confirmed` status auto-complete when date passes
- ✅ Webhooks and imports use same logic (no inconsistencies)
- ✅ Events age gracefully without manual status flipping

---

## Offline Capability

When Supabase is unavailable:

1. **Create/edit/delete** — Works normally, stored in localStorage only
2. **Sync on load** — Returns null, uses cached localStorage
3. **When back online** — Next app load calls `syncEventsFromSupabase()`, pulls latest from server
4. **No conflicts** — Merge strategy prioritizes Supabase (server of truth) but preserves user-edited fields

---

## Webhook Logging

The `/v1/wix-receiver` endpoint logs all events for debugging:

```json
{
  "timestamp": "2026-06-21T10:30:45Z",
  "level": "info",
  "wixEventId": "event-123",
  "action": "sync_complete",
  "details": {
    "action": "created",
    "title": "Coffee at the Park",
    "status": "confirmed"
  }
}
```

View logs in Supabase Dashboard → Functions → wix-receiver.

---

## Setup Checklist

### Step 1: Run Bulk Import (Optional, for historical events)
```bash
npx ts-node scripts/import-wix-events.ts
```

### Step 2: Set Up Live Sync
See `WIX_INTEGRATION_SETUP.md` for webhook configuration.

### Step 3: Verify Persistence
- Create an event in the app
- Check Supabase dashboard → `events` table — should appear there
- Close app, reopen — event should still be there
- Open on different device — event should appear (after sync)

### Step 4: Test Wix Webhook
Use `scripts/post-wix-events.ts` to simulate webhook:
```bash
WIX_RECEIVER_URL="https://..." WIX_WEBHOOK_SECRET="..." npx tsx scripts/post-wix-events.ts
```

---

## Troubleshooting

### Events Don't Persist After Refresh
- **Check**: Is Supabase configured in `.env`? (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
- **Check**: Can you reach Supabase? (test in browser console: `fetch(url)`)
- **Fallback**: Events still work offline in localStorage, sync when online

### Wix Events Don't Update on Webhook
- **Check**: Webhook secret matches `.env` (`WIX_WEBHOOK_SECRET`)
- **Check**: URL is correct in Wix app settings
- **Check**: Supabase functions are deployed
- **Test**: Use `scripts/post-wix-events.ts` to simulate

### User Edits Keep Getting Overwritten
- **Fixed**: Webhook now preserves `notes` and `event_type` fields
- **Status issue?** If event status is being overwritten: File issue (status should only update if date crosses past/future line)

### Events Appear Duplicate
- **Check**: Unique constraint on `wix_event_id` (should prevent duplicates)
- **Solution**: Delete from Supabase and re-import if corrupted

---

## Architecture Decisions

### Why No Login?
- Barista-facing console for a single business
- All staff members see same events (shared access)
- Simpler deployment (no auth infrastructure)
- Can add logins later if needed (RLS policies already in place)

### Why localStorage + Supabase?
- **Offline**: Work continues without internet
- **Sync**: Multiple devices see same data
- **Conflict resolution**: Server is source of truth, user edits preserved
- **Simple**: No complex merge algorithms, webhook always wins unless field is user-edited

### Why Preserve User Edits During Sync?
- Wix is CRUD layer (title, dates, location)
- App is analytics + operations layer (notes, type, contacts, pre-orders)
- Both layers can update independently without stepping on each other

---

## Future Improvements

- [ ] Real-time subscriptions (Supabase realtime) instead of sync-on-load
- [ ] Two-way sync (user edits push back to Wix custom fields)
- [ ] Conflict resolution UI (if user and Wix edit same event simultaneously)
- [ ] Offline queue with retry logic (batch sync on reconnect)
