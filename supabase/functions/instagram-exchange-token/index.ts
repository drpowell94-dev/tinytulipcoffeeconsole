import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const INSTAGRAM_GRAPH_URL = "https://graph.instagram.com";

// Simple rate limiting
const requestCounts = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(identifier: string, maxRequests: number = 3, windowSeconds: number = 60): boolean {
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

export const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

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
    // Rate limit (3 attempts per minute per IP)
    const clientIp = req.headers.get("x-forwarded-for") || "unknown";
    if (!checkRateLimit(clientIp, 3, 60)) {
      return new Response(
        JSON.stringify({ error: "Too many attempts, please try again later" }),
        { status: 429, headers: corsHeaders }
      );
    }

    const { code } = await req.json();

    if (!code || typeof code !== "string" || code.length > 500) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid authorization code" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Get credentials from environment (backend-only, never exposed)
    const clientId = Deno.env.get("INSTAGRAM_CLIENT_ID");
    const clientSecret = Deno.env.get("INSTAGRAM_CLIENT_SECRET");
    const redirectUri = Deno.env.get("INSTAGRAM_REDIRECT_URI");

    if (!clientId || !clientSecret || !redirectUri) {
      console.error("Instagram configuration missing");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Exchange code for access token (backend-only operation)
    const tokenResponse = await fetch(
      `${INSTAGRAM_GRAPH_URL}/v18.0/oauth/access_token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
          code,
        }),
      }
    );

    if (!tokenResponse.ok) {
      console.error("Token exchange failed");
      return new Response(
        JSON.stringify({ error: "Failed to exchange token" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const tokenData = await tokenResponse.json() as any;
    const accessToken = tokenData.access_token;
    const businessAccountId = tokenData.user_id;

    // Get user details using the access token (use Authorization header, not URL param)
    const userDetailsResponse = await fetch(
      `${INSTAGRAM_GRAPH_URL}/me?fields=username,name,profile_picture_url`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    let username = businessAccountId;
    if (userDetailsResponse.ok) {
      const userDetails = await userDetailsResponse.json() as any;
      username = userDetails.username || businessAccountId;
    }

    return new Response(
      JSON.stringify({
        accessToken,
        businessAccountId,
        username,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error processing token exchange");
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: corsHeaders }
    );
  }
};
