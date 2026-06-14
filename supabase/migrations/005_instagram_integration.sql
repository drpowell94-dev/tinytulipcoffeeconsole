-- Migration 005: Instagram Graph API Integration
-- Adds Instagram authentication and integration fields to users table

BEGIN;

-- Create Instagram integration table
CREATE TABLE IF NOT EXISTS instagram_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  instagram_business_account_id TEXT NOT NULL UNIQUE,
  instagram_access_token TEXT NOT NULL,
  token_expiry TIMESTAMP WITH TIME ZONE,
  token_refresh_available BOOLEAN DEFAULT true,
  instagram_username TEXT,
  business_name TEXT,
  business_category TEXT,
  profile_picture_url TEXT,
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_token_refresh TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_instagram_user ON instagram_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_instagram_account ON instagram_integrations(instagram_business_account_id);
CREATE INDEX IF NOT EXISTS idx_instagram_active ON instagram_integrations(is_active);

-- Create webhook events log for audit trail
CREATE TABLE IF NOT EXISTS instagram_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'comment', 'message', 'story_mention', etc.
  webhook_payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  processing_result TEXT,
  action_taken TEXT, -- 'dm_sent', 'story_posted', 'error', null if unprocessed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_webhook_user ON instagram_webhook_events(user_id);
CREATE INDEX IF NOT EXISTS idx_webhook_type ON instagram_webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_processed ON instagram_webhook_events(processed);

-- Create story publishing log for event updates
CREATE TABLE IF NOT EXISTS instagram_story_publishes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  story_id TEXT,
  story_type TEXT CHECK (story_type IN ('event_checkin', 'announcement', 'promo')),
  media_url TEXT,
  text_content TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  status TEXT CHECK (status IN ('draft', 'pending', 'published', 'failed')) DEFAULT 'draft',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_story_user ON instagram_story_publishes(user_id);
CREATE INDEX IF NOT EXISTS idx_story_event ON instagram_story_publishes(event_id);
CREATE INDEX IF NOT EXISTS idx_story_status ON instagram_story_publishes(status);

-- Create DM conversation log
CREATE TABLE IF NOT EXISTS instagram_dm_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  instagram_user_id TEXT NOT NULL,
  instagram_username TEXT,
  last_message_id TEXT,
  conversation_history JSONB DEFAULT '[]'::jsonb,
  last_message_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dm_user ON instagram_dm_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_dm_instagram_user ON instagram_dm_conversations(instagram_user_id);

COMMIT;
