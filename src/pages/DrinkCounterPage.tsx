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
      toast.success("🎉🌷 All pre-orders fulfilled! Amazing work!", { duration: 5000 });
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
    navigator.clipboard.writeText(summary).then(() => {
      toast.success("Summary copied to clipboard! 🌷");
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
      toast.success(`Session saved — ${saved.totalDrinks} drinks, ${formatCurrency(saved.totalRevenue)} 📚`);
    }
    clearSession(event.id);
    setOrders([]);
    setCelebrated(false);
    navigate("/events");
  };

  const handleReset = () => {
    if (orders.length > 0 && event) {
      archiveSession(event.id, event.name, preOrders, orders);
      toast.success("Previous counts saved to history 📚");
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

  const pct = preOrders > 0 ? Math.min(Math.round((total / preOrders) * 100), 100) : 0;

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-xl mx-auto">
      <div className="bg-accent text-accent-foreground text-center text-xs font-body font-semibold py-1.5 px-4">
        Purely a pop-up. Where the people are.
      </div>

      {/* Header */}
      <header className="flex items-center justify-between px-4 pt-4 pb-3 gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Link
            to="/events"
            className="p-1.5 rounded-full hover:bg-muted/40 text-muted-foreground shrink-0"
            aria-label="Back to events"
          >
            <ArrowLeft size={20} />
          </Link>
          <span className="text-2xl">🌷</span>
          <div className="min-w-0">
            <h1 className="font-display text-base sm:text-xl text-foreground truncate">{event.name}</h1>
            <p className="text-[11px] text-muted-foreground font-body truncate">
              {event.location}
              {isSupabaseEnabled ? " · syncing live" : " · local mode"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleReset}
            className="rounded-full bg-muted/60 px-2.5 py-1.5 text-xs font-body font-semibold text-muted-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors"
          >
            <RotateCcw size={14} className="inline" /> <span className="hidden sm:inline">Reset</span>
          </button>
          <button
            onClick={handleExport}
            className="rounded-full bg-accent px-2.5 py-1.5 text-xs font-body font-semibold text-accent-foreground hover:bg-primary transition-colors"
          >
            <ClipboardCopy size={14} className="inline" /> <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </header>

      {/* Session stats */}
      <div className="mx-4 mb-4 rounded-2xl bg-card border border-border p-5 shadow-sm">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-body font-semibold text-muted-foreground uppercase tracking-widest">
              Session Total
            </p>
            <p className="font-display text-4xl text-foreground mt-1">
              {total}
              {preOrders > 0 && <span className="text-2xl text-muted-foreground"> / {preOrders}</span>}
            </p>
            <p className="text-xs text-muted-foreground font-body">
              drinks sold{preOrders > 0 && " of pre-orders"}
            </p>
            <p className="font-display text-lg text-accent mt-1">{formatCurrency(revenue)}</p>
          </div>
          {extra.units > 0 && (
            <div className="text-right">
              <p className="text-xs font-body font-semibold text-muted-foreground uppercase tracking-widest">
                Extra Sales
              </p>
              <p className="font-display text-2xl text-foreground mt-1">~{formatCurrency(extra.revenue)}</p>
              <p className="text-xs text-muted-foreground font-body">+{extra.units} drinks</p>
            </div>
          )}
        </div>
        {preOrders > 0 && (
          <div className="mt-4">
            <div className="w-full h-3 rounded-full bg-muted/50 overflow-hidden">
              <div
                className="h-full rounded-full bg-accent transition-all duration-500 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground font-body mt-1.5 text-right">{pct}% fulfilled</p>
          </div>
        )}
      </div>

      {/* Tap buttons */}
      <div className="px-4 mb-4 grid grid-cols-2 gap-3 [&>*:nth-child(5)]:col-span-2 [&>*:nth-child(5)]:justify-self-center [&>*:nth-child(5)]:w-1/2">
        {DRINKS.map(product => (
          <TapButton
            key={product.id}
            product={product}
            count={counts[product.id] || 0}
            onTap={handleTap}
          />
        ))}
      </div>

      {/* Order log */}
      <div className="px-4 flex-1">
        <button
          onClick={() => setShowLog(!showLog)}
          className="w-full text-center text-xs font-body font-semibold text-muted-foreground uppercase tracking-widest mb-3 hover:text-foreground transition-colors"
        >
          {showLog ? "▾ Hide Order Log" : "▸ Show Order Log"}
        </button>
        {showLog && <OrderLog orders={orders} />}
      </div>

      {/* End session */}
      <div className="p-4">
        <button
          onClick={handleEndSession}
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary text-primary-foreground font-body font-bold py-3.5 hover:opacity-90 active:scale-[0.98] transition-all"
        >
          <CheckCircle2 size={18} />
          End Session & Save
        </button>
      </div>
    </div>
  );
}
