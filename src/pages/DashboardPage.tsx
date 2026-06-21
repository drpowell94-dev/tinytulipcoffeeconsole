import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Coffee, AlertTriangle, TrendingUp, Plus, FileText, Package, Zap, ExternalLink } from "lucide-react";
import { upcomingEvents } from "@/lib/eventStore";
import { lowStockItems } from "@/lib/inventoryStore";
import { loadHistory } from "@/lib/drinkStore";
import { generateInsights, type DashboardInsight } from "@/services/analyticsService";
import { formatCurrency, formatDate, daysUntil } from "@/lib/utils";
import ConversionFunnelWidget from "@/components/dashboard/ConversionFunnelWidget";

export default function DashboardPage() {
  const upcoming = upcomingEvents(7);
  const lowStock = lowStockItems();
  const history = loadHistory();
  const [insights, setInsights] = useState<DashboardInsight[]>([]);

  useEffect(() => {
    generateInsights()
      .then(data => setInsights(data || []))
      .catch(err => {
        console.error("Failed to generate insights:", err);
        setInsights([]);
      });
  }, []);

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
    <div className="space-y-12">
      <div className="pt-2">
        <h1 className="font-display text-4xl text-foreground leading-tight">Good morning</h1>
        <p className="text-sm text-muted-foreground font-body mt-1">{today}</p>
      </div>

      {/* Quick stats — whitespace-based layout */}
      <div className="space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          <StatCard icon={<CalendarDays size={20} />} label="Events This Week" value={String(upcoming.length)} />
          <StatCard icon={<Coffee size={20} />} label="Drinks This Month" value={String(monthDrinks)} />
          <StatCard icon={<TrendingUp size={20} />} label="Revenue This Month" value={formatCurrency(monthRevenue)} />
          <StatCard
            icon={<AlertTriangle size={20} />}
            label="Low Stock Items"
            value={String(lowStock.length)}
            alert={lowStock.length > 0}
          />
        </div>
      </div>

      {/* Upcoming events */}
      <section className="space-y-6">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-display text-2xl text-foreground">Upcoming Events</h2>
          <Link to="/events" className="text-xs font-body font-semibold text-accent hover:opacity-70 transition-opacity">
            View all →
          </Link>
        </div>
        {upcoming.length > 0 && (
          <div className="space-y-3">
            {upcoming.map(event => {
              const days = daysUntil(event.dateStart);
              return (
                <div
                  key={event.id}
                  className="flex items-center justify-between gap-4 px-4 py-4 rounded-lg bg-muted/15 hover:bg-muted/25 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-body font-semibold text-sm text-foreground truncate">{event.name}</p>
                    <p className="text-xs font-body text-muted-foreground mt-1">
                      {formatDate(event.dateStart)}
                      {event.location && ` • ${event.location}`}
                      {event.preOrders > 0 && ` • ${event.preOrders} pre-orders`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-xs font-body font-semibold ${days === 0 ? "text-accent" : "text-muted-foreground"}`}>
                      {days === 0 ? "Today" : `${days}d`}
                    </span>
                    <Link
                      to={`/events/${event.id}/counter`}
                      className="rounded-lg bg-accent text-accent-foreground px-4 py-2 text-xs font-body font-semibold hover-scale active:scale-95 transition-all"
                    >
                      Counter
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {upcoming.length === 0 && insights.length === 0 && (
          <p className="text-sm font-body text-muted-foreground py-8">
            Nothing in the next 7 days — time to book a pop-up!
          </p>
        )}
      </section>

      {/* Conversion Funnel Widget - moved higher for visibility */}
      <ConversionFunnelWidget userId="default-user" />

      {/* Smart Recommendations - always visible */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-lg text-foreground flex items-center gap-2">
            <Zap size={20} className="text-accent" />
            Smart Recommendations
          </h2>
        </div>
        {insights.length > 0 ? (
          <div className="space-y-3">
            {insights.map((insight, idx) => (
              <InsightCard key={idx} insight={insight} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-accent/20 bg-accent/5 p-4">
            <p className="text-sm font-body text-foreground">
              Add upcoming events and leads to see personalized recommendations.
            </p>
          </div>
        )}
      </section>

      {/* Inventory alerts */}
      {lowStock.length > 0 && (
        <section className="space-y-4 p-5 rounded-lg bg-destructive/5">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-lg text-destructive">Low Stock</h2>
            <Link to="/inventory" className="text-xs font-body font-semibold text-accent hover:opacity-70 transition-opacity">
              Restock →
            </Link>
          </div>
          <div className="space-y-2">
            {lowStock.map(item => (
              <p key={item.id} className="text-sm font-body text-foreground">
                <span className="font-semibold">{item.name}</span>{" "}
                <span className="text-muted-foreground">
                  {item.quantity} {item.unit} left · reorder at {item.reorderLevel}
                </span>
              </p>
            ))}
          </div>
        </section>
      )}

      {/* Quick actions */}
      <section className="space-y-6">
        <h2 className="font-display text-lg text-foreground">Quick Actions</h2>
        <div className="grid grid-cols-3 gap-4">
          <QuickAction to="/events" icon={<Plus size={18} />} label="New Event" />
          <QuickAction to="/content" icon={<FileText size={18} />} label="New Blog" />
          <QuickAction to="/inventory" icon={<Package size={18} />} label="Inventory" />
        </div>
      </section>
    </div>
  );
}

function StatCard({ icon, label, value, alert }: { icon: React.ReactNode; label: string; value: string; alert?: boolean }) {
  return (
    <div className={`rounded-lg p-5 transition-colors space-y-2 ${alert ? "bg-destructive/8" : "bg-muted/20"}`}>
      <div className={alert ? "text-destructive" : "text-foreground/60"}>
        {icon}
      </div>
      <p className="font-display text-3xl text-foreground">{value}</p>
      <p className="text-xs font-body text-muted-foreground">{label}</p>
    </div>
  );
}

function InsightCard({ insight }: { insight: DashboardInsight }) {
  const priorityStyles = {
    low: "border-l-4 border-muted bg-muted/10",
    medium: "border-l-4 border-accent bg-accent/8",
    high: "border-l-4 border-accent bg-accent/12",
  };

  return (
    <div className={`rounded-lg p-5 flex items-start gap-4 ${priorityStyles[insight.priority]}`}>
      <Zap className="shrink-0 mt-1 text-accent" size={18} strokeWidth={1.75} />
      <div className="flex-1 min-w-0">
        <p className="font-body text-sm text-foreground font-semibold">
          {insight.actionableNextStep}
        </p>
        {insight.relatedEventId && (
          <Link
            to={`/events/${insight.relatedEventId}`}
            className="inline-flex items-center gap-1 mt-2 text-xs font-body font-semibold text-accent hover:opacity-70 transition-opacity"
          >
            Draft pitch <ExternalLink size={12} />
          </Link>
        )}
      </div>
    </div>
  );
}

function QuickAction({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center gap-2 rounded-lg bg-muted/20 p-5 hover:bg-muted/35 transition-colors font-body font-semibold text-xs text-center text-foreground hover-scale"
    >
      <div className="text-accent">{icon}</div>
      {label}
    </Link>
  );
}
