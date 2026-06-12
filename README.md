# Tiny Tulip Coffee Console

A comprehensive operations management system for Tiny Tulip Coffee with **integrated drink counter** for baristas at events. Perfect for pop-ups, farmers markets, and catering events.

## 🎯 All Features

### 1. **Event Tracker + Drink Counter** ⭐ PRIMARY
Mobile-first drink counting interface for baristas at events:
- **Large tap buttons** for each drink type (☕ 🧋 🥤 🍋 🍫)
- **Real-time progress** toward pre-order goals
- **Extra sales tracking** with revenue calculation
- **Order log** with timestamps
- **Offline support** (syncs automatically when online)
- **Celebration** when pre-orders fulfilled
- Also includes full event management (create, edit, contacts, deposits)

### 2. **Dashboard Overview**
- Welcome screen with quick stats
- Upcoming events (next 7 days)
- Live drink counts for active events
- Inventory alerts
- Monthly revenue summary
- Quick action buttons

### 3. **Content & Website CMS**
- **Blog Generator**: Templates for coffee content, SEO fields, tone selector
- **Website Quick Updater**: Operating hours, seasonal menu, alert banners
- Auto-save drafts and publish scheduling

### 4. **Logistics & Packing Checklists**
- Auto-generated checklists by event type
- Digital checkboxes with timestamps
- Download/print capability
- Offline support

### 5. **Operations & Supplies Log**
- Real-time inventory tracking
- Low-stock alerts (visual indicators)
- Usage history per event
- Supplier management

## 🏗️ Tech Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Backend/Database**: Supabase (PostgreSQL)
- **Build**: Vite
- **Components**: shadcn/ui + Lucide React icons
- **Routing**: React Router v6
- **Data Fetching**: React Query
- **Form Validation**: Zod

## 📋 Documentation

### Quick Start
- **[QUICK_START_DRINK_TRACKER.md](./QUICK_START_DRINK_TRACKER.md)** ← **START HERE! (15 min)**
  - Fast setup for just the drink counter
  - Perfect for trying out quickly
  - Supabase + React foundation

### Full System Integration (All 5 Modules)
- **[FULL_APP_INTEGRATION.md](./FULL_APP_INTEGRATION.md)** ← **Complete system design**
  - All 5 modules + drink counter
  - Module breakdown with examples
  - Data flow architecture
  - Detailed layouts & workflows
  - Implementation sequence
  - User roles & permissions

### Deep Dive Guides
- **[DRINK_TRACKER_GUIDE.md](./DRINK_TRACKER_GUIDE.md)** ← Drink counter details
  - Architecture & design decisions
  - Database schema for drink tracking
  - Sync strategy (offline-first)
  - Performance optimization
  
- **[ARCHITECTURE_OVERVIEW.md](./ARCHITECTURE_OVERVIEW.md)** ← System architecture
  - Component hierarchy
  - Data flow diagrams
  - Security implementation
  - Deployment strategy

### Implementation Guides
- **[IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)** ← Step-by-step roadmap
  - 5 phases (Foundation → Drink Counter → Dashboard → Content/Logistics → Operations)
  - Timeline & effort estimates
  - Technology decisions

### Reference
- **[SCHEMA.md](./SCHEMA.md)** ← Database reference
  - 15 table definitions
  - Relationships & constraints
  - Row-level security
  - Indexes for performance

- **[CLAUDE.md](./CLAUDE.md)** ← Project overview
  - Technology stack
  - Brand colors & fonts
  - Module architecture
  - Dependencies

## 🚀 Quick Start

```bash
# 1. Clone and navigate to repo
cd /home/user/tinytulipcoffeeconsole

# 2. Follow GETTING_STARTED.md for complete setup
# (Project initialization, Supabase setup, database, components)

# 3. Start development server
npm run dev

# 4. Open http://localhost:3000
```

## 📁 Project Structure

```
tinytulipcoffeeconsole/
├── README.md                           # This file
├── CLAUDE.md                           # Project overview & tech stack
├── ARCHITECTURE_OVERVIEW.md            # System design & diagrams
├── SCHEMA.md                           # Database schema reference
├── IMPLEMENTATION_PLAN.md              # Step-by-step build guide
├── GETTING_STARTED.md                  # Quick setup guide
├── supabase_migrations.sql             # Complete database schema
│
├── src/
│   ├── components/
│   │   ├── layout/                     # Layout components
│   │   ├── dashboard/                  # Dashboard widgets
│   │   ├── events/                     # Event tracking
│   │   ├── content/                    # CMS features
│   │   ├── logistics/                  # Checklists
│   │   ├── inventory/                  # Supply tracking
│   │   └── common/                     # Reusable UI
│   │
│   ├── pages/                          # Page components
│   ├── hooks/                          # Custom React hooks
│   ├── services/                       # API services
│   ├── types/                          # TypeScript types
│   ├── utils/                          # Utility functions
│   │
│   ├── App.tsx                         # Main app component
│   ├── main.tsx                        # Entry point
│   └── index.css                       # Global styles
│
├── supabase/
│   └── migrations/                     # Database migrations
│
├── public/                             # Static assets
├── package.json                        # Dependencies
├── tsconfig.json                       # TypeScript config
├── vite.config.ts                      # Vite config
├── tailwind.config.js                  # Tailwind theme
└── .env.example                        # Environment variables template
```

## 🎨 Design System

### Color Palette (Tiny Tulip Coffee Brand)
- **Warm Charcoal** (Primary): `#3d2013` — Main dark color
- **Deep Espresso**: `#1a1410` — Deep dark accent
- **Stone Taupe** (Light): `#b8a89b` — Warm neutral
- **Cream** (Background): `#fffbf4` — Warm off-white
- **Main Taupe**: `#8b7355` — Medium brown
- **Medium Brown**: `#6d412a` — Warm brown
- **Accent Coral** (Highlight): `#e45b3c` — Energy/Action color
- **Alert Red**: `#ef4444` — Warnings

### Responsive Breakpoints
- **Mobile**: < 640px (Bottom navigation)
- **Tablet**: 640px - 1024px (Collapsible sidebar)
- **Desktop**: > 1024px (Fixed sidebar)

## 🔐 Security

- **Authentication**: Supabase Auth (email/password)
- **Authorization**: Row-Level Security (RLS) policies on all tables
- **Data Encryption**: HTTPS for all API calls, hashed passwords
- **Input Validation**: Client-side (Zod) + Server-side (PostgreSQL constraints)
- **Audit Trail**: Activity log for all important actions

## 📊 Database

- **Platform**: PostgreSQL (Supabase)
- **Tables**: 15 (users, events, inventory, checklists, blog, etc.)
- **Indexes**: 30+ for performance
- **Triggers**: Real-time notifications, audit logging
- **RLS**: Enforced on all tables

Run migrations: See GETTING_STARTED.md → Step 5

## 🔄 Real-time Features

- Live event updates across devices
- Inventory alert subscriptions
- Checklist state synchronization
- Concurrent editing indicators
- Activity log streaming

## 📱 Mobile Responsive

✅ Desktop sidebar → Mobile bottom navigation  
✅ Touch-friendly buttons (44x44px minimum)  
✅ Responsive forms & modals  
✅ Optimized typography sizes  
✅ Tested on iOS & Android viewports  

## 🧪 Testing

Currently: Manual testing recommended

Future additions:
- Jest + React Testing Library
- Cypress for E2E testing
- Accessibility testing (axe)

## 📈 Performance

**Targets**:
- Initial load: < 3 seconds
- Time to interactive: < 5 seconds
- Database queries: < 100ms
- API responses: < 500ms

**Optimizations**:
- React Query caching
- Code splitting by route
- Lazy loading of components
- Tailwind CSS (no runtime overhead)
- Efficient database indexes
- Image optimization

## 🚢 Deployment

### Development
```bash
npm run dev    # Start local dev server on :3000
```

### Production
```bash
npm run build  # Build for production
npm run preview # Preview production build
```

**Deployment Target**: Vercel or Netlify (Free tier supported)

**Backend**: Supabase (Free tier: 500MB DB, unlimited API calls)

## 📝 Development Guidelines

### Commit Messages
```
<type>: <subject>

<optional body>

<optional footer>

Types: feat, fix, refactor, docs, chore, test
```

### Code Style
- TypeScript strict mode
- Tailwind CSS for styling (no CSS files)
- Functional components with hooks
- Custom hooks for reusable logic
- One component per file

### File Naming
- Components: `PascalCase` (e.g., `EventForm.tsx`)
- Hooks: `camelCase` (e.g., `useEvents.ts`)
- Services: `camelCase` (e.g., `eventService.ts`)
- Types: `PascalCase` (e.g., `Event.ts`)

## 🐛 Troubleshooting

### Common Issues

**Missing Supabase credentials**
- Verify `.env.local` file exists
- Check `VITE_` prefix on variable names
- Restart dev server after changes

**Cannot login**
- Verify user exists in Supabase Auth
- Check password is correct
- Clear browser cache/localStorage

**Tables not found**
- Verify SQL migrations ran successfully
- Check Supabase Table Editor shows all tables
- Check project status (should be "Active")

**Port 3000 in use**
- Change port in `vite.config.ts`
- Or: `lsof -ti:3000 | xargs kill -9`

## 📚 Learning Resources

- **React**: https://react.dev
- **Supabase**: https://supabase.com/docs
- **Tailwind CSS**: https://tailwindcss.com
- **TypeScript**: https://www.typescriptlang.org
- **Vite**: https://vitejs.dev

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Make changes and commit with clear messages
3. Push to branch: `git push origin feature/my-feature`
4. Create a pull request with description

## 📞 Support

For questions or issues:
1. Check troubleshooting section above
2. Review relevant documentation file
3. Check Supabase docs: https://supabase.com/docs
4. Check React docs: https://react.dev

## 📄 License

MIT (or your chosen license)

---

## 🎉 Ready to Start?

1. **First time?** → Read [GETTING_STARTED.md](./GETTING_STARTED.md)
2. **Want to understand the design?** → Read [ARCHITECTURE_OVERVIEW.md](./ARCHITECTURE_OVERVIEW.md)
3. **Building the app?** → Follow [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)
4. **Need database details?** → Check [SCHEMA.md](./SCHEMA.md)

**Happy building! ☕**
