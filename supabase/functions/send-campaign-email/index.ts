import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    // Fetch campaign
    const { data: campaign, error: campaignError } = await supabase
      .from("email_campaigns")
      .select("*")
      .eq("id", campaignId)
      .single();

    if (campaignError || !campaign) {
      return new Response(
        JSON.stringify({ error: "Campaign not found" }),
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
