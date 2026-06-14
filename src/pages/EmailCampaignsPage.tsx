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
      <div className="rounded-lg bg-accent/8 border border-accent/20 p-5">
        <p className="text-sm font-body font-semibold text-foreground mb-2">
          📧 Available Template Variables:
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs font-mono text-muted-foreground">
          <span>{'{{clientName}}'}</span>
          <span>{'{{eventName}}'}</span>
          <span>{'{{eventType}}'}</span>
          <span>{'{{eventDate}}'}</span>
          <span>{'{{guestCount}}'}</span>
          <span>{'{{location}}'}</span>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">
          These will be automatically filled from your lead information
        </p>
      </div>

      {/* Campaign list */}
      <div className="space-y-4">
        {campaigns.map(campaign => (
          <div
            key={campaign.id}
            className="rounded-lg border border-border bg-muted/20 overflow-hidden"
          >
            <button
              onClick={() => setExpandedId(expandedId === campaign.id ? null : campaign.id)}
              className="w-full flex items-center justify-between p-5 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 text-left">
                <Mail size={18} className="text-accent shrink-0" />
                <div className="min-w-0">
                  <h3 className="font-body font-semibold text-foreground truncate">
                    {campaign.name}
                  </h3>
                  <p className="text-xs text-muted-foreground truncate">
                    {campaign.subject}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {campaign.isActive ? (
                  <span className="px-2 py-1 rounded-full bg-green-600/20 text-green-600 dark:text-green-400 text-xs font-semibold">
                    Active
                  </span>
                ) : (
                  <span className="px-2 py-1 rounded-full bg-muted text-muted-foreground text-xs font-semibold">
                    Inactive
                  </span>
                )}
                <ChevronDown
                  size={18}
                  className={cn(
                    "transition-transform",
                    expandedId === campaign.id && "rotate-180"
                  )}
                />
              </div>
            </button>

            {expandedId === campaign.id && (
              <div className="border-t border-border p-5 space-y-4 bg-background/50">
                {editingId === campaign.id && editingCampaign ? (
                  // Edit mode
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-body font-semibold text-muted-foreground uppercase">
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
                      <label className="text-xs font-body font-semibold text-muted-foreground uppercase">
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

                    <label className="flex items-center gap-2 text-sm font-body">
                      <input
                        type="checkbox"
                        checked={editingCampaign.isActive !== false}
                        onChange={e =>
                          setEditingCampaign({
                            ...editingCampaign,
                            isActive: e.target.checked,
                          })
                        }
                        className="accent-accent"
                      />
                      <span className="text-foreground">Active campaign</span>
                    </label>

                    <div className="flex gap-2">
                      <button
                        onClick={handleSave}
                        className="flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 font-body font-semibold text-sm hover-scale active:scale-95 transition-all"
                      >
                        <Save size={14} /> Save
                      </button>
                      <button
                        onClick={handleCancel}
                        className="flex items-center gap-2 rounded-lg bg-muted/50 text-foreground px-4 py-2 font-body font-semibold text-sm hover:bg-muted/70 transition-colors"
                      >
                        <X size={14} /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  // View mode
                  <>
                    <div>
                      <p className="text-xs font-body font-semibold text-muted-foreground mb-1">
                        Subject:
                      </p>
                      <p className="text-sm font-body text-foreground bg-background/50 p-3 rounded">
                        {campaign.subject}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-body font-semibold text-muted-foreground mb-1">
                        Body:
                      </p>
                      <p className="text-sm font-body text-foreground bg-background/50 p-3 rounded whitespace-pre-wrap">
                        {campaign.body}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleToggleActive(campaign)}
                        className={cn(
                          "flex items-center gap-2 rounded-lg px-4 py-2 font-body font-semibold text-sm hover-scale active:scale-95 transition-all",
                          campaign.isActive
                            ? "bg-muted/50 text-foreground hover:bg-muted/70"
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
                        className="flex items-center gap-2 rounded-lg bg-accent text-accent-foreground px-4 py-2 font-body font-semibold text-sm hover-scale active:scale-95 transition-all"
                      >
                        <Send size={14} /> Send test
                      </button>
                      <button
                        onClick={() => handleEdit(campaign)}
                        className="flex items-center gap-2 rounded-lg bg-muted/50 text-foreground px-4 py-2 font-body font-semibold text-sm hover:bg-muted/70 transition-colors"
                      >
                        <Edit2 size={14} /> Edit
                      </button>
                    </div>

                    {sendForm?.campaignId === campaign.id && (
                      <div className="rounded-lg border border-border bg-background/50 p-4 space-y-3">
                        <p className="text-xs font-body font-semibold text-muted-foreground uppercase">
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
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSendTest(campaign)}
                            disabled={sending}
                            className="flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 font-body font-semibold text-sm hover-scale active:scale-95 transition-all disabled:opacity-50"
                          >
                            <Send size={14} /> {sending ? "Sending…" : "Send test"}
                          </button>
                          <button
                            onClick={() => setSendForm(null)}
                            className="flex items-center gap-2 rounded-lg bg-muted/50 text-foreground px-4 py-2 font-body font-semibold text-sm hover:bg-muted/70 transition-colors"
                          >
                            <X size={14} /> Cancel
                          </button>
                        </div>
                        {!isSupabaseEnabled && (
                          <p className="text-[10px] text-muted-foreground">
                            Live sending requires Supabase + Resend to be configured.
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
        <div className="rounded-lg bg-muted/20 p-12 text-center space-y-3">
          <Mail size={40} className="mx-auto text-muted-foreground" />
          <p className="font-body text-muted-foreground">
            No campaigns created yet. Default campaigns will be created when you receive your first lead.
          </p>
        </div>
      )}

      {/* Info section */}
      <div className="rounded-lg border border-accent/20 bg-accent/8 p-5 space-y-3">
        <h3 className="font-body font-semibold text-foreground">How Email Campaigns Work</h3>
        <ul className="space-y-2 text-sm font-body text-foreground">
          <li className="flex gap-2">
            <span className="font-bold text-accent">1.</span>
            <span>Lead receives <strong>Inquiry Confirmation</strong> immediately after booking request</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold text-accent">2.</span>
            <span>Follow-up emails on Day 3 and Day 7 to remind them about your service</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold text-accent">3.</span>
            <span>Post-event email with feedback request and referral incentive</span>
          </li>
        </ul>
        <p className="text-xs text-muted-foreground border-t border-accent/20 pt-3">
          💡 Tip: Customize these templates to match your brand voice. Default templates provided above can be edited anytime.
        </p>
      </div>
    </div>
  );
}
