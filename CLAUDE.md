# Tiny Tulip Coffee Console - Complete System Design

## Project Overview
Comprehensive web application for managing operations, marketing, and events at Tiny Tulip Coffee. Mobile-responsive dashboard with integrated modules for content management, event tracking, logistics, and inventory.

## Technology Stack
- **Frontend**: React 18+ with TypeScript
- **Styling**: Tailwind CSS + custom theme
- **UI Components**: shadcn/ui + Lucide React icons
- **Build Tool**: Vite
- **Backend/Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Real-time**: Supabase Realtime subscriptions
- **Deployment**: Vercel or Netlify

## Color Palette (Brand Theme)
- Primary: Warm cream (`#F5F1E8`)
- Accent: Tulip pink (`#D4736F`)
- Secondary: Terracotta (`#E8A89B`)
- Dark: Coffee brown (`#3E2723`)
- Light: Soft white (`#FAFAF8`)
- Alert Red: `#EF4444`

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

## Module Architecture

### 1. Dashboard Overview
- Welcome message with date
- Upcoming events (next 7 days)
- Inventory alerts (low stock)
- Quick action buttons
- Real-time status indicators

### 2. Event Tracker
- Calendar view + List view toggle
- Event form with all required fields
- Event status pipeline (Inquiry → Confirmed → Completed)
- Client contact management
- Revenue tracking & deposit status
- Event type templates (Catering, Pop-up, Farmers Market)

### 3. Content & Website CMS
- **Blog Generator**:
  - Pre-built templates (Coffee Origin, Seasonal Launch, Community Update)
  - Rich text editor
  - SEO fields (title, keywords, meta description)
  - Tone selector (friendly, professional, casual)
  - Auto-save drafts
  
- **Website Updater**:
  - Operating hours form
  - Seasonal menu management
  - Alert banner management
  - Real-time preview

### 4. Logistics & Packing Checklists
- Auto-generate checklists based on event type
- Dynamic item lists (e.g., Catering Setup vs Farmers Market)
- Digital checkboxes with:
  - Timestamp capture
  - User attribution
  - Offline-capable state
- Checklist templates management

### 5. Operations & Supplies Log
- Real-time inventory tracker
- Low-stock alerts (visual: turn red below threshold)
- Add/edit/delete items
- Usage history per event
- Reorder level management

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
