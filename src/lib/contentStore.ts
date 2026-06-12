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
    id: "coffee-origin",
    name: "Coffee Origin Spotlight",
    starter:
      "## Meet Our Newest Origin\n\nThis month we're featuring beans from [REGION]. Grown at [ELEVATION], these beans bring notes of [TASTING NOTES].\n\n### The Story\n\n[Tell the farm/co-op story here]\n\n### How We Brew It\n\n[Brewing recommendations]\n\nCome try a cup at our next pop-up! 🌷",
  },
  {
    id: "seasonal-launch",
    name: "Seasonal Drink Launch",
    starter:
      "## Introducing: [DRINK NAME]\n\nOur new seasonal drink is here! Made with [INGREDIENTS], it's the perfect way to celebrate [SEASON].\n\n### What's In It\n\n[Ingredient highlights]\n\n### Available\n\n[Dates and locations]\n\nFind us at the farmers market this weekend! 🌷",
  },
  {
    id: "community-update",
    name: "Community Update",
    starter:
      "## What's Brewing at Tiny Tulip\n\nHey friends! Here's what we've been up to lately.\n\n### Recent Events\n\n[Recap recent pop-ups and markets]\n\n### Coming Up\n\n[Upcoming schedule]\n\n### Thank You\n\n[Community shout-outs]\n\nSee you soon! 🌷",
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
