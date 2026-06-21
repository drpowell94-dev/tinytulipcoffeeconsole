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
      "## Introducing Our New Canned Latte\n\nWe're thrilled to announce [PRODUCT NAME] — a cold-crafted latte in a can. No shortcuts, no artificial anything, just real espresso and milk.\n\n### What Makes It Different\n\n[Highlight the product: texture, taste, ingredients]\n\n### Where to Find It\n\nAvailable at our pop-ups and farmers markets starting [DATE]. Limited quantity while supplies last.\n\n### Try It First\n\nCome say hi at the next event — first taste is on us. 🌷",
  },
  {
    id: "popup-event-announcement",
    name: "Resident Event Pop-Up Announcement",
    starter:
      "## Pop-Up at [RESIDENT EVENT NAME]\n\nWe're bringing the cart to [NEIGHBORHOOD/COMMUNITY]. Come hang with us and the folks who make this place what it is.\n\n### What's Happening\n\n[Describe the event, the vibe, the community]\n\n### When & Where\n\n[Date], [Time], [Location]\n\n### What We're Pouring\n\n[Menu highlights for this event]\n\nWe'll be here all day. See you there! 🌷",
  },
  {
    id: "community-update",
    name: "Community Update",
    starter:
      "## What's Brewing at Tiny Tulip\n\nHey friends! Here's what we've been up to lately.\n\n### Where We've Been\n\n[Recap recent pop-ups, markets, resident events]\n\n### Where We're Going\n\n[Upcoming events and dates]\n\n### Thank You\n\n[Community shout-outs and appreciation]\n\nPurely a pop-up, where the people are. See you soon! 🌷",
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
