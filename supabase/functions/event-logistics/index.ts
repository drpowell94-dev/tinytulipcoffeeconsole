import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PredictedNeeds {
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

interface LogisticsResponse {
  eventId: string;
  guestCount: number;
  predictedNeeds: PredictedNeeds;
}

// Default prediction when no historical data
function getDefaultPrediction(guestCount: number): PredictedNeeds {
  const defaultCupsPerGuest = 1.3;
  const defaultBeansPerCup = 0.18;
  const defaultMilkPerCup = 0.15;
  const defaultNapkinsPerCup = 2;

  const predictedCups = Math.ceil(defaultCupsPerGuest * guestCount);
  const predictedBeans = Math.round(defaultBeansPerCup * predictedCups * 10) / 10;
  const predictedMilk = Math.round(defaultMilkPerCup * predictedCups * 10) / 10;

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

// Calculate prediction from metrics
function calculatePrediction(
  guestCount: number,
  avgCupsPerGuest: number,
  avgBeansPerCup: number,
  avgMilkPerCup: number,
  avgNapkinsPerCup: number,
  sampleSize: number,
  methodId: "zip_code" | "event_type" | "default"
): PredictedNeeds {
  const predictedCups = Math.ceil(avgCupsPerGuest * guestCount * 1.1); // 10% buffer
  const predictedBeans = Math.round(avgBeansPerCup * predictedCups * 10) / 10;
  const predictedMilk = Math.round(avgMilkPerCup * predictedCups * 10) / 10;
  const predictedLids = predictedCups;
  const predictedNapkins = Math.ceil(avgNapkinsPerCup * predictedCups);

  const confidence =
    sampleSize >= 10 ? "high" : sampleSize >= 5 ? "medium" : "low";

  const methodologyLabel =
    methodId === "zip_code"
      ? `Based on ${sampleSize} past events in this zip code`
      : methodId === "event_type"
        ? `Based on ${sampleSize} past events of this type`
        : `Based on ${sampleSize} past events (limited data)`;

  return {
    predictedCups,
    predictedBeansLbs: predictedBeans,
    predictedMilkLiters: predictedMilk,
    predictedLids,
    predictedNapkins,
    confidence,
    sampleSize,
    methodology: methodologyLabel,
    methodId,
  };
}

export const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: corsHeaders }
    );
  }

  try {
    // Extract eventId from URL path
    const url = new URL(req.url);
    const eventId = url.searchParams.get("eventId");

    if (!eventId) {
      return new Response(
        JSON.stringify({ error: "eventId query parameter required" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Initialize Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: corsHeaders }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch event
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, guest_count, event_type, event_contacts(zip_code)")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return new Response(
        JSON.stringify({ error: "Event not found" }),
        { status: 404, headers: corsHeaders }
      );
    }

    const guestCount = event.guest_count ?? 0;
    const eventType = event.event_type ?? "other";
    const zipCode = event.event_contacts?.[0]?.zip_code;

    // Try zip-code-specific metrics first
    if (zipCode) {
      const { data: zipMetrics, error: zipError } = await supabase
        .from("event_logistics_history")
        .select(
          `cups_used, beans_used_lbs, milk_used_liters, napkins_used,
           events!inner(guest_count, status)`
        )
        .eq("events.status", "completed")
        .eq("events.event_contacts.zip_code", zipCode);

      if (!zipError && zipMetrics && zipMetrics.length >= 3) {
        let totalCups = 0,
          totalBeans = 0,
          totalMilk = 0,
          totalNapkins = 0,
          totalGuests = 0;

        (zipMetrics as any[]).forEach((m) => {
          totalCups += m.cups_used ?? 0;
          totalBeans += m.beans_used_lbs ?? 0;
          totalMilk += m.milk_used_liters ?? 0;
          totalNapkins += m.napkins_used ?? 0;
          if (Array.isArray(m.events)) {
            m.events.forEach((e: any) => (totalGuests += e.guest_count ?? 0));
          } else if (m.events?.guest_count) {
            totalGuests += m.events.guest_count;
          }
        });

        const avgCupsPerGuest =
          totalGuests > 0 ? totalCups / totalGuests : 1.3;
        const avgBeansPerCup = totalCups > 0 ? totalBeans / totalCups : 0.18;
        const avgMilkPerCup = totalCups > 0 ? totalMilk / totalCups : 0.15;
        const avgNapkinsPerCup =
          totalCups > 0 ? totalNapkins / totalCups : 2;

        const prediction = calculatePrediction(
          guestCount,
          avgCupsPerGuest,
          avgBeansPerCup,
          avgMilkPerCup,
          avgNapkinsPerCup,
          zipMetrics.length,
          "zip_code"
        );

        return new Response(
          JSON.stringify({
            eventId,
            guestCount,
            predictedNeeds: prediction,
          } as LogisticsResponse),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Fall back to event-type metrics
    const { data: typeMetrics, error: typeError } = await supabase
      .from("event_logistics_history")
      .select(
        `cups_used, beans_used_lbs, milk_used_liters, napkins_used,
         events!inner(guest_count, status, event_type)`
      )
      .eq("events.status", "completed")
      .eq("events.event_type", eventType);

    if (!typeError && typeMetrics && typeMetrics.length >= 3) {
      let totalCups = 0,
        totalBeans = 0,
        totalMilk = 0,
        totalNapkins = 0,
        totalGuests = 0;

      (typeMetrics as any[]).forEach((m) => {
        totalCups += m.cups_used ?? 0;
        totalBeans += m.beans_used_lbs ?? 0;
        totalMilk += m.milk_used_liters ?? 0;
        totalNapkins += m.napkins_used ?? 0;
        if (Array.isArray(m.events)) {
          m.events.forEach((e: any) => (totalGuests += e.guest_count ?? 0));
        } else if (m.events?.guest_count) {
          totalGuests += m.events.guest_count;
        }
      });

      const avgCupsPerGuest = totalGuests > 0 ? totalCups / totalGuests : 1.3;
      const avgBeansPerCup = totalCups > 0 ? totalBeans / totalCups : 0.18;
      const avgMilkPerCup = totalCups > 0 ? totalMilk / totalCups : 0.15;
      const avgNapkinsPerCup = totalCups > 0 ? totalNapkins / totalCups : 2;

      const prediction = calculatePrediction(
        guestCount,
        avgCupsPerGuest,
        avgBeansPerCup,
        avgMilkPerCup,
        avgNapkinsPerCup,
        typeMetrics.length,
        "event_type"
      );

      return new Response(
        JSON.stringify({
          eventId,
          guestCount,
          predictedNeeds: prediction,
        } as LogisticsResponse),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Default prediction
    const defaultPrediction = getDefaultPrediction(guestCount);

    return new Response(
      JSON.stringify({
        eventId,
        guestCount,
        predictedNeeds: defaultPrediction,
      } as LogisticsResponse),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: corsHeaders }
    );
  }
};
