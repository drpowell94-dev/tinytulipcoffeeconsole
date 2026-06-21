import { supabase, isSupabaseEnabled } from "./supabase";

/**
 * Instagram Graph API Service
 * Handles authentication, webhook processing, and content publishing
 */

// Constants
const INSTAGRAM_GRAPH_URL = "https://graph.instagram.com";
const INSTAGRAM_BUSINESS_API_VERSION = "v18.0";

export interface InstagramToken {
  accessToken: string;
  businessAccountId: string;
  username: string;
  expiryDate?: Date;
}

export interface InstagramComment {
  id: string;
  from: {
    username: string;
    id: string;
  };
  text: string;
  timestamp: string;
}

export interface InstagramWebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    time: number;
    changes: Array<{
      field: string;
      value: {
        comment_id?: string;
        text?: string;
        from?: {
          id: string;
          username: string;
        };
        [key: string]: any;
      };
    }>;
  }>;
}

/**
 * Get Instagram OAuth authorization URL from secure edge function.
 * Client IDs and secrets are managed server-side only.
 */
export async function generateInstagramAuthUrl(): Promise<string> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      console.error("Supabase URL not configured");
      return "";
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/instagram-auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get-auth-url" }),
    });

    if (!response.ok) {
      console.error("Failed to get Instagram auth URL:", response.statusText);
      return "";
    }

    const data = await response.json();
    return data.authUrl || "";
  } catch (error) {
    console.error("Error generating Instagram auth URL:", error);
    return "";
  }
}

/**
 * Exchange authorization code for access token via secure edge function.
 * Token exchange and client secret are managed server-side only.
 */
export async function exchangeCodeForToken(code: string, userId: string): Promise<InstagramToken | null> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      console.error("Supabase URL not configured");
      return null;
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/instagram-callback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, userId }),
    });

    if (!response.ok) {
      console.error("Token exchange failed:", response.statusText);
      return null;
    }

    const data = await response.json();
    if (!data.success) {
      console.error("Token exchange error:", data.error);
      return null;
    }

    return {
      accessToken: data.accessToken || data.access_token,
      businessAccountId: data.businessAccountId,
      username: data.username,
    };
  } catch (error) {
    console.error("Error exchanging code for token:", error);
    return null;
  }
}

/**
 * Store Instagram token in database
 */
export async function storeInstagramToken(
  userId: string,
  token: InstagramToken
): Promise<boolean> {
  if (!isSupabaseEnabled || !supabase) return false;

  try {
    const { error } = await supabase.from("instagram_integrations").upsert(
      {
        user_id: userId,
        instagram_business_account_id: token.businessAccountId,
        instagram_access_token: token.accessToken,
        instagram_username: token.username,
        token_expiry: token.expiryDate ? new Date(token.expiryDate).toISOString() : null,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    return !error;
  } catch (error) {
    console.error("Error storing Instagram token:", error);
    return false;
  }
}

/**
 * Get user's Instagram integration (token and account details)
 */
export async function getInstagramIntegration(userId: string): Promise<InstagramToken | null> {
  if (!isSupabaseEnabled || !supabase) return null;

  try {
    const { data, error } = await supabase
      .from("instagram_integrations")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .single();

    if (error || !data) {
      console.error("Instagram integration not found:", error?.message);
      return null;
    }

    // Check if token is expired
    if (data.token_expiry && new Date(data.token_expiry) < new Date()) {
      console.warn("Instagram token expired");
      // Token refresh logic would go here
      return null;
    }

    return {
      accessToken: data.instagram_access_token,
      businessAccountId: data.instagram_business_account_id,
      username: data.instagram_username,
      expiryDate: data.token_expiry ? new Date(data.token_expiry) : undefined,
    };
  } catch (error) {
    console.error("Error fetching Instagram integration:", error);
    return null;
  }
}

/**
 * Process incoming webhook event from Instagram
 */
export async function processWebhookEvent(
  userId: string,
  payload: InstagramWebhookPayload
): Promise<{ success: boolean; action?: string; error?: string }> {
  if (!isSupabaseEnabled || !supabase) {
    return { success: false, error: "Database unavailable" };
  }

  try {
    // Log webhook event
    const { error: logError } = await supabase.from("instagram_webhook_events").insert({
      user_id: userId,
      event_type: payload.entry[0]?.changes[0]?.field || "unknown",
      webhook_payload: payload,
      processed: false,
    });

    if (logError) {
      console.warn("Failed to log webhook:", logError);
    }

    // Process based on event type
    for (const entry of payload.entry) {
      for (const change of entry.changes) {
        if (change.field === "comments") {
          return await handleCommentWebhook(userId, change.value);
        }
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Error processing webhook:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Handle comment webhook (check for keywords, send DM reply)
 */
async function handleCommentWebhook(
  userId: string,
  commentData: any
): Promise<{ success: boolean; action?: string; error?: string }> {
  try {
    const text = commentData.text || "";
    const fromUserId = commentData.from?.id;
    const fromUsername = commentData.from?.username;

    // Keywords that trigger DM response
    const triggerKeywords = ["CATER", "MENU", "BOOKING", "EVENT"];
    const matchesKeyword = triggerKeywords.some((kw) =>
      text.toUpperCase().includes(kw)
    );

    if (!matchesKeyword || !fromUserId) {
      return { success: true, action: "comment_ignored" };
    }

    // Send DM reply
    const result = await sendInstagramDM(userId, fromUserId, fromUsername, text);

    if (result.success) {
      // Log the action
      await supabase?.from("instagram_webhook_events").update({
        processed: true,
        action_taken: "dm_sent",
        processing_result: JSON.stringify(result),
      });

      return { success: true, action: "dm_sent" };
    }

    return { success: false, error: "Failed to send DM" };
  } catch (error) {
    console.error("Error handling comment webhook:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Send direct message via Instagram Messaging API
 * Message is constructed safely with sanitized user input
 */
export async function sendInstagramDM(
  userId: string,
  recipientInstagramId: string,
  recipientUsername: string | undefined,
  triggerMessage: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const integration = await getInstagramIntegration(userId);
    if (!integration) {
      return { success: false, error: "No Instagram integration found" };
    }

    // Sanitize username - remove special characters that could be used for injection
    const safeUsername = sanitizeUsername(recipientUsername);
    if (!safeUsername) {
      return { success: false, error: "Invalid recipient username" };
    }

    // Generate booking link with validated URL parameters
    const bookingLink = buildSafeBookingLink(safeUsername);

    // Prepare message with sanitized data
    const messageText = `Hi @${safeUsername}! 👋 Thanks for your interest in catering! Check out our services and book here: ${bookingLink}`;

    // Mock API call - in production, this would call Instagram Messaging API
    console.log(`[MOCK DM] Sending to ${safeUsername}:`, messageText);

    if (!isSupabaseEnabled || !supabase) {
      return { success: false, error: "Database unavailable" };
    }

    // Store conversation with sanitized data
    const { error } = await supabase.from("instagram_dm_conversations").upsert(
      {
        user_id: userId,
        instagram_user_id: recipientInstagramId,
        instagram_username: safeUsername,
        last_message_at: new Date().toISOString(),
        conversation_history: [
          {
            from: "business",
            text: messageText,
            timestamp: new Date().toISOString(),
          },
        ],
      },
      { onConflict: "user_id,instagram_user_id" }
    );

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      messageId: `mock-${Date.now()}`,
    };
  } catch (error) {
    console.error("Error sending Instagram DM:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Sanitize Instagram username to prevent injection attacks
 * Only allows alphanumeric, dots, and underscores
 */
function sanitizeUsername(username: string | undefined): string {
  if (!username || typeof username !== "string") return "";
  // Remove any characters that aren't alphanumeric, dots, or underscores
  const sanitized = username.replace(/[^a-zA-Z0-9._]/g, "").trim();
  // Instagram usernames must be 1-30 characters
  return sanitized.length > 0 && sanitized.length <= 30 ? sanitized : "";
}

/**
 * Build a safe booking link with proper URL encoding
 */
function buildSafeBookingLink(username: string): string {
  const baseUrl = "https://tinytulipcoffee.com/booking";
  const params = new URLSearchParams({
    source: "instagram_dm",
    ref: username,
  });
  return `${baseUrl}?${params.toString()}`;
}

/**
 * Trigger Instagram Story post for event check-in
 */
export async function triggerInstagramStoryUpdate(
  userId: string,
  eventId: string
): Promise<{ success: boolean; storyId?: string; error?: string }> {
  if (!isSupabaseEnabled || !supabase) {
    return { success: false, error: "Database unavailable" };
  }

  try {
    // Fetch event details
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("*")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return { success: false, error: "Event not found" };
    }

    // Get Instagram integration
    const integration = await getInstagramIntegration(userId);
    if (!integration) {
      return { success: false, error: "No Instagram integration found" };
    }

    // Format event details for Story
    const storyText = formatEventForStory(event);

    // Mock API call to Instagram Content Publishing API
    console.log(`[MOCK STORY] Publishing event story for ${event.name}:`, storyText);

    // Create story publish log
    const storyId = `mock-story-${Date.now()}`;
    const { error: storyError } = await supabase.from("instagram_story_publishes").insert({
      user_id: userId,
      event_id: eventId,
      story_id: storyId,
      story_type: "event_checkin",
      text_content: storyText,
      status: "pending",
      published_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    });

    if (storyError) {
      return { success: false, error: storyError.message };
    }

    return {
      success: true,
      storyId,
    };
  } catch (error) {
    console.error("Error triggering Instagram story:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Format event details for Instagram Story
 */
function formatEventForStory(event: any): string {
  const eventDate = new Date(event.date_start).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return `☕ ${event.name}
📍 ${event.location}
📅 ${eventDate}
👥 ${event.guest_count || "??"} guests

Link in bio to book! 🎉`;
}

/**
 * Verify webhook token from Instagram
 */
export function verifyInstagramWebhook(token: string): boolean {
  const verifyToken = import.meta.env.VITE_INSTAGRAM_WEBHOOK_VERIFY_TOKEN;
  return token === verifyToken;
}
