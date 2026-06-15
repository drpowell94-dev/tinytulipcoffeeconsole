import { supabase, isSupabaseEnabled } from "./supabase";
import { loadEvents } from "@/lib/eventStore";

/**
 * Local pipeline funnel computed from the localStorage event store. Leads that
 * are accepted become "confirmed" and delivered events become "completed", so
 * we read the funnel off the current pipeline. Declines aren't tracked locally.
 */
function localFunnel(): ConversionFunnel {
  const events = loadEvents();
  const pending = events.filter(e => e.status === "inquiry").length;
  const booked = events.filter(e => e.status === "confirmed" || e.status === "completed").length;
  const completed = events.filter(e => e.status === "completed").length;
  const total = pending + booked;
  return {
    totalLeads: total,
    acceptedLeads: booked,
    declinedLeads: 0,
    convertedLeads: completed,
    acceptanceRate: total > 0 ? Math.round((booked / total) * 100) : 0,
    conversionRate: booked > 0 ? Math.round((completed / booked) * 100) : 0,
    averageResponseTime: 0,
    bySource: {},
  };
}

const RESPONSE_THRESHOLD_MS = 4 * 60 * 60 * 1000; // 4 hours

function localPendingLeads(): Array<{
  leadId: string;
  leadName: string;
  hoursOverdue: number;
  createdAt: string;
}> {
  const now = Date.now();
  return loadEvents()
    .filter(e => e.status === "inquiry")
    .map(e => ({
      leadId: e.id,
      leadName: e.name,
      hoursOverdue: Math.max(
        0,
        Math.floor((now - new Date(e.createdAt).getTime() - RESPONSE_THRESHOLD_MS) / (60 * 60 * 1000))
      ),
      createdAt: e.createdAt,
    }))
    .filter(l => l.hoursOverdue > 0);
}

export interface LeadMetric {
  leadId: string;
  status: "pending" | "accepted" | "declined" | "converted";
  responseTimeMinutes: number | null;
  source: string;
  createdAt: string;
  firstResponseAt: string | null;
}

export interface ConversionFunnel {
  totalLeads: number;
  acceptedLeads: number;
  declinedLeads: number;
  convertedLeads: number;
  acceptanceRate: number; // percentage
  conversionRate: number; // percentage
  averageResponseTime: number; // minutes
  bySource: Record<string, { total: number; conversion: number; rate: number }>;
}

/**
 * Track a lead's response/acceptance
 */
export async function trackLeadResponse(
  userId: string,
  leadId: string,
  status: "accepted" | "declined",
  source?: string
): Promise<boolean> {
  if (!isSupabaseEnabled || !supabase) return false;

  try {
    const { error } = await supabase.from("lead_metrics").upsert(
      {
        user_id: userId,
        lead_id: leadId,
        conversion_status: status === "accepted" ? "accepted" : "declined",
        [status === "accepted" ? "accepted_at" : "declined_at"]: new Date().toISOString(),
        first_response_at: new Date().toISOString(),
        source: source || "manual",
      },
      { onConflict: "lead_id" }
    );

    return !error;
  } catch (error) {
    console.error("Error tracking lead response:", error);
    return false;
  }
}

/**
 * Get conversion funnel metrics for dashboard
 */
export async function getConversionFunnel(userId: string): Promise<ConversionFunnel | null> {
  if (!isSupabaseEnabled || !supabase) return localFunnel();

  try {
    // Get all leads for this user
    const { data: leads, error: leadsError } = await supabase
      .from("events")
      .select("id, status, created_at, source_lead_form")
      .eq("user_id", userId)
      .eq("status", "inquiry");

    if (leadsError || !leads) return null;

    // Get metrics for these leads
    const { data: metricsData, error: metricsError } = await supabase
      .from("lead_metrics")
      .select("*")
      .in("lead_id", leads.map(l => l.id));

    if (metricsError) {
      console.error("Failed to fetch lead metrics:", metricsError.message);
      return null;
    }

    // Ensure metrics is always an array (could be null/undefined if no results)
    const metrics = metricsData || [];

    // Calculate funnel
    const totalLeads = leads.length;
    const acceptedLeads = metrics.filter(m => m.conversion_status === "accepted").length;
    const declinedLeads = metrics.filter(m => m.conversion_status === "declined").length;
    const convertedLeads = metrics.filter(m => m.conversion_status === "converted").length;
    const pendingLeads = metrics.filter(m => m.conversion_status === "pending").length;

    // Calculate response times
    const responseTimes = metrics
      .filter(m => m.response_time_minutes)
      .map(m => m.response_time_minutes);
    const averageResponseTime =
      responseTimes.length > 0
        ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
        : 0;

    // Group by source
    const bySource: Record<string, { total: number; conversion: number; rate: number }> = {};
    leads.forEach(lead => {
      const source = lead.source_lead_form || "unknown";
      if (!bySource[source]) bySource[source] = { total: 0, conversion: 0, rate: 0 };
      bySource[source].total += 1;

      const leadMetric = metrics.find(m => m.lead_id === lead.id);
      if (leadMetric && leadMetric.conversion_status === "accepted") {
        bySource[source].conversion += 1;
      }
    });

    // Calculate rates
    Object.keys(bySource).forEach(source => {
      bySource[source].rate =
        bySource[source].total > 0
          ? Math.round((bySource[source].conversion / bySource[source].total) * 100)
          : 0;
    });

    return {
      totalLeads,
      acceptedLeads,
      declinedLeads,
      convertedLeads,
      acceptanceRate: totalLeads > 0 ? Math.round(((acceptedLeads + pendingLeads) / totalLeads) * 100) : 0,
      conversionRate: acceptedLeads > 0 ? Math.round((convertedLeads / acceptedLeads) * 100) : 0,
      averageResponseTime,
      bySource,
    };
  } catch (error) {
    console.error("Error getting conversion funnel:", error);
    return null;
  }
}

/**
 * Get pending leads with response time alerts
 */
export async function getPendingLeadsWithAlerts(userId: string): Promise<
  Array<{
    leadId: string;
    leadName: string;
    hoursOverdue: number;
    createdAt: string;
  }>
> {
  if (!isSupabaseEnabled || !supabase) return localPendingLeads();

  try {
    const { data: leads, error } = await supabase
      .from("events")
      .select("id, name, created_at")
      .eq("user_id", userId)
      .eq("status", "inquiry")
      .order("created_at", { ascending: true });

    if (error || !leads) return [];

    const now = new Date();
    const alertThresholdMs = 4 * 60 * 60 * 1000; // 4 hours

    return leads
      .map(lead => {
        const createdAt = new Date(lead.created_at);
        const ageMs = now.getTime() - createdAt.getTime();
        const hoursOverdue = Math.floor((ageMs - alertThresholdMs) / (60 * 60 * 1000));

        return {
          leadId: lead.id,
          leadName: lead.name,
          hoursOverdue: Math.max(0, hoursOverdue),
          createdAt: lead.created_at,
        };
      })
      .filter(l => l.hoursOverdue > 0); // Only show overdue
  } catch (error) {
    console.error("Error getting pending leads:", error);
    return [];
  }
}
