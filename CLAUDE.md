# Tiny Tulip Coffee Console - Complete System Design

## Git Workflow (IMPORTANT)
- **Always start from `main`** — `main` is the source of truth for code review and history
- **`claude/wizardly-hypatia-hy56qv` is Vercel's configured Production Branch** — it, not `main`, is what actually deploys to the live site. Every commit that should ship must be pushed to **both** `main` and `claude/wizardly-hypatia-hy56qv` (e.g. `git push origin main:claude/wizardly-hypatia-hy56qv` after pushing `main`)
- **Never work off a stale or unrelated branch** — if the current branch is not `main`, switch to it: `git checkout main && git pull origin main`
- Production URL: `https://tinytulipcoffeeconsole.vercel.app` (auto-deploys from `claude/wizardly-hypatia-hy56qv` — verify in Vercel project settings under Git > Production Branch before assuming this has changed)

## Project Overview
A barista-focused event management and drink tracking system for Tiny Tulip Coffee. The primary focus is a mobile-first drink counter integrated with event management. Secondary features include inventory tracking, packing checklists, and content management.

**Primary Use Case**: Baristas at pop-up events tap drink buttons to count prepaid orders and additional sales in real-time.

## Technology Stack
- **Frontend**: React 18+ with TypeScript
- **Styling**: Tailwind CSS + custom theme
- **UI Components**: shadcn/ui + Lucide React icons
- **Build Tool**: Vite
- **Backend/Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Real-time**: Supabase Realtime subscriptions
- **Offline Support**: localStorage fallback for drink counting
- **Deployment**: Vercel or Netlify

## Color Palette (Actual Brand Theme)
Sourced from tinytulipcoffee.com design system:

- **Warm Charcoal** (Primary Dark): `#3d2013`
- **Deep Espresso**: `#1a1410`
- **Stone Taupe** (Light Brown): `#b8a89b`
- **Cream** (Background): `#fffbf4`
- **Main Taupe**: `#8b7355`
- **Medium Brown**: `#6d412a`
- **Accent Coral** (Warm accent): `#e45b3c`
- **Alert Red**: `#ef4444`

## Project Structure
```
tinytulipcoffeeconsole/
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── MobileNav.tsx
│   │   │   └── MainLayout.tsx
│   │   ├── dashboard/
│   │   │   ├── DashboardOverview.tsx
│   │   │   ├── EventUpcomingWidget.tsx
│   │   │   └── InventoryWidget.tsx
│   │   ├── events/
│   │   │   ├── EventTracker.tsx
│   │   │   ├── EventCalendar.tsx
│   │   │   ├── EventForm.tsx
│   │   │   └── EventList.tsx
│   │   ├── content/
│   │   │   ├── BlogGenerator.tsx
│   │   │   ├── WebsiteUpdater.tsx
│   │   │   └── BlogTemplateSelector.tsx
│   │   ├── logistics/
│   │   │   ├── ChecklistManager.tsx
│   │   │   ├── ChecklistForm.tsx
│   │   │   └── PackingChecklistItem.tsx
│   │   ├── inventory/
│   │   │   ├── InventoryTracker.tsx
│   │   │   └── InventoryItem.tsx
│   │   └── common/
│   │       ├── Button.tsx
│   │       ├── Card.tsx
│   │       └── Modal.tsx
│   ├── hooks/
│   │   ├── useEvents.ts
│   │   ├── useInventory.ts
│   │   ├── useChecklists.ts
│   │   └── useAuth.ts
│   ├── services/
│   │   ├── supabase.ts
│   │   ├── eventService.ts
│   │   ├── inventoryService.ts
│   │   ├── checklistService.ts
│   │   └── contentService.ts
│   ├── types/
│   │   ├── event.ts
│   │   ├── inventory.ts
│   │   ├── checklist.ts
│   │   ├── user.ts
│   │   └── content.ts
│   ├── utils/
│   │   ├── dateHelpers.ts
│   │   ├── formatters.ts
│   │   └── validators.ts
│   ├── pages/
│   │   ├── DashboardPage.tsx
│   │   ├── EventTrackerPage.tsx
│   │   ├── ContentPage.tsx
│   │   ├── LogisticsPage.tsx
│   │   ├── InventoryPage.tsx
│   │   └── LoginPage.tsx
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── public/
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   └── seed.sql
├── .env.example
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── vite.config.ts
```

## Database Schema (PostgreSQL via Supabase)
See `SCHEMA.md` for detailed schema design.

### Key Tables:
1. **users** - Staff and admin accounts
2. **events** - Catering, pop-ups, farmers markets
3. **event_contacts** - Client contact information per event
4. **inventory_items** - Core supplies tracking
5. **checklists** - Template checklists by event type
6. **checklist_items** - Individual checklist items
7. **checklist_signoffs** - Digital sign-offs with timestamps
8. **blog_posts** - Generated blog content
9. **website_updates** - Quick updates to website data

## Module Architecture (5 Modules + Drink Counter)

### 1. Event Tracker + Drink Counter ⭐ PRIMARY FOCUS
The barista's main interface when at an event. Seamlessly integrated with event management.

**Drink Counter Features:**
- **Event Overview**: Name, date, pre-order count, location
- **Large Tap Buttons**: ☕ Hot Coffee, 🧋 Iced Coffee, 🥤 Cold Brew, 🍋 Lemonade, 🍫 Chocolate Milk
- **Session Progress**: Total drinks sold vs. pre-orders with visual progress bar
- **Extra Sales Tracking**: Automatic calculation of revenue beyond pre-orders
- **Order Log**: Timestamped detailed list of all drinks sold
- **Real-time Sync**: Automatic syncing to Supabase (2-5 second debounce)
- **Offline Mode**: Full functionality without internet (syncs when reconnected)
- **Celebration**: Confetti animation when pre-orders fulfilled
- **Mobile-first**: Optimized for portrait orientation on small screens

**Event Management (when not at event):**
- Calendar view + List view of events
- Create/edit/delete events
- Client contact information per event
- Revenue estimates and deposit tracking
- Event history with analytics

### 2. Dashboard Overview
- Welcome message with current date
- Upcoming events (next 7 days) with drink counter status
- Live drink counts for active events (if team member role)
- Inventory alerts (low stock items)
- Quick action buttons (New Event, New Blog Post, View Inventory)
- Revenue summary for the month
- Real-time status indicators

### 3. Content & Website CMS
- **Blog Generator**:
  - Pre-built templates (Coffee Origin Spotlight, Seasonal Drink Launch, Community Update)
  - Rich text editor
  - SEO fields (title, keywords, meta description)
  - Tone selector (friendly, professional, casual)
  - Auto-save drafts
  - Publish/Schedule controls
  
- **Website Quick Updater**:
  - Operating hours management
  - Seasonal menu item updates
  - Alert banner management
  - Real-time preview

### 4. Logistics & Packing Checklists
- Auto-generate checklists based on event type
- Pre-built templates:
  - Catering Setup (espresso machine, grinders, syrups, etc.)
  - Farmers Market Setup (tent, weights, display, POS)
  - Pop-up Event (minimal equipment, mobile setup)
- Digital checkboxes with timestamp capture and user attribution
- Offline-capable with state persistence
- Checklist templates management (admin)
- Download/print checklist

### 5. Operations & Supplies Log
- Real-time inventory tracker for core supplies
- Items: Coffee Beans, Oat Milk, Whole Milk, 12oz Cups, Lids, Napkins, Equipment, etc.
- Current quantity vs. reorder level
- Low-stock visual alerts (red indicators when below threshold)
- Add/edit/delete inventory items
- Usage history linked to events
- Reorder level management
- Supplier contact information

## Authentication & Security
- Supabase Auth (email/password)
- Row-level security (RLS) policies
- Role-based access control (Admin, Manager, Staff)
- Secure API endpoints with JWT

## Real-time Features
- Live event updates
- Inventory alerts
- Checklist state sync across devices
- Concurrent editing indicators

## Mobile Responsiveness Strategy
- Desktop: Fixed sidebar (250px) + main content
- Tablet (768px+): Sidebar collapsible
- Mobile (<768px): Bottom navigation bar, full-screen content areas
- Touch-optimized buttons and inputs
- Responsive grid layouts

## Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Project setup (Vite + React + TypeScript)
- [ ] Supabase project configuration
- [ ] Database schema creation
- [ ] Authentication setup
- [ ] Layout components (Sidebar, MobileNav, MainLayout)
- [ ] Basic routing

### Phase 2: Core Features (Week 2)
- [ ] Dashboard overview
- [ ] Event Tracker (CRUD operations, calendar integration)
- [ ] Event contact management
- [ ] Basic styling with theme

### Phase 3: Content & Logistics (Week 3)
- [ ] Blog generator with templates
- [ ] Website quick updater
- [ ] Packing checklist system
- [ ] Checklist templates

### Phase 4: Inventory & Polish (Week 4)
- [ ] Inventory tracking system
- [ ] Low-stock alerts
- [ ] Real-time subscriptions
- [ ] Mobile optimization
- [ ] Testing & bug fixes

## Dependencies
```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "typescript": "^5.3.0",
  "vite": "^5.0.0",
  "tailwindcss": "^3.3.0",
  "shadcn-ui": "latest",
  "lucide-react": "^0.263.0",
  "@supabase/supabase-js": "^2.38.0",
  "@tanstack/react-query": "^5.0.0",
  "react-router-dom": "^6.20.0",
  "zod": "^3.22.0"
}
```

## Next Steps
1. Initialize project with Vite
2. Set up Supabase project and run migrations
3. Create base layout components
4. Build event tracker module
5. Implement remaining modules
6. Mobile optimization
7. Deployment

---
**Status**: Architecture & design complete. Ready for implementation.
**Last Updated**: 2026-06-12
