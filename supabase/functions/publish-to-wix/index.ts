import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const WIX_API_BASE = "https://www.wixapis.com/blog/v3";
const WIX_SITE_ID = "ee97a2c1-f67d-495c-a09b-ef7b100310d6"; // Tiny Tulip Coffee

interface BlogPost {
  title: string;
  body: string;
  excerpt?: string;
  featured?: boolean;
}

serve(async (req) => {
  // Only allow POST
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const post: BlogPost = await req.json();

    // Validate required fields
    if (!post.title || !post.body) {
      return new Response(
        JSON.stringify({ error: "Title and body are required" }),
        { status: 400 }
      );
    }

    // Get Wix API token from environment
    const wixToken = Deno.env.get("WIX_API_TOKEN");
    if (!wixToken) {
      return new Response(
        JSON.stringify({ error: "Wix API token not configured" }),
        { status: 500 }
      );
    }

    // Step 1: Create a draft post
    const draftResponse = await fetch(`${WIX_API_BASE}/draft-posts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${wixToken}`,
      },
      body: JSON.stringify({
        draftPost: {
          title: post.title,
          excerpt:
            post.excerpt || extractExcerpt(post.body, 160),
          body: post.body,
          featured: post.featured ?? false,
        },
      }),
    });

    if (!draftResponse.ok) {
      const errorData = await draftResponse.text();
      console.error("Draft creation failed:", errorData);
      return new Response(
        JSON.stringify({
          error: `Failed to create draft: ${draftResponse.statusText}`,
          details: errorData,
        }),
        { status: draftResponse.status }
      );
    }

    const draftData = await draftResponse.json();
    const draftPostId = draftData.draftPost?.id;

    if (!draftPostId) {
      return new Response(
        JSON.stringify({ error: "No draft post ID returned from Wix" }),
        { status: 500 }
      );
    }

    // Step 2: Publish the draft post
    const publishResponse = await fetch(
      `${WIX_API_BASE}/draft-posts/${draftPostId}/publish`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${wixToken}`,
        },
      }
    );

    if (!publishResponse.ok) {
      const errorData = await publishResponse.text();
      console.error("Publish failed:", errorData);
      return new Response(
        JSON.stringify({
          error: `Failed to publish: ${publishResponse.statusText}`,
          details: errorData,
        }),
        { status: publishResponse.status }
      );
    }

    const publishData = await publishResponse.json();
    const postId = publishData.postId;

    if (!postId) {
      return new Response(
        JSON.stringify({ error: "No post ID returned from publish" }),
        { status: 500 }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        postId,
        message: `Post published successfully to Wix: ${post.title}`,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Publish error:", message);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

function extractExcerpt(body: string, maxLength: number = 160): string {
  const cleaned = body
    .replace(/^#+\s+/gm, "")
    .replace(/\*\*|__/g, "")
    .replace(/\*|_/g, "")
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
    .trim();

  const paragraphs = cleaned.split("\n\n");
  const excerpt = paragraphs[0] || cleaned;

  return excerpt.length > maxLength
    ? excerpt.substring(0, maxLength) + "…"
    : excerpt;
}
