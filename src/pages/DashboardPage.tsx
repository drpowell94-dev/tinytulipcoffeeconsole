import { Link } from "react-router-dom";
import { CalendarDays, Coffee, AlertTriangle, TrendingUp, Plus, FileText, Package } from "lucide-react";
import { upcomingEvents } from "@/lib/eventStore";
import { lowStockItems } from "@/lib/inventoryStore";
import { loadHistory } from "@/lib/drinkStore";
import { formatCurrency, formatDate, daysUntil } from "@/lib/utils";

export default function DashboardPage() {
  const upcoming = upcomingEvents(7);
  const lowStock = lowStockItems();
  const history = loadHistory();

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthRevenue = history
    .filter(s => new Date(s.date) >= monthStart)
    .reduce((sum, s) => sum + s.totalRevenue, 0);
  const monthDrinks = history
    .filter(s => new Date(s.date) >= monthStart)
    .reduce((sum, s) => sum + s.totalDrinks, 0);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Good morning! 🌷</h1>
        <p className="text-sm text-muted-foreground font-body">{today}</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<CalendarDays className="text-accent" size={22} />} label="Events This Week" value={String(upcoming.length)} />
        <StatCard icon={<Coffee className="text-accent" size={22} />} label="Drinks This Month" value={String(monthDrinks)} />
        <StatCard icon={<TrendingUp className="text-accent" size={22} />} label="Revenue This Month" value={formatCurrency(monthRevenue)} />
        <StatCard
          icon={<AlertTriangle className={lowStock.length > 0 ? "text-destructive" : "text-muted-foreground"} size={22} />}
          label="Low Stock Items"
          value={String(lowStock.length)}
          alert={lowStock.length > 0}
        />
      </div>

      {/* Upcoming events */}
      <section className="rounded-2xl bg-card border border-border p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg">📅 Upcoming Events</h2>
          <Link to="/events" className="text-xs font-body font-semibold text-accent hover:underline">
            View all →
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <p className="text-sm font-body text-muted-foreground py-4 text-center">
            Nothing in the next 7 days — time to book a pop-up!
          </p>
        ) : (
          <div className="space-y-2">
            {upcoming.map(event => {
              const days = daysUntil(event.dateStart);
              return (
                <div key={event.id} className="flex items-center justify-between gap-3 rounded-xl bg-muted/20 px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-body font-semibold text-sm text-foreground truncate">{event.name}</p>
                    <p className="text-xs font-body text-muted-foreground">
                      {formatDate(event.dateStart)} · {event.location}
                      {event.preOrders > 0 && ` · ${event.preOrders} pre-orders`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-body font-bold text-accent">
                      {days === 0 ? "Today!" : `${days}d`}
                    </span>
                    <Link
                      to={`/events/${event.id}/counter`}
                      className="rounded-lg bg-accent text-accent-foreground px-3 py-1.5 text-xs font-body font-bold hover:opacity-90"
                    >
                      Counter
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Inventory alerts */}
      {lowStock.length > 0 && (
        <section className="rounded-2xl bg-destructive/5 border border-destructive/30 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg text-destructive">🔴 Inventory Alerts</h2>
            <Link to="/inventory" className="text-xs font-body font-semibold text-accent hover:underline">
              Go to Inventory →
            </Link>
          </div>
          <div className="space-y-1.5">
            {lowStock.map(item => (
              <p key={item.id} className="text-sm font-body text-foreground">
                • <span className="font-semibold">{item.name}</span>: {item.quantity} {item.unit} left
                (reorder at {item.reorderLevel})
              </p>
            ))}
          </div>
        </section>
      )}

      {/* Quick actions */}
      <section>
        <h2 className="font-display text-lg mb-3">🚀 Quick Actions</h2>
        <div className="grid grid-cols-3 gap-3">
          <QuickAction to="/events" icon={<Plus size={20} />} label="New Event" />
          <QuickAction to="/content" icon={<FileText size={20} />} label="New Blog Post" />
          <QuickAction to="/inventory" icon={<Package size={20} />} label="Check Inventory" />
        </div>
      </section>
    </div>
  );
}

function StatCard({ icon, label, value, alert }: { icon: React.ReactNode; label: string; value: string; alert?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${alert ? "bg-destructive/5 border-destructive/30" : "bg-card border-border"}`}>
      {icon}
      <p className="font-display text-2xl mt-2">{value}</p>
      <p className="text-xs font-body text-muted-foreground">{label}</p>
    </div>
  );
}

function QuickAction({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center gap-2 rounded-2xl bg-card border border-border p-4 shadow-sm hover:border-accent hover:text-accent transition-colors font-body font-semibold text-xs text-center"
    >
      {icon}
      {label}
    </Link>
  );
}
