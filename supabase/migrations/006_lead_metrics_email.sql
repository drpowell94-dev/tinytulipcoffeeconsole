-- Migration: Add lead tracking and email campaign support
-- Tracks response times, conversion metrics, and email campaigns

CREATE TABLE IF NOT EXISTS lead_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  lead_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  first_response_at TIMESTAMP,
  accepted_at TIMESTAMP,
  declined_at TIMESTAMP,
  converted_to_booking_at TIMESTAMP,
  conversion_status TEXT CHECK (conversion_status IN ('pending', 'accepted', 'declined', 'converted')) DEFAULT 'pending',
  source TEXT, -- 'instagram', 'wix_form', 'manual', 'referral'
  response_time_minutes INT,
  UNIQUE(lead_id)
);

CREATE TABLE IF NOT EXISTS email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL, -- 'inquiry_confirmation', 'follow_up_day3', 'follow_up_day7', 'post_event'
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  campaign_id UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  sent_at TIMESTAMP NOT NULL DEFAULT NOW(),
  opened_at TIMESTAMP,
  clicked_at TIMESTAMP,
  bounced BOOLEAN DEFAULT FALSE,
  resend_message_id TEXT UNIQUE
);

CREATE INDEX idx_lead_metrics_user_id ON lead_metrics(user_id);
CREATE INDEX idx_lead_metrics_conversion_status ON lead_metrics(user_id, conversion_status);
CREATE INDEX idx_lead_metrics_created_at ON lead_metrics(user_id, created_at);
CREATE INDEX idx_email_campaigns_user_id ON email_campaigns(user_id);
CREATE INDEX idx_email_sends_user_id ON email_sends(user_id);
CREATE INDEX idx_email_sends_sent_at ON email_sends(user_id, sent_at);
