import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface LeadBookingPayload {
  leadId: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  eventDate: string;
  location: string;
  guestCount: number;
  eventType?: string;
  specialNotes?: string;
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
    // Authenticate with API key
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: corsHeaders }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const validApiKeys = (Deno.env.get("LEAD_API_KEYS") || "").split(",");

    if (!validApiKeys.includes(token)) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: corsHeaders }
      );
    }

    // Parse and validate request
    const payload: LeadBookingPayload = await req.json();

    const errors: string[] = [];
    if (!payload.leadId) errors.push("leadId required");
    if (!payload.clientName) errors.push("clientName required");
    if (!payload.clientEmail || !payload.clientEmail.includes("@"))
      errors.push("Valid clientEmail required");
    if (!payload.eventDate) errors.push("eventDate required");
    if (!payload.location) errors.push("location required");
    if (typeof payload.guestCount !== "number" || payload.guestCount <= 0)
      errors.push("guestCount must be positive");

    if (errors.length > 0) {
      return new Response(
        JSON.stringify({ error: "Validation failed", details: errors }),
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

    // Extract zip code from location
    const zipMatch = payload.location.match(/(\d{5})(?:-\d{4})?$/);
    const zipCode = zipMatch ? zipMatch[1] : null;

    // Create event record
    const { data: eventData, error: eventError } = await supabase
      .from("events")
      .insert([
        {
          name: `Catering Request - ${payload.clientName}`,
          event_type: payload.eventType ?? "catering",
          date_start: new Date(payload.eventDate).toISOString(),
          location: payload.location,
          guest_count: payload.guestCount,
          estimated_guest_count: payload.guestCount,
          status: "inquiry",
          source_lead_form: "wix_website",
          lead_uuid: payload.leadId,
          client_notes: payload.specialNotes ?? null,
          deposit_status: "pending",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select();

    if (eventError || !eventData || eventData.length === 0) {
      console.error("Event creation error:", eventError);
      return new Response(
        JSON.stringify({
          error: "Failed to create event",
          message: eventError?.message,
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    const eventId = eventData[0].id;

    // Create event contact
    const { error: contactError } = await supabase
      .from("event_contacts")
      .insert([
        {
          event_id: eventId,
          contact_name: payload.clientName,
          contact_email: payload.clientEmail,
          contact_phone: payload.clientPhone ?? null,
          zip_code: zipCode,
          city:
            payload.location.split(",")[1]?.trim() ??
            payload.location.split(",")[0],
          is_primary: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

    if (contactError) {
      console.warn("Contact creation warning:", contactError);
    }

    // Log activity
    const { error: logError } = await supabase.from("activity_log").insert([
      {
        action: "LEAD_CREATED",
        entity_type: "event",
        entity_id: eventId,
        changes: {
          source: "api",
          lead_id: payload.leadId,
          client_name: payload.clientName,
        },
        created_at: new Date().toISOString(),
      },
    ]);

    if (logError) {
      console.warn("Activity log warning:", logError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        eventId,
        status: "inquiry",
        message: "Lead event created successfully",
      }),
      { status: 201, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: corsHeaders }
    );
  }
};
