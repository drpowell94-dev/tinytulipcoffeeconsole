import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface DashboardInsight {
  type: string;
  actionableNextStep: string;
  relatedEventId?: string;
  relatedVenueName?: string;
  priority: "low" | "medium" | "high";
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

    const insights: DashboardInsight[] = [];

    // 1. Check for upcoming events (next 7 days)
    const now = new Date();
    const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const { data: upcomingEvents, error: upcomingError } = await supabase
      .from("events")
      .select("id, name, date_start")
      .gte("date_start", now.toISOString())
      .lte("date_start", futureDate.toISOString())
      .in("status", ["confirmed", "inquiry"]);

    if (upcomingError) {
      console.error("Upcoming events query error:", upcomingError);
    }

    const upcomingCount = upcomingEvents?.length ?? 0;

    // If no upcoming events, suggest outreach to high-performing venues
    if (upcomingCount === 0) {
      const { data: pastEvents, error: pastError } = await supabase
        .from("events")
        .select(
          "id, name, estimated_revenue, location, event_contacts(zip_code)"
        )
        .eq("status", "completed")
        .gte(
          "date_start",
          new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
        )
        .order("estimated_revenue", { ascending: false })
        .limit(5);

      if (!pastError && pastEvents && pastEvents.length > 0) {
        const topEvent = pastEvents[0];
        insights.push({
          type: "no_upcoming_events",
          actionableNextStep: `Suggest outreach to ${topEvent.location} (previous catering for $${topEvent.estimated_revenue ?? 0})`,
          relatedEventId: topEvent.id,
          relatedVenueName: topEvent.location,
          priority: "high",
        });
      } else {
        insights.push({
          type: "no_upcoming_events",
          actionableNextStep:
            "Schedule upcoming events to maintain momentum",
          priority: "high",
        });
      }
    }

    // 2. Check for revenue decline (month-over-month)
    const today = new Date();
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonthStart = new Date(
      today.getFullYear(),
      today.getMonth() - 1,
      1
    );
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

    const { data: monthlyData, error: monthlyError } = await supabase
      .from("events")
      .select("estimated_revenue, date_start")
      .eq("status", "completed")
      .gte("date_start", lastMonthStart.toISOString());

    if (!monthlyError && monthlyData && monthlyData.length > 0) {
      let thisMonthRevenue = 0;
      let lastMonthRevenue = 0;

      (monthlyData as any[]).forEach((e) => {
        const eventDate = new Date(e.date_start);
        if (eventDate >= thisMonthStart) {
          thisMonthRevenue += e.estimated_revenue ?? 0;
        } else if (eventDate >= lastMonthStart) {
          lastMonthRevenue += e.estimated_revenue ?? 0;
        }
      });

      if (lastMonthRevenue > 0) {
        const decline = ((lastMonthRevenue - thisMonthRevenue) / lastMonthRevenue) * 100;
        if (decline > 20) {
          insights.push({
            type: "low_revenue_trend",
            actionableNextStep: `Revenue down ${Math.round(decline)}% vs last month. Consider seasonal drink launch or promotional event.`,
            priority: "high",
          });
        }
      }
    }

    // 3. Check for pending checklists (items unchecked 24hrs before event)
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const { data: soonEvents, error: checklistError } = await supabase
      .from("events")
      .select(
        "id, name, date_start, checklists(id, checklist_items(is_completed))"
      )
      .gte("date_start", now.toISOString())
      .lte("date_start", tomorrow.toISOString())
      .in("status", ["confirmed"]);

    if (!checklistError && soonEvents) {
      const uncheckedEvent = (soonEvents as any[]).find((e) =>
        e.checklists?.some((c: any) =>
          c.checklist_items?.some((ci: any) => !ci.is_completed)
        )
      );

      if (uncheckedEvent) {
        insights.push({
          type: "pending_checklists",
          actionableNextStep: `${uncheckedEvent.name} is tomorrow! ${uncheckedEvent.checklists?.[0]?.checklist_items?.filter((ci: any) => !ci.is_completed).length ?? 0} prep items still pending.`,
          relatedEventId: uncheckedEvent.id,
          priority: "high",
        });
      }
    }

    // 4. Check for low inventory (optional - can extend to query inventory_items)

    return new Response(
      JSON.stringify({
        upcomingEventCount: upcomingCount,
        insights: insights,
      }),
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
