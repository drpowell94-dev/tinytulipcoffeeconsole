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

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: corsHeaders }
    );
  }

  try {
    const { code, userId, state } = await req.json();

    if (!code || !userId) {
      return new Response(
        JSON.stringify({ error: "Missing code or userId" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Exchange code for access token
    const clientId = Deno.env.get("INSTAGRAM_CLIENT_ID");
    const clientSecret = Deno.env.get("INSTAGRAM_CLIENT_SECRET");
    const redirectUri = Deno.env.get("INSTAGRAM_REDIRECT_URI");

    const tokenResponse = await fetch(
      "https://graph.instagram.com/v18.0/oauth/access_token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId || "",
          client_secret: clientSecret || "",
          grant_type: "authorization_code",
          redirect_uri: redirectUri || "",
          code,
        }),
      }
    );

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error("Token exchange error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to exchange code for token" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const tokenData = await tokenResponse.json() as any;
    const accessToken = tokenData.access_token;
    const businessAccountId = tokenData.user_id;

    // Get Instagram user details
    const userDetailsResponse = await fetch(
      `https://graph.instagram.com/me?fields=username,name,profile_picture_url&access_token=${accessToken}`
    );

    let username = businessAccountId;
    let businessName = "";
    let profilePictureUrl = "";

    if (userDetailsResponse.ok) {
      const userDetails = await userDetailsResponse.json() as any;
      username = userDetails.username || businessAccountId;
      businessName = userDetails.name || "";
      profilePictureUrl = userDetails.profile_picture_url || "";
    }

    // Store token in Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: corsHeaders }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error: upsertError } = await supabase
      .from("instagram_integrations")
      .upsert(
        {
          user_id: userId,
          instagram_business_account_id: businessAccountId,
          instagram_access_token: accessToken,
          instagram_username: username,
          business_name: businessName,
          profile_picture_url: profilePictureUrl,
          is_active: true,
          connected_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (upsertError) {
      console.error("Database error:", upsertError);
      return new Response(
        JSON.stringify({ error: "Failed to store Instagram integration" }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Log activity
    await supabase.from("activity_log").insert({
      user_id: userId,
      action: "INSTAGRAM_CONNECTED",
      entity_type: "instagram_integration",
      entity_id: userId,
      changes: {
        username,
        business_account_id: businessAccountId,
      },
      created_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Instagram account connected",
        username,
        businessAccountId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: corsHeaders }
    );
  }
};
