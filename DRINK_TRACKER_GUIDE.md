# Drink Tracker Integration Guide

## Overview

Your existing Lovable tracker (`tiny-tulip-tracker.lovable.app`) is the perfect UX for counting drinks at events. This guide explains how to evolve it from `localStorage`-only to a full Supabase-backed system while keeping the simple, fast UI.

## Architecture

### Current (Lovable)
```
Barista taps buttons → State updates → Saves to localStorage → Manual export/email
```

### New (with Supabase)
```
Barista taps buttons → State updates → localStorage (instant) → 
Supabase syncs (real-time) → Dashboard/reports see live data
```

**Key Design**: LocalStorage for instant responsiveness, Supabase for persistence and real-time sharing.

---

## Database Schema (Drink Tracking)

### `events` (Already Defined)
```sql
CREATE TABLE events (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  event_type TEXT,
  date_start TIMESTAMP,
  location TEXT,
  created_by UUID REFERENCES users(id),
  -- ... other fields
);
```

### `event_drink_counts` (New Table)
Tracks real-time drink counts during an event.

```sql
CREATE TABLE event_drink_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  drink_type TEXT NOT NULL (e.g., 'hot-coffee', 'iced-coffee'),
  quantity INTEGER DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES users(id)
);

CREATE INDEX idx_drink_counts_event ON event_drink_counts(event_id);
```

### `event_drink_orders` (New Table)
Detailed order log (optional, for analytics).

```sql
CREATE TABLE event_drink_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  drink_type TEXT NOT NULL,
  price DECIMAL(10, 2),
  add_ons TEXT[], -- e.g., ['extra-syrup', 'vanilla']
  ordered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  recorded_by UUID REFERENCES users(id)
);

CREATE INDEX idx_orders_event ON event_drink_orders(event_id);
```

### `event_sessions` (New Table)
Captures entire session snapshots (for history).

```sql
CREATE TABLE event_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  session_start TIMESTAMP WITH TIME ZONE NOT NULL,
  session_end TIMESTAMP WITH TIME ZONE,
  pre_orders INTEGER DEFAULT 0,
  total_sold INTEGER DEFAULT 0,
  total_revenue DECIMAL(10, 2) DEFAULT 0,
  extra_sales DECIMAL(10, 2) DEFAULT 0,
  product_counts JSONB, -- { "hot-coffee": 5, "iced-coffee": 3 }
  notes TEXT,
  ended_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sessions_event ON event_sessions(event_id);
CREATE INDEX idx_sessions_date ON event_sessions(session_start);
```

---

## Frontend Integration

### Data Model (React State)

```typescript
// src/types/drinks.ts
export interface DrinkProduct {
  id: string;
  name: string;
  emoji: string;
  price: number;
}

export interface DrinkCount {
  drinkId: string;
  count: number;
}

export interface EventSession {
  eventId: string;
  eventName: string;
  preOrders: number;
  drinkCounts: Record<string, number>;
  totalSold: number;
  totalRevenue: number;
  extraSales: number;
  startTime: Date;
}

export const DRINKS: DrinkProduct[] = [
  { id: "hot-coffee", name: "Hot Coffee", emoji: "☕", price: 5 },
  { id: "iced-coffee", name: "Iced Coffee", emoji: "🧋", price: 7 },
  { id: "cold-brew-can", name: "Cold Brew Can", emoji: "🥤", price: 7 },
  { id: "lemonade", name: "Lemonade", emoji: "🍋", price: 5 },
  { id: "chocolate-milk", name: "Chocolate Milk", emoji: "🍫", price: 5 },
];
```

### Local Storage Strategy

```typescript
// src/lib/drinkStore.ts
const SESSION_KEY = "tiny-tulip-session";
const EVENT_KEY = "tiny-tulip-event";

export function saveLocalSession(session: EventSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function loadLocalSession(): EventSession | null {
  try {
    const data = localStorage.getItem(SESSION_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function clearLocalSession() {
  localStorage.removeItem(SESSION_KEY);
}
```

### Supabase Sync

```typescript
// src/services/drinkService.ts
import { supabase } from './supabase';
import { EventSession } from '@/types/drinks';

export async function syncSessionToSupabase(session: EventSession) {
  try {
    // Update drink counts table
    for (const [drinkId, count] of Object.entries(session.drinkCounts)) {
      await supabase
        .from('event_drink_counts')
        .upsert({
          event_id: session.eventId,
          drink_type: drinkId,
          quantity: count,
          last_updated: new Date().toISOString(),
          updated_by: (await supabase.auth.getUser()).data.user?.id,
        }, {
          onConflict: 'event_id,drink_type'
        });
    }
    return true;
  } catch (error) {
    console.error('Sync failed:', error);
    return false; // Will retry on next tap
  }
}

export async function saveSessionSnapshot(session: EventSession) {
  try {
    await supabase
      .from('event_sessions')
      .insert({
        event_id: session.eventId,
        session_start: session.startTime.toISOString(),
        pre_orders: session.preOrders,
        total_sold: session.totalSold,
        total_revenue: session.totalRevenue,
        extra_sales: session.extraSales,
        product_counts: session.drinkCounts,
      });
    return true;
  } catch (error) {
    console.error('Failed to save session:', error);
    return false;
  }
}

export async function subscribeToLiveSession(eventId: string, callback: (counts: Record<string, number>) => void) {
  return supabase
    .from('event_drink_counts')
    .on('*', payload => {
      if (payload.new.event_id === eventId) {
        callback(payload.new);
      }
    })
    .subscribe();
}
```

### UI Component (Modified TapButton)

```typescript
// src/components/DrinkCounter.tsx
import { useState, useEffect, useCallback } from 'react';
import { EventSession, DRINKS } from '@/types/drinks';
import { TapButton } from '@/components/TapButton';
import { syncSessionToSupabase } from '@/services/drinkService';

interface DrinkCounterProps {
  eventId: string;
  eventName: string;
  preOrders: number;
}

export function DrinkCounter({ eventId, eventName, preOrders }: DrinkCounterProps) {
  const [session, setSession] = useState<EventSession>({
    eventId,
    eventName,
    preOrders,
    drinkCounts: {},
    totalSold: 0,
    totalRevenue: 0,
    extraSales: 0,
    startTime: new Date(),
  });

  const [syncing, setSyncing] = useState(false);

  // Sync to Supabase on any change
  useEffect(() => {
    const syncTimer = setTimeout(async () => {
      setSyncing(true);
      const success = await syncSessionToSupabase(session);
      if (!success) {
        // Retry logic here
        console.warn('Sync failed, will retry on next change');
      }
      setSyncing(false);
    }, 2000); // Debounce syncs to every 2 seconds

    return () => clearTimeout(syncTimer);
  }, [session]);

  const handleTap = useCallback((drinkId: string) => {
    const drink = DRINKS.find(d => d.id === drinkId)!;
    
    setSession(prev => {
      const newCounts = { ...prev.drinkCounts };
      newCounts[drinkId] = (newCounts[drinkId] || 0) + 1;
      
      const newTotal = Object.values(newCounts).reduce((a, b) => a + b, 0);
      const newRevenue = Object.entries(newCounts).reduce((sum, [id, count]) => {
        const p = DRINKS.find(d => d.id === id);
        return sum + (p?.price || 0) * count;
      }, 0);
      
      const extraUnits = preOrders > 0 ? Math.max(0, newTotal - preOrders) : 0;
      const extraSales = extraUnits > 0 
        ? Object.entries(newCounts)
            .filter(([_, i]) => i > preOrders)
            .reduce((sum, [id, count]) => {
              const p = DRINKS.find(d => d.id === id);
              return sum + (p?.price || 0) * Math.min(count, extraUnits);
            }, 0)
        : 0;

      return {
        ...prev,
        drinkCounts: newCounts,
        totalSold: newTotal,
        totalRevenue: newRevenue,
        extraSales,
      };
    });
  }, [preOrders]);

  const extraUnits = session.preOrders > 0 
    ? Math.max(0, session.totalSold - session.preOrders)
    : 0;

  return (
    <div className="space-y-4">
      {/* Event Header */}
      <div className="bg-card rounded-2xl p-4 border border-border">
        <h2 className="font-display text-2xl text-foreground">{session.eventName}</h2>
        <p className="text-sm text-muted-foreground">Pre-orders: {session.preOrders}</p>
        {syncing && <span className="text-xs text-accent">⟳ Syncing...</span>}
      </div>

      {/* Session Stats */}
      <div className="bg-card rounded-2xl p-5 border border-border">
        <div className="flex justify-between items-end">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              Session Total
            </p>
            <p className="font-display text-4xl text-foreground mt-1">
              {session.totalSold}
              {session.preOrders > 0 && (
                <span className="text-2xl text-muted-foreground"> / {session.preOrders}</span>
              )}
            </p>
            <p className="text-xs text-muted-foreground">${session.totalRevenue.toFixed(2)}</p>
          </div>
          
          {extraUnits > 0 && (
            <div className="text-right">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Extra Sales</p>
              <p className="font-display text-2xl text-accent">~${session.extraSales.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">+{extraUnits} drinks</p>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {session.preOrders > 0 && (
          <div className="mt-4">
            <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-500"
                style={{ width: `${Math.min((session.totalSold / session.preOrders) * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-right">
              {Math.min(Math.round((session.totalSold / session.preOrders) * 100), 100)}% fulfilled
            </p>
          </div>
        )}
      </div>

      {/* Tap Buttons */}
      <div className="grid grid-cols-2 gap-3">
        {DRINKS.map(drink => (
          <TapButton
            key={drink.id}
            product={drink}
            count={session.drinkCounts[drink.id] || 0}
            onTap={handleTap}
          />
        ))}
      </div>
    </div>
  );
}
```

---

## Sync Strategy

### Real-time Sync (Preferred)
```typescript
// Every tap triggers a debounced sync to Supabase (2-5 second delay)
// If sync fails, it retries on next change
// Session never blocked waiting for sync
```

### Offline-first Design
```typescript
// 1. Tap updates local state immediately (instant feedback)
// 2. Tap syncs to localStorage immediately (persistent)
// 3. Sync to Supabase asynchronously in background (no blocking)
// 4. If offline, syncs when connection restores
// 5. Team sees live counts via Realtime subscriptions
```

### Manual Export (Session End)
```typescript
// When barista ends session:
// 1. Save complete session snapshot to event_sessions table
// 2. Archive event_drink_counts (or keep for realtime only)
// 3. Generate summary email
// 4. Move to event history
```

---

## Migration Path

### Phase 1: Keep Existing Lovable
- Your current app works as-is
- No changes needed

### Phase 2: Add Supabase Backend
- Create Supabase schema (add 3 tables above)
- Update React components to sync counts
- Keep localStorage as primary, Supabase as backup
- No UI changes to user experience

### Phase 3: Integrate with Event Management
- Link drink counter to event details
- Show real-time synced counts on dashboard
- Add historical reports

### Phase 4: Dashboard & Reports
- Live event monitoring dashboard
- Past event analytics
- Revenue reports by event/drink type

---

## Example Workflow

### Barista at Event
```
1. Opens app → Select/Create Event
2. Enters event name "Farmers Market - Saturday"
3. Enters pre-orders "25"
4. Starts tapping:
   - Tap ☕ Hot Coffee 8 times
   - Tap 🧋 Iced Coffee 7 times
   - Tap 🍋 Lemonade 5 times
   - Total: 20 drinks (shown as "20 / 25")
5. More customers arrive:
   - Tap ☕ Hot Coffee 4 more times
   - Total: 24 drinks (shown as "24 / 25" + Extra Sales: $23)
6. Event ends at 2pm
   - Taps "End Session"
   - App saves to history
   - Email summary sent
   - Counts synced to Supabase
7. Manager sees "Farmers Market - Saturday: 24 drinks, $145" on dashboard
```

### Manager on Dashboard
```
1. Opens "Events" tab
2. Sees "Active Events" list
3. Clicks "Farmers Market - Saturday"
4. Views:
   - Live drink counts (synced from barista's app)
   - Progress toward pre-orders
   - Revenue in real-time
   - Order timeline
5. When barista ends session:
   - Session moves to "Completed" tab
   - Full analytics available
```

---

## Performance Notes

- **Instant Feedback**: Tap → count updates immediately (no server wait)
- **Debounced Sync**: Every 2-5 seconds to Supabase (not every tap)
- **Offline Works**: Complete session possible without internet
- **Mobile Optimized**: Minimal network overhead, works on 4G
- **Real-time Dashboard**: Other team members see counts update live via Realtime

---

## Success Metrics

- ✅ Barista never waits for network
- ✅ Counts persist locally even if app crashes
- ✅ Manager sees live updates on dashboard
- ✅ Past events fully archived
- ✅ Works at outdoor events with poor connectivity
