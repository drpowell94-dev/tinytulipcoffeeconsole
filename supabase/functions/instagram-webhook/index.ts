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

  // Instagram sends a GET request with hub.challenge for verification
  if (req.method === "GET") {
    return handleVerification(req);
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: corsHeaders }
    );
  }

  try {
    const payload = await req.json();

    // Verify webhook token
    const verifyToken = Deno.env.get("INSTAGRAM_WEBHOOK_VERIFY_TOKEN");
    if (!verifyToken) {
      console.error("INSTAGRAM_WEBHOOK_VERIFY_TOKEN not configured");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: corsHeaders }
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

    // Process each entry in the webhook
    if (payload.entry && Array.isArray(payload.entry)) {
      for (const entry of payload.entry) {
        // Get Instagram page ID (which corresponds to user's business account)
        const pageId = entry.id;

        // Fetch the user associated with this Instagram account
        const { data: integrations, error: integrationError } = await supabase
          .from("instagram_integrations")
          .select("user_id")
          .eq("instagram_business_account_id", pageId);

        if (integrationError || !integrations || integrations.length === 0) {
          console.warn(`No user found for Instagram account ${pageId}`);
          continue;
        }

        const userId = integrations[0].user_id;

        // Process changes
        if (entry.changes && Array.isArray(entry.changes)) {
          for (const change of entry.changes) {
            // Handle comment events
            if (change.field === "comments") {
              await handleCommentEvent(supabase, userId, change.value);
            }

            // Handle mentions in captions
            if (change.field === "mentions") {
              await handleMentionEvent(supabase, userId, change.value);
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: corsHeaders }
    );
  }
};

/**
 * Handle GET request for webhook verification
 */
function handleVerification(req: Request): Response {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  const verifyToken = Deno.env.get("INSTAGRAM_WEBHOOK_VERIFY_TOKEN");

  if (mode === "subscribe" && token === verifyToken) {
    console.log("Webhook verified");
    return new Response(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return new Response("Forbidden", { status: 403 });
}

/**
 * Handle comment webhook event
 */
async function handleCommentEvent(
  supabase: any,
  userId: string,
  changeValue: any
): Promise<void> {
  try {
    const commentText = changeValue.text || "";
    const fromUsername = changeValue.from?.username;
    const fromId = changeValue.from?.id;

    if (!fromId || !fromUsername) {
      console.warn("Missing comment from info");
      return;
    }

    // Log the webhook event
    const { error: logError } = await supabase.from("instagram_webhook_events").insert({
      user_id: userId,
      event_type: "comment",
      webhook_payload: changeValue,
      processed: false,
    });

    if (logError) {
      console.warn("Failed to log webhook event:", logError);
    }

    // Check for trigger keywords
    const triggerKeywords = ["CATER", "CATERING", "MENU", "BOOKING", "EVENT", "AVAILABILITY"];
    const matchesKeyword = triggerKeywords.some((kw) =>
      commentText.toUpperCase().includes(kw)
    );

    if (!matchesKeyword) {
      console.log("Comment does not match trigger keywords, ignoring");
      return;
    }

    // Send DM reply
    const dmSuccess = await sendInstagramDM(
      userId,
      fromId,
      fromUsername,
      commentText
    );

    if (dmSuccess) {
      // Update webhook event as processed
      await supabase
        .from("instagram_webhook_events")
        .update({
          processed: true,
          action_taken: "dm_sent",
          processing_result: `DM sent to @${fromUsername}`,
        })
        .eq("webhook_payload", changeValue);
    }
  } catch (error) {
    console.error("Error handling comment event:", error);
  }
}

/**
 * Handle mention webhook event
 */
async function handleMentionEvent(
  supabase: any,
  userId: string,
  changeValue: any
): Promise<void> {
  try {
    // Log the mention event
    await supabase.from("instagram_webhook_events").insert({
      user_id: userId,
      event_type: "mention",
      webhook_payload: changeValue,
      processed: true,
    });
  } catch (error) {
    console.error("Error handling mention event:", error);
  }
}

/**
 * Send DM via Instagram Messaging API
 * Mock implementation - in production, would call real Instagram API
 */
async function sendInstagramDM(
  userId: string,
  recipientId: string,
  recipientUsername: string,
  triggerMessage: string
): Promise<boolean> {
  try {
    const bookingLink = `https://tinytulipcoffee.com/booking?source=instagram_dm&ref=${recipientUsername}`;
    const responseText = `Hi @${recipientUsername}! 👋 Thanks for your interest in catering! Check out our services and book here: ${bookingLink}`;

    console.log(`[INSTAGRAM DM] Sending to ${recipientUsername}: ${responseText}`);

    // In production, this would make a real API call to Instagram Messaging API
    // await fetch(`https://graph.instagram.com/v18.0/${recipientId}/messages?...`);

    // For now, just log it
    return true;
  } catch (error) {
    console.error("Error sending DM:", error);
    return false;
  }
}
