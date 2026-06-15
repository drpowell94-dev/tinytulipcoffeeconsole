import { useState, useEffect, useRef } from "react";
import { Trash2, Save, Globe, Sparkles, PenLine, ChevronDown, Share2, Mail, Tag, Instagram, LogIn } from "lucide-react";
import { toast } from "sonner";
import {
  BLOG_TEMPLATES,
  loadPosts,
  savePost,
  deletePost,
  loadSiteSettings,
  saveSiteSettings,
  type BlogPost,
  type BlogTone,
  type WebsiteSettings,
} from "@/lib/contentStore";
import { generateBlogDraft } from "@/lib/blogWriter";
import { generateInstagramAuthUrl } from "@/services/instagramService";
import { isSupabaseEnabled } from "@/services/supabase";

type Tab = "blog" | "website" | "social";

const input =
  "w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-accent/50";

export default function ContentPage() {
  const [tab, setTab] = useState<Tab>("blog");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl text-foreground">Content & Website</h1>
        <p className="text-sm text-muted-foreground font-body mt-1">
          Blog posts, website management, and social media
        </p>
      </div>

      <div className="flex gap-2 flex-wrap -mt-6">
        <TabButton active={tab === "blog"} onClick={() => setTab("blog")}>
          <PenLine size={15} strokeWidth={1.75} /> Blog
        </TabButton>
        <TabButton active={tab === "website"} onClick={() => setTab("website")}>
          <Globe size={15} strokeWidth={1.75} /> Website
        </TabButton>
        <TabButton active={tab === "social"} onClick={() => setTab("social")}>
          <Instagram size={15} strokeWidth={1.75} /> Social
        </TabButton>
      </div>

      {tab === "blog" && <BlogGenerator />}
      {tab === "website" && <WebsiteUpdater />}
      {tab === "social" && <SocialManager />}
    </div>
  );
}

function SocialManager() {
  return (
    <div className="space-y-6">
      {/* Instagram integration */}
      <div className="rounded-lg border border-accent/30 bg-gradient-to-r from-accent/10 via-accent/5 to-transparent p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <Instagram size={20} className="text-accent mt-1 shrink-0" strokeWidth={1.5} />
            <div>
              <h3 className="font-body font-semibold text-foreground">Connect Instagram</h3>
              <p className="text-xs text-muted-foreground font-body mt-1">
                Automatically post event updates and respond to catering inquiries from your Instagram comments.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              const authUrl = generateInstagramAuthUrl();
              if (!authUrl) {
                toast.error("Instagram credentials not configured. Add VITE_INSTAGRAM_CLIENT_ID to .env");
                return;
              }
              try {
                const url = new URL(authUrl);
                if (url.hostname === "graph.instagram.com" && url.pathname.includes("oauth")) {
                  window.location.href = authUrl;
                } else {
                  toast.error("Invalid Instagram authorization URL");
                }
              } catch {
                toast.error("Invalid Instagram authorization URL");
              }
            }}
            className="flex items-center gap-2 rounded-lg bg-accent text-accent-foreground px-4 py-2.5 font-body font-semibold text-sm hover-scale active:scale-95 transition-all shrink-0 whitespace-nowrap"
          >
            <LogIn size={14} strokeWidth={2} /> Connect
          </button>
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg px-4 py-2.5 font-body font-semibold text-sm transition-colors ${
        active ? "bg-primary text-primary-foreground" : "bg-muted/20 text-muted-foreground hover:text-foreground hover:bg-muted/35"
      }`}
    >
      {children}
    </button>
  );
}

function BlogGenerator() {
  const [posts, setPosts] = useState<BlogPost[]>(() => loadPosts());
  const [editingId, setEditingId] = useState<string | undefined>();
  const [title, setTitle] = useState("");
  const [template, setTemplate] = useState(BLOG_TEMPLATES[0].id);
  const [tone, setTone] = useState<BlogTone>("friendly");
  const [keywords, setKeywords] = useState("");
  const [body, setBody] = useState(BLOG_TEMPLATES[0].starter);
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [showGenerated, setShowGenerated] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<{
    socialCaption?: string;
    emailExcerpt?: string;
    keywords?: string[];
  }>({});
  const [generating, setGenerating] = useState(false);
  const autosave = useRef<number>();

  // Auto-save draft 2s after typing stops (only once a title exists)
  useEffect(() => {
    window.clearTimeout(autosave.current);
    if (!title.trim()) return;
    autosave.current = window.setTimeout(() => {
      const next = savePost({ id: editingId, title, template, tone, keywords, body, status });
      setPosts(next);
      if (!editingId) setEditingId(next[0].id);
    }, 2000);
    return () => window.clearTimeout(autosave.current);
  }, [title, template, tone, keywords, body, editingId, status]);

  const applyTemplate = (id: string) => {
    setTemplate(id);
    const t = BLOG_TEMPLATES.find(t => t.id === id);
    if (t && (!body.trim() || confirm("Replace current body with template starter?"))) {
      setBody(t.starter);
    }
  };

  const handleGenerate = async () => {
    const draft = generateBlogDraft(template, tone, keywords);
    if (!title.trim()) setTitle(draft.title);
    setBody(draft.body);
    toast.success("Draft written — give it your voice and publish");

    // AI content variants (social caption, email excerpt, SEO keywords) come
    // from a Supabase edge function. Skip the call entirely when there's no
    // backend so we don't fire a spurious error toast.
    if (!isSupabaseEnabled) return;

    setGenerating(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/content-generator`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${import.meta.env.VITE_WIX_WEBHOOK_SECRET || "demo"}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            blogPostId: editingId || "temp",
            blogContent: draft.body,
            template: template,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.generatedContent) {
          setGeneratedContent(data.generatedContent);
          setShowGenerated(true);
          toast.success("Content variants generated!");
        }
      } else {
        console.warn("Content generation failed:", response.status);
        toast.error("Couldn't generate content variants — try again later.");
      }
    } catch (err) {
      console.error("Content generation error:", err);
      toast.error("Couldn't generate content variants — try again later.");
    } finally {
      setGenerating(false);
    }
  };

  const handlePublish = () => {
    if (!title.trim()) {
      toast.error("Add a title first");
      return;
    }
    const next = savePost({ id: editingId, title, template, tone, keywords, body, status: "published" });
    setPosts(next);
    resetForm();
    toast.success("Post published!");
  };

  const resetForm = () => {
    setEditingId(undefined);
    setTitle("");
    setKeywords("");
    setBody(BLOG_TEMPLATES.find(t => t.id === template)?.starter ?? "");
    setStatus("draft");
  };

  const handleEdit = (post: BlogPost) => {
    setEditingId(post.id);
    setTitle(post.title);
    setTemplate(post.template);
    setTone(post.tone);
    setKeywords(post.keywords);
    setBody(post.body);
    setStatus(post.status);
  };

  return (
    <div className="grid lg:grid-cols-[1fr_280px] gap-6">
      <div className="rounded-lg bg-muted/20 p-5 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <select className={input} value={template} onChange={e => applyTemplate(e.target.value)}>
            {BLOG_TEMPLATES.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <select className={input} value={tone} onChange={e => setTone(e.target.value as BlogTone)}>
            <option value="friendly">Friendly</option>
            <option value="professional">Professional</option>
            <option value="casual">Casual</option>
          </select>
        </div>
        <input
          className={input}
          placeholder="Post title *"
          value={title}
          onChange={e => setTitle(e.target.value)}
          autoFocus
        />
        <input
          className={input}
          placeholder="SEO keywords (comma-separated)"
          value={keywords}
          onChange={e => setKeywords(e.target.value)}
        />
        <textarea
          className={`${input} font-mono text-xs leading-relaxed`}
          rows={14}
          value={body}
          onChange={e => setBody(e.target.value)}
        />

        {/* Generated content variants - prominent section */}
        <div className="rounded-lg bg-gradient-to-br from-accent/12 to-accent/8 border border-accent/25 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-accent" strokeWidth={2} />
              <h3 className="font-body font-semibold text-sm text-foreground">AI Content Variants</h3>
            </div>
            {(generatedContent.socialCaption || generatedContent.emailExcerpt || generatedContent.keywords) && (
              <button
                onClick={() => setShowGenerated(!showGenerated)}
                className="p-1 rounded hover:bg-accent/10 transition-colors"
              >
                <ChevronDown size={16} className={`transition-transform text-accent ${showGenerated ? "rotate-180" : ""}`} />
              </button>
            )}
          </div>

          {!generatedContent.socialCaption && !generatedContent.emailExcerpt && !generatedContent.keywords ? (
            <p className="text-xs font-body text-muted-foreground">
              Click "Generate variants" below to create social captions, email excerpts, and SEO keywords automatically.
            </p>
          ) : (
            showGenerated && (
              <div className="space-y-3 mt-3 pt-3 border-t border-accent/20">
                {generatedContent.socialCaption && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-body font-semibold text-accent">
                      <Share2 size={14} /> Social Caption
                    </div>
                    <p className="text-xs font-body text-foreground bg-background/70 p-2.5 rounded line-clamp-4 hover:line-clamp-none transition-all cursor-pointer">
                      {generatedContent.socialCaption}
                    </p>
                  </div>
                )}

                {generatedContent.emailExcerpt && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-body font-semibold text-accent">
                      <Mail size={14} /> Email Excerpt
                    </div>
                    <p className="text-xs font-body text-foreground bg-background/70 p-2.5 rounded line-clamp-4 hover:line-clamp-none transition-all cursor-pointer">
                      {generatedContent.emailExcerpt}
                    </p>
                  </div>
                )}

                {generatedContent.keywords && generatedContent.keywords.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-body font-semibold text-accent">
                      <Tag size={14} /> SEO Keywords
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {generatedContent.keywords.map((kw, idx) => (
                        <span key={idx} className="text-xs font-body bg-accent/20 text-accent rounded-full px-3 py-1.5 font-semibold border border-accent/30">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 rounded-lg bg-accent text-accent-foreground px-5 py-2.5 font-body font-semibold text-sm hover-scale active:scale-95 transition-all disabled:opacity-50"
          >
            <Sparkles size={16} strokeWidth={1.75} /> {generating ? "Generating..." : "Generate variants"}
          </button>
          <button
            onClick={handlePublish}
            className="flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-5 py-2.5 font-body font-semibold text-sm hover-scale active:scale-95 transition-all"
          >
            <Save size={16} strokeWidth={1.5} /> Publish
          </button>
          <button
            onClick={() => {
              handlePublish();
              toast.promise(
                new Promise(resolve => setTimeout(resolve, 800)),
                {
                  loading: "Syncing to website...",
                  success: "Live on website! ✨",
                  error: "Sync unavailable",
                }
              );
            }}
            className="flex items-center gap-2 rounded-lg bg-secondary text-secondary-foreground px-5 py-2.5 font-body font-semibold text-sm hover-scale active:scale-95 transition-all"
          >
            <Globe size={16} strokeWidth={1.5} /> Website
          </button>
          <p className="text-xs font-body text-muted-foreground">
            {title.trim() ? "Auto-saving" : "Add title to auto-save"}
          </p>
        </div>
      </div>

      <div className="rounded-lg bg-muted/20 p-4 h-fit space-y-3">
        <p className="text-xs font-body font-semibold text-muted-foreground uppercase tracking-widest">
          Posts ({posts.length})
        </p>
        {posts.length === 0 ? (
          <p className="text-sm font-body text-muted-foreground">None yet</p>
        ) : (
          <div className="space-y-2">
            {posts.map(post => (
              <div key={post.id} className="rounded-lg bg-background/50 px-3 py-3 flex items-center justify-between gap-2">
                <button onClick={() => handleEdit(post)} className="text-left min-w-0 flex-1">
                  <p className="font-body font-semibold text-sm truncate">{post.title}</p>
                  <p className="text-[10px] font-body text-muted-foreground mt-0.5">
                    <span className={post.status === "published" ? "text-accent font-semibold" : ""}>
                      {post.status === "published" ? "Published" : "Draft"}
                    </span>{" "}
                    · {new Date(post.updatedAt).toLocaleDateString()}
                  </p>
                </button>
                <button
                  onClick={() => setPosts(deletePost(post.id))}
                  className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0"
                  aria-label={`Delete ${post.title}`}
                >
                  <Trash2 size={14} strokeWidth={1.5} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function WebsiteUpdater() {
  const [settings, setSettings] = useState<WebsiteSettings>(() => loadSiteSettings());

  const handleSave = () => {
    saveSiteSettings(settings);
    toast.success("Website settings saved");
  };

  return (
    <div className="rounded-lg bg-muted/20 p-5 space-y-6 max-w-2xl">
      <div>
        <label className="text-xs font-body font-semibold text-muted-foreground uppercase tracking-widest mb-2 block">
          Operating Hours
        </label>
        <textarea
          className={input}
          rows={3}
          value={settings.hours}
          onChange={e => setSettings({ ...settings, hours: e.target.value })}
        />
      </div>
      <div>
        <label className="text-xs font-body font-semibold text-muted-foreground uppercase tracking-widest mb-2 block">
          Seasonal Menu
        </label>
        <textarea
          className={input}
          rows={4}
          placeholder="One item per line"
          value={settings.seasonalMenu}
          onChange={e => setSettings({ ...settings, seasonalMenu: e.target.value })}
        />
      </div>
      <div>
        <label className="text-xs font-body font-semibold text-muted-foreground uppercase tracking-widest mb-3 block">
          Alert Banner
        </label>
        <input
          className={input}
          placeholder='e.g., "Closed for a private event"'
          value={settings.alertBanner}
          onChange={e => setSettings({ ...settings, alertBanner: e.target.value })}
        />
        <label className="flex items-center gap-2 mt-3 text-sm font-body">
          <input
            type="checkbox"
            checked={settings.alertActive}
            onChange={e => setSettings({ ...settings, alertActive: e.target.checked })}
            className="accent-accent w-4 h-4"
          />
          Show banner
        </label>
      </div>

      {/* Live preview */}
      {settings.alertActive && settings.alertBanner && (
        <div className="rounded-lg bg-accent text-accent-foreground text-center text-sm font-body font-semibold py-3 px-4">
          {settings.alertBanner}
        </div>
      )}

      <button
        onClick={handleSave}
        className="flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-6 py-3 font-body font-semibold text-sm hover-scale active:scale-95 transition-all"
      >
        <Globe size={16} strokeWidth={1.5} /> Save Updates
      </button>
    </div>
  );
}
