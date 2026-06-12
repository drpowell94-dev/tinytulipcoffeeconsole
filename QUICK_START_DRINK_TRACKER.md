# Quick Start: Drink Tracker Setup

Get the barista drink counter running in **15 minutes** with Supabase backend and real-time sync.

## What You're Building

A **mobile-first drink counter** that baristas use at events to count prepaid drinks and track extra sales.

**Before**: Lovable tracker using localStorage only  
**After**: Lovable tracker + Supabase backend + team dashboard

---

## Step 1: Supabase Project (2 minutes)

1. Go to [supabase.com](https://supabase.com)
2. Create new project:
   - **Name**: `tiny-tulip-coffee`
   - **Password**: Save this
   - **Region**: Closest to you
3. Go to **Settings → API**
4. Copy and save:
   - `VITE_SUPABASE_URL` (Project URL)
   - `VITE_SUPABASE_ANON_KEY` (anon public key)

---

## Step 2: Project Setup (3 minutes)

```bash
cd /home/user/tinytulipcoffeeconsole

# Install dependencies
npm install

# Create environment file
echo 'VITE_SUPABASE_URL=https://your-project-id.supabase.co' > .env.local
echo 'VITE_SUPABASE_ANON_KEY=your-anon-key' >> .env.local
```

---

## Step 3: Database Schema (5 minutes)

1. In Supabase, go to **SQL Editor → New Query**
2. Copy this SQL:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Events Table (for tracking events)
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  event_type TEXT CHECK (event_type IN ('popup', 'farmers_market', 'catering', 'other')),
  date_start TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Real-time Drink Counts (live during event)
CREATE TABLE IF NOT EXISTS event_drink_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  drink_type TEXT NOT NULL,
  quantity INTEGER DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by TEXT,
  UNIQUE(event_id, drink_type)
);

-- Order Log (detailed records)
CREATE TABLE IF NOT EXISTS event_drink_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  drink_type TEXT NOT NULL,
  price DECIMAL(10, 2),
  add_ons TEXT[],
  ordered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  recorded_by TEXT
);

-- Session Archive (completed sessions)
CREATE TABLE IF NOT EXISTS event_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  session_start TIMESTAMP WITH TIME ZONE NOT NULL,
  session_end TIMESTAMP WITH TIME ZONE,
  pre_orders INTEGER DEFAULT 0,
  total_sold INTEGER DEFAULT 0,
  total_revenue DECIMAL(10, 2) DEFAULT 0,
  extra_sales DECIMAL(10, 2) DEFAULT 0,
  product_counts JSONB,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_events_date ON events(date_start DESC);
CREATE INDEX idx_drink_counts_event ON event_drink_counts(event_id);
CREATE INDEX idx_orders_event ON event_drink_orders(event_id);
CREATE INDEX idx_sessions_event ON event_sessions(event_id);

-- Enable Realtime for drink counts
ALTER PUBLICATION supabase_realtime ADD TABLE event_drink_counts;
```

3. Click **Run** and wait for success

---

## Step 4: Core Files (5 minutes)

### Create folder structure:
```bash
mkdir -p src/{components,pages,hooks,services,types,lib,utils}
```

### Create `src/lib/utils.ts`:
```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### Create `src/services/supabase.ts`:
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials in .env.local')
}

export const supabase = createClient(supabaseUrl, supabaseKey)
```

### Create `src/vite-env.d.ts`:
```typescript
/// <reference types="vite/client" />
```

---

## Step 5: Main App Components

### Create `src/App.tsx`:
```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import DrinkCounter from './pages/DrinkCounter'

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster />
      <DrinkCounter />
    </QueryClientProvider>
  )
}
```

### Create `src/main.tsx`:
```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

---

## Step 6: Run It!

```bash
npm run dev
```

Open **http://localhost:3000** and you should see:
- Input for event name
- Input for pre-order count
- Big drink tap buttons
- Real-time sync status

---

## What Works Now

✅ Barista enters event name  
✅ Barista enters pre-order count  
✅ Tap buttons to count drinks  
✅ Local storage saves automatically  
✅ Progress bar toward pre-orders  
✅ Extra sales tracking  
✅ Counts sync to Supabase in real-time

---

## Next Steps

### To Add Team Dashboard:
1. Create dashboard page showing active events
2. Subscribe to drink counts Realtime
3. Display live counts from all events
4. Show revenue tracking

### To Add Event History:
1. "End Session" button saves to `event_sessions` table
2. Show past events with full analytics
3. Generate revenue reports

### To Add Inventory Integration:
1. Link drink counting to inventory tracking
2. Auto-decrement supply counts
3. Alert when low stock

---

## Testing

```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Check database
# In Supabase console:
# 1. Go to Table Editor
# 2. Select event_drink_counts
# 3. Tap drinks in your app
# 4. Watch counts update in real-time
```

---

## Production Notes

- **Offline**: App works without internet (counts stored locally)
- **Sync**: When online, syncs to Supabase every 2-5 seconds
- **Speed**: No delay on tap (instant feedback)
- **Mobile**: Responsive for all screen sizes

---

## Troubleshooting

**"Missing Supabase credentials"**
- Check `.env.local` has `VITE_` prefix
- Restart dev server

**"Table doesn't exist"**
- Verify SQL migration ran successfully
- Check Supabase Table Editor shows tables

**Counts not syncing**
- Check browser console for errors
- Verify internet connection
- Check Supabase API keys are correct

---

**Ready to tap! 🌷**

For full integration guide, see `DRINK_TRACKER_GUIDE.md`
