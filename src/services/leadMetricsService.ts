import { supabase, isSupabaseEnabled } from "./supabase";

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
  if (!isSupabaseEnabled || !supabase) return null;

  try {
    // Get all leads for this user
    const { data: leads, error: leadsError } = await supabase
      .from("events")
      .select("id, status, created_at, source_lead_form")
      .eq("user_id", userId)
      .eq("status", "inquiry");

    if (leadsError || !leads) return null;

    // Get metrics for these leads
    const { data: metrics, error: metricsError } = await supabase
      .from("lead_metrics")
      .select("*")
      .in("lead_id", leads.map(l => l.id));

    if (metricsError) return null;

    // Calculate funnel
    const totalLeads = leads.length;
    const acceptedLeads = metrics?.filter(m => m.conversion_status === "accepted").length ?? 0;
    const declinedLeads = metrics?.filter(m => m.conversion_status === "declined").length ?? 0;
    const convertedLeads = metrics?.filter(m => m.conversion_status === "converted").length ?? 0;
    const pendingLeads = metrics?.filter(m => m.conversion_status === "pending").length ?? 0;

    // Calculate response times
    const responseTimes = metrics
      ?.filter(m => m.response_time_minutes)
      .map(m => m.response_time_minutes) ?? [];
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

      const leadMetric = metrics?.find(m => m.lead_id === lead.id);
      if (leadMetric?.conversion_status === "accepted") {
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
  if (!isSupabaseEnabled || !supabase) return [];

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
