import { supabase, isSupabaseEnabled } from "./supabase";

export interface EmailCampaign {
  id: string;
  name: string;
  triggerType: "inquiry_confirmation" | "follow_up_day3" | "follow_up_day7" | "post_event";
  subject: string;
  body: string;
  isActive: boolean;
}

/**
 * Default email templates
 */
export const DEFAULT_CAMPAIGNS = {
  inquiry_confirmation: {
    name: "Inquiry Confirmation",
    triggerType: "inquiry_confirmation" as const,
    subject: "Thanks for Your Interest in Tiny Tulip Catering! ☕",
    body: `Hi {{clientName}},

Thank you so much for your interest in Tiny Tulip Coffee catering for your {{eventType}} on {{eventDate}}.

We're excited to help make your event special! Here's what we offer:
• Fresh-brewed coffee & espresso
• Custom drink options
• Full barista setup
• Flexible service options

Your event details:
📅 Date: {{eventDate}}
👥 Guests: {{guestCount}}
📍 Location: {{location}}

Next steps:
1. Reply to this email with any questions
2. We'll send you a custom quote within 24 hours
3. Let's discuss timing and your drink preferences

Questions? Call us or reply to this email - we're here to help!

Best,
The Tiny Tulip Team ☕`,
  },
  follow_up_day3: {
    name: "Follow-up (3 Days)",
    triggerType: "follow_up_day3" as const,
    subject: "Still Interested in {{eventName}}? Let's Chat! 💬",
    body: `Hi {{clientName}},

Just checking in on your {{eventType}} for {{eventDate}}!

We haven't heard back yet, and we'd love to help make your event amazing.

Quick questions:
✓ Are you still moving forward?
✓ Do you have any questions about our service?
✓ Would a phone call be easier?

We're flexible and happy to work around your needs. Either way, we appreciate you thinking of us!

Looking forward to hearing from you.

Best,
The Tiny Tulip Team ☕

P.S. Worried about availability? Don't be - we keep space open for special events. Just let us know!`,
  },
  follow_up_day7: {
    name: "Final Follow-up (7 Days)",
    triggerType: "follow_up_day7" as const,
    subject: "Last Chance: {{eventName}} Booking",
    body: `Hi {{clientName}},

This is our last message about your {{eventType}} on {{eventDate}}.

We understand if your plans changed, and that's totally okay! But if you're still interested, now's the time to book.

Here's why we're perfect for your event:
✓ Experienced team (served 1000+ events)
✓ Customizable drink options
✓ Professional setup & cleanup
✓ Same-day flexibility

Ready to book? Just reply or call us today.

Not right now? No problem - save our contact info for next time. We'd love to work with you in the future!

Best,
The Tiny Tulip Team ☕`,
  },
  post_event: {
    name: "Post-Event Follow-up",
    triggerType: "post_event" as const,
    subject: "How Did We Do? We'd Love Your Feedback! ⭐",
    body: `Hi {{clientName}},

Thank you so much for choosing Tiny Tulip Coffee for {{eventName}}!

We had a blast serving {{guestCount}} people at your event. Your feedback helps us improve and means the world to us.

Would you mind taking 2 minutes to answer a few quick questions?
→ {{feedbackFormLink}}

As a thank you, here's a special offer:
🎁 15% off your next event booking
Use code: GRATEFUL15

Questions or special requests? Feel free to reach out - we'd love to hear from you!

Best,
The Tiny Tulip Team ☕

P.S. Know someone planning an event? Tell them about us! We offer referral discounts for both you and your friends.`,
  },
};

/**
 * Get all email campaigns for a user
 */
export async function getEmailCampaigns(userId: string): Promise<EmailCampaign[] | null> {
  if (!isSupabaseEnabled || !supabase) return null;

  try {
    const { data, error } = await supabase
      .from("email_campaigns")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching campaigns:", error);
      return null;
    }

    return data.map(c => ({
      id: c.id,
      name: c.name,
      triggerType: c.trigger_type,
      subject: c.subject,
      body: c.body,
      isActive: c.is_active,
    }));
  } catch (error) {
    console.error("Error getting email campaigns:", error);
    return null;
  }
}

/**
 * Create or update an email campaign
 */
export async function saveEmailCampaign(
  userId: string,
  campaign: Partial<EmailCampaign> & { id?: string }
): Promise<EmailCampaign | null> {
  if (!isSupabaseEnabled || !supabase) return null;

  try {
    const { data, error } = await supabase.from("email_campaigns").upsert(
      {
        id: campaign.id,
        user_id: userId,
        name: campaign.name,
        trigger_type: campaign.triggerType,
        subject: campaign.subject,
        body: campaign.body,
        is_active: campaign.isActive !== false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    if (error) {
      console.error("Error saving campaign:", error);
      return null;
    }

    return campaign as EmailCampaign;
  } catch (error) {
    console.error("Error saving email campaign:", error);
    return null;
  }
}

/**
 * Initialize default campaigns for a new user
 */
export async function initializeDefaultCampaigns(userId: string): Promise<boolean> {
  if (!isSupabaseEnabled || !supabase) return false;

  try {
    const campaigns = Object.values(DEFAULT_CAMPAIGNS).map(template => ({
      user_id: userId,
      name: template.name,
      trigger_type: template.triggerType,
      subject: template.subject,
      body: template.body,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from("email_campaigns").insert(campaigns);

    return !error;
  } catch (error) {
    console.error("Error initializing campaigns:", error);
    return false;
  }
}

/**
 * Send an email via Resend (requires API key in environment)
 */
export async function sendEmailViaCampaign(
  campaignId: string,
  recipientEmail: string,
  recipientName: string,
  eventId: string,
  variables: Record<string, string>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Call edge function to send email
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-campaign-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        campaignId,
        recipientEmail,
        recipientName,
        eventId,
        variables,
      }),
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Failed to send email: ${response.status}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      messageId: data.messageId,
    };
  } catch (error) {
    console.error("Error sending email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
