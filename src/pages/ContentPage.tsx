import { useState, useEffect, useRef } from "react";
import { Trash2, Save, Globe } from "lucide-react";
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

type Tab = "blog" | "website";

const input =
  "w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-accent/50";

export default function ContentPage() {
  const [tab, setTab] = useState<Tab>("blog");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl text-foreground">Content & Website</h1>
        <p className="text-sm text-muted-foreground font-body mt-1">
          Blog posts and website management
        </p>
      </div>

      <div className="flex gap-2">
        <TabButton active={tab === "blog"} onClick={() => setTab("blog")}>✍️ Blog</TabButton>
        <TabButton active={tab === "website"} onClick={() => setTab("website")}>🌐 Website</TabButton>
      </div>

      {tab === "blog" ? <BlogGenerator /> : <WebsiteUpdater />}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-4 py-2.5 font-body font-semibold text-sm transition-colors ${
        active ? "bg-accent text-accent-foreground" : "bg-muted/20 text-muted-foreground hover:text-foreground hover:bg-muted/35"
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
  const autosave = useRef<number>();

  // Auto-save draft 2s after typing stops (only once a title exists)
  useEffect(() => {
    window.clearTimeout(autosave.current);
    if (!title.trim()) return;
    autosave.current = window.setTimeout(() => {
      const next = savePost({ id: editingId, title, template, tone, keywords, body, status: "draft" });
      setPosts(next);
      if (!editingId) setEditingId(next[0].id);
    }, 2000);
    return () => window.clearTimeout(autosave.current);
  }, [title, template, tone, keywords, body, editingId]);

  const applyTemplate = (id: string) => {
    setTemplate(id);
    const t = BLOG_TEMPLATES.find(t => t.id === id);
    if (t && (!body.trim() || confirm("Replace current body with template starter?"))) {
      setBody(t.starter);
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
    toast.success("Post published! 🌷");
  };

  const resetForm = () => {
    setEditingId(undefined);
    setTitle("");
    setKeywords("");
    setBody(BLOG_TEMPLATES.find(t => t.id === template)?.starter ?? "");
  };

  const handleEdit = (post: BlogPost) => {
    setEditingId(post.id);
    setTitle(post.title);
    setTemplate(post.template);
    setTone(post.tone);
    setKeywords(post.keywords);
    setBody(post.body);
  };

  return (
    <div className="grid lg:grid-cols-[1fr_300px] gap-6">
      <div className="rounded-lg bg-muted/20 p-6 space-y-4">
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
        <div className="flex items-center gap-3">
          <button
            onClick={handlePublish}
            className="flex items-center gap-2 rounded-lg bg-accent text-accent-foreground px-5 py-2.5 font-body font-semibold text-sm hover-scale active:scale-95 transition-all"
          >
            <Save size={16} strokeWidth={1.5} /> Publish
          </button>
          <p className="text-xs font-body text-muted-foreground">
            {title.trim() ? "Auto-saving" : "Add title to auto-save"}
          </p>
        </div>
      </div>

      <div className="rounded-lg bg-muted/20 p-5 h-fit">
        <p className="text-xs font-body font-semibold text-muted-foreground uppercase tracking-widest mb-4">
          📚 Posts ({posts.length})
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
                    {post.status === "published" ? "✅" : "📝"} {new Date(post.updatedAt).toLocaleDateString()}
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
    toast.success("Website settings saved! 🌐");
  };

  return (
    <div className="rounded-lg bg-muted/20 p-6 space-y-6 max-w-2xl">
      <div>
        <label className="text-xs font-body font-semibold text-muted-foreground uppercase tracking-widest mb-2 block">
          🕐 Operating Hours
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
          🍂 Seasonal Menu
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
          🚨 Alert Banner
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
