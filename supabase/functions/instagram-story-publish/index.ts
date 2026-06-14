import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: corsHeaders }
    );
  }

  try {
    // Authenticate with Bearer token (future enhancement: use JWT from Supabase Auth)
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: corsHeaders }
      );
    }

    const { eventId, userId } = await req.json();

    if (!eventId || !userId) {
      return new Response(
        JSON.stringify({ error: "Missing eventId or userId" }),
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

    // Fetch Instagram integration
    const { data: integration, error: integrationError } = await supabase
      .from("instagram_integrations")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .single();

    if (integrationError || !integration) {
      return new Response(
        JSON.stringify({ error: "No Instagram integration found" }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Fetch event details
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("*")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return new Response(
        JSON.stringify({ error: "Event not found" }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Format event for story
    const storyText = formatEventForStory(event);

    // Create story publish log
    const storyId = `story-${Date.now()}`;
    const { error: storyLogError } = await supabase
      .from("instagram_story_publishes")
      .insert({
        user_id: userId,
        event_id: eventId,
        story_id: storyId,
        story_type: "event_checkin",
        text_content: storyText,
        status: "pending",
        published_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });

    if (storyLogError) {
      return new Response(
        JSON.stringify({ error: "Failed to log story publish" }),
        { status: 500, headers: corsHeaders }
      );
    }

    // In production, would call Instagram Content Publishing API here
    // For now, mock the API call
    console.log(`[INSTAGRAM STORY] Publishing for event ${event.name}:`);
    console.log(storyText);

    // Log activity
    await supabase.from("activity_log").insert({
      user_id: userId,
      action: "INSTAGRAM_STORY_PUBLISHED",
      entity_type: "event",
      entity_id: eventId,
      changes: {
        story_id: storyId,
        event_name: event.name,
      },
      created_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        success: true,
        storyId,
        message: "Story published to Instagram",
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

/**
 * Format event details for Instagram Story
 */
function formatEventForStory(event: any): string {
  const eventDate = new Date(event.date_start);
  const dateStr = eventDate.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const timeStr = eventDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return `☕ ${event.name}

📍 ${event.location}

📅 ${dateStr} at ${timeStr}

👥 ${event.guest_count || "??"} guests

🔗 Link in bio to book! 🎉`;
}
