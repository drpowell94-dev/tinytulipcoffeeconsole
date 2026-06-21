import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Home, CalendarDays, FileText, ClipboardCheck, Package, Menu, X, Mail } from "lucide-react";
import { TulipLogo } from "@/components/drinks/DrinkIcon";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: Home },
  { to: "/events", label: "Events", icon: CalendarDays },
  { to: "/content", label: "Content", icon: FileText },
  { to: "/checklists", label: "Checklists", icon: ClipboardCheck },
  { to: "/email-campaigns", label: "Email", icon: Mail },
  { to: "/inventory", label: "Inventory", icon: Package },
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
        <div className="px-4 py-6 text-xs text-muted-foreground font-body leading-relaxed">
          Purely a pop-up. Where the people are.
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between px-4 py-4 bg-card/50 backdrop-blur-sm sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <TulipLogo size={28} />
            <h1 className="font-display text-lg">Tiny Tulip</h1>
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={sidebarOpen}
            className="p-2 rounded-lg hover:bg-muted/30 transition-colors"
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
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
              <div className="px-4 py-6 text-xs text-muted-foreground font-body leading-relaxed">
                Purely a pop-up. Where the people are.
              </div>
            </aside>
          </>
        )}

        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-6xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
