import { supabase, isSupabaseEnabled } from "./supabase";
import type { TulipEvent } from "@/lib/eventStore";

export interface ActualUsage {
  cupsUsed: number;
  beansUsedLbs: number;
  milkUsedLiters: number;
  iceUsedLbs?: number;
  lidsUsed: number;
  napkinsUsed: number;
  notes?: string;
}

export interface PredictedNeeds {
  predictedCups: number;
  predictedBeansLbs: number;
  predictedMilkLiters: number;
  predictedLids: number;
  predictedNapkins: number;
  confidence: "high" | "medium" | "low";
  sampleSize: number;
  methodology: string;
  methodId: "zip_code" | "event_type" | "default";
}

export interface HistoricalMetrics {
  averageCupsPerGuest: number;
  averageBeansPerCup: number;
  averageMilkPerCup: number;
  averageNapkinsPerCup: number;
  sampleSize: number;
}

export interface LogisticsAnalysis {
  eventId: string;
  guestCount: number;
  predictedNeeds: PredictedNeeds;
  historicalMetrics: HistoricalMetrics;
}

/**
 * Record actual usage data after an event completes.
 * This data feeds the predictive model for future events.
 */
export async function recordActualUsage(
  eventId: string,
  usage: ActualUsage,
  recordedByUserId?: string
): Promise<{ success: boolean; message: string }> {
  if (!isSupabaseEnabled || !supabase) {
    return {
      success: false,
      message: "Database not available",
    };
  }

  try {
    const { error } = await supabase
      .from("event_logistics_history")
      .insert([
        {
          event_id: eventId,
          cups_used: usage.cupsUsed,
          beans_used_lbs: usage.beansUsedLbs,
          milk_used_liters: usage.milkUsedLiters,
          ice_used_lbs: usage.iceUsedLbs ?? null,
          lids_used: usage.lidsUsed,
          napkins_used: usage.napkinsUsed,
          notes: usage.notes ?? null,
          recorded_by: recordedByUserId ?? null,
          recorded_at: new Date().toISOString(),
        },
      ]);

    if (error) {
      return {
        success: false,
        message: `Failed to record usage: ${error.message}`,
      };
    }

    return {
      success: true,
      message: "Usage data recorded successfully",
    };
  } catch (error) {
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : "Unknown"}`,
    };
  }
}

/**
 * Get historical metrics for a specific zip code or event type.
 * Returns averages across past completed events.
 */
export async function getHistoricalMetrics(
  zipCode?: string,
  eventType?: string
): Promise<HistoricalMetrics | null> {
  if (!isSupabaseEnabled || !supabase) return null;

  try {
    let query = supabase.from("event_logistics_history").select(
      `
      cups_used,
      beans_used_lbs,
      milk_used_liters,
      napkins_used,
      events!inner(guest_count, event_contacts!inner(zip_code), event_type, status)
      `
    );

    // Filter by completed events only
    query = query.eq("events.status", "completed");

    // Apply optional filters
    if (zipCode) {
      query = query.eq("events.event_contacts.zip_code", zipCode);
    }

    if (eventType) {
      query = query.eq("events.event_type", eventType);
    }

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      return null;
    }

    // Aggregate metrics
    let totalCups = 0;
    let totalBeans = 0;
    let totalMilk = 0;
    let totalNapkins = 0;
    let totalGuests = 0;

    (data as any[]).forEach((record: any) => {
      totalCups += record.cups_used ?? 0;
      totalBeans += record.beans_used_lbs ?? 0;
      totalMilk += record.milk_used_liters ?? 0;
      totalNapkins += record.napkins_used ?? 0;
      if (Array.isArray(record.events)) {
        record.events.forEach((e: any) => {
          totalGuests += e.guest_count ?? 0;
        });
      } else if (record.events?.guest_count) {
        totalGuests += record.events.guest_count;
      }
    });

    const sampleSize = data.length;
    const avgCupsPerGuest = totalGuests > 0 ? totalCups / totalGuests : 0;
    const avgBeansPerCup = totalCups > 0 ? totalBeans / totalCups : 0;
    const avgMilkPerCup = totalCups > 0 ? totalMilk / totalCups : 0;
    const avgNapkinsPerCup = totalCups > 0 ? totalNapkins / totalCups : 0;

    return {
      averageCupsPerGuest: Math.round(avgCupsPerGuest * 100) / 100,
      averageBeansPerCup: Math.round(avgBeansPerCup * 100) / 100,
      averageMilkPerCup: Math.round(avgMilkPerCup * 100) / 100,
      averageNapkinsPerCup: Math.round(avgNapkinsPerCup * 100) / 100,
      sampleSize,
    };
  } catch (error) {
    console.error("Error fetching historical metrics:", error);
    return null;
  }
}

/**
 * Predict supply needs for an event based on historical data.
 * Tries zip-code-specific data first, falls back to event_type, then global.
 */
export async function getPredictedNeeds(
  event: TulipEvent
): Promise<PredictedNeeds> {
  if (!isSupabaseEnabled || !supabase) {
    // Return default prediction if DB unavailable
    return getDefaultPrediction(event.guestCount ?? 0);
  }

  try {
    // Try to get event contact zip code
    const { data: contactData } = await supabase
      .from("event_contacts")
      .select("zip_code")
      .eq("event_id", event.id)
      .eq("is_primary", true)
      .single();

    const zipCode = contactData?.zip_code;

    // Attempt zip-code-specific metrics first
    if (zipCode) {
      const zipMetrics = await getHistoricalMetrics(zipCode);
      if (zipMetrics && zipMetrics.sampleSize >= 3) {
        return calculatePrediction(event, zipMetrics, "zip_code");
      }
    }

    // Fall back to event-type metrics
    const typeMetrics = await getHistoricalMetrics(undefined, event.eventType);
    if (typeMetrics && typeMetrics.sampleSize >= 3) {
      return calculatePrediction(event, typeMetrics, "event_type");
    }

    // Fall back to global metrics
    const globalMetrics = await getHistoricalMetrics();
    if (globalMetrics) {
      return calculatePrediction(event, globalMetrics, "default");
    }

    // No historical data, use defaults
    return getDefaultPrediction(event.guestCount ?? 0);
  } catch (error) {
    console.error("Error predicting needs:", error);
    return getDefaultPrediction(event.guestCount ?? 0);
  }
}

/**
 * Calculate predicted needs given metrics and a methodology.
 */
function calculatePrediction(
  event: TulipEvent,
  metrics: HistoricalMetrics,
  methodId: "zip_code" | "event_type" | "default"
): PredictedNeeds {
  const guestCount = event.guestCount ?? 0;

  const predictedCups = Math.ceil(
    metrics.averageCupsPerGuest * guestCount * 1.1
  ); // 10% buffer
  const predictedBeans = Math.round(
    metrics.averageBeansPerCup * predictedCups * 10
  ) / 10;
  const predictedMilk = Math.round(
    metrics.averageMilkPerCup * predictedCups * 10
  ) / 10;
  const predictedLids = predictedCups;
  const predictedNapkins = Math.ceil(
    metrics.averageNapkinsPerCup * predictedCups
  );

  const confidence =
    metrics.sampleSize >= 10
      ? "high"
      : metrics.sampleSize >= 5
        ? "medium"
        : "low";

  const methodologyLabel =
    methodId === "zip_code"
      ? `Based on ${metrics.sampleSize} past events in this zip code`
      : methodId === "event_type"
        ? `Based on ${metrics.sampleSize} past ${event.eventType} events`
        : `Based on ${metrics.sampleSize} past events (limited data)`;

  return {
    predictedCups,
    predictedBeansLbs: predictedBeans,
    predictedMilkLiters: predictedMilk,
    predictedLids,
    predictedNapkins,
    confidence,
    sampleSize: metrics.sampleSize,
    methodology: methodologyLabel,
    methodId,
  };
}

/**
 * Return a conservative default prediction when no historical data exists.
 */
function getDefaultPrediction(guestCount: number): PredictedNeeds {
  // Conservative defaults (slightly over-estimate to be safe)
  const defaultCupsPerGuest = 1.3; // Most guests get 1+ drink
  const defaultBeansPerCup = 0.18; // ~18g per drink
  const defaultMilkPerCup = 0.15; // ~150ml per drink
  const defaultNapkinsPerCup = 2;

  const predictedCups = Math.ceil(defaultCupsPerGuest * guestCount);
  const predictedBeans = Math.round(
    defaultBeansPerCup * predictedCups * 10
  ) / 10;
  const predictedMilk = Math.round(
    defaultMilkPerCup * predictedCups * 10
  ) / 10;

  return {
    predictedCups,
    predictedBeansLbs: predictedBeans,
    predictedMilkLiters: predictedMilk,
    predictedLids: predictedCups,
    predictedNapkins: Math.ceil(defaultNapkinsPerCup * predictedCups),
    confidence: "low",
    sampleSize: 0,
    methodology: "Default conservative estimate (no historical data)",
    methodId: "default",
  };
}

/**
 * Full analysis combining predicted needs with historical metrics.
 * Useful for event detail page or logistics planning.
 */
export async function getLogisticsAnalysis(
  event: TulipEvent
): Promise<LogisticsAnalysis> {
  const predictedNeeds = await getPredictedNeeds(event);
  const historicalMetrics = await getHistoricalMetrics(undefined, event.eventType);

  return {
    eventId: event.id,
    guestCount: event.guestCount ?? 0,
    predictedNeeds,
    historicalMetrics: historicalMetrics || {
      averageCupsPerGuest: 0,
      averageBeansPerCup: 0,
      averageMilkPerCup: 0,
      averageNapkinsPerCup: 0,
      sampleSize: 0,
    },
  };
}
