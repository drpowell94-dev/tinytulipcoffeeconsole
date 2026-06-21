import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

// SECURITY: Restrict CORS to Wix domain only (not wildcard)
const corsHeaders = {
  "Access-Control-Allow-Origin": "https://www.wixapis.com",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "3600",
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

// In-memory rate limiter (replace with Redis in production)
const requestCounts = new Map<string, { count: number; resetTime: number }>();

/** SECURITY: Constant-time string comparison to prevent timing attacks. */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/** SECURITY: Validate ISO8601 date format. */
function isValidISO8601(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && dateString === date.toISOString();
}

/** SECURITY: Rate limit by IP address (100 requests per minute). */
function checkRateLimit(clientIp: string): boolean {
  const now = Date.now();
  const limit = 100;
  const window = 60000; // 1 minute

  const record = requestCounts.get(clientIp);
  if (!record || now > record.resetTime) {
    requestCounts.set(clientIp, { count: 1, resetTime: now + window });
    return true;
  }

  if (record.count >= limit) return false;
  record.count++;
  return true;
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

/** Log webhook event for audit trail. Does NOT log sensitive data (titles, descriptions). */
function logWebhookEvent(
  level: "info" | "warn" | "error",
  wixEventId: string,
  action: string,
  requestId: string,
  details: Record<string, unknown> = {}
) {
  const timestamp = new Date().toISOString();
  const message = {
    timestamp,
    requestId,
    level,
    wixEventId,
    action,
    ...details,
  };
  console[level === "error" ? "error" : "log"](JSON.stringify(message));
}

export const handler = async (req: Request): Promise<Response> => {
  const requestId = crypto.randomUUID();
  const clientIp =
    req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";

  // SECURITY: Check rate limit
  if (!checkRateLimit(clientIp)) {
    logWebhookEvent("warn", "unknown", "rate_limit_exceeded", requestId, {
      clientIp,
    });
    return new Response(
      JSON.stringify({ error: "Invalid request" }),
      { status: 429, headers: corsHeaders }
    );
  }

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Invalid request" }),
      { status: 405, headers: corsHeaders }
    );
  }

  try {
    // SECURITY: Check request body size (100KB limit)
    const contentLength = req.headers.get("content-length");
    const maxSize = 1024 * 100; // 100KB
    if (contentLength && parseInt(contentLength) > maxSize) {
      logWebhookEvent("warn", "unknown", "payload_too_large", requestId, {
        size: parseInt(contentLength),
        maxSize,
      });
      return new Response(
        JSON.stringify({ error: "Invalid request" }),
        { status: 413, headers: corsHeaders }
      );
    }

    // Extract and verify Bearer token
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      logWebhookEvent("warn", "unknown", "missing_authorization", requestId);
      return new Response(
        JSON.stringify({ error: "Invalid request" }),
        { status: 401, headers: corsHeaders }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const expectedToken = Deno.env.get("WIX_WEBHOOK_SECRET");

    if (!expectedToken) {
      logWebhookEvent(
        "error",
        "unknown",
        "webhook_secret_not_configured",
        requestId
      );
      return new Response(
        JSON.stringify({ error: "Invalid request" }),
        { status: 500, headers: corsHeaders }
      );
    }

    // SECURITY: Use constant-time comparison to prevent timing attacks
    if (!constantTimeCompare(token, expectedToken)) {
      logWebhookEvent("warn", "unknown", "unauthorized_webhook", requestId, {
        clientIp,
      });
      return new Response(
        JSON.stringify({ error: "Invalid request" }),
        { status: 401, headers: corsHeaders }
      );
    }

    // Parse request body
    let payload: WixEventPayload;
    try {
      payload = await req.json();
    } catch (e) {
      logWebhookEvent("warn", "unknown", "invalid_json", requestId);
      return new Response(
        JSON.stringify({ error: "Invalid request" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // SECURITY: Validate required fields and formats
    const requiredFields: (keyof WixEventPayload)[] = [
      "wixEventId",
      "title",
      "startDate",
      "location",
      "status",
    ];
    for (const field of requiredFields) {
      if (!payload[field]) {
        logWebhookEvent("warn", "unknown", "validation_failed", requestId);
        return new Response(
          JSON.stringify({ error: "Invalid request" }),
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // SECURITY: Validate date formats
    if (!isValidISO8601(payload.startDate)) {
      logWebhookEvent("warn", "unknown", "invalid_date_format", requestId);
      return new Response(
        JSON.stringify({ error: "Invalid request" }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (payload.endDate && !isValidISO8601(payload.endDate)) {
      logWebhookEvent("warn", "unknown", "invalid_date_format", requestId);
      return new Response(
        JSON.stringify({ error: "Invalid request" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate status enum
    if (!["draft", "published", "cancelled"].includes(payload.status)) {
      logWebhookEvent("warn", "unknown", "invalid_status", requestId);
      return new Response(
        JSON.stringify({ error: "Invalid request" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      logWebhookEvent(
        "error",
        payload.wixEventId,
        "supabase_config_missing",
        requestId
      );
      return new Response(
        JSON.stringify({ error: "Invalid request" }),
        { status: 500, headers: corsHeaders }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Derive status using same logic as frontend
    const appStatus = deriveStatus(payload);

    // Upsert event
    const { error } = await supabase.from("events").upsert(
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
      {
        onConflict: "wix_event_id",
      }
    );

    if (error) {
      logWebhookEvent(
        "error",
        payload.wixEventId,
        "upsert_failed",
        requestId
      );
      return new Response(
        JSON.stringify({ error: "Invalid request" }),
        { status: 500, headers: corsHeaders }
      );
    }

    // SECURITY: Don't log sensitive data (titles, descriptions)
    logWebhookEvent("info", payload.wixEventId, "sync_complete", requestId);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Event synced successfully",
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    logWebhookEvent(
      "error",
      "unknown",
      "handler_error",
      requestId
    );
    return new Response(
      JSON.stringify({ error: "Invalid request" }),
      { status: 500, headers: corsHeaders }
    );
  }
};
