import { NavLink, useLocation } from "react-router-dom";
import { Home, CalendarDays, FileText, ClipboardCheck, Package } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: Home },
  { to: "/events", label: "Events", icon: CalendarDays },
  { to: "/content", label: "Content", icon: FileText },
  { to: "/logistics", label: "Logistics", icon: ClipboardCheck },
  { to: "/inventory", label: "Inventory", icon: Package },
];

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  // The drink counter is a full-screen barista experience — hide chrome.
  const isCounter = /^\/events\/[^/]+\/counter/.test(location.pathname);

  if (isCounter) {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-border bg-card min-h-screen sticky top-0">
        <div className="px-6 py-6 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🌷</span>
            <div>
              <h1 className="font-display text-xl leading-tight">Tiny Tulip</h1>
              <p className="text-xs text-muted-foreground font-body">Coffee Console</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-xl font-body font-semibold text-sm transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-muted/40"
                )
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 text-xs text-muted-foreground font-body border-t border-border">
          Purely a pop-up. Where the people are.
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="md:hidden flex items-center gap-2 px-4 py-3 border-b border-border bg-card sticky top-0 z-20">
          <span className="text-xl">🌷</span>
          <h1 className="font-display text-lg">Tiny Tulip</h1>
        </header>

        <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 max-w-5xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-card border-t border-border flex justify-around py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-[10px] font-body font-semibold transition-colors",
                isActive ? "text-accent" : "text-muted-foreground"
              )
            }
          >
            <item.icon size={20} />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
