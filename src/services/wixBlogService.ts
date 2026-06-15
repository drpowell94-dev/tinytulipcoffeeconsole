/**
 * Wix Blog API integration for publishing blog posts to the Wix site.
 * Handles creating draft posts and publishing them to the live blog.
 */

const WIX_SITE_ID = "ee97a2c1-f67d-495c-a09b-ef7b100310d6"; // Tiny Tulip Coffee
const WIX_API_BASE = "https://www.wixapis.com/blog/v3";

/**
 * Publish a blog post to Wix via secure edge function.
 * The Wix API token is managed server-side and never exposed to the client.
 */
export async function publishToWix(post: {
  title: string;
  body: string;
  excerpt?: string;
  featured?: boolean;
}): Promise<{ success: boolean; postId?: string; error?: string }> {
  try {
    const supabaseUrl = getSupabaseUrl();

    // Call the edge function which handles Wix API calls securely server-side
    const response = await fetch(
      `${supabaseUrl}/functions/v1/publish-to-wix`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: post.title,
          body: post.body,
          excerpt: post.excerpt || extractExcerpt(post.body, 160),
          featured: post.featured ?? false,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(
        errorData.error || `HTTP ${response.status}: ${response.statusText}`
      );
    }

    const data = await response.json();

    if (!data.success || !data.postId) {
      throw new Error(data.error || "Failed to publish post");
    }

    return { success: true, postId: data.postId };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Wix blog publish error:", message);
    return { success: false, error: message };
  }
}

/**
 * Extract a brief excerpt from the post body for the blog preview.
 */
function extractExcerpt(body: string, maxLength: number = 160): string {
  // Remove markdown headers and formatting
  const cleaned = body
    .replace(/^#+\s+/gm, "") // Remove headers
    .replace(/\*\*|__/g, "") // Remove bold
    .replace(/\*|_/g, "") // Remove italic
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1") // Convert links to text
    .trim();

  // Get first paragraph or first maxLength characters
  const paragraphs = cleaned.split("\n\n");
  const excerpt = paragraphs[0] || cleaned;

  return excerpt.length > maxLength
    ? excerpt.substring(0, maxLength) + "…"
    : excerpt;
}

/**
 * Get the Supabase URL for calling edge functions.
 * The Wix API token is managed server-side in edge functions.
 */
function getSupabaseUrl(): string {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (!url) {
    throw new Error("Supabase URL not configured. Set VITE_SUPABASE_URL.");
  }
  return url;
}

