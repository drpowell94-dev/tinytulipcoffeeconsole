# Tiny Tulip Coffee Console

A barista-focused event management system with real-time drink counting. Perfect for pop-ups, farmers markets, and catering events.

## 🎯 Primary Feature: Drink Counter ⭐

A mobile-first tap-counter that baristas use to count prepaid drinks and track extra sales **in real-time**. 

**Example Workflow**:
1. Barista opens app at event
2. Enters event name ("Farmers Market - Sat") and pre-order count (25)
3. **Taps buttons** for each drink sold: ☕ Hot Coffee, 🧋 Iced Coffee, etc.
4. Sees live progress: "23 / 25" drinks with progress bar
5. Extra sales automatically tracked: "+3 extra drinks = $21"
6. Counts sync to Supabase → team sees live updates on dashboard
7. Session ends → saved to history with full analytics

## 🎯 Secondary Features

- **Event Management**: Create/manage events with contacts, dates, locations
- **Team Dashboard**: Real-time view of all active events and drink counts
- **Event History**: Past events with full analytics and revenue reports
- **Content & Website CMS**: Blog generator and website updates
- **Logistics & Packing Checklists**: Event-type-specific checklists with digital sign-offs
- **Inventory Tracking**: Supply management with low-stock alerts

## 🏗️ Tech Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Backend/Database**: Supabase (PostgreSQL)
- **Build**: Vite
- **Components**: shadcn/ui + Lucide React icons
- **Routing**: React Router v6
- **Data Fetching**: React Query
- **Form Validation**: Zod

## 📋 Documentation

### For Drink Tracker Setup (PRIMARY)
- **[QUICK_START_DRINK_TRACKER.md](./QUICK_START_DRINK_TRACKER.md)** ← **START HERE!**
  - 15-minute setup for barista counter
  - Supabase configuration
  - Database schema for drink tracking
  - Real-time sync setup
  - Works offline with localStorage
  
- **[DRINK_TRACKER_GUIDE.md](./DRINK_TRACKER_GUIDE.md)** ← Deep dive
  - Complete drink counter architecture
  - Database schema for orders, counts, sessions
  - Frontend integration (React hooks)
  - Supabase sync strategy
  - Offline-first design
  - Example workflow

### For System Architecture
- **[ARCHITECTURE_OVERVIEW.md](./ARCHITECTURE_OVERVIEW.md)** ← Full system design
  - Component hierarchy
  - Data flow diagrams
  - State management
  - Security & RLS policies
  - Performance optimization
  
### For Full Implementation
- **[IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)** ← Build roadmap
  - 3 phases: Foundation → Drink Counter → Supporting Features
  - Step-by-step implementation
  - Technology decisions
  - Effort estimates

### For Database Design
- **[SCHEMA.md](./SCHEMA.md)** ← Complete database reference
  - All table definitions
  - Relationships & indexes
  - RLS policies
  - Seed data

### For Project Overview
- **[CLAUDE.md](./CLAUDE.md)** ← Tech stack & structure
  - Technology choices
  - Brand colors
  - Project structure
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
