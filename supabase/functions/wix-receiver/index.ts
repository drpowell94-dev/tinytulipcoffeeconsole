import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface WixEventPayload {
  wixEventId: string;
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  location: string;
  status: "draft" | "published" | "cancelled";
}

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
    // Extract and verify Bearer token
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: corsHeaders }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const expectedToken = Deno.env.get("WIX_WEBHOOK_SECRET");

    if (!expectedToken) {
      console.error("WIX_WEBHOOK_SECRET not configured");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: corsHeaders }
      );
    }

    if (token !== expectedToken) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: corsHeaders }
      );
    }

    // Parse request body
    const payload: WixEventPayload = await req.json();

    // Validate required fields
    const requiredFields = [
      "wixEventId",
      "title",
      "startDate",
      "location",
      "status",
    ];
    for (const field of requiredFields) {
      if (!payload[field as keyof WixEventPayload]) {
        return new Response(
          JSON.stringify({ error: `Missing required field: ${field}` }),
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Supabase configuration missing");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: corsHeaders }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Map Wix status to app status
    const appStatus =
      payload.status === "cancelled"
        ? "cancelled"
        : payload.status === "published"
          ? "confirmed"
          : "inquiry";

    // Upsert event
    const { data, error } = await supabase
      .from("events")
      .upsert(
        {
          wix_event_id: payload.wixEventId,
          name: payload.title,
          description: payload.description || null,
          date_start: new Date(payload.startDate).toISOString(),
          date_end: payload.endDate ? new Date(payload.endDate).toISOString() : null,
          location: payload.location,
          status: appStatus,
          event_type: "other",
          synced_from_wix: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "wix_event_id" }
      )
      .select();

    if (error) {
      console.error("Database error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to save event" }),
        { status: 500, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Event synced successfully",
        data,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: corsHeaders }
    );
  }
};
