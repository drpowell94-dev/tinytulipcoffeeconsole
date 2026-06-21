import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ClipboardCopy, RotateCcw, CheckCircle2 } from "lucide-react";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { loadEvents, updateEvent } from "@/lib/eventStore";
import {
  DRINKS,
  loadSession,
  saveSession,
  clearSession,
  newOrder,
  countByProduct,
  totalRevenue,
  extraSales,
  archiveSession,
  generateSummary,
  type OrderItem,
} from "@/lib/drinkStore";
import { scheduleSync, archiveSessionRemote } from "@/services/drinkSync";
import { isSupabaseEnabled } from "@/services/supabase";
import { savePost } from "@/lib/contentStore";
import { generateEventRecap } from "@/lib/blogWriter";
import { TapButton } from "@/components/drinks/TapButton";
import { OrderLog } from "@/components/drinks/OrderLog";
import { formatCurrency } from "@/lib/utils";

const CONFETTI_COLORS = ["#e45b3c", "#b8a89b", "#8b7355", "#6d412a", "#fffbf4"];

export default function DrinkCounterPage() {
  const { eventId = "" } = useParams();
  const navigate = useNavigate();
  const event = useMemo(() => loadEvents().find(e => e.id === eventId), [eventId]);

  const [orders, setOrders] = useState<OrderItem[]>(() => loadSession(eventId));
  const [celebrated, setCelebrated] = useState(false);
  const [showLog, setShowLog] = useState(false);

  const preOrders = event?.preOrders ?? 0;
  const total = orders.length;
  const counts = countByProduct(orders);
  const revenue = totalRevenue(orders);
  const extra = extraSales(orders, preOrders);

  useEffect(() => {
    saveSession(eventId, orders);
    scheduleSync(eventId, orders);

    if (preOrders > 0 && total >= preOrders && !celebrated) {
      setCelebrated(true);
      toast.success("All pre-orders fulfilled — amazing work!", { duration: 5000 });
      const end = Date.now() + 1500;
      const fire = () => {
        confetti({
          particleCount: 80,
          spread: 100,
          origin: { x: Math.random(), y: Math.random() * 0.4 },
          colors: CONFETTI_COLORS,
        });
        if (Date.now() < end) requestAnimationFrame(fire);
      };
      fire();
    }
    if (preOrders > 0 && total < preOrders && celebrated) setCelebrated(false);
  }, [orders, eventId, preOrders, total, celebrated]);

  const handleTap = useCallback((productId: string) => {
    setOrders(prev => [...prev, newOrder(productId)]);
  }, []);

  const handleExport = () => {
    if (!event) return;
    const summary = generateSummary(event.name, preOrders, orders);
    navigator.clipboard.writeText(summary)
      .then(() => {
        toast.success("Summary copied to clipboard");
      })
      .catch(() => {
        toast.error("Failed to copy to clipboard");
      });
    const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const subject = encodeURIComponent(`${event.name}, ${today}`);
    const body = encodeURIComponent(summary);
    window.open(`mailto:tinytulipcoffee@gmail.com?subject=${subject}&body=${body}`, "_self");
  };

  const handleEndSession = () => {
    if (!event) return;
    const saved = archiveSession(event.id, event.name, preOrders, orders);
    if (saved) {
      archiveSessionRemote({
        eventId: saved.eventId,
        eventName: saved.eventName,
        preOrders: saved.preOrders,
        totalDrinks: saved.totalDrinks,
        totalRevenue: saved.totalRevenue,
        extraSales: saved.extraSales,
        productCounts: saved.productCounts,
      });
      updateEvent(event.id, { status: "completed" });
      const recap = generateEventRecap(saved);
      savePost({
        title: recap.title,
        template: "community-update",
        tone: "friendly",
        keywords: "",
        body: recap.body,
        status: "draft",
      });
      toast.success(
        `Session saved — ${saved.totalDrinks} drinks, ${formatCurrency(saved.totalRevenue)}. Recap draft is waiting in Content.`
      );
    }
    clearSession(event.id);
    setOrders([]);
    setCelebrated(false);
    navigate("/events");
  };

  const handleReset = () => {
    if (orders.length > 0 && event) {
      archiveSession(event.id, event.name, preOrders, orders);
      toast.success("Previous counts saved to history");
    }
    clearSession(eventId);
    setOrders([]);
    setCelebrated(false);
  };

  if (!event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <p className="font-body text-muted-foreground">Event not found.</p>
        <Link to="/events" className="text-accent font-body font-semibold underline">
          Back to events
        </Link>
      </div>
    );
  }

  // Drink counter only for Pop-Ups (30 included coffees)
  if (preOrders !== 30) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-4">
        <p className="font-body text-muted-foreground">Drink counter is only for Pop-Up events.</p>
        <p className="text-sm text-muted-foreground">This event is a Grab & Go service.</p>
        <Link to="/events" className="text-accent font-body font-semibold underline">
          Back to events
        </Link>
      </div>
    );
  }

  const pct = preOrders > 0 ? Math.min(Math.round((total / preOrders) * 100), 100) : 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Subtle top bar */}
      <div className="bg-gradient-to-b from-accent/5 to-transparent text-center text-xs font-body text-muted-foreground py-2 px-4 sm:px-6">
        Purely a pop-up. Where the people are.
      </div>

      {/* Header */}
      <header className="flex items-center justify-between px-4 sm:px-6 pt-6 pb-4 gap-3 border-b border-border/50">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Link
            to="/events"
            className="p-2 rounded-lg hover:bg-muted/30 text-foreground/60 shrink-0 transition-colors"
            aria-label="Back to events"
          >
            <ArrowLeft size={20} strokeWidth={1.5} />
          </Link>
          <div className="min-w-0">
            <h1 className="font-display text-lg sm:text-2xl text-foreground truncate leading-tight">{event.name}</h1>
            <p className="text-[11px] text-muted-foreground font-body mt-0.5">
              {event.location}
              {isSupabaseEnabled ? " • syncing" : " • local"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleReset}
            className="p-2 rounded-lg hover:bg-muted/30 text-foreground/60 transition-colors"
            title="Reset counts"
            aria-label="Reset counts"
          >
            <RotateCcw size={18} strokeWidth={1.5} />
          </button>
          <button
            onClick={handleExport}
            className="p-2 rounded-lg bg-accent/10 hover:bg-accent/20 text-accent transition-colors"
            title="Export session"
            aria-label="Export session"
          >
            <ClipboardCopy size={18} strokeWidth={1.5} />
          </button>
        </div>
      </header>

      {/* Main content - responsive grid */}
      <div className="flex-1 grid lg:grid-cols-[1fr_280px] gap-4 p-4 sm:p-6 min-h-0">
        {/* Left: Tap buttons + session stats */}
        <div className="flex flex-col gap-4 min-h-0 overflow-y-auto">
          {/* Session stats */}
          <div className="rounded-lg bg-muted/15 p-5">
            <div className="space-y-5">
              <div className="flex items-baseline justify-between gap-3">
                <div>
                  <p className="text-xs font-body font-semibold text-muted-foreground uppercase tracking-widest mb-1">
                    Total
                  </p>
                  <div className="flex items-baseline gap-2">
                    <p className="font-display text-5xl text-foreground leading-none">{total}</p>
                    {preOrders > 0 && <p className="text-lg text-muted-foreground">/ {preOrders}</p>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-display text-2xl text-foreground">{formatCurrency(revenue)}</p>
                  {extra.units > 0 && <p className="text-xs text-accent font-body mt-1">+{extra.units} extra</p>}
                </div>
              </div>

              {preOrders > 0 && (
                <div className="space-y-2">
                  <div className="w-full h-px rounded-full bg-muted/40 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-accent transition-all duration-500 ease-out"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-right text-xs font-body text-muted-foreground">{pct}%</p>
                </div>
              )}
            </div>
          </div>

          {/* Tap buttons */}
          <div className="grid grid-cols-2 gap-4 [&>*:nth-child(5)]:col-span-2 [&>*:nth-child(5)]:justify-self-center [&>*:nth-child(5)]:w-1/2">
            {DRINKS.map(product => (
              <TapButton
                key={product.id}
                product={product}
                count={counts[product.id] || 0}
                onTap={handleTap}
              />
            ))}
          </div>

          {/* Order log on mobile/tablet - collapsible */}
          <div className="lg:hidden">
            <button
              onClick={() => setShowLog(!showLog)}
              className="text-xs font-body font-semibold text-muted-foreground uppercase tracking-widest hover:text-foreground transition-colors mb-2"
            >
              {showLog ? "▾ Hide log" : "▸ Show log"}
            </button>
            {showLog && <OrderLog orders={orders} />}
          </div>

          {/* End session button */}
          <button
            onClick={handleEndSession}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-accent text-accent-foreground font-body font-semibold py-4 hover-scale active:scale-95 transition-all mt-auto"
          >
            <CheckCircle2 size={18} strokeWidth={1.5} />
            End Session & Save
          </button>
        </div>

        {/* Right: Order log - always visible on desktop */}
        <div className="hidden lg:flex flex-col min-h-0 rounded-lg bg-muted/15 p-5">
          <p className="text-xs font-body font-semibold text-muted-foreground uppercase tracking-widest mb-3">
            Recent Orders
          </p>
          <div className="flex-1 min-h-0 overflow-y-auto">
            <OrderLog orders={orders} />
          </div>
        </div>
      </div>
    </div>
  );
}
