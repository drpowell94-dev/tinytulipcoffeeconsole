-- ============================================================================
-- Tiny Tulip Coffee - Wix Events Import Seed
-- ============================================================================
-- Generated from live Wix Events data (Tiny Tulip Coffee site) pulled via the
-- Wix MCP connection. Contains all 22 existing events.
--
-- HOW TO RUN:
--   1. First apply the migration that adds Wix columns:
--        supabase/migrations/002_add_wix_sync.sql
--   2. Then paste this entire file into the Supabase SQL Editor and Run.
--
-- This script is idempotent: it matches on wix_event_id, so running it again
-- updates existing rows instead of creating duplicates.
-- ============================================================================

-- 1. Ensure a system user exists to own imported events (events.created_by is
--    NOT NULL and references users.id).
INSERT INTO users (id, email, full_name, role)
VALUES (
  '00000000-0000-0000-0000-0000000000a1',
  'system@tinytulipcoffee.internal',
  'Wix Import',
  'admin'
)
ON CONFLICT (email) DO NOTHING;

-- 2. Upsert all Wix events.
INSERT INTO events (
  wix_event_id, name, description, event_type,
  date_start, date_end, location, status,
  synced_from_wix, created_by
)
VALUES
  ('b75d962e-08ea-429d-947d-2b3efdf26b43', 'The Prospect', NULL, 'other',
   '2025-12-30T15:00:00Z', '2025-12-30T19:00:00Z', '1115 S Mint St, Charlotte, NC 28203, USA', 'completed',
   true, '00000000-0000-0000-0000-0000000000a1'),

  ('58d466d3-4b0a-4fce-918f-3e480521ea5d', 'Indigo at Berewick', NULL, 'other',
   '2026-01-21T13:00:00Z', '2026-01-21T17:00:00Z', '3010 Furr court, Charlotte, NC 28273, USA', 'completed',
   true, '00000000-0000-0000-0000-0000000000a1'),

  ('db1de84d-5b8b-4e81-b383-461111e6af49', 'Vera at Savona', 'Grab & Go Event', 'other',
   '2026-01-30T13:00:00Z', '2026-01-30T13:20:00Z', '725 Savona Ml Ln, Charlotte, NC 28208, USA', 'completed',
   true, '00000000-0000-0000-0000-0000000000a1'),

  ('f8b829d3-d7f6-4318-8d60-a20c56c61d28', 'Vestique Warehouse Sale', NULL, 'other',
   '2026-02-07T13:00:00Z', '2026-02-07T17:00:00Z', '1532 East Blvd, Charlotte, NC 28203, USA', 'completed',
   true, '00000000-0000-0000-0000-0000000000a1'),

  ('cf720f94-c301-4b3b-8424-079234e387e9', '704 At The Quarter- Grab & Go', NULL, 'other',
   '2026-02-10T00:00:00Z', '2026-02-10T00:05:00Z', '704 W Tremont Ave, Charlotte, NC 28203, USA', 'completed',
   true, '00000000-0000-0000-0000-0000000000a1'),

  ('c78b7bb3-a145-4351-b04f-6e1c4186b6dc', 'Hanover Dilworth', NULL, 'other',
   '2026-02-13T13:00:00Z', '2026-02-13T14:00:00Z', '711 E Morehead St, Charlotte, NC 28202, USA', 'completed',
   true, '00000000-0000-0000-0000-0000000000a1'),

  ('e13110a4-f5b9-480d-aa2c-e65b9f9320fd', 'Lakehouse on Wylie', NULL, 'popup',
   '2026-02-13T16:30:00Z', '2026-02-13T18:30:00Z', '11023 Moonbug Ct, Charlotte, NC 28278, USA', 'completed',
   true, '00000000-0000-0000-0000-0000000000a1'),

  ('6c982796-cb60-44c5-be44-317f96454d5a', 'The Ellis', NULL, 'popup',
   '2026-02-16T13:00:00Z', '2026-02-16T15:00:00Z', 'The ellis apt, 512 N College St, Charlotte, NC 28202, USA', 'completed',
   true, '00000000-0000-0000-0000-0000000000a1'),

  ('90ddd2d7-2ca4-47b7-b94f-66e683a7dbf2', 'Ashton South End', NULL, 'popup',
   '2026-02-27T13:00:00Z', '2026-02-27T15:00:00Z', '125 W Tremont Ave, Charlotte, NC 28203, USA', 'completed',
   true, '00000000-0000-0000-0000-0000000000a1'),

  ('f20e551c-6911-40e1-81e8-d71334f27584', 'The Ascher Uptown Apartments - North', 'We''re excited to se you at the North Tower!', 'popup',
   '2026-03-04T13:00:00Z', '2026-03-04T17:00:00Z', '640 N Church St, Charlotte, NC 28202, USA', 'completed',
   true, '00000000-0000-0000-0000-0000000000a1'),

  ('e776c063-4447-4d67-806c-69fd96059504', 'Camden Southline', NULL, 'other',
   '2026-03-05T10:00:00Z', '2026-03-05T12:00:00Z', '2317 South Blvd, Charlotte, NC 28203, USA', 'completed',
   true, '00000000-0000-0000-0000-0000000000a1'),

  ('d3e9d316-37ae-4422-b285-e4418cf60ddf', 'The Ascher Uptown Apartments - South', 'We''re excited to see you at the South Tower!', 'popup',
   '2026-03-06T13:00:00Z', '2026-03-06T16:00:00Z', '640 N Church St, Charlotte, NC 28202, USA', 'completed',
   true, '00000000-0000-0000-0000-0000000000a1'),

  ('3dd4abf3-ccd9-4664-87ff-56509153296d', 'Bradham at New Bern', NULL, 'popup',
   '2026-03-10T11:00:00Z', '2026-03-10T14:00:00Z', '145 New Bern St, Charlotte, NC 28209, USA', 'completed',
   true, '00000000-0000-0000-0000-0000000000a1'),

  ('83184da3-578b-4cda-9404-f641e29f9522', 'Savoy', NULL, 'popup',
   '2026-03-17T12:00:00Z', '2026-03-17T14:00:00Z', '650 E Brooklyn Vlg Ave, Charlotte, NC 28202, USA', 'completed',
   true, '00000000-0000-0000-0000-0000000000a1'),

  ('851283a5-cafa-4c72-a08a-6060e812150f', 'Bradham at New Bern', NULL, 'popup',
   '2026-03-18T11:00:00Z', '2026-03-18T13:00:00Z', '145 New Bern St, Charlotte, NC 28209, USA', 'completed',
   true, '00000000-0000-0000-0000-0000000000a1'),

  ('972e2e45-a7ae-49d6-99f5-8c2d23ab4b17', 'Indigo at Berewick', NULL, 'other',
   '2026-04-01T13:00:00Z', '2026-04-01T13:30:00Z', '3010 Furr court, Charlotte, NC 28273, USA', 'completed',
   true, '00000000-0000-0000-0000-0000000000a1'),

  ('5d7c2564-7231-486f-b35e-b41eae62db75', 'Ashton South End', NULL, 'popup',
   '2026-04-09T12:00:00Z', '2026-04-09T14:00:00Z', '125 W Tremont Ave, Charlotte, NC 28203, USA', 'completed',
   true, '00000000-0000-0000-0000-0000000000a1'),

  ('eb372083-5e2d-48f9-9909-71e19aba11ad', 'Bradham at New Bern', NULL, 'popup',
   '2026-04-15T11:00:00Z', '2026-04-15T13:00:00Z', '145 New Bern St, Charlotte, NC 28209, USA', 'completed',
   true, '00000000-0000-0000-0000-0000000000a1'),

  ('cb3812fd-37f8-4bd4-a99b-87c9c85e0424', 'Enclave at Radius Dilworth', NULL, 'popup',
   '2026-04-17T12:00:00Z', '2026-04-17T14:00:00Z', '515 Royal Ct, Charlotte, NC 28202, USA', 'completed',
   true, '00000000-0000-0000-0000-0000000000a1'),

  ('19ab7ff3-81f1-45b7-b854-cac4c282d51b', 'Ayrsley Lofts', NULL, 'other',
   '2026-04-21T13:00:00Z', '2026-04-21T13:30:00Z', '9336 Kings Parade Blvd, Charlotte, NC 28273, USA', 'completed',
   true, '00000000-0000-0000-0000-0000000000a1'),

  ('cbf8fe8f-a599-4eb1-b138-a6ab8cc8e578', 'The Penrose', NULL, 'popup',
   '2026-04-22T14:30:00Z', '2026-04-22T16:30:00Z', '327 W Tremont Ave, Charlotte, NC 28203, USA', 'completed',
   true, '00000000-0000-0000-0000-0000000000a1'),

  ('c0e643ff-4d05-40d2-8e24-819b5472c40d', 'Vestique', NULL, 'popup',
   '2026-04-25T14:00:00Z', '2026-04-25T17:00:00Z', '1532 East Blvd, Charlotte, NC 28203, USA', 'completed',
   true, '00000000-0000-0000-0000-0000000000a1')

ON CONFLICT (wix_event_id) DO UPDATE SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  event_type  = EXCLUDED.event_type,
  date_start  = EXCLUDED.date_start,
  date_end    = EXCLUDED.date_end,
  location    = EXCLUDED.location,
  status      = EXCLUDED.status,
  synced_from_wix = true,
  updated_at  = NOW();

-- Verify:
--   SELECT name, date_start, location, status FROM events
--   WHERE synced_from_wix = true ORDER BY date_start;
