import { uid } from "./storage";
import { supabase } from "@/services/supabase";

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

interface BlogPostRow {
  id: string;
  title: string;
  body: string | null;
  status: string | null;
  template: string | null;
  tone: string | null;
  keywords: string | null;
  updated_at: string;
}

function rowToPost(row: BlogPostRow): BlogPost {
  return {
    id: row.id,
    title: row.title,
    template: row.template ?? "",
    tone: (row.tone as BlogTone) ?? "friendly",
    keywords: row.keywords ?? "",
    body: row.body ?? "",
    status: (row.status as BlogPost["status"]) ?? "draft",
    updatedAt: row.updated_at,
  };
}

export async function loadPosts(): Promise<BlogPost[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .schema("coffee")
    .from("blog_posts")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) {
    console.warn("[contentStore] loadPosts failed:", error.message);
    return [];
  }
  return (data ?? []).map(rowToPost);
}

export async function savePost(post: Omit<BlogPost, "id" | "updatedAt"> & { id?: string }): Promise<BlogPost[]> {
  if (supabase) {
    const updatedAt = new Date().toISOString();
    const id = post.id ?? uid();
    const { error } = await supabase
      .schema("coffee")
      .from("blog_posts")
      .upsert(
        {
          id,
          title: post.title,
          template: post.template,
          tone: post.tone,
          keywords: post.keywords,
          body: post.body,
          status: post.status,
          updated_at: updatedAt,
        },
        { onConflict: "id" }
      );
    if (error) console.warn("[contentStore] savePost failed:", error.message);
  }
  return loadPosts();
}

export async function deletePost(id: string): Promise<BlogPost[]> {
  if (supabase) {
    const { error } = await supabase.schema("coffee").from("blog_posts").delete().eq("id", id);
    if (error) console.warn("[contentStore] deletePost failed:", error.message);
  }
  return loadPosts();
}

const DEFAULT_SITE_SETTINGS: WebsiteSettings = {
  hours: "Mon–Fri: 7am–2pm\nSat: 8am–12pm (farmers market)\nSun: Closed",
  seasonalMenu: "Lavender Latte\nStrawberry Matcha\nMaple Cold Brew",
  alertBanner: "",
  alertActive: false,
};

export async function loadSiteSettings(): Promise<WebsiteSettings> {
  if (!supabase) return DEFAULT_SITE_SETTINGS;
  const { data, error } = await supabase.schema("coffee").from("settings").select("*").eq("id", 1).maybeSingle();
  if (error) {
    console.warn("[contentStore] loadSiteSettings failed:", error.message);
    return DEFAULT_SITE_SETTINGS;
  }
  if (!data) return DEFAULT_SITE_SETTINGS;
  return {
    hours: data.hours ?? DEFAULT_SITE_SETTINGS.hours,
    seasonalMenu: data.seasonal_menu ?? DEFAULT_SITE_SETTINGS.seasonalMenu,
    alertBanner: data.alert_banner ?? DEFAULT_SITE_SETTINGS.alertBanner,
    alertActive: data.alert_active ?? DEFAULT_SITE_SETTINGS.alertActive,
  };
}

export async function saveSiteSettings(settings: WebsiteSettings): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .schema("coffee")
    .from("settings")
    .upsert(
      {
        id: 1,
        hours: settings.hours,
        seasonal_menu: settings.seasonalMenu,
        alert_banner: settings.alertBanner,
        alert_active: settings.alertActive,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
  if (error) console.warn("[contentStore] saveSiteSettings failed:", error.message);
}
