import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ContentGenerationRequest {
  blogPostId: string;
  blogContent: string;
  template: "coffee_origin" | "seasonal_launch" | "community_update";
}

interface GeneratedContent {
  socialCaption: string;
  emailExcerpt: string;
  keywords: string[];
}

/**
 * Mock AI content generator.
 * In production, integrate with OpenAI, Anthropic, or similar.
 */
function generateContentVariants(
  content: string,
  template: string
): GeneratedContent {
  // Extract first 100 words for excerpt
  const words = content.split(/\s+/).slice(0, 100).join(" ");
  const emailExcerpt = `${words}...`;

  // Extract keywords (mock: first few nouns, or use real NLP)
  const keywords = extractKeywords(content);

  // Generate social caption based on template
  let socialCaption = "";
  switch (template) {
    case "coffee_origin":
      socialCaption = `☕ Discover the story behind our beans! ${keywords[0] || "coffee"} sourced with care. Read the full story: [link] #CoffeeOrigin #TinyTulip`;
      break;
    case "seasonal_launch":
      socialCaption = `🌟 New season, new flavors! Try our latest ${keywords[0] || "seasonal"} drink. Limited time only! #SeasonalDrink #TinyTulipCoffee`;
      break;
    case "community_update":
      socialCaption = `💛 Community spotlight! Check out what's brewing in our neighborhood. #CommunityLove #TinyTulip`;
      break;
    default:
      socialCaption = `Check out our latest blog post! #TinyTulipCoffee`;
  }

  return {
    socialCaption,
    emailExcerpt,
    keywords,
  };
}

/**
 * Extract keywords from content (mock implementation).
 * In production, use proper NLP library or API.
 */
function extractKeywords(content: string): string[] {
  // Simple mock: split by words, filter common words, take first 5
  const commonWords = new Set([
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "will",
    "would",
    "could",
    "should",
    "may",
    "might",
    "must",
    "can",
    "that",
    "this",
    "it",
    "of",
    "in",
    "to",
    "for",
    "with",
    "on",
    "at",
    "by",
    "from",
  ]);

  const words = content
    .toLowerCase()
    .split(/\W+/)
    .filter(
      (w) => w.length > 3 && !commonWords.has(w)
    )
    .slice(0, 5);

  return [...new Set(words)];
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
    // Authenticate with Bearer token
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid authorization header" }),
        { status: 401, headers: corsHeaders }
      );
    }

    const token = authHeader.substring(7);
    const expectedToken = Deno.env.get("WIX_WEBHOOK_SECRET");

    if (!expectedToken || token !== expectedToken) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: corsHeaders }
      );
    }

    // Parse request
    const request: ContentGenerationRequest = await req.json();

    if (!request.blogPostId || !request.blogContent || !request.template) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: blogPostId, blogContent, template",
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Generate content variants
    const generated = generateContentVariants(
      request.blogContent,
      request.template
    );

    // Initialize Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      // Return generated content even if DB unavailable
      return new Response(
        JSON.stringify({
          success: true,
          generatedContent: generated,
          stored: false,
          message: "Content generated (not stored - DB unavailable)",
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Update blog post with generated content
    const { error: updateError } = await supabase
      .from("blog_posts")
      .update({
        social_caption: generated.socialCaption,
        email_excerpt: generated.emailExcerpt,
        seo_keywords_generated: generated.keywords,
        updated_at: new Date().toISOString(),
      })
      .eq("id", request.blogPostId);

    if (updateError) {
      console.error("Blog update error:", updateError);
      // Return content even if update fails
      return new Response(
        JSON.stringify({
          success: true,
          generatedContent: generated,
          stored: false,
          message: `Content generated but not stored: ${updateError.message}`,
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    // Log content generation
    const { error: logError } = await supabase
      .from("content_generation_log")
      .insert([
        {
          blog_post_id: request.blogPostId,
          template_used: request.template,
          generated_caption: generated.socialCaption,
          generated_excerpt: generated.emailExcerpt,
          generated_keywords: generated.keywords,
          status: "success",
          generated_by: "mock",
          created_at: new Date().toISOString(),
        },
      ]);

    if (logError) {
      console.warn("Content generation log error:", logError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        generatedContent: generated,
        stored: true,
        message: "Content generated and stored successfully",
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
