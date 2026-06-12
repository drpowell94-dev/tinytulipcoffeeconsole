# Implementation Plan - Tiny Tulip Coffee Console

## Overview
Build a comprehensive 5-module operations system for Tiny Tulip Coffee with **drink counter as primary feature**. The drink counter is integrated into the Event Tracker, with supporting modules for content, logistics, and inventory.

## Quick Start Timeline
**Total Duration**: 4-5 weeks  
**Phases**: Foundation → Event Tracker (w/ Drink Counter) → Dashboard → Content & Logistics → Operations & Polish

**Build Priority**:
1. **Phase 1**: Foundation & Auth (essential infrastructure)
2. **Phase 2**: Event Tracker + Drink Counter (primary feature)
3. **Phase 3**: Dashboard (team visibility)
4. **Phase 4**: Content, Logistics, Checklists
5. **Phase 5**: Inventory & Polish

---

## Phase 1: Foundation & Setup (Days 1-5)

### Step 1.1: Project Initialization
- [ ] Initialize React + Vite project
- [ ] Install dependencies (React Router, Supabase, Tailwind, etc.)
- [ ] Configure TypeScript
- [ ] Set up environment variables

**Command**:
```bash
npm create vite@latest tinytulipcoffeeconsole -- --template react-ts
cd tinytulipcoffeeconsole
npm install
npm install -D tailwindcss postcss autoprefixer
npm install @supabase/supabase-js react-router-dom @tanstack/react-query zod lucide-react
npx tailwindcss init -p
```

**Deliverable**: Working Vite project with all dependencies installed

---

### Step 1.2: Supabase Project Setup
- [ ] Create Supabase project (supabase.com)
- [ ] Get API keys (ANON KEY, SERVICE ROLE KEY)
- [ ] Create `.env.local` file with keys
- [ ] Initialize Supabase client in `src/services/supabase.ts`

**Environment Variables**:
```env
VITE_SUPABASE_URL=https://[project-id].supabase.co
VITE_SUPABASE_ANON_KEY=[anon-key]
VITE_SUPABASE_SERVICE_ROLE_KEY=[service-role-key]
```

**Deliverable**: Configured Supabase client ready for database connections

---

### Step 1.3: Database Schema Migration
- [ ] Create migration file: `supabase/migrations/001_initial_schema.sql`
- [ ] Copy full schema from `SCHEMA.md`
- [ ] Run migration in Supabase
- [ ] Verify tables created
- [ ] Enable RLS policies
- [ ] Create seed data (admin user, templates, sample inventory)

**Deliverable**: Complete PostgreSQL database with all tables, indexes, and RLS policies

---

### Step 1.4: Tailwind CSS Theme Configuration
- [ ] Configure Tailwind colors in `tailwind.config.js`
- [ ] Set up custom color palette (cream, pink, brown, etc.)
- [ ] Create CSS variables in `src/index.css`
- [ ] Test theme colors in a test component

**tailwind.config.js**:
```js
export default {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        tulip: {
          50: '#FAF5F2',
          100: '#F5EBE5',
          200: '#E8A89B',
          500: '#D4736F',
          700: '#B8483D',
        },
        coffee: {
          50: '#FAF9F7',
          100: '#F5F1E8',
          900: '#3E2723',
        },
        warm: {
          cream: '#F5F1E8',
          terracotta: '#E8A89B',
        },
      },
    },
  },
  plugins: [],
};
```

**Deliverable**: Tailwind configured with Tiny Tulip brand colors

---

### Step 1.5: Core Layout Components
Create foundational layout components for responsive design.

**Files to Create**:
- `src/components/layout/MainLayout.tsx` - Main container with nav
- `src/components/layout/Sidebar.tsx` - Desktop sidebar (fixed left)
- `src/components/layout/MobileNav.tsx` - Mobile bottom nav
- `src/components/layout/Header.tsx` - Top header with user menu
- `src/pages/LoginPage.tsx` - Authentication entry point

**Sidebar Navigation Items**:
```tsx
const navItems = [
  { icon: Home, label: 'Dashboard', href: '/dashboard' },
  { icon: Calendar, label: 'Events', href: '/events' },
  { icon: FileText, label: 'Content', href: '/content' },
  { icon: CheckSquare, label: 'Logistics', href: '/logistics' },
  { icon: Package, label: 'Inventory', href: '/inventory' },
];
```

**Deliverable**: Responsive layout components with mobile/desktop navigation

---

### Step 1.6: Authentication Setup
- [ ] Configure Supabase Auth
- [ ] Create login form (email/password)
- [ ] Implement protected routes
- [ ] Create `useAuth` hook

**Key Features**:
- Email/password sign-up and login
- Session persistence
- Logout functionality
- Redirect to login if not authenticated

**Deliverable**: Working authentication with protected routes

---

## Phase 2: Core Features - Event Tracker (Days 6-12)

### Step 2.1: Event Data Types & Services
- [ ] Create `src/types/event.ts` with TypeScript types
- [ ] Create `src/services/eventService.ts` with Supabase queries
- [ ] Create `useEvents` custom hook

**Event Type Definition**:
```typescript
export interface Event {
  id: string;
  name: string;
  event_type: 'catering' | 'popup' | 'farmers_market' | 'other';
  date_start: string;
  date_end?: string;
  location: string;
  guest_count?: number;
  estimated_revenue?: number;
  status: 'inquiry' | 'confirmed' | 'completed' | 'cancelled';
  deposit_status: 'pending' | 'paid';
  deposit_amount?: number;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface EventContact {
  id: string;
  event_id: string;
  contact_name: string;
  contact_email?: string;
  contact_phone?: string;
  company_name?: string;
  is_primary: boolean;
  // ... other fields
}
```

**Service Functions**:
```typescript
- createEvent(data: Event)
- updateEvent(id: string, data: Partial<Event>)
- deleteEvent(id: string)
- getEvent(id: string)
- listEvents(filters?: { status, eventType, dateRange })
- getEventContacts(eventId: string)
- addEventContact(eventId: string, contact: EventContact)
```

**Deliverable**: Type definitions and service layer for event management

---

### Step 2.2: Event Tracker Page Layout
- [ ] Create `src/pages/EventTrackerPage.tsx`
- [ ] Create view toggle (Calendar/List)
- [ ] Create `EventList.tsx` component
- [ ] Create `EventCard.tsx` component for list view
- [ ] Add quick-action button ("New Event")

**Features**:
- Tab/toggle between Calendar and List views
- Filter controls (status, event type, date range)
- Search by event name or client name
- Responsive layout (full calendar on desktop, simplified on mobile)

**Deliverable**: Functional Event Tracker page with list view

---

### Step 2.3: Event Calendar Component
- [ ] Install calendar library: `npm install react-big-calendar date-fns`
- [ ] Create `src/components/events/EventCalendar.tsx`
- [ ] Implement month/week/day views
- [ ] Add event click handlers
- [ ] Style with Tailwind

**Features**:
- Click on date to create event
- Click on event to view/edit details
- Color-code events by status
- Show guest count and revenue in calendar

**Deliverable**: Interactive calendar view for events

---

### Step 2.4: Event Form Component
- [ ] Create `src/components/events/EventForm.tsx`
- [ ] Implement form fields (name, type, date, location, contact info, etc.)
- [ ] Add client contact management (add/remove contacts)
- [ ] Implement form validation with Zod
- [ ] Add submit handler (create/update event)

**Form Fields**:
```
Event Name (required)
Event Type (dropdown: Catering/Pop-up/Farmers Market)
Date & Time Start (datetime picker)
Date & Time End (optional datetime picker)
Location (required)
Guest Count (number)
Event Notes (textarea)

--- Contact Section ---
Primary Contact Name (required)
Contact Email
Contact Phone
Company Name
Additional Contacts (add/remove)

--- Financial Section ---
Estimated Revenue (number)
Deposit Status (Paid/Pending)
Deposit Amount (conditional on status)

--- Status Section ---
Event Status (Inquiry/Confirmed/Completed/Cancelled)
```

**Deliverable**: Complete event creation/editing form

---

### Step 2.5: Event Details View
- [ ] Create `src/components/events/EventDetails.tsx` modal/page
- [ ] Display all event information
- [ ] Show associated contacts
- [ ] Show linked checklist
- [ ] Add edit/delete buttons
- [ ] Add status transition buttons

**Deliverable**: Full event details view with actions

---

## Phase 3: Content, Logistics, and Inventory (Days 13-19)

### Step 3.1: Blog Generator Component
- [ ] Create `src/components/content/BlogGenerator.tsx`
- [ ] Create `BlogTemplateSelector.tsx` for template selection
- [ ] Create rich text editor component (use `react-quill` or `slate`)
- [ ] Implement template system

**Blog Templates**:
1. **Coffee Origin Spotlight**
   - Pre-filled structure for origin story, tasting notes, brewing tips
   
2. **Seasonal Drink Launch**
   - Ingredients, flavor profile, availability, promotion angles
   
3. **Community Update**
   - Event recap, staff highlights, community involvement

**Features**:
- Template selection dropdown
- Title field (with slug generation)
- Keywords input (comma-separated, converted to array)
- Meta description field
- Tone selector (Friendly/Professional/Casual)
- Rich text editor for body content
- Auto-save drafts every 30 seconds
- Publish vs. Schedule publish
- Preview mode

**Deliverable**: Functional blog generator with templates and drafts

---

### Step 3.2: Website Quick Updater
- [ ] Create `src/components/content/WebsiteUpdater.tsx`
- [ ] Create forms for operating hours, menu, alerts
- [ ] Implement toggle for "is_active"
- [ ] Add date range selectors

**Update Types**:
1. **Operating Hours** - Day of week, open/close times, special notes
2. **Seasonal Menu** - Item name, description, price, category, season
3. **Alert Banner** - Title, content, priority level, display duration

**Deliverable**: Quick update forms for website content

---

### Step 3.3: Checklist Templates Management
- [ ] Create checklist template CRUD in admin panel
- [ ] Allow creation of templates for each event type
- [ ] Implement drag-to-reorder template items
- [ ] Add category grouping (equipment, supplies, documents)

**Deliverable**: Editable checklist templates

---

### Step 3.4: Packing Checklist System
- [ ] Create `src/components/logistics/ChecklistManager.tsx`
- [ ] Implement auto-generation based on event type
- [ ] Create `ChecklistItem.tsx` component with checkbox
- [ ] Implement digital sign-off capture (timestamp + user)
- [ ] Add notes capability per item

**Features**:
- Auto-load checklist template when event type selected
- Dynamic addition/removal of items
- Group items by category
- Checkbox with state persistence
- Sign-off modal with timestamp capture
- Download/print checklist
- Completion percentage indicator

**Deliverable**: Complete packing checklist system with sign-offs

---

### Step 3.5: Inventory Tracker
- [ ] Create `src/components/inventory/InventoryTracker.tsx`
- [ ] Create `InventoryItem.tsx` component
- [ ] Implement add/edit/delete item forms
- [ ] Add visual low-stock alerts (red indicator)
- [ ] Create inventory history/usage log

**Features**:
- Display all items in table/grid
- Current quantity vs. reorder level
- Red alert if current < reorder level
- Quick "Add Stock" button
- Item history by event
- Reorder reminder system
- Unit of measure flexibility

**Deliverable**: Full inventory management system with alerts

---

## Phase 4: Dashboard, Polish & Optimization (Days 20-28)

### Step 4.1: Dashboard Overview
- [ ] Create `src/pages/DashboardPage.tsx`
- [ ] Create `EventUpcomingWidget.tsx` - next 7 days
- [ ] Create `InventoryWidget.tsx` - low stock alerts
- [ ] Add quick action buttons
- [ ] Add welcome greeting with date

**Widgets**:
1. **Welcome Card** - Greeting, current date/time, weather
2. **Upcoming Events** - Next 7 days, sorted by date
3. **Inventory Alerts** - Items below reorder level
4. **Quick Stats** - Total events this month, revenue, pending deposits
5. **Quick Actions** - New event, new blog post, check inventory

**Deliverable**: Functional dashboard with widgets

---

### Step 4.2: Responsive Design Optimization
- [ ] Test on mobile devices (real + emulator)
- [ ] Optimize sidebar collapse behavior
- [ ] Implement mobile bottom navigation
- [ ] Adjust typography sizes
- [ ] Ensure touch-friendly buttons (min 44x44px)
- [ ] Test form inputs on mobile keyboards

**Breakpoints**:
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

**Deliverable**: Fully responsive mobile-first design

---

### Step 4.3: Real-time Features
- [ ] Implement Supabase Realtime subscriptions
- [ ] Subscribe to event changes
- [ ] Subscribe to inventory changes
- [ ] Subscribe to checklist updates
- [ ] Show "live" indicators for concurrent editing

**Deliverable**: Real-time data synchronization

---

### Step 4.4: Performance Optimization
- [ ] Implement React Query caching
- [ ] Optimize images
- [ ] Code splitting by page
- [ ] Lazy load modals/heavy components
- [ ] Remove unused CSS

**Deliverable**: Optimized performance metrics

---

### Step 4.5: Testing & Bug Fixes
- [ ] Test all CRUD operations
- [ ] Verify form validations
- [ ] Test mobile responsiveness
- [ ] Test authentication flows
- [ ] Test RLS policies

**Deliverable**: Stable, tested application

---

### Step 4.6: Deployment
- [ ] Prepare for production (build optimization)
- [ ] Deploy to Vercel or Netlify
- [ ] Configure custom domain
- [ ] Set up monitoring/error tracking
- [ ] Create deployment documentation

**Deliverable**: Live application at custom domain

---

## Step-by-Step Code Implementation Order

### Critical Path (do these first):
1. Supabase setup & database schema
2. Authentication & protected routes
3. Layout components (Sidebar, MobileNav)
4. Event Tracker (most complex, core feature)
5. Inventory Tracker (quick wins)
6. Dashboard (pulls together everything)

### Then add (in any order):
7. Blog Generator
8. Website Updater
9. Packing Checklists
10. Polish & optimizations

---

## Key Files to Create (in order)

```
Phase 1:
  ✓ CLAUDE.md, SCHEMA.md, IMPLEMENTATION_PLAN.md
  → package.json, vite.config.ts, tsconfig.json
  → tailwind.config.js, src/index.css
  → .env.local (with your keys)
  → supabase/migrations/001_initial_schema.sql
  → src/services/supabase.ts
  → src/types/user.ts
  → src/pages/LoginPage.tsx
  → src/components/layout/MainLayout.tsx
  → src/components/layout/Sidebar.tsx
  → src/components/layout/MobileNav.tsx
  → src/hooks/useAuth.ts
  → src/App.tsx

Phase 2:
  → src/types/event.ts
  → src/services/eventService.ts
  → src/hooks/useEvents.ts
  → src/pages/EventTrackerPage.tsx
  → src/components/events/EventForm.tsx
  → src/components/events/EventList.tsx
  → src/components/events/EventCalendar.tsx
  → src/components/events/EventDetails.tsx

Phase 3:
  → src/types/content.ts, src/services/contentService.ts
  → src/components/content/BlogGenerator.tsx
  → src/components/content/WebsiteUpdater.tsx
  → src/types/checklist.ts, src/services/checklistService.ts
  → src/components/logistics/ChecklistManager.tsx
  → src/types/inventory.ts, src/services/inventoryService.ts
  → src/components/inventory/InventoryTracker.tsx

Phase 4:
  → src/pages/DashboardPage.tsx
  → src/components/dashboard/* (widgets)
  → Optimizations & deployment
```

---

## Technology Decisions & Rationale

| Component | Choice | Why |
|-----------|--------|-----|
| Frontend Framework | React 18 | Mature, large ecosystem, component reusability |
| Build Tool | Vite | Fast HMR, optimized builds, minimal config |
| Styling | Tailwind CSS | Utility-first, rapid prototyping, theme consistency |
| Database | Supabase PostgreSQL | Real-time, RLS, easy auth, generous free tier |
| Form Validation | Zod | Type-safe, runtime validation, great error messages |
| Routing | React Router v6 | Industry standard, nested routes, lazy loading |
| Data Fetching | React Query | Caching, synchronization, error handling |
| UI Components | shadcn/ui | Headless, customizable, Tailwind-based |
| Icons | Lucide React | Clean, consistent, full TypeScript support |
| Rich Text | TBD | Options: Quill, Slate, TipTap (recommend TipTap for extensibility) |
| Calendar | react-big-calendar | Feature-rich, flexible, good mobile support |
| Date Utils | date-fns | Immutable, modular, great docs |

---

## Estimated Effort per Phase

| Phase | Duration | Effort |
|-------|----------|--------|
| Phase 1 (Foundation) | 5 days | 40 hours |
| Phase 2 (Event Tracker) | 7 days | 56 hours |
| Phase 3 (Content & Logistics) | 7 days | 56 hours |
| Phase 4 (Dashboard & Polish) | 9 days | 72 hours |
| **TOTAL** | **28 days** | **224 hours** |

*Can be accelerated by 50% with experienced developer or extended for more features.*

---

## Success Criteria

- [x] All 5 modules functional (Dashboard, Events, Content, Logistics, Inventory)
- [x] Mobile responsive on screens < 640px
- [x] Real-time data sync working
- [x] All forms validated
- [x] Authentication working
- [x] RLS policies enforced
- [x] Performance: < 3s initial load
- [x] All CRUD operations tested
- [x] Deployed to production

---

**Status**: Implementation plan finalized.  
**Next Step**: Begin Phase 1 - Project Initialization  
**Last Updated**: 2026-06-12
