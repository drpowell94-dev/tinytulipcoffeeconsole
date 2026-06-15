/**
 * Wix Blog API integration for publishing blog posts to the Wix site.
 * Handles creating draft posts and publishing them to the live blog.
 */

const WIX_SITE_ID = "ee97a2c1-f67d-495c-a09b-ef7b100310d6"; // Tiny Tulip Coffee
const WIX_API_BASE = "https://www.wixapis.com/blog/v3";

/**
 * Publish a blog post to Wix by creating a draft and publishing it.
 */
export async function publishToWix(post: {
  title: string;
  body: string;
  excerpt?: string;
  featured?: boolean;
}): Promise<{ success: boolean; postId?: string; error?: string }> {
  try {
    // Step 1: Create a draft post
    const draftResponse = await fetch(`${WIX_API_BASE}/draft-posts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getWixToken()}`,
      },
      body: JSON.stringify({
        draftPost: {
          title: post.title,
          excerpt: post.excerpt || extractExcerpt(post.body, 160),
          body: post.body,
          featured: post.featured ?? false,
        },
      }),
    });

    if (!draftResponse.ok) {
      const errorData = await draftResponse.json().catch(() => ({}));
      throw new Error(
        `Failed to create draft: ${draftResponse.statusText} - ${JSON.stringify(errorData)}`
      );
    }

    const draftData = await draftResponse.json();
    const draftPostId = draftData.draftPost?.id;

    if (!draftPostId) {
      throw new Error("No draft post ID returned from Wix");
    }

    // Step 2: Publish the draft post
    const publishResponse = await fetch(
      `${WIX_API_BASE}/draft-posts/${draftPostId}/publish`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getWixToken()}`,
        },
      }
    );

    if (!publishResponse.ok) {
      const errorData = await publishResponse.json().catch(() => ({}));
      throw new Error(
        `Failed to publish: ${publishResponse.statusText} - ${JSON.stringify(errorData)}`
      );
    }

    const publishData = await publishResponse.json();
    const postId = publishData.postId;

    if (!postId) {
      throw new Error("No post ID returned from publish");
    }

    return { success: true, postId };
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
 * Get the Wix API token from environment or storage.
 * In production, this should come from secure OAuth flow with Wix.
 */
function getWixToken(): string {
  // Try environment variable first
  const envToken = import.meta.env.VITE_WIX_API_TOKEN as string | undefined;
  if (envToken) return envToken;

  // Fall back to localStorage for user-provided token
  const storedToken = localStorage.getItem("wix-api-token");
  if (storedToken) return storedToken;

  // No token available
  throw new Error(
    "Wix API token not configured. Set VITE_WIX_API_TOKEN or authenticate via Wix OAuth."
  );
}

/**
 * Store a Wix API token (for OAuth flow).
 */
export function setWixToken(token: string): void {
  localStorage.setItem("wix-api-token", token);
}

/**
 * Clear stored Wix token.
 */
export function clearWixToken(): void {
  localStorage.removeItem("wix-api-token");
}
