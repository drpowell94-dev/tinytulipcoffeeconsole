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
  "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring";

export default function ContentPage() {
  const [tab, setTab] = useState<Tab>("blog");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Content & Website</h1>
        <p className="text-sm text-muted-foreground font-body">
          Blog posts and quick website updates
        </p>
      </div>

      <div className="flex gap-2">
        <TabButton active={tab === "blog"} onClick={() => setTab("blog")}>✍️ Blog Generator</TabButton>
        <TabButton active={tab === "website"} onClick={() => setTab("website")}>🌐 Website Updater</TabButton>
      </div>

      {tab === "blog" ? <BlogGenerator /> : <WebsiteUpdater />}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl px-4 py-2 font-body font-semibold text-sm transition-colors ${
        active ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"
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
    <div className="grid lg:grid-cols-[1fr_280px] gap-4">
      <div className="rounded-2xl bg-card border border-border p-5 space-y-3 shadow-sm">
        <div className="grid sm:grid-cols-2 gap-3">
          <select className={input} value={template} onChange={e => applyTemplate(e.target.value)}>
            {BLOG_TEMPLATES.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <select className={input} value={tone} onChange={e => setTone(e.target.value as BlogTone)}>
            <option value="friendly">Tone: Friendly</option>
            <option value="professional">Tone: Professional</option>
            <option value="casual">Tone: Casual</option>
          </select>
        </div>
        <input className={input} placeholder="Post title *" value={title} onChange={e => setTitle(e.target.value)} />
        <input className={input} placeholder="SEO keywords (comma-separated)" value={keywords} onChange={e => setKeywords(e.target.value)} />
        <textarea
          className={`${input} font-mono text-xs leading-relaxed`}
          rows={14}
          value={body}
          onChange={e => setBody(e.target.value)}
        />
        <div className="flex items-center gap-2">
          <button
            onClick={handlePublish}
            className="flex items-center gap-1.5 rounded-xl bg-accent text-accent-foreground px-5 py-2 font-body font-semibold text-sm hover:opacity-90"
          >
            <Save size={15} /> Publish
          </button>
          <p className="text-xs font-body text-muted-foreground">
            {title.trim() ? "Drafts auto-save as you type" : "Add a title to enable auto-save"}
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-card border border-border p-4 shadow-sm h-fit">
        <p className="text-xs font-body font-semibold text-muted-foreground uppercase tracking-widest mb-3">
          📚 Posts ({posts.length})
        </p>
        {posts.length === 0 ? (
          <p className="text-sm font-body text-muted-foreground">No posts yet</p>
        ) : (
          <div className="space-y-2">
            {posts.map(post => (
              <div key={post.id} className="rounded-xl bg-muted/20 px-3 py-2 flex items-center justify-between gap-2">
                <button onClick={() => handleEdit(post)} className="text-left min-w-0 flex-1">
                  <p className="font-body font-semibold text-sm truncate">{post.title}</p>
                  <p className="text-[11px] font-body text-muted-foreground">
                    {post.status === "published" ? "✅ Published" : "📝 Draft"} ·{" "}
                    {new Date(post.updatedAt).toLocaleDateString()}
                  </p>
                </button>
                <button
                  onClick={() => setPosts(deletePost(post.id))}
                  className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive hover:text-destructive-foreground shrink-0"
                  aria-label={`Delete ${post.title}`}
                >
                  <Trash2 size={13} />
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
    <div className="rounded-2xl bg-card border border-border p-5 space-y-4 shadow-sm max-w-2xl">
      <div>
        <label className="text-xs font-body font-semibold text-muted-foreground uppercase tracking-widest">
          🕐 Operating Hours
        </label>
        <textarea
          className={`${input} mt-1.5`}
          rows={3}
          value={settings.hours}
          onChange={e => setSettings({ ...settings, hours: e.target.value })}
        />
      </div>
      <div>
        <label className="text-xs font-body font-semibold text-muted-foreground uppercase tracking-widest">
          🍂 Seasonal Menu (one item per line)
        </label>
        <textarea
          className={`${input} mt-1.5`}
          rows={4}
          value={settings.seasonalMenu}
          onChange={e => setSettings({ ...settings, seasonalMenu: e.target.value })}
        />
      </div>
      <div>
        <label className="text-xs font-body font-semibold text-muted-foreground uppercase tracking-widest">
          🚨 Alert Banner
        </label>
        <input
          className={`${input} mt-1.5`}
          placeholder='e.g. "Closed today for a private wedding"'
          value={settings.alertBanner}
          onChange={e => setSettings({ ...settings, alertBanner: e.target.value })}
        />
        <label className="flex items-center gap-2 mt-2 text-sm font-body">
          <input
            type="checkbox"
            checked={settings.alertActive}
            onChange={e => setSettings({ ...settings, alertActive: e.target.checked })}
            className="accent-[#e45b3c] w-4 h-4"
          />
          Show alert banner on website
        </label>
      </div>

      {/* Live preview */}
      {settings.alertActive && settings.alertBanner && (
        <div className="rounded-xl bg-accent text-accent-foreground text-center text-sm font-body font-semibold py-2 px-4">
          {settings.alertBanner}
        </div>
      )}

      <button
        onClick={handleSave}
        className="flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-5 py-2 font-body font-semibold text-sm hover:opacity-90"
      >
        <Globe size={15} /> Save Website Updates
      </button>
    </div>
  );
}
