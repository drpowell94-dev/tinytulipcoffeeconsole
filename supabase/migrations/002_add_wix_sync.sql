-- Add Wix sync columns to events table
-- This allows tracking which events came from Wix and maintaining the Wix event ID for updates

ALTER TABLE events
ADD COLUMN IF NOT EXISTS wix_event_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS synced_from_wix BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS description TEXT;

-- Create index for Wix event ID lookups
CREATE INDEX IF NOT EXISTS idx_events_wix_event_id ON events(wix_event_id);
CREATE INDEX IF NOT EXISTS idx_events_synced_from_wix ON events(synced_from_wix);
