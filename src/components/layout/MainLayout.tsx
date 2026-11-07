import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Home, CalendarDays, FileText, ClipboardCheck, Package, Menu, X, Mail, Building2, LogOut } from "lucide-react";
import { TulipLogo } from "@/components/drinks/DrinkIcon";
import BottomNav from "@/components/layout/BottomNav";
import { cn } from "@/lib/utils";
import { signOut } from "@/hooks/useAuth";
import { isSupabaseEnabled } from "@/services/supabase";
import { isDemoMode } from "@/demo/demoMode";

// Ordered by actual usage: daily operational flow first (dashboard check-in,
// event tracking + drink counter, packing lists, inventory checks), then
// reference data (venues), then periodic marketing tasks (content, email).
const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: Home },
  { to: "/events", label: "Events", icon: CalendarDays },
  { to: "/checklists", label: "Lists", icon: ClipboardCheck },
  { to: "/inventory", label: "Inventory", icon: Package },
  { to: "/properties", label: "Venues", icon: Building2 },
  { to: "/content", label: "Content", icon: FileText },
  { to: "/email-campaigns", label: "Email", icon: Mail },
];

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // The drink counter is a full-screen barista experience — hide chrome.
  const isCounter = /^\/events\/[^/]+\/counter/.test(location.pathname);

  if (isCounter) {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  const handleNavClick = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col bg-background min-h-screen sticky top-0">
        <div className="px-6 py-8">
          <div className="flex items-center gap-3">
            <TulipLogo size={36} />
            <div>
              <h1 className="font-display text-xl leading-tight text-foreground">Tiny Tulip</h1>
              <p className="text-xs text-muted-foreground font-body mt-0.5">Coffee Console</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg font-body font-semibold text-sm transition-all duration-200",
                  isActive
                    ? "bg-primary text-primary-foreground hover-scale"
                    : "text-foreground hover:bg-muted/30 hover-scale"
                )
              }
            >
              <item.icon size={18} strokeWidth={1.5} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-4 py-6 space-y-3">
          {isSupabaseEnabled && (
            <button
              onClick={() => signOut()}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-body font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
            >
              <LogOut size={14} strokeWidth={1.5} />
              {isDemoMode ? "Exit demo" : "Log out"}
            </button>
          )}
          <p className="text-xs text-muted-foreground font-body leading-relaxed">
            Purely a pop-up. Where the people are.
          </p>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {isDemoMode && (
          <div className="flex items-center justify-between gap-3 bg-accent text-accent-foreground px-4 py-2 text-xs sm:text-sm font-body">
            <span>
              <strong className="font-semibold">Demo mode</strong>
              <span className="hidden sm:inline"> · sample data only. Changes reset when you exit.</span>
            </span>
            <button
              onClick={() => signOut()}
              className="shrink-0 rounded-md bg-accent-foreground/15 px-3 py-1 font-semibold hover:bg-accent-foreground/25 transition-colors"
            >
              Exit demo
            </button>
          </div>
        )}
        {/* Mobile header */}
        <header
          className="md:hidden flex items-center gap-3 px-4 py-4 bg-card/50 backdrop-blur-sm sticky top-0 z-30"
          style={{ paddingTop: "calc(1rem + env(safe-area-inset-top))" }}
        >
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={sidebarOpen}
            className="p-2 rounded-lg hover:bg-muted/30 transition-colors shrink-0"
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <TulipLogo size={24} className="shrink-0" />
            <h1 className="font-display text-sm truncate">Tiny Tulip Coffee Console</h1>
          </div>
        </header>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/20 md:hidden z-10"
              onClick={() => setSidebarOpen(false)}
            />
            <aside className="md:hidden fixed top-0 left-0 h-screen w-64 bg-background flex flex-col z-20 pt-20">
              <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
                {NAV_ITEMS.map(item => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={handleNavClick}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 px-4 py-3 rounded-lg font-body font-semibold text-sm transition-all duration-200",
                        isActive
                          ? "bg-primary text-primary-foreground hover-scale"
                          : "text-foreground hover:bg-muted/30 hover-scale"
                      )
                    }
                  >
                    <item.icon size={18} strokeWidth={1.5} />
                    {item.label}
                  </NavLink>
                ))}
              </nav>
              <div className="px-4 py-6 space-y-3">
                {isSupabaseEnabled && (
                  <button
                    onClick={() => signOut()}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-body font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
                  >
                    <LogOut size={14} strokeWidth={1.5} />
                    {isDemoMode ? "Exit demo" : "Log out"}
                  </button>
                )}
                <p className="text-xs text-muted-foreground font-body leading-relaxed">
                  Purely a pop-up. Where the people are.
                </p>
              </div>
            </aside>
          </>
        )}

        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-6xl w-full mx-auto pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-8">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
