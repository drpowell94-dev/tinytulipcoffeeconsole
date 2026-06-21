import { supabase, isSupabaseEnabled } from "./supabase";
import { loadEvents } from "@/lib/eventStore";
import { loadProperties, getInstagramFollowsWithoutBooking, getCharlotteApartments } from "@/lib/propertyStore";

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
  relatedPropertyId?: string;
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
 * Get past events from localStorage (for local Wix imports and app events).
 * Used to drive recommendations even without Supabase sync.
 */
function getLocalPastEventsByVenue(daysBack: number = 90): PastEventMetrics | null {
  const events = loadEvents().filter(e => e.status === "completed");

  if (events.length === 0) {
    return {
      totalEvents: 0,
      highestRevenueEvent: null,
      topVenues: [],
    };
  }

  // Group by venue
  const venueMap = new Map<
    string,
    { location: string; events: number; revenue: number }
  >();

  events.forEach((e: any) => {
    const key = e.location || "Unknown";
    const current = venueMap.get(key) || {
      location: e.location,
      events: 0,
      revenue: 0,
    };
    current.events += 1;
    current.revenue += e.estimatedRevenue ?? 0;
    venueMap.set(key, current);
  });

  const topVenues = Array.from(venueMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)
    .map((v) => ({
      zipCode: undefined,
      location: v.location,
      eventCount: v.events,
      totalRevenue: v.revenue,
      avgRevenue: v.revenue / v.events,
    }));

  const highestRevenueEvent = events.sort((a, b) => (b.estimatedRevenue ?? 0) - (a.estimatedRevenue ?? 0))[0]
    ? {
        eventId: events[0].id,
        eventName: events[0].name,
        location: events[0].location || "Unknown",
        revenue: events[0].estimatedRevenue ?? 0,
      }
    : null;

  return {
    totalEvents: events.length,
    highestRevenueEvent,
    topVenues,
  };
}

/**
 * Find venues that haven't had an event in X days.
 */
function findInactiveVenues(daysWithoutEvent: number = 60): Array<{
  location: string;
  daysAgo: number;
  lastEventDate: string;
}> {
  const events = loadEvents().filter(e => e.status === "completed");
  if (events.length === 0) return [];

  const cutoffDate = new Date(Date.now() - daysWithoutEvent * 24 * 60 * 60 * 1000);
  const venueMap = new Map<string, string>();

  events
    .sort((a, b) => b.dateStart.localeCompare(a.dateStart))
    .forEach(e => {
      if (!venueMap.has(e.location)) {
        venueMap.set(e.location, e.dateStart);
      }
    });

  return Array.from(venueMap.entries())
    .map(([location, lastDate]) => ({
      location,
      lastEventDate: lastDate,
      daysAgo: Math.floor((Date.now() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24)),
    }))
    .filter(v => v.daysAgo >= daysWithoutEvent)
    .sort((a, b) => b.daysAgo - a.daysAgo)
    .slice(0, 3);
}

/**
 * Generate actionable insights for dashboard based on current business state.
 * Returns a list of insights prioritized by impact.
 */
export async function generateInsights(): Promise<DashboardInsight[]> {
  const insights: DashboardInsight[] = [];

  // ALWAYS show top venue recommendations based on completed events
  let pastMetrics = await getPastEventsByVenue(90);
  if (!pastMetrics || pastMetrics.topVenues.length === 0) {
    pastMetrics = getLocalPastEventsByVenue(90);
  }

  if (pastMetrics && pastMetrics.topVenues.length > 0) {
    const topVenue = pastMetrics.topVenues[0];
    insights.push({
      type: "no_upcoming_events",
      actionableNextStep: `${topVenue.location} is your best venue (avg $${topVenue.avgRevenue.toFixed(0)}/event, ${topVenue.eventCount} bookings)`,
      relatedVenueName: topVenue?.location,
      priority: "high",
    });
  }

  // Recommend re-engagement with inactive venues (no event in 60+ days)
  const inactiveVenues = findInactiveVenues(60);
  if (inactiveVenues.length > 0) {
    const venue = inactiveVenues[0];
    insights.push({
      type: "low_revenue_trend",
      actionableNextStep: `${venue.location} hasn't hosted in ${venue.daysAgo}d. Time for a check-in?`,
      relatedVenueName: venue.location,
      priority: "medium",
    });
  }

  // Recommend outreach to new Instagram followers without bookings
  const allEvents = loadEvents();
  const bookedPropertyIds = new Set(
    allEvents
      .filter(e => e.propertyId)
      .map(e => e.propertyId!)
  );
  const instagramFollows = getInstagramFollowsWithoutBooking(Array.from(bookedPropertyIds));
  if (instagramFollows.length > 0) {
    const property = instagramFollows[0];
    insights.push({
      type: "inventory_low",
      actionableNextStep: `${property.name} follows on Instagram. Reach out about hosting?`,
      relatedVenueName: property.name,
      relatedPropertyId: property.id,
      priority: "medium",
    });
  }

  // Fallback: Suggest exploring all properties if insights are thin
  if (insights.length < 3) {
    const properties = loadProperties();
    const allProperties = properties.filter(p => p.category === "charlotte_apartment");
    if (allProperties.length > 0) {
      insights.push({
        type: "inventory_low",
        actionableNextStep: `Manage ${allProperties.length} Charlotte properties in your database. Add events to generate venue insights.`,
        priority: "low",
      });
    }
  }

  // Check for revenue decline (month-over-month) - use localStorage as fallback
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);

  let monthlyData: any[] | null = null;

  // Try Supabase first
  if (isSupabaseEnabled && supabase) {
    const { data, error } = await supabase
      .from("events")
      .select("estimated_revenue, date_start")
      .eq("status", "completed")
      .gte("date_start", lastMonth.toISOString());

    if (!error && data) {
      monthlyData = data;
    }
  }

  // Fall back to localStorage
  if (!monthlyData) {
    monthlyData = loadEvents()
      .filter(e => e.status === "completed" && new Date(e.dateStart) >= lastMonth)
      .map(e => ({ estimated_revenue: e.estimatedRevenue, date_start: e.dateStart }));
  }

  if (monthlyData && monthlyData.length > 0) {
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

  if (!isSupabaseEnabled || !supabase) {
    return insights;
  }

  // Check for pending checklists (items unchecked 24hrs before event)
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const { data: soonEvents, error: checklistError } = await supabase
    .from("events")
    .select("id, name, date_start, checklists(id, checklist_items(is_completed))")
    .gte("date_start", new Date().toISOString())
    .lte("date_start", tomorrow.toISOString());

  if (!checklistError && soonEvents) {
    const uncheckedEvent = (soonEvents as any[]).find((e: any) =>
      e.checklists?.some((c: any) =>
        c.checklist_items?.some((ci: any) => !ci.is_completed)
      )
    );

    if (uncheckedEvent) {
      insights.push({
        type: "pending_checklists",
        actionableNextStep: `${uncheckedEvent.name} is tomorrow! Complete prep checklist`,
        relatedEventId: uncheckedEvent.id,
        priority: "high",
      });
    }
  }

  return insights;
}
