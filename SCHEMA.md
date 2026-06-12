# Database Schema - Tiny Tulip Coffee Console

## Overview
PostgreSQL relational schema hosted on Supabase with Row-Level Security (RLS) policies.

---

## Tables

### 1. `users`
Manages staff and admin accounts with roles and permissions.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT auth.uid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT CHECK (role IN ('admin', 'manager', 'staff')) DEFAULT 'staff',
  is_active BOOLEAN DEFAULT true,
  profile_image_url TEXT,
  phone_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE
);
```

---

### 2. `events`
Core event tracking for catering, pop-ups, and farmers markets.

```sql
CREATE TABLE events (
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
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

### 3. `event_contacts`
Client contact information linked to events.

```sql
CREATE TABLE event_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  contact_name TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  company_name TEXT,
  is_primary BOOLEAN DEFAULT true,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

### 4. `inventory_items`
Core supplies tracking with low-stock alerts.

```sql
CREATE TABLE inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  item_type TEXT CHECK (item_type IN ('coffee_beans', 'milk', 'cups', 'lids', 'supplies', 'equipment', 'other')) NOT NULL,
  current_quantity INTEGER NOT NULL DEFAULT 0,
  unit_of_measure TEXT NOT NULL (e.g., 'boxes', 'bags', 'liters', 'units'),
  reorder_level INTEGER NOT NULL,
  reorder_quantity INTEGER,
  unit_cost DECIMAL(10, 2),
  supplier_name TEXT,
  supplier_contact TEXT,
  last_restocked TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

### 5. `checklist_templates`
Template checklists by event type (e.g., Catering Setup, Farmers Market).

```sql
CREATE TABLE checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  event_type TEXT NOT NULL (e.g., 'catering_setup', 'farmers_market', 'popup_event'),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

### 6. `checklist_template_items`
Individual items within a checklist template.

```sql
CREATE TABLE checklist_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES checklist_templates(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  category TEXT (e.g., 'equipment', 'supplies', 'documents'),
  quantity_needed INTEGER,
  notes TEXT,
  sort_order INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

### 7. `checklists`
Actual checklist instances created for specific events.

```sql
CREATE TABLE checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  template_id UUID REFERENCES checklist_templates(id),
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMP WITH TIME ZONE,
  assigned_to UUID REFERENCES users(id),
  status TEXT CHECK (status IN ('pending', 'in_progress', 'completed')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

### 8. `checklist_items`
Individual items within a checklist with sign-off tracking.

```sql
CREATE TABLE checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  category TEXT,
  quantity_needed INTEGER,
  is_completed BOOLEAN DEFAULT false,
  notes TEXT,
  sort_order INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

### 9. `checklist_signoffs`
Digital sign-offs with timestamps and user attribution.

```sql
CREATE TABLE checklist_signoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_item_id UUID NOT NULL REFERENCES checklist_items(id) ON DELETE CASCADE,
  signed_by UUID NOT NULL REFERENCES users(id),
  signed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT
);
```

---

### 10. `blog_posts`
Generated blog content with drafts and publish status.

```sql
CREATE TABLE blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE,
  content TEXT,
  excerpt TEXT,
  featured_image_url TEXT,
  template_used TEXT (e.g., 'coffee_origin', 'seasonal_launch', 'community_update'),
  tone TEXT CHECK (tone IN ('friendly', 'professional', 'casual')) DEFAULT 'friendly',
  keywords TEXT[], -- Array of SEO keywords
  meta_description TEXT,
  author_id UUID NOT NULL REFERENCES users(id),
  status TEXT CHECK (status IN ('draft', 'published', 'scheduled')) DEFAULT 'draft',
  published_at TIMESTAMP WITH TIME ZONE,
  scheduled_publish_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

### 11. `website_updates`
Quick updates to website data (hours, menu, alerts).

```sql
CREATE TABLE website_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  update_type TEXT CHECK (update_type IN ('operating_hours', 'menu', 'alert_banner')) NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE,
  priority INTEGER DEFAULT 0, -- For ordering alerts
  updated_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

### 12. `operating_hours`
Detailed operating hours schedule.

```sql
CREATE TABLE operating_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 6=Saturday
  opens_at TIME NOT NULL,
  closes_at TIME NOT NULL,
  is_closed BOOLEAN DEFAULT false,
  notes TEXT,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

### 13. `seasonal_menu`
Seasonal menu items for quick updates.

```sql
CREATE TABLE seasonal_menu (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name TEXT NOT NULL,
  description TEXT,
  category TEXT (e.g., 'drinks', 'pastries', 'food'),
  price DECIMAL(10, 2),
  is_available BOOLEAN DEFAULT true,
  season TEXT CHECK (season IN ('spring', 'summer', 'fall', 'winter', 'year_round')),
  image_url TEXT,
  featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

### 14. `activity_log`
Audit trail for important actions.

```sql
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  changes JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## Indexes

```sql
CREATE INDEX idx_events_date_start ON events(date_start);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_created_by ON events(created_by);
CREATE INDEX idx_inventory_items_reorder ON inventory_items(current_quantity, reorder_level);
CREATE INDEX idx_checklists_event_id ON checklists(event_id);
CREATE INDEX idx_checklists_status ON checklists(status);
CREATE INDEX idx_blog_posts_status ON blog_posts(status);
CREATE INDEX idx_blog_posts_published_at ON blog_posts(published_at);
CREATE INDEX idx_website_updates_active ON website_updates(is_active);
CREATE INDEX idx_activity_log_user_created ON activity_log(user_id, created_at);
```

---

## Row-Level Security (RLS) Policies

### Example RLS for events table:
```sql
-- Users can view only their own events or events assigned to them
CREATE POLICY events_view ON events
  FOR SELECT USING (
    created_by = auth.uid() OR 
    EXISTS(SELECT 1 FROM checklists WHERE checklists.event_id = events.id AND checklists.assigned_to = auth.uid())
  );

-- Only admins/managers can create events
CREATE POLICY events_create ON events
  FOR INSERT WITH CHECK (
    EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );
```

---

## Data Types & Constraints

| Field | Type | Constraints |
|-------|------|-------------|
| UUID | UUID | Primary/Foreign Key |
| TEXT | STRING | Variable length |
| INTEGER | NUMBER | Whole numbers |
| DECIMAL | NUMERIC | Fixed decimal |
| TIMESTAMP | DATETIME | UTC with timezone |
| BOOLEAN | BOOL | true/false |
| JSONB | JSON | Flexible key-value |
| ENUM | SELECT | Limited values |

---

## Relationships

```
users (1) ──→ (many) events
users (1) ──→ (many) checklists
users (1) ──→ (many) blog_posts

events (1) ──→ (many) event_contacts
events (1) ──→ (many) checklists

checklist_templates (1) ──→ (many) checklist_template_items
checklist_templates (1) ──→ (many) checklists

checklists (1) ──→ (many) checklist_items
checklist_items (1) ──→ (many) checklist_signoffs
```

---

## Migration Strategy

1. Create tables in order (users first, then dependent tables)
2. Add indexes
3. Enable RLS on all tables
4. Create RLS policies
5. Seed initial data (users, templates, inventory items)

See `supabase/migrations/001_initial_schema.sql` for full migration script.

---

**Status**: Schema finalized and ready for implementation.
**Last Updated**: 2026-06-12
