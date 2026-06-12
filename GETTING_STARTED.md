# Getting Started - Tiny Tulip Coffee Console

## Quick Setup (15 minutes)

### Prerequisites
- Node.js 18+ and npm/yarn
- Supabase account (free at supabase.com)
- Git installed
- Code editor (VS Code recommended)

---

## Step 1: Create Supabase Project (5 min)

1. Go to https://supabase.com and sign up/login
2. Click "New Project"
3. Fill in details:
   - **Name**: `tiny-tulip-coffee`
   - **Database Password**: Save this! (you won't see it again)
   - **Region**: Choose closest to you
4. Wait for project to initialize (2-3 minutes)
5. Go to **Settings** → **API** and copy:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public` key → `VITE_SUPABASE_ANON_KEY`

---

## Step 2: Initialize Project

```bash
# Navigate to your project directory (already initialized as git repo)
cd /home/user/tinytulipcoffeeconsole

# Create package.json
npm init -y

# Install core dependencies
npm install react@18.2.0 react-dom@18.2.0 typescript@5.3.0
npm install -D vite @vitejs/plugin-react tailwindcss postcss autoprefixer

# Install UI & data libraries
npm install @supabase/supabase-js react-router-dom zod lucide-react
npm install -D @tanstack/react-query

# Initialize TypeScript config
npx tsc --init

# Initialize Tailwind
npx tailwindcss init -p
```

---

## Step 3: Project Structure Setup

```bash
# Create folder structure
mkdir -p src/{components,pages,hooks,services,types,utils}
mkdir -p src/components/{layout,dashboard,events,content,logistics,inventory,common}
mkdir -p public
mkdir -p supabase/migrations
```

---

## Step 4: Create Configuration Files

### `.env.local`
```env
VITE_SUPABASE_URL=https://[your-project-id].supabase.co
VITE_SUPABASE_ANON_KEY=[your-anon-key]
```

### `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noEmit": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "noEmitOnError": true
  },
  "include": ["src"],
  "exclude": ["node_modules"]
}
```

### `vite.config.ts`
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
  },
})
```

### `tailwind.config.js`
```javascript
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        tulip: {
          50: '#FAF5F2',
          100: '#F5EBE5',
          200: '#E8A89B',
          500: '#D4736F',
          700: '#B8483D',
          900: '#8B2E26',
        },
        coffee: {
          50: '#FAF9F7',
          100: '#F5F1E8',
          400: '#A1887F',
          700: '#6D5C56',
          900: '#3E2723',
        },
        warm: {
          cream: '#F5F1E8',
          terracotta: '#E8A89B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
```

### `postcss.config.js`
```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

### `package.json` (update scripts section)
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "type-check": "tsc --noEmit"
  }
}
```

---

## Step 5: Initialize Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy entire contents of `supabase_migrations.sql`
4. Paste into SQL editor
5. Click **Run**
6. Wait for all tables to be created

**Verify:**
- Go to **Table Editor** and confirm all 15 tables appear
- Check that sample data was seeded (operating hours, inventory, menu items)

---

## Step 6: Create Core Files

### `src/main.tsx`
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

### `src/index.css`
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html, body, #root {
  height: 100%;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Inter', system-ui, sans-serif;
  background-color: #F5F1E8;
  color: #3E2723;
}
```

### `index.html`
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Tiny Tulip Coffee Console</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

---

## Step 7: Create Supabase Service

### `src/services/supabase.ts`
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials in .env.local')
}

export const supabase = createClient(supabaseUrl, supabaseKey)
```

---

## Step 8: Create Basic App Structure

### `src/App.tsx`
```typescript
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './services/supabase'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import MainLayout from './components/layout/MainLayout'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription?.unsubscribe()
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }

  if (!session) {
    return <LoginPage />
  }

  return (
    <Router>
      <MainLayout>
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </MainLayout>
    </Router>
  )
}
```

### `src/pages/LoginPage.tsx`
```typescript
import { useState } from 'react'
import { supabase } from '../services/supabase'
import { AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-warm-cream flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-coffee-900 mb-2">Tiny Tulip</h1>
        <p className="text-gray-600 mb-6">Coffee Console</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-tulip-500"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-tulip-500"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-tulip-500 hover:bg-tulip-600 text-white font-semibold py-2 rounded-lg disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {error && (
          <div className="mt-4 flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  )
}
```

### `src/components/layout/MainLayout.tsx`
```typescript
import { useState } from 'react'
import Sidebar from './Sidebar'
import MobileNav from './MobileNav'
import Header from './Header'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0">
        <MobileNav />
      </div>
    </div>
  )
}
```

### `src/components/layout/Sidebar.tsx`
```typescript
import { useNavigate } from 'react-router-dom'
import { Home, Calendar, FileText, CheckSquare, Package, LogOut } from 'lucide-react'
import { supabase } from '../../services/supabase'

const navItems = [
  { icon: Home, label: 'Dashboard', href: '/dashboard' },
  { icon: Calendar, label: 'Events', href: '/events' },
  { icon: FileText, label: 'Content', href: '/content' },
  { icon: CheckSquare, label: 'Logistics', href: '/logistics' },
  { icon: Package, label: 'Inventory', href: '/inventory' },
]

export default function Sidebar() {
  const navigate = useNavigate()

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-tulip-600">Tiny Tulip</h2>
        <p className="text-sm text-gray-500">Coffee Console</p>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <button
            key={item.href}
            onClick={() => navigate(item.href)}
            className="w-full flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-tulip-50 text-gray-700 transition"
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <button
        onClick={handleLogout}
        className="m-4 flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition"
      >
        <LogOut size={20} />
        <span>Sign Out</span>
      </button>
    </div>
  )
}
```

### `src/components/layout/MobileNav.tsx`
```typescript
import { useNavigate } from 'react-router-dom'
import { Home, Calendar, FileText, CheckSquare, Package } from 'lucide-react'

const navItems = [
  { icon: Home, label: 'Dashboard', href: '/dashboard' },
  { icon: Calendar, label: 'Events', href: '/events' },
  { icon: FileText, label: 'Content', href: '/content' },
  { icon: CheckSquare, label: 'Logistics', href: '/logistics' },
  { icon: Package, label: 'Inventory', href: '/inventory' },
]

export default function MobileNav() {
  const navigate = useNavigate()

  return (
    <div className="bg-white border-t border-gray-200 flex justify-around py-2">
      {navItems.map((item) => (
        <button
          key={item.href}
          onClick={() => navigate(item.href)}
          className="flex flex-col items-center gap-1 p-2 text-gray-600 hover:text-tulip-600 transition"
        >
          <item.icon size={24} />
          <span className="text-xs">{item.label}</span>
        </button>
      ))}
    </div>
  )
}
```

### `src/components/layout/Header.tsx`
```typescript
import { Menu, Bell, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../../services/supabase'

export default function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })
  }, [])

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <button
        onClick={onMenuClick}
        className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
      >
        <Menu size={24} />
      </button>

      <div className="flex items-center gap-4">
        <button className="p-2 hover:bg-gray-100 rounded-lg relative">
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-tulip-200 rounded-full flex items-center justify-center">
            <User size={20} className="text-tulip-600" />
          </div>
          <span className="text-sm text-gray-700">{user?.email?.split('@')[0]}</span>
        </div>
      </div>
    </header>
  )
}
```

### `src/pages/DashboardPage.tsx`
```typescript
import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import { Calendar, AlertCircle, TrendingUp } from 'lucide-react'

export default function DashboardPage() {
  const [events, setEvents] = useState<any[]>([])
  const [inventory, setInventory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch upcoming events
        const { data: eventsData } = await supabase
          .from('events')
          .select('*')
          .gte('date_start', new Date().toISOString())
          .order('date_start')
          .limit(5)

        // Fetch low stock items
        const { data: inventoryData } = await supabase
          .from('inventory_items')
          .select('*')
          .lt('current_quantity', 'reorder_level')

        setEvents(eventsData || [])
        setInventory(inventoryData || [])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) return <div>Loading...</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-coffee-900">Dashboard</h1>
        <p className="text-gray-600">Welcome back! Here's what's happening today.</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center gap-4">
            <Calendar className="text-tulip-600" size={32} />
            <div>
              <p className="text-gray-600 text-sm">Upcoming Events</p>
              <p className="text-2xl font-bold">{events.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center gap-4">
            <AlertCircle className="text-red-500" size={32} />
            <div>
              <p className="text-gray-600 text-sm">Low Stock Items</p>
              <p className="text-2xl font-bold">{inventory.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center gap-4">
            <TrendingUp className="text-green-600" size={32} />
            <div>
              <p className="text-gray-600 text-sm">This Month</p>
              <p className="text-2xl font-bold">${events.reduce((sum, e) => sum + (e.estimated_revenue || 0), 0).toFixed(0)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Events */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h2 className="text-xl font-bold mb-4">Upcoming Events</h2>
        {events.length > 0 ? (
          <div className="space-y-3">
            {events.map((event) => (
              <div key={event.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <p className="font-semibold">{event.name}</p>
                  <p className="text-sm text-gray-600">{new Date(event.date_start).toLocaleDateString()}</p>
                </div>
                <span className="px-3 py-1 bg-tulip-100 text-tulip-700 rounded-full text-sm">
                  {event.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600">No upcoming events</p>
        )}
      </div>
    </div>
  )
}
```

---

## Step 9: Test the Application

```bash
# Start dev server
npm run dev

# Should open http://localhost:3000 in browser
```

**First Test:**
1. You should see the login page
2. Try to create a test user in Supabase (Auth → Users → Add User)
3. Login with those credentials
4. You should see the dashboard with sample data

---

## Step 10: Initialize Git & Commit

```bash
git add .
git commit -m "Initial project setup with Supabase, React, and Tailwind CSS

- Configure Vite + React + TypeScript
- Setup Tailwind CSS with custom color theme
- Initialize Supabase client and database schema
- Create layout components (Sidebar, MobileNav, Header)
- Implement authentication (login page)
- Create basic dashboard with widgets

https://claude.ai/code/session_018qBZArNmikCwF55AcDBhmH"

git push -u origin claude/wizardly-hypatia-hy56qv
```

---

## What's Next?

1. ✅ You now have a working foundation!
2. → Follow the phases in `IMPLEMENTATION_PLAN.md`
3. → Implement Event Tracker (next critical module)
4. → Add remaining modules (CMS, Logistics, Inventory)

---

## Troubleshooting

### "Missing Supabase credentials"
- Check `.env.local` has correct `VITE_` prefix
- Restart dev server after adding env vars

### "Table does not exist"
- Verify migration SQL was run successfully in Supabase
- Check Tables section shows all 15 tables

### "Can't login"
- Verify user exists in Supabase Auth → Users
- Check email/password are correct
- Clear browser cache/cookies and retry

### Port 3000 already in use
- Change in `vite.config.ts`: `port: 3001`
- Or: `lsof -ti:3000 | xargs kill -9`

---

**You're ready to build! 🎉**
