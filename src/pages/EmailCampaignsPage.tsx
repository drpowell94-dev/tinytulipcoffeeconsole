import { useState, useEffect } from "react";
import { Mail, Edit2, Send, ChevronDown, Save, X, Play, Pause } from "lucide-react";
import { toast } from "sonner";
import {
  getEmailCampaigns,
  saveEmailCampaign,
  sendEmailViaCampaign,
  DEFAULT_CAMPAIGNS,
  type EmailCampaign,
} from "@/services/emailCampaignService";
import { isSupabaseEnabled } from "@/services/supabase";
import { cn } from "@/lib/utils";

// Sample data used when sending a test so {{variables}} render to something real.
const SAMPLE_VARS: Record<string, string> = {
  clientName: "Jordan",
  eventName: "Summer Garden Party",
  eventType: "pop-up",
  eventDate: "Aug 15, 2026",
  guestCount: "50",
  location: "Riverside Park",
  feedbackFormLink: "https://tinytulipcoffee.com/feedback",
};

const input =
  "w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-accent/50";

export default function EmailCampaignsPage() {
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingCampaign, setEditingCampaign] = useState<Partial<EmailCampaign> | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sendForm, setSendForm] = useState<{ campaignId: string; name: string; email: string } | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    const data = await getEmailCampaigns("default-user"); // TODO: Use actual userId
    if (data && data.length > 0) {
      setCampaigns(data);
    } else {
      // No backend yet — fall back to the default templates so the campaigns
      // can still be reviewed, edited, and started.
      setCampaigns(
        Object.values(DEFAULT_CAMPAIGNS).map(t => ({
          id: `default-${t.triggerType}`,
          name: t.name,
          triggerType: t.triggerType,
          subject: t.subject,
          body: t.body,
          isActive: true,
        }))
      );
    }
  };

  const handleToggleActive = async (campaign: EmailCampaign) => {
    const nextActive = !campaign.isActive;
    setCampaigns(prev =>
      prev.map(c => (c.id === campaign.id ? { ...c, isActive: nextActive } : c))
    );
    await saveEmailCampaign("default-user", { ...campaign, isActive: nextActive });
    toast.success(
      nextActive
        ? `"${campaign.name}" started — it'll send automatically on its trigger`
        : `"${campaign.name}" paused`
    );
  };

  const handleSendTest = async (campaign: EmailCampaign) => {
    if (!sendForm || !sendForm.email.trim()) {
      toast.error("Recipient email is required");
      return;
    }
    if (!isSupabaseEnabled) {
      toast.info("Connect Supabase + Resend to send live emails — your template is ready to go.");
      setSendForm(null);
      return;
    }
    setSending(true);
    const result = await sendEmailViaCampaign(
      campaign.id,
      sendForm.email.trim(),
      sendForm.name.trim() || "there",
      "",
      { ...SAMPLE_VARS, clientName: sendForm.name.trim() || SAMPLE_VARS.clientName }
    );
    setSending(false);
    if (result.success) {
      toast.success(`Test email sent to ${sendForm.email.trim()}`);
      setSendForm(null);
    } else {
      toast.error(result.error || "Failed to send test email");
    }
  };

  const handleEdit = (campaign: EmailCampaign) => {
    setEditingId(campaign.id);
    setEditingCampaign({ ...campaign });
  };

  const handleSave = async () => {
    if (!editingCampaign || !editingCampaign.name || !editingCampaign.subject) {
      toast.error("Name and subject are required");
      return;
    }

    const saved = await saveEmailCampaign("default-user", {
      ...editingCampaign,
      id: editingId || undefined,
    });

    if (saved) {
      toast.success("Campaign saved!");
      setEditingId(null);
      setEditingCampaign(null);
      loadCampaigns();
    } else {
      toast.error("Failed to save campaign");
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditingCampaign(null);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl text-foreground">Email Campaigns</h1>
        <p className="text-sm text-muted-foreground font-body mt-1">
          Automated follow-ups to convert more leads
        </p>
      </div>

      {/* Available variables info */}
      <div className="rounded-xl bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/30 p-6 shadow-sm">
        <p className="text-sm font-body font-semibold text-foreground mb-4 flex items-center gap-2">
          <span>📧</span>
          <span>Available Template Variables</span>
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          {[
            { key: '{{clientName}}', desc: 'Client name' },
            { key: '{{eventName}}', desc: 'Event name' },
            { key: '{{eventType}}', desc: 'Event type' },
            { key: '{{eventDate}}', desc: 'Event date' },
            { key: '{{guestCount}}', desc: 'Guest count' },
            { key: '{{location}}', desc: 'Location' }
          ].map((variable, i) => (
            <div key={i} className="bg-background/60 rounded-lg p-3 border border-accent/20">
              <p className="text-xs font-mono text-accent font-semibold">{variable.key}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{variable.desc}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground bg-background/40 rounded-lg px-3 py-2">
          ✨ Variables are automatically filled from your lead information
        </p>
      </div>

      {/* Campaign list */}
      <div className="space-y-3">
        {campaigns.map(campaign => (
          <div
            key={campaign.id}
            className="rounded-lg border border-border bg-background shadow-sm hover:shadow-md transition-shadow overflow-hidden"
          >
            <button
              onClick={() => setExpandedId(expandedId === campaign.id ? null : campaign.id)}
              className="w-full flex items-center justify-between p-5 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-4 flex-1 text-left">
                <div className="p-2 rounded-lg bg-accent/10">
                  <Mail size={20} className="text-accent" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-body font-semibold text-foreground truncate">
                    {campaign.name}
                  </h3>
                  <p className="text-xs text-muted-foreground truncate mt-1">
                    {campaign.subject}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {campaign.isActive ? (
                  <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs font-semibold">
                    Active
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs font-semibold">
                    Inactive
                  </span>
                )}
                <ChevronDown
                  size={18}
                  className={cn(
                    "text-muted-foreground transition-transform",
                    expandedId === campaign.id && "rotate-180"
                  )}
                />
              </div>
            </button>

            {expandedId === campaign.id && (
              <div className="border-t border-border p-6 space-y-5 bg-muted/20">
                {editingId === campaign.id && editingCampaign ? (
                  // Edit mode
                  <div className="space-y-5">
                    <div>
                      <label className="text-xs font-body font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
                        Subject
                      </label>
                      <input
                        className={input}
                        value={editingCampaign.subject || ""}
                        onChange={e =>
                          setEditingCampaign({
                            ...editingCampaign,
                            subject: e.target.value,
                          })
                        }
                        placeholder="Email subject"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-body font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
                        Body
                      </label>
                      <textarea
                        className={cn(input, "font-mono text-xs min-h-64")}
                        value={editingCampaign.body || ""}
                        onChange={e =>
                          setEditingCampaign({
                            ...editingCampaign,
                            body: e.target.value,
                          })
                        }
                        placeholder="Email body (use {{variable}} syntax)"
                      />
                    </div>

                    <label className="flex items-center gap-2 text-sm font-body cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingCampaign.isActive !== false}
                        onChange={e =>
                          setEditingCampaign({
                            ...editingCampaign,
                            isActive: e.target.checked,
                          })
                        }
                        className="accent-accent cursor-pointer"
                      />
                      <span className="text-foreground font-medium">Active campaign</span>
                    </label>

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={handleSave}
                        className="flex items-center gap-2 rounded-lg bg-accent text-accent-foreground px-4 py-2.5 font-body font-semibold text-sm hover:opacity-90 active:scale-95 transition-all"
                      >
                        <Save size={14} /> Save Changes
                      </button>
                      <button
                        onClick={handleCancel}
                        className="flex items-center gap-2 rounded-lg bg-muted/70 text-foreground px-4 py-2.5 font-body font-semibold text-sm hover:bg-muted transition-colors"
                      >
                        <X size={14} /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  // View mode
                  <>
                    <div className="space-y-3">
                      <p className="text-xs font-body font-semibold text-muted-foreground uppercase tracking-wide">
                        Subject:
                      </p>
                      <p className="text-sm font-body text-foreground bg-background p-4 rounded-lg border border-border">
                        {campaign.subject}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <p className="text-xs font-body font-semibold text-muted-foreground uppercase tracking-wide">
                        Body:
                      </p>
                      <p className="text-sm font-body text-foreground bg-background p-4 rounded-lg border border-border whitespace-pre-wrap">
                        {campaign.body}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => handleToggleActive(campaign)}
                        className={cn(
                          "flex items-center gap-2 rounded-lg px-4 py-2.5 font-body font-semibold text-sm hover:opacity-90 active:scale-95 transition-all",
                          campaign.isActive
                            ? "bg-muted/70 text-foreground hover:bg-muted"
                            : "bg-primary text-primary-foreground"
                        )}
                      >
                        {campaign.isActive ? (
                          <>
                            <Pause size={14} /> Pause
                          </>
                        ) : (
                          <>
                            <Play size={14} /> Start Campaign
                          </>
                        )}
                      </button>
                      <button
                        onClick={() =>
                          setSendForm(
                            sendForm?.campaignId === campaign.id
                              ? null
                              : { campaignId: campaign.id, name: "", email: "" }
                          )
                        }
                        className="flex items-center gap-2 rounded-lg bg-accent text-accent-foreground px-4 py-2.5 font-body font-semibold text-sm hover:opacity-90 active:scale-95 transition-all"
                      >
                        <Send size={14} /> Send test
                      </button>
                      <button
                        onClick={() => handleEdit(campaign)}
                        className="flex items-center gap-2 rounded-lg bg-muted/70 text-foreground px-4 py-2.5 font-body font-semibold text-sm hover:bg-muted transition-colors"
                      >
                        <Edit2 size={14} /> Edit
                      </button>
                    </div>

                    {sendForm?.campaignId === campaign.id && (
                      <div className="rounded-lg border border-border bg-background p-5 space-y-4 mt-4">
                        <p className="text-xs font-body font-semibold text-muted-foreground uppercase tracking-wide">
                          Send a test of this email
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <input
                            className={input}
                            placeholder="Recipient name (optional)"
                            value={sendForm.name}
                            onChange={e => setSendForm({ ...sendForm, name: e.target.value })}
                          />
                          <input
                            className={input}
                            type="email"
                            placeholder="Recipient email *"
                            value={sendForm.email}
                            onChange={e => setSendForm({ ...sendForm, email: e.target.value })}
                          />
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleSendTest(campaign)}
                            disabled={sending}
                            className="flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2.5 font-body font-semibold text-sm hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Send size={14} /> {sending ? "Sending…" : "Send test"}
                          </button>
                          <button
                            onClick={() => setSendForm(null)}
                            className="flex items-center gap-2 rounded-lg bg-muted/70 text-foreground px-4 py-2.5 font-body font-semibold text-sm hover:bg-muted transition-colors"
                          >
                            <X size={14} /> Cancel
                          </button>
                        </div>
                        {!isSupabaseEnabled && (
                          <p className="text-[10px] text-muted-foreground bg-muted/30 rounded px-3 py-2">
                            💡 Live sending requires Supabase + Resend to be configured.
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Empty state */}
      {campaigns.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-accent/30 bg-accent/5 p-12 text-center space-y-4">
          <Mail size={48} className="mx-auto text-accent/60" />
          <div>
            <p className="font-body font-semibold text-foreground mb-2">No campaigns yet</p>
            <p className="text-sm text-muted-foreground">
              Default campaigns will be created when you receive your first lead
            </p>
          </div>
        </div>
      )}

      {/* Info section */}
      <div className="rounded-xl border border-accent/30 bg-gradient-to-br from-accent/8 to-accent/5 p-6 space-y-4 shadow-sm">
        <h3 className="font-body font-semibold text-foreground text-lg">How Email Campaigns Work</h3>
        <ul className="space-y-3">
          {[
            { number: '1', title: 'Inquiry Confirmation', desc: 'Lead receives confirmation immediately after booking request' },
            { number: '2', title: 'Smart Follow-ups', desc: 'Automated emails on Day 3 and Day 7 to keep your service top-of-mind' },
            { number: '3', title: 'Post-Event', desc: 'Send feedback requests and referral incentives after the event' }
          ].map((item, i) => (
            <li key={i} className="flex gap-3 text-sm font-body text-foreground">
              <span className="font-bold text-accent text-base w-6 h-6 flex items-center justify-center rounded-full bg-accent/10">
                {item.number}
              </span>
              <div>
                <p className="font-semibold">{item.title}</p>
                <p className="text-muted-foreground text-xs mt-1">{item.desc}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground border-t border-accent/20 pt-4 italic">
          💡 Tip: Customize templates to match your brand voice. All templates can be edited anytime.
        </p>
      </div>
    </div>
  );
}
