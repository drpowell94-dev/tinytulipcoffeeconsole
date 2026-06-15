import { loadJSON, saveJSON, uid } from "./storage";

export type BlogTone = "friendly" | "professional" | "casual";

export interface BlogPost {
  id: string;
  title: string;
  template: string;
  tone: BlogTone;
  keywords: string;
  body: string;
  status: "draft" | "published";
  updatedAt: string;
}

export interface BlogTemplate {
  id: string;
  name: string;
  starter: string;
}

export const BLOG_TEMPLATES: BlogTemplate[] = [
  {
    id: "canned-latte-feature",
    name: "Canned Latte Product Spotlight",
    starter:
      "## [LATTE FLAVOR] Canned Latte: Cold, Crafted, Ready\n\nOur premium canned lattes are [FLAVOR PROFILE]. Perfect for [OCCASION].\n\n### What Makes Them Different\n\n[Why our canned lattes stand out—quality, taste, convenience]\n\n### How to Enjoy\n\nChilled straight from the can or poured over ice. No preparation needed.\n\n### Where to Find\n\nShop online, grab at pop-ups, or discover us at [LOCATION].\n\nTaste the difference. 🌷",
  },
  {
    id: "popup-event-announcement",
    name: "Graffiti Streetwear Pop-Up Announcement",
    starter:
      "## Mobile Iced Coffee Meets [EVENT/LOCATION] Vibes\n\nWe're popping up at [EVENT NAME] with fresh, cold-brew excellence and the energy of graffiti streetwear culture.\n\n### What's On the Menu\n\n[Feature canned lattes, seasonal iced offerings, and limited collaborations]\n\n### The Experience\n\n[Describe the vibe—merging coffee culture with streetwear aesthetics]\n\n### When & Where\n\n[Date, time, and location]\n\nBring your crew. 🌷",
  },
  {
    id: "community-update",
    name: "Community Update",
    starter:
      "## What's Brewing at Tiny Tulip\n\nHey friends! Here's what we've been up to lately.\n\n### Recent Pop-Ups & Collabs\n\n[Recap recent events, partnerships, and community moments]\n\n### Coming Up\n\n[Upcoming pop-up schedule and new flavors]\n\n### Thank You\n\n[Community shout-outs and customer stories]\n\nSee you at the next pop-up! 🌷",
  },
];

export interface WebsiteSettings {
  hours: string;
  seasonalMenu: string;
  alertBanner: string;
  alertActive: boolean;
}

const POSTS_KEY = "tt-blog-posts";
const SITE_KEY = "tt-website-settings";

export function loadPosts(): BlogPost[] {
  return loadJSON<BlogPost[]>(POSTS_KEY, []);
}

export function savePost(post: Omit<BlogPost, "id" | "updatedAt"> & { id?: string }): BlogPost[] {
  const posts = loadPosts();
  const updatedAt = new Date().toISOString();
  if (post.id) {
    const next = posts.map(p => (p.id === post.id ? { ...p, ...post, updatedAt } as BlogPost : p));
    saveJSON(POSTS_KEY, next);
    return next;
  }
  const created: BlogPost = { ...post, id: uid(), updatedAt } as BlogPost;
  posts.unshift(created);
  saveJSON(POSTS_KEY, posts);
  return posts;
}

export function deletePost(id: string): BlogPost[] {
  const posts = loadPosts().filter(p => p.id !== id);
  saveJSON(POSTS_KEY, posts);
  return posts;
}

export function loadSiteSettings(): WebsiteSettings {
  return loadJSON<WebsiteSettings>(SITE_KEY, {
    hours: "Mon–Fri: 7am–2pm\nSat: 8am–12pm (farmers market)\nSun: Closed",
    seasonalMenu: "Lavender Latte\nStrawberry Matcha\nMaple Cold Brew",
    alertBanner: "",
    alertActive: false,
  });
}

export function saveSiteSettings(settings: WebsiteSettings) {
  saveJSON(SITE_KEY, settings);
}
