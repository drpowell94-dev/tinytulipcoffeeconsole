import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigins = [
    "https://tinytulipcoffee.com",
    "https://www.tinytulipcoffee.com",
  ];

  const isAllowed = origin && allowedOrigins.includes(origin);

  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : "null",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Max-Age": "86400",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
  };
}

// Simple rate limiting
const requestCounts = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(identifier: string, maxRequests: number = 100, windowSeconds: number = 60): boolean {
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

// Verify Instagram webhook signature using HMAC-SHA256
async function verifyInstagramSignature(payload: string, signature: string, appSecret: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(appSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
    const hexSig = Array.from(new Uint8Array(sig))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    return hexSig === signature;
  } catch (error) {
    console.error("Error verifying signature:", error);
    return false;
  }
}

export const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

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
    // Rate limit (100 webhooks per minute per IP)
    const clientIp = req.headers.get("x-forwarded-for") || "unknown";
    if (!checkRateLimit(clientIp, 100, 60)) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded" }),
        { status: 429, headers: corsHeaders }
      );
    }

    // Get the raw body for signature verification
    const rawBody = await req.text();
    const payload = JSON.parse(rawBody);

    // Verify Instagram signature
    const signature = req.headers.get("x-hub-signature-256");
    const appSecret = Deno.env.get("INSTAGRAM_APP_SECRET");

    if (!signature || !appSecret) {
      console.error("Missing signature or app secret");
      return new Response(
        JSON.stringify({ error: "Invalid request" }),
        { status: 403, headers: corsHeaders }
      );
    }

    const isValidSignature = await verifyInstagramSignature(rawBody, signature.replace("sha256=", ""), appSecret);
    if (!isValidSignature) {
      console.error("Invalid signature");
      return new Response(
        JSON.stringify({ error: "Signature verification failed" }),
        { status: 403, headers: corsHeaders }
      );
    }

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
