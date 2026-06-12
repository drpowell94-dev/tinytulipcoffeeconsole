# Full App Integration Guide

## Overview

The Tiny Tulip Coffee Console is a **5-module operations system** with the **drink counter as the primary feature**.

```
┌─────────────────────────────────────────────────────┐
│         TINY TULIP COFFEE CONSOLE                   │
│    5 Modules + Integrated Drink Counter             │
└─────────────────────────────────────────────────────┘

Dashboard (Entry point)
    ├── Events Tab (PRIMARY)
    │   ├── Event List/Calendar
    │   ├── Create Event
    │   └── 🌟 DRINK COUNTER (when at event)
    │       ├── Tap buttons for each drink
    │       ├── Real-time sync to Supabase
    │       └── Order history
    │
    ├── Content Tab (SECONDARY)
    │   ├── Blog Generator (templates, drafts, publish)
    │   └── Website Updater (hours, menu, alerts)
    │
    ├── Logistics Tab (SECONDARY)
    │   ├── Checklist Manager
    │   ├── Auto-generate from event type
    │   ├── Digital sign-offs
    │   └── Download/print
    │
    ├── Inventory Tab (SECONDARY)
    │   ├── Real-time inventory tracker
    │   ├── Low-stock alerts
    │   ├── Usage history
    │   └── Supplier management
    │
    └── Dashboard Tab (INFO)
        ├── Quick stats & alerts
        ├── Upcoming events
        ├── Live drink counts
        └── Revenue summary
```

---

## Module Breakdown

### 1️⃣ Event Tracker + Drink Counter (PRIMARY)

#### Event List View
- Calendar view (month/week/day) + List view toggle
- Create new event dialog
- Search/filter by status, type, date
- Quick event card with key info

#### When Creating Event
```
Event Details:
- Event name (e.g., "Farmers Market - Saturday")
- Event type (catering, popup, farmers_market)
- Date & time (start + optional end)
- Location
- Pre-order count
- Client contact info
- Estimated revenue
- Deposit status

→ After creation, ready to use drink counter
```

#### Drink Counter (At Event)
```
Screen Layout:
┌─────────────────────────────────────┐
│  Tiny Tulip Tracker                 │
│  Farmers Market - Saturday           │
├─────────────────────────────────────┤
│                                      │
│  Session Total:  23 / 25             │
│  Revenue: $127.50                    │
│  Extra Sales: +2 drinks = $12        │
│                                      │
├─────────────────────────────────────┤
│                                      │
│  ☕ Hot Coffee    🧋 Iced Coffee    │
│      [7]              [8]            │
│                                      │
│  🥤 Cold Brew     🍋 Lemonade       │
│      [5]              [3]            │
│                                      │
│  🍫 Chocolate Milk                   │
│      [0]                             │
│                                      │
├─────────────────────────────────────┤
│  Show Order Log | Export | Reset     │
└─────────────────────────────────────┘

Features:
- Big tap buttons (touch-optimized, 44x44px minimum)
- Live count display in corner of each button
- Progress bar showing % of pre-orders fulfilled
- "Extra Sales" section when > pre-orders
- Confetti when pre-orders hit
- Order log (scrollable, timestamps)
- Real-time sync status indicator

Syncing:
- Every tap updates localStorage immediately (instant)
- Every 2-5 seconds syncs to Supabase (async, non-blocking)
- Shows "⟳ Syncing..." when uploading
- Works offline - retries when online
```

#### Event Details View
- Show all event information
- Associated contacts
- Linked checklist
- Revenue summary
- Status timeline (Inquiry → Confirmed → Completed)
- Edit/delete options
- Quick access to drink counter

---

### 2️⃣ Dashboard Overview

**Entry Point** - Shows comprehensive status:

```
Layout:
┌──────────────────────────────────────┐
│  🌷 Tiny Tulip Coffee Console        │
│  Welcome, [User Name]!               │
│  [Current Date & Time]               │
├──────────────────────────────────────┤
│  📊 QUICK STATS                      │
│  ┌─────────────┬─────────────────┐  │
│  │ 7 Upcoming  │ 2 Active Events │  │
│  │ Events      │ (w/ live counts)│  │
│  └─────────────┴─────────────────┘  │
│  ┌─────────────┬─────────────────┐  │
│  │ $2,450      │ 8 Low Stock     │  │
│  │ This Month  │ Alerts          │  │
│  └─────────────┴─────────────────┘  │
├──────────────────────────────────────┤
│  📅 UPCOMING EVENTS (Next 7 Days)    │
│  ┌──────────────────────────────┐   │
│  │ Farmers Market - Sat          │   │
│  │ Tomorrow at 8am, 25 pre-orders│   │
│  │ Live: 23/25 drinks ████████░  │   │
│  │ → Go to Event                │   │
│  └──────────────────────────────┘   │
│  [More events...]                    │
├──────────────────────────────────────┤
│  🔴 INVENTORY ALERTS                │
│  • 12oz Cups: 2 boxes (reorder soon) │
│  • Oat Milk: 1 liter (running low)  │
│  → Go to Inventory                   │
├──────────────────────────────────────┤
│  🚀 QUICK ACTIONS                   │
│  [Create Event] [New Blog Post]      │
│  [Check Inventory] [View History]    │
└──────────────────────────────────────┘
```

**Key Features:**
- Real-time stats pulled from Supabase
- Live drink counts for active events (if multi-team)
- Quick navigation to other modules
- Revenue tracking
- Inventory alerts

---

### 3️⃣ Content & Website CMS

#### Blog Generator
```
Workflow:
1. Select template:
   - "Coffee Origin Spotlight" 
   - "Seasonal Drink Launch"
   - "Community Update"

2. Fill in fields:
   - Title
   - Keywords (SEO)
   - Meta description
   - Tone (friendly/professional/casual)

3. Edit content:
   - Rich text editor with formatting
   - Auto-save every 30 seconds (as draft)
   - Preview mode

4. Publish:
   - Save as draft
   - Schedule for future date
   - Publish immediately
```

#### Website Quick Updater
```
Three sections:

1. Operating Hours
   - Day of week selector (Sun-Sat)
   - Opens/closes time picker
   - Notes field

2. Seasonal Menu
   - Add menu item (name, description, price)
   - Category (drinks, pastries, food)
   - Season selector (spring/summer/fall/winter/year-round)
   - Mark as featured

3. Alert Banner
   - Title + content
   - Priority level
   - Active toggle
   - Display duration
```

**Stored in Supabase**:
- `blog_posts` table
- `website_updates` table
- `seasonal_menu` table

---

### 4️⃣ Logistics & Packing Checklists

#### Checklist Templates (by Event Type)

**Template 1: Catering Setup**
```
Category: Equipment
- Espresso machine
- Grinder (burr)
- Milk frother
- Scales

Category: Supplies
- Coffee beans (various)
- Oat milk, whole milk
- Sugar, syrups
- Cups, lids, napkins

Category: Documents
- Receipt book
- Permit (if needed)
```

**Template 2: Farmers Market**
```
Category: Equipment
- Tent/canopy
- Weights (for windy days)
- Table + chair
- Display stand

Category: Supplies
- Pre-made cold brew cans
- Cups, lids, napkins
- Sweeteners, napkins
- Ice (if needed)

Category: Tech
- iPad/tablet for orders
- Square reader
- Card reader
```

**Template 3: Pop-up Event**
```
Category: Minimal Equipment
- Portable espresso machine
- Manual grinder
- Hot water thermos

Category: Supplies
- Pre-brew coffee
- Paper cups
- Napkins

Category: Documents
- Permission/permit
```

#### Using Checklists at Event

```
Workflow:
1. Select event → automatically loads template
2. See pre-populated items grouped by category
3. As items are loaded, barista/staff checks them off
4. Each checkbox triggers:
   - Timestamp capture
   - User attribution
   - Offline state persistence

5. View completion %
6. Can download/print before event

Storage:
- event_drink_counts (real-time)
- event_drink_orders (detailed log)
- checklist_items (individual items)
- checklist_signoffs (timestamps + user)
```

---

### 5️⃣ Operations & Supplies Log

#### Inventory Tracker

**Items Tracked:**
- Coffee Beans (various origins)
- Milk (Oat, Whole)
- Cups (12oz, 16oz)
- Lids
- Napkins, straws
- Equipment (espresso machine, grinder, etc.)

**For Each Item:**
- Current quantity
- Unit of measure
- Reorder level
- Reorder quantity
- Unit cost
- Supplier name & contact
- Last restocked date

#### Visual Alerts

```
Item Status:
✅ Green   - Well stocked (> reorder level)
🟡 Yellow  - Getting low (approaching reorder level)
🔴 Red     - Below reorder level (ALERT!)

Example:
- 12oz Cups: [████░░░] 2 boxes (reorder level: 5)  🔴 ALERT
- Oat Milk:  [██████░] 3 liters (reorder level: 8) 🟡 LOW
- Espresso:  [███████] 1 unit (reorder level: 1)   ✅ OK
```

#### Usage Tracking

```
When checklist completed at event:
- Automatically deduct items used
- Log to inventory_history
- Link to specific event
- Timestamp capture

Example:
"Farmers Market - Sat" used:
- 25 cups (from 30 → 5)
- 3 liters oat milk (from 8 → 5)
- 1 lb espresso beans (from 5 → 4)

Historical analysis:
- Average usage per event
- Trending/seasonal needs
- Cost per event
```

---

## Data Flow Architecture

### Drink Counter Sync

```
Barista at Event:
1. Tap ☕ button
   ↓
2. State updates instantly (in-memory)
   ↓
3. Saved to localStorage (persistent)
   ↓
4. Every 2-5 seconds: sync to Supabase
   (async, non-blocking)
   ↓
5. Supabase inserts/updates event_drink_counts
   ↓
6. Realtime subscription notifies:
   - Team dashboard
   - Manager view
   - Live event metrics
```

### Session Lifecycle

```
BEFORE EVENT:
- Create event in Dashboard
- Set pre-order count
- Select/create checklist

DURING EVENT:
- Open app, select event
- Tap drinks, see live counts
- Check off checklist items
- Counts sync to Supabase

END OF EVENT:
- Tap "End Session" button
- Session snapshot saved to event_sessions table
- Full analytics calculated
- Moved to history
- Email summary generated
```

---

## Technical Architecture

### Database Tables

```
Core:
- users (staff & admins)
- events (event records)
- event_contacts (client info)

Drink Tracking:
- event_drink_counts (live counts, with Realtime)
- event_drink_orders (detailed order log)
- event_sessions (archived completed sessions)

Content:
- blog_posts (drafts & published)
- website_updates (hours, menu, alerts)
- seasonal_menu (menu items)
- operating_hours (schedule)

Logistics:
- checklist_templates (templates by type)
- checklist_template_items (template items)
- checklists (instances)
- checklist_items (individual items)
- checklist_signoffs (timestamps + user)

Operations:
- inventory_items (current stock)
- inventory_history (usage audit trail)

Audit:
- activity_log (all important actions)
```

### Real-time Subscriptions

```
Enabled on:
- event_drink_counts (live drink counts)
- checklists (team sees updates)
- inventory_items (low-stock alerts)

When Supabase updates these tables:
- Connected clients get instant notification
- UI updates reflect new data
- No polling required
```

---

## User Roles & Permissions

### Barista
- Access to Event Tracker
- Can use drink counter
- Can fill out checklists
- View inventory (read-only)

### Manager
- Access to all modules
- Can create/edit events
- Can manage inventory
- Can view analytics & history
- Can manage staff

### Admin
- Full access to all
- Can manage users & roles
- Can manage templates
- System configuration

---

## Offline Support

### LocalStorage Strategy

**What's stored locally:**
- `tiny-tulip-session` — Current session drink counts
- `tiny-tulip-event` — Current event info
- `tiny-tulip-history` — Past sessions (local backup)

**Sync strategy:**
1. Tap updates state + localStorage (instant)
2. Async sync to Supabase (2-5 second debounce)
3. If offline, keeps syncing until online
4. When online again, catches up

**Advantages:**
- Barista never blocked waiting for network
- Works at outdoor events with poor signal
- Automatic retry without manual intervention
- Team sees updates when connection restores

---

## Implementation Sequence

### Phase 1: Foundation (3-5 days)
- Project setup (Vite + React + TypeScript)
- Supabase configuration
- Database schema creation
- Auth setup (login)
- Layout components

### Phase 2: Event Tracker + Drink Counter (7-10 days)
- Event CRUD (create, read, update, delete)
- Event list & calendar views
- Drink counter component
- TapButton with animations
- Session state management
- localStorage persistence
- Supabase sync service
- Real-time subscriptions

### Phase 3: Dashboard (5-7 days)
- Overview page
- Widgets (upcoming events, inventory alerts, stats)
- Quick actions
- Live event status

### Phase 4: Content & Logistics (7-10 days)
- Blog generator with templates
- Website updater forms
- Checklist system
- Template management
- Digital sign-offs

### Phase 5: Inventory & Polish (7-10 days)
- Inventory tracker
- Low-stock alerts
- Usage history
- Mobile optimization
- Testing & bug fixes

---

## Key Features by Module

| Module | Barista | Manager | Admin |
|--------|---------|---------|-------|
| **Event Tracker** | Drink counter | Create/manage | All + settings |
| **Dashboard** | View stats | Full view | Full view |
| **Content** | View only | Create/edit | All + templates |
| **Logistics** | Check items | Manage | All + templates |
| **Inventory** | View | Edit | All + suppliers |

---

## Success Criteria

✅ Barista can tap drinks instantly (no lag)  
✅ Counts persist locally & sync to Supabase  
✅ Team sees live counts on dashboard  
✅ Works offline, syncs when online  
✅ All 5 modules functional  
✅ Mobile responsive  
✅ Events tracked with full analytics  
✅ Inventory management works  
✅ Checklists auto-generate by type  
✅ Blog & website CMS operational  

---

**Ready to build! 🌷**
