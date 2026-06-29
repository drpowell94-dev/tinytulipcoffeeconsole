import { NavLink } from "react-router-dom";
import { Home, CalendarDays, Package, ListTodo } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/events", label: "Events", icon: CalendarDays },
  { to: "/checklists?tab=todos", label: "To-Dos", icon: ListTodo },
  { to: "/inventory", label: "Inventory", icon: Package },
];

export default function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border/50 flex items-center justify-around h-16 z-20">
      {NAV_ITEMS.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors",
              isActive
                ? "text-accent"
                : "text-muted-foreground hover:text-foreground"
            )
          }
        >
          <item.icon size={20} strokeWidth={1.5} />
          <span className="text-xs font-body font-semibold">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
