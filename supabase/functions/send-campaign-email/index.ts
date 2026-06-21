import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
// Simple rate limiting
const requestCounts = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(identifier: string, maxRequests: number = 5, windowSeconds: number = 60): boolean {
  const now = Date.now();
  const record = requestCounts.get(identifier);

  if (!record || now > record.resetTime) {
    requestCounts.set(identifier, { count: 1, resetTime: now + windowSeconds * 1000 });
    return true;
  }

  if (record.count < maxRequests) {
    record.count++;
    return true;
  }

  return false;
}

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigins = [
    "https://tinytulipcoffee.com",
    "https://www.tinytulipcoffee.com",
  ];

  const isAllowed = origin && allowedOrigins.includes(origin);

  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : "null",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Max-Age": "86400",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
  };
}

interface SendEmailRequest {
  campaignId: string;
  recipientEmail: string;
  recipientName: string;
  eventId: string;
  variables: Record<string, string>;
}

/**
 * Replace variables in email template
 * {{clientName}} -> variable value
 */
function interpolateTemplate(template: string, variables: Record<string, string>): string {
  let result = template;
  Object.entries(variables).forEach(([key, value]) => {
    result = result.replace(new RegExp(`{{${key}}}`, "g"), value);
  });
  return result;
}

/**
 * Send email via Resend (or fallback to mock)
 */
async function sendEmailViaResend(
  recipientEmail: string,
  subject: string,
  body: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");

  if (!resendApiKey) {
    // Mock send if no API key configured
    console.log(
      `[MOCK EMAIL] To: ${recipientEmail}, Subject: ${subject}, Body length: ${body.length}`
    );
    return {
      success: true,
      messageId: `mock-${Date.now()}`,
    };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "noreply@tinytulipcoffee.com",
        to: recipientEmail,
        subject,
        html: `<p>${body.replace(/\n/g, "<br>")}</p>`,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Resend error:", error);
      return {
        success: false,
        error: `Resend API error: ${response.status}`,
      };
    }

    const data = await response.json() as any;
    return {
      success: true,
      messageId: data.id,
    };
  } catch (error) {
    console.error("Error sending email via Resend:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const payload: SendEmailRequest = await req.json();

    const { campaignId, recipientEmail, recipientName, eventId, variables } = payload;

    // Get authenticated user from Authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: corsHeaders }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return new Response(
        JSON.stringify({ error: "Invalid authorization token" }),
        { status: 401, headers: corsHeaders }
      );
    }

    // Check rate limit (5 emails per minute per user)
    const clientIp = req.headers.get("x-forwarded-for") || "unknown";
    if (!checkRateLimit(clientIp, 5, 60)) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded" }),
        { status: 429, headers: corsHeaders }
      );
    }

    // Validate
    if (!campaignId || !recipientEmail || !eventId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
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

    // Get user ID from token (using Supabase admin API)
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: corsHeaders }
      );
    }

    // Fetch campaign and verify ownership
    const { data: campaign, error: campaignError } = await supabase
      .from("email_campaigns")
      .select("*")
      .eq("id", campaignId)
      .eq("user_id", user.id)
      .single();

    if (campaignError || !campaign) {
      return new Response(
        JSON.stringify({ error: "Campaign not found or access denied" }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Fetch event for additional context
    const { data: event } = await supabase
      .from("events")
      .select("name, guest_count, location, date_start")
      .eq("id", eventId)
      .single();

    // Prepare variables with event data
    const fullVariables = {
      clientName: recipientName,
      eventName: event?.name || "your event",
      eventType: "event",
      eventDate: event?.date_start
        ? new Date(event.date_start).toLocaleDateString()
        : "TBD",
      guestCount: event?.guest_count?.toString() || "unknown",
      location: event?.location || "TBD",
      feedbackFormLink: `https://tinytulipcoffee.com/feedback?event=${eventId}`,
      ...variables,
    };

    // Interpolate template
    const subject = interpolateTemplate(campaign.subject, fullVariables);
    const body = interpolateTemplate(campaign.body, fullVariables);

    // Send email
    const sendResult = await sendEmailViaResend(recipientEmail, subject, body);

    if (!sendResult.success) {
      return new Response(JSON.stringify({ error: sendResult.error }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    // Log send in database
    const { error: logError } = await supabase.from("email_sends").insert({
      user_id: campaign.user_id,
      campaign_id: campaignId,
      event_id: eventId,
      recipient_email: recipientEmail,
      recipient_name: recipientName,
      resend_message_id: sendResult.messageId,
    });

    if (logError) {
      console.warn("Failed to log email send:", logError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        messageId: sendResult.messageId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
};
