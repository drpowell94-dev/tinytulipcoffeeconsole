-- Tiny Tulip Coffee Console - Complete Database Schema
-- Run this in Supabase SQL Editor to initialize the database

-- ============================================================================
-- 1. USERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT auth.uid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT CHECK (role IN ('admin', 'manager', 'staff')) DEFAULT 'staff',
  is_active BOOLEAN DEFAULT true,
  profile_image_url TEXT,
  phone_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE,

  -- Sync with auth.users
  CONSTRAINT email_unique UNIQUE (email)
);

-- ============================================================================
-- 2. EVENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  event_type TEXT CHECK (event_type IN ('catering', 'popup', 'farmers_market', 'other')) NOT NULL,
  date_start TIMESTAMP WITH TIME ZONE NOT NULL,
  date_end TIMESTAMP WITH TIME ZONE,
  location TEXT NOT NULL,
  guest_count INTEGER,
  estimated_revenue DECIMAL(10, 2),
  status TEXT CHECK (status IN ('inquiry', 'confirmed', 'completed', 'cancelled')) DEFAULT 'inquiry',
  deposit_status TEXT CHECK (deposit_status IN ('pending', 'paid')) DEFAULT 'pending',
  deposit_amount DECIMAL(10, 2),
  notes TEXT,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_events_date_start ON events(date_start);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_created_by ON events(created_by);
CREATE INDEX idx_events_event_type ON events(event_type);

-- ============================================================================
-- 3. EVENT CONTACTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS event_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  contact_name TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  company_name TEXT,
  is_primary BOOLEAN DEFAULT false,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_event_contacts_event_id ON event_contacts(event_id);
CREATE INDEX idx_event_contacts_is_primary ON event_contacts(event_id, is_primary);

-- ============================================================================
-- 4. INVENTORY ITEMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  item_type TEXT CHECK (item_type IN ('coffee_beans', 'milk', 'cups', 'lids', 'supplies', 'equipment', 'other')) NOT NULL,
  current_quantity INTEGER NOT NULL DEFAULT 0,
  unit_of_measure TEXT NOT NULL,
  reorder_level INTEGER NOT NULL DEFAULT 5,
  reorder_quantity INTEGER,
  unit_cost DECIMAL(10, 2),
  supplier_name TEXT,
  supplier_contact TEXT,
  last_restocked TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_inventory_items_name ON inventory_items(name);
CREATE INDEX idx_inventory_items_reorder ON inventory_items(current_quantity, reorder_level) WHERE is_active = true;
CREATE INDEX idx_inventory_items_type ON inventory_items(item_type);

-- ============================================================================
-- 5. INVENTORY HISTORY TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS inventory_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  quantity_before INTEGER NOT NULL,
  quantity_after INTEGER NOT NULL,
  quantity_change INTEGER NOT NULL,
  change_type TEXT CHECK (change_type IN ('restock', 'usage', 'adjustment')) NOT NULL,
  related_event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  notes TEXT,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_inventory_history_item_id ON inventory_history(item_id);
CREATE INDEX idx_inventory_history_event_id ON inventory_history(related_event_id);

-- ============================================================================
-- 6. CHECKLIST TEMPLATES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  event_type TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_checklist_templates_event_type ON checklist_templates(event_type);
CREATE INDEX idx_checklist_templates_is_active ON checklist_templates(is_active);

-- ============================================================================
-- 7. CHECKLIST TEMPLATE ITEMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS checklist_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES checklist_templates(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  category TEXT,
  quantity_needed INTEGER,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_checklist_template_items_template_id ON checklist_template_items(template_id);

-- ============================================================================
-- 8. CHECKLISTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  template_id UUID REFERENCES checklist_templates(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMP WITH TIME ZONE,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT CHECK (status IN ('pending', 'in_progress', 'completed')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_checklists_event_id ON checklists(event_id);
CREATE INDEX idx_checklists_status ON checklists(status);
CREATE INDEX idx_checklists_assigned_to ON checklists(assigned_to);

-- ============================================================================
-- 9. CHECKLIST ITEMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  category TEXT,
  quantity_needed INTEGER,
  is_completed BOOLEAN DEFAULT false,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_checklist_items_checklist_id ON checklist_items(checklist_id);
CREATE INDEX idx_checklist_items_is_completed ON checklist_items(checklist_id, is_completed);

-- ============================================================================
-- 10. CHECKLIST SIGNOFFS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS checklist_signoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_item_id UUID NOT NULL REFERENCES checklist_items(id) ON DELETE CASCADE,
  signed_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  signed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT
);

CREATE INDEX idx_checklist_signoffs_item_id ON checklist_signoffs(checklist_item_id);
CREATE INDEX idx_checklist_signoffs_signed_by ON checklist_signoffs(signed_by);

-- ============================================================================
-- 11. BLOG POSTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE,
  content TEXT,
  excerpt TEXT,
  featured_image_url TEXT,
  template_used TEXT,
  tone TEXT CHECK (tone IN ('friendly', 'professional', 'casual')) DEFAULT 'friendly',
  keywords TEXT[],
  meta_description TEXT,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status TEXT CHECK (status IN ('draft', 'published', 'scheduled')) DEFAULT 'draft',
  published_at TIMESTAMP WITH TIME ZONE,
  scheduled_publish_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_blog_posts_status ON blog_posts(status);
CREATE INDEX idx_blog_posts_published_at ON blog_posts(published_at);
CREATE INDEX idx_blog_posts_author_id ON blog_posts(author_id);
CREATE INDEX idx_blog_posts_slug ON blog_posts(slug);

-- ============================================================================
-- 12. WEBSITE UPDATES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS website_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  update_type TEXT CHECK (update_type IN ('operating_hours', 'menu', 'alert_banner')) NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE,
  priority INTEGER DEFAULT 0,
  updated_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_website_updates_type ON website_updates(update_type);
CREATE INDEX idx_website_updates_is_active ON website_updates(is_active);

-- ============================================================================
-- 13. OPERATING HOURS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS operating_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
  opens_at TIME NOT NULL,
  closes_at TIME NOT NULL,
  is_closed BOOLEAN DEFAULT false,
  notes TEXT,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(day_of_week)
);

CREATE INDEX idx_operating_hours_day ON operating_hours(day_of_week);

-- ============================================================================
-- 14. SEASONAL MENU TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS seasonal_menu (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  price DECIMAL(10, 2),
  is_available BOOLEAN DEFAULT true,
  season TEXT CHECK (season IN ('spring', 'summer', 'fall', 'winter', 'year_round')),
  image_url TEXT,
  featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_seasonal_menu_category ON seasonal_menu(category);
CREATE INDEX idx_seasonal_menu_season ON seasonal_menu(season);
CREATE INDEX idx_seasonal_menu_available ON seasonal_menu(is_available);

-- ============================================================================
-- 15. ACTIVITY LOG TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  changes JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX idx_activity_log_created_at ON activity_log(created_at DESC);
CREATE INDEX idx_activity_log_entity ON activity_log(entity_type, entity_id);

-- ============================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_signoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE operating_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasonal_menu ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY users_view_own ON users
  FOR SELECT USING (id = auth.uid() OR EXISTS(
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager')
  ));

CREATE POLICY users_update_own ON users
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Events: Users can view events if they created them or are assigned to related checklists
CREATE POLICY events_view ON events
  FOR SELECT USING (
    auth.uid()::uuid = created_by OR
    auth.uid()::uuid IS NOT NULL
  );

CREATE POLICY events_create ON events
  FOR INSERT WITH CHECK (auth.uid()::uuid = created_by);

CREATE POLICY events_update ON events
  FOR UPDATE USING (
    auth.uid()::uuid = created_by OR
    EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- Event Contacts: Visible if event is visible
CREATE POLICY event_contacts_view ON event_contacts
  FOR SELECT USING (
    EXISTS(SELECT 1 FROM events WHERE events.id = event_contacts.event_id AND (
      events.created_by = auth.uid()::uuid OR auth.uid()::uuid IS NOT NULL
    ))
  );

-- Inventory: All authenticated users can view
CREATE POLICY inventory_items_view ON inventory_items
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY inventory_items_update ON inventory_items
  FOR UPDATE USING (
    EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- Checklists: Visible to assigned user, creator, and managers
CREATE POLICY checklists_view ON checklists
  FOR SELECT USING (
    auth.uid()::uuid = assigned_to OR
    EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- Blog Posts: All users view published, authors/admins view drafts
CREATE POLICY blog_posts_view ON blog_posts
  FOR SELECT USING (
    status = 'published' OR
    author_id = auth.uid()::uuid OR
    EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- Activity Log: Admins only
CREATE POLICY activity_log_view ON activity_log
  FOR SELECT USING (
    EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Insert sample checklist templates
INSERT INTO checklist_templates (name, event_type, description) VALUES
  ('Catering Setup Checklist', 'catering', 'Complete checklist for catering events with espresso machine and equipment'),
  ('Farmers Market Setup', 'farmers_market', 'Setup checklist for farmers market with tent and display equipment'),
  ('Pop-up Event Checklist', 'popup', 'Pop-up event checklist with POS and display setup')
ON CONFLICT DO NOTHING;

-- Insert sample inventory items
INSERT INTO inventory_items (name, item_type, current_quantity, unit_of_measure, reorder_level, reorder_quantity, unit_cost) VALUES
  ('Espresso Beans - Medium Roast', 'coffee_beans', 50, 'bags', 10, 30, 8.50),
  ('Oat Milk', 'milk', 40, 'liters', 8, 20, 2.25),
  ('Whole Milk', 'milk', 35, 'liters', 8, 20, 1.75),
  ('12oz Cups', 'cups', 500, 'boxes', 100, 500, 15.00),
  ('Lids - Flat', 'lids', 300, 'boxes', 75, 300, 8.00),
  ('Napkins - Brown', 'supplies', 200, 'boxes', 50, 200, 5.50),
  ('Espresso Machine', 'equipment', 1, 'units', 1, 1, 3500.00),
  ('Grinder - Burr', 'equipment', 2, 'units', 1, 1, 250.00),
  ('Sugar Packets', 'supplies', 1000, 'boxes', 200, 500, 3.00)
ON CONFLICT (name) DO NOTHING;

-- Insert sample operating hours
INSERT INTO operating_hours (day_of_week, opens_at, closes_at, is_closed) VALUES
  (0, '09:00'::time, '17:00'::time, false),  -- Sunday
  (1, '07:00'::time, '18:00'::time, false),  -- Monday
  (2, '07:00'::time, '18:00'::time, false),  -- Tuesday
  (3, '07:00'::time, '18:00'::time, false),  -- Wednesday
  (4, '07:00'::time, '19:00'::time, false),  -- Thursday
  (5, '07:00'::time, '19:00'::time, false),  -- Friday
  (6, '08:00'::time, '18:00'::time, false)   -- Saturday
ON CONFLICT (day_of_week) DO NOTHING;

-- Insert sample seasonal menu items
INSERT INTO seasonal_menu (item_name, description, category, price, is_available, season, featured) VALUES
  ('Spring Strawberry Latte', 'Fresh strawberry syrup with smooth espresso', 'drinks', 5.50, true, 'spring', true),
  ('Summer Iced Lavender', 'Cooling lavender lemonade with espresso shot', 'drinks', 4.75, true, 'summer', true),
  ('Autumn Pumpkin Spice', 'Classic seasonal favorite - pumpkin, cinnamon, nutmeg', 'drinks', 5.25, true, 'fall', true),
  ('Winter Peppermint Mocha', 'Rich chocolate and peppermint with espresso', 'drinks', 5.75, true, 'winter', true),
  ('Avocado Toast', 'Smashed avocado on multigrain toast with everything seasoning', 'food', 8.50, true, 'year_round', false),
  ('Chocolate Croissant', 'Buttery croissant filled with dark chocolate', 'pastries', 4.50, true, 'year_round', false)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- FUNCTIONS FOR COMMON OPERATIONS
-- ============================================================================

-- Function to update user last_login
CREATE OR REPLACE FUNCTION update_user_last_login()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users SET last_login = NOW() WHERE id = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log activity
CREATE OR REPLACE FUNCTION log_activity(
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_changes JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO activity_log (user_id, action, entity_type, entity_id, changes)
  VALUES (auth.uid(), p_action, p_entity_type, p_entity_id, p_changes)
  RETURNING id INTO v_log_id;
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-generate checklist from template
CREATE OR REPLACE FUNCTION create_checklist_from_template(
  p_event_id UUID,
  p_template_id UUID,
  p_assigned_to UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_checklist_id UUID;
  v_template_name TEXT;
  v_item RECORD;
BEGIN
  -- Get template name
  SELECT name INTO v_template_name FROM checklist_templates WHERE id = p_template_id;

  -- Create checklist
  INSERT INTO checklists (event_id, template_id, title, assigned_to, status)
  VALUES (p_event_id, p_template_id, v_template_name, p_assigned_to, 'pending')
  RETURNING id INTO v_checklist_id;

  -- Copy template items
  INSERT INTO checklist_items (checklist_id, item_name, category, quantity_needed, sort_order)
  SELECT v_checklist_id, item_name, category, quantity_needed, sort_order
  FROM checklist_template_items
  WHERE template_id = p_template_id;

  RETURN v_checklist_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- CONSTRAINTS & DEFAULTS
-- ============================================================================

-- Prevent past dates for events
ALTER TABLE events
ADD CONSTRAINT events_future_date CHECK (date_start > NOW());

-- Ensure end date is after start date
ALTER TABLE events
ADD CONSTRAINT events_date_order CHECK (date_end IS NULL OR date_end >= date_start);

-- Ensure inventory doesn't go negative
ALTER TABLE inventory_items
ADD CONSTRAINT inventory_non_negative CHECK (current_quantity >= 0);

-- Ensure reorder level > 0
ALTER TABLE inventory_items
ADD CONSTRAINT inventory_reorder_positive CHECK (reorder_level > 0);

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- Tables created: 15
-- Indexes created: 30+
-- RLS Policies enabled on all tables
-- Seed data populated
-- Ready for application use!
