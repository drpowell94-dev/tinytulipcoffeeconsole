-- Migration 003: Content Multiplier Pipeline
-- Adds blog post fields for AI-generated content variants and Wix integration

BEGIN;

-- Add columns to blog_posts for content generation & Wix sync
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS (
  social_caption TEXT,
  email_excerpt TEXT,
  seo_keywords_generated TEXT[],
  wix_published_at TIMESTAMP WITH TIME ZONE,
  wix_post_id TEXT,
  synced_to_wix BOOLEAN DEFAULT false
);

-- Ensure wix_post_id is unique when present
ALTER TABLE blog_posts ADD CONSTRAINT blog_posts_wix_post_id_unique UNIQUE (wix_post_id)
  WHERE wix_post_id IS NOT NULL;

-- Index for tracking Wix sync status
CREATE INDEX IF NOT EXISTS idx_blog_posts_wix_sync
  ON blog_posts(synced_to_wix, published_at);

-- Create API keys table for lead intake & external integrations
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  partner_name TEXT,
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_api_keys_partner ON api_keys(partner_name);

COMMIT;
