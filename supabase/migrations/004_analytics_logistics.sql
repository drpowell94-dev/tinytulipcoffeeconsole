-- Migration 004: Analytics & Predictive Logistics
-- Adds tables for lead tracking, event logistics history, and insights

BEGIN;

-- Extend events table for lead tracking
ALTER TABLE events ADD COLUMN IF NOT EXISTS (
  source_lead_form TEXT CHECK (source_lead_form IN ('wix_website', 'direct_form', 'phone', 'email', null)),
  lead_uuid TEXT,
  client_notes TEXT,
  estimated_guest_count INTEGER,
  followup_required BOOLEAN DEFAULT true
);

-- Unique constraint on lead UUID (external form submission ID)
ALTER TABLE events ADD CONSTRAINT IF NOT EXISTS events_lead_uuid_unique UNIQUE (lead_uuid)
  WHERE lead_uuid IS NOT NULL;

-- Index pending leads for quick retrieval
CREATE INDEX IF NOT EXISTS idx_events_pending_leads
  ON events(status) WHERE status = 'inquiry' OR status = 'pending_lead';

CREATE INDEX IF NOT EXISTS idx_events_zip_code
  ON event_contacts(zip_code) WHERE zip_code IS NOT NULL;

-- Historical logistics data for predictive analysis
CREATE TABLE IF NOT EXISTS event_logistics_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  cups_used INTEGER,
  beans_used_lbs DECIMAL(10, 2),
  milk_used_liters DECIMAL(10, 2),
  ice_used_lbs DECIMAL(10, 2),
  lids_used INTEGER,
  napkins_used INTEGER,
  notes TEXT,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logistics_event ON event_logistics_history(event_id);
CREATE INDEX IF NOT EXISTS idx_logistics_recorded ON event_logistics_history(recorded_at);

-- Analytics cache table for dashboard insights (optional, can query events directly)
CREATE TABLE IF NOT EXISTS dashboard_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID,
  insight_type TEXT NOT NULL, -- 'no_upcoming_events', 'low_revenue_trend', 'pending_checklists'
  actionable_next_step TEXT NOT NULL,
  related_event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
  dismissed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '7 days'
);

CREATE INDEX IF NOT EXISTS idx_insights_type ON dashboard_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_insights_active
  ON dashboard_insights(created_at) WHERE dismissed_at IS NULL AND expires_at > NOW();

-- Table to track content generation operations for audit trail
CREATE TABLE IF NOT EXISTS content_generation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_post_id UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  template_used TEXT,
  generated_caption TEXT,
  generated_excerpt TEXT,
  generated_keywords TEXT[],
  status TEXT CHECK (status IN ('success', 'failed', 'pending')) DEFAULT 'pending',
  error_message TEXT,
  generated_by TEXT, -- 'openai', 'mock', 'manual'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_log_blog ON content_generation_log(blog_post_id);
CREATE INDEX IF NOT EXISTS idx_content_log_status ON content_generation_log(status);

COMMIT;
