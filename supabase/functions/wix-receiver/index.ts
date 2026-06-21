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

/** Derive the app status for an event, checking both Wix status and date.
 *  Cancelled stays cancelled; otherwise past events are "completed", future are "confirmed".
 */
function deriveStatus(record: {
  status: string;
  startDate: string;
  endDate?: string;
}): string {
  if (record.status === "cancelled") return "cancelled";
  const end = new Date(record.endDate || record.startDate).getTime();
  return end < Date.now() ? "completed" : "confirmed";
}

/** Log webhook event for audit trail and debugging. */
function logWebhookEvent(
  level: "info" | "warn" | "error",
  wixEventId: string,
  action: string,
  details: Record<string, unknown> = {}
) {
  const timestamp = new Date().toISOString();
  const message = {
    timestamp,
    level,
    wixEventId,
    action,
    ...details,
  };
  console[level === "error" ? "error" : "log"](JSON.stringify(message));
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
      logWebhookEvent("warn", "unknown", "missing_authorization");
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: corsHeaders }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const expectedToken = Deno.env.get("WIX_WEBHOOK_SECRET");

    if (!expectedToken) {
      logWebhookEvent("error", "unknown", "webhook_secret_not_configured");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: corsHeaders }
      );
    }

    if (token !== expectedToken) {
      logWebhookEvent("warn", "unknown", "unauthorized_webhook");
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
        logWebhookEvent("warn", payload.wixEventId || "unknown", "validation_failed", {
          missingField: field,
        });
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
      logWebhookEvent("error", payload.wixEventId, "supabase_config_missing");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: corsHeaders }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Derive status using same logic as frontend (checks dates, not just Wix status)
    const appStatus = deriveStatus(payload);
    logWebhookEvent("info", payload.wixEventId, "status_derived", {
      wixStatus: payload.status,
      appStatus,
      startDate: payload.startDate,
      endDate: payload.endDate,
    });

    // Fetch existing event to preserve user edits
    const { data: existingEvent, error: fetchError } = await supabase
      .from("events")
      .select("*")
      .eq("wix_event_id", payload.wixEventId)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      // PGRST116 = no rows returned (new event)
      logWebhookEvent("error", payload.wixEventId, "fetch_existing_failed", {
        error: fetchError.message,
      });
      throw fetchError;
    }

    // Merge strategy: preserve user-edited fields, update Wix source fields
    const eventData = {
      wix_event_id: payload.wixEventId,
      name: payload.title,
      description: payload.description || null, // Maps Wix description
      notes: existingEvent?.notes || undefined, // Preserve user notes
      date_start: new Date(payload.startDate).toISOString(),
      date_end: payload.endDate ? new Date(payload.endDate).toISOString() : null,
      location: payload.location,
      status: appStatus,
      event_type: existingEvent?.event_type || "other", // Preserve user-specified type
      synced_from_wix: true,
      updated_at: new Date().toISOString(),
    };

    // Log what fields are being preserved/updated
    if (existingEvent) {
      logWebhookEvent("info", payload.wixEventId, "merge_applied", {
        preservedNotes: !!existingEvent.notes,
        preservedEventType: existingEvent.event_type,
      });
    }

    // Upsert event
    const { data, error } = await supabase
      .from("events")
      .upsert(eventData, {
        onConflict: "wix_event_id",
      })
      .select();

    if (error) {
      logWebhookEvent("error", payload.wixEventId, "upsert_failed", {
        error: error.message,
      });
      return new Response(
        JSON.stringify({ error: "Failed to save event" }),
        { status: 500, headers: corsHeaders }
      );
    }

    logWebhookEvent("info", payload.wixEventId, "sync_complete", {
      action: existingEvent ? "updated" : "created",
      title: payload.title,
      status: appStatus,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Event synced successfully",
        data,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logWebhookEvent("error", "unknown", "handler_error", {
      error: errorMessage,
    });
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: corsHeaders }
    );
  }
};
