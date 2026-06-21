import { supabase, isSupabaseEnabled } from "./supabase";
import { upcomingEvents, loadEvents } from "@/lib/eventStore";
import { lowStockItems } from "@/lib/inventoryStore";
import { loadChecklists } from "@/lib/checklistStore";

export interface UpcomingEventMetrics {
  upcomingEventCount: number;
  upcomingEvents: Array<{ id: string; name: string; dateStart: string }>;
}

export interface PastEventMetrics {
  totalEvents: number;
  highestRevenueEvent: {
    eventId: string;
    eventName: string;
    location: string;
    zip?: string;
    revenue: number;
  } | null;
  topVenues: Array<{
    zipCode?: string;
    location: string;
    eventCount: number;
    totalRevenue: number;
    avgRevenue: number;
  }>;
}

export interface RevenueMetrics {
  estimatedRevenue: number;
  actualRevenue?: number;
  variance?: number;
  monthlyTrend: Array<{ month: string; revenue: number }>;
}

export interface DashboardInsight {
  type:
    | "no_upcoming_events"
    | "low_revenue_trend"
    | "pending_checklists"
    | "inventory_low";
  actionableNextStep: string;
  relatedEventId?: string;
  relatedVenueName?: string;
  priority: "low" | "medium" | "high";
}

/**
 * Count upcoming events in the next N days.
 */
export async function getUpcomingEventCount(
  daysAhead: number = 7
): Promise<UpcomingEventMetrics | null> {
  if (!isSupabaseEnabled || !supabase) return null;

  const now = new Date();
  const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from("events")
    .select("id, name, date_start, status")
    .gte("date_start", now.toISOString())
    .lte("date_start", futureDate.toISOString())
    .in("status", ["confirmed", "inquiry"])
    .order("date_start", { ascending: true });

  if (error) {
    console.error("Failed to count upcoming events:", error.message);
    return null;
  }

  return {
    upcomingEventCount: data?.length ?? 0,
    upcomingEvents: (data ?? []).map((e) => ({
      id: e.id,
      name: e.name,
      dateStart: e.date_start,
    })),
  };
}

/**
 * Analyze past events (last N days) to find high-performing venues.
 * Used to generate outreach recommendations.
 */
export async function getPastEventsByVenue(
  daysBack: number = 90
): Promise<PastEventMetrics | null> {
  if (!isSupabaseEnabled || !supabase) return null;

  const pastDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

  // Fetch completed events
  const { data: events, error: eventsError } = await supabase
    .from("events")
    .select(
      "id, name, status, estimated_revenue, date_start, location, event_contacts(zip_code)"
    )
    .eq("status", "completed")
    .gte("date_start", pastDate.toISOString())
    .order("estimated_revenue", { ascending: false });

  if (eventsError) {
    console.error("Failed to fetch past events:", eventsError.message);
    return null;
  }

  if (!events || events.length === 0) {
    return {
      totalEvents: 0,
      highestRevenueEvent: null,
      topVenues: [],
    };
  }

  // Group by venue/zip
  const venueMap = new Map<
    string,
    { location: string; zip?: string; events: number; revenue: number }
  >();

  events.forEach((e: any) => {
    const zip = e.event_contacts?.[0]?.zip_code;
    const key = zip || e.location;
    const current = venueMap.get(key) || {
      location: e.location,
      zip,
      events: 0,
      revenue: 0,
    };
    current.events += 1;
    current.revenue += e.estimated_revenue ?? 0;
    venueMap.set(key, current);
  });

  const topVenues = Array.from(venueMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)
    .map((v) => ({
      zipCode: v.zip,
      location: v.location,
      eventCount: v.events,
      totalRevenue: v.revenue,
      avgRevenue: v.revenue / v.events,
    }));

  const highestRevenueEvent = events[0]
    ? {
        eventId: events[0].id,
        eventName: events[0].name,
        location: events[0].location,
        zip: events[0].event_contacts?.[0]?.zip_code,
        revenue: events[0].estimated_revenue ?? 0,
      }
    : null;

  return {
    totalEvents: events.length,
    highestRevenueEvent,
    topVenues,
  };
}

/**
 * Calculate revenue metrics for a specific event (estimated vs actual, monthly trend).
 */
export async function calculateRevenueMetrics(
  eventId: string
): Promise<RevenueMetrics | null> {
  if (!isSupabaseEnabled || !supabase) return null;

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("estimated_revenue, date_start")
    .eq("id", eventId)
    .single();

  if (eventError || !event) {
    console.error("Failed to fetch event:", eventError?.message);
    return null;
  }

  // Query monthly revenue trend (last 12 months)
  const { data: monthlyEvents, error: trendError } = await supabase
    .from("events")
    .select("estimated_revenue, date_start")
    .eq("status", "completed")
    .gte("date_start", new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString());

  if (trendError) {
    console.error("Failed to fetch trend data:", trendError.message);
    return null;
  }

  // Aggregate by month
  const monthlyMap = new Map<string, number>();
  (monthlyEvents ?? []).forEach((e: any) => {
    const date = new Date(e.date_start);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    monthlyMap.set(monthKey, (monthlyMap.get(monthKey) ?? 0) + (e.estimated_revenue ?? 0));
  });

  const monthlyTrend = Array.from(monthlyMap.entries())
    .sort()
    .map(([month, revenue]) => ({ month, revenue }));

  return {
    estimatedRevenue: event.estimated_revenue ?? 0,
    monthlyTrend,
  };
}

/**
 * Generate actionable insights for dashboard based on current business state.
 * Returns a list of insights prioritized by impact.
 */
export async function generateInsights(): Promise<DashboardInsight[]> {
  const insights: DashboardInsight[] = [];

  // --- Local insights (computed from localStorage, work fully offline) ---

  // No events booked in the next 7 days. When a backend is connected we can
  // enrich this with a top-venue outreach suggestion.
  const upcoming = upcomingEvents(7);
  if (upcoming.length === 0) {
    let actionableNextStep = "No events in the next 7 days — line up a pop-up to keep momentum.";
    let relatedVenueName: string | undefined;
    if (isSupabaseEnabled) {
      const pastMetrics = await getPastEventsByVenue(90);
      const topVenue = pastMetrics?.topVenues?.[0];
      if (topVenue) {
        actionableNextStep = `Suggest outreach to ${topVenue.location || "your top venue"} (avg $${topVenue.avgRevenue.toFixed(0)}/event)`;
        relatedVenueName = topVenue.location;
      }
    }
    insights.push({ type: "no_upcoming_events", actionableNextStep, relatedVenueName, priority: "high" });
  }

  // Inventory at/below reorder level.
  const low = lowStockItems();
  if (low.length > 0) {
    insights.push({
      type: "inventory_low",
      actionableNextStep: `${low.length} item${low.length > 1 ? "s" : ""} at or below reorder level — restock before your next event.`,
      priority: "medium",
    });
  }

  // Packing checklists with unchecked items for events within 24 hours.
  const now = Date.now();
  const checklists = loadChecklists();
  loadEvents()
    .filter(e => {
      const t = new Date(e.dateStart).getTime();
      return t >= now && t <= now + 24 * 60 * 60 * 1000 && e.status !== "cancelled";
    })
    .forEach(ev => {
      const checklist = checklists.find(c => c.eventId === ev.id);
      if (checklist && checklist.items.some(i => !i.checked)) {
        insights.push({
          type: "pending_checklists",
          actionableNextStep: `${ev.name} is within 24h — finish the packing checklist.`,
          relatedEventId: ev.id,
          priority: "high",
        });
      }
    });

  // --- Backend-only insights below this point ---

  // Check for revenue decline (month-over-month)
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  const monthKey = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}`;

  if (!isSupabaseEnabled || !supabase) {
    return insights;
  }

  const { data: monthlyData, error } = await supabase
    .from("events")
    .select("estimated_revenue, date_start")
    .eq("status", "completed")
    .gte("date_start", lastMonth.toISOString());

  if (!error && monthlyData && monthlyData.length > 0) {
    const thisMonthRevenue = (monthlyData as any[])
      .filter((e: any) => {
        const d = new Date(e.date_start);
        return d.getMonth() === new Date().getMonth();
      })
      .reduce((sum: number, e: any) => sum + (e.estimated_revenue ?? 0), 0);

    const lastMonthRevenue = (monthlyData as any[])
      .filter((e: any) => {
        const d = new Date(e.date_start);
        return d.getMonth() === lastMonth.getMonth();
      })
      .reduce((sum: number, e: any) => sum + (e.estimated_revenue ?? 0), 0);

    if (lastMonthRevenue > 0 && thisMonthRevenue < lastMonthRevenue * 0.8) {
      insights.push({
        type: "low_revenue_trend",
        actionableNextStep: `Revenue down ${Math.round(((lastMonthRevenue - thisMonthRevenue) / lastMonthRevenue) * 100)}% vs last month. Launch seasonal drink or event promo?`,
        priority: "high",
      });
    }
  }

  return insights;
}
