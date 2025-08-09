-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enums
CREATE TYPE subject_type AS ENUM ('student', 'couple', 'family');
CREATE TYPE order_status AS ENUM ('pending', 'approved', 'delivered', 'failed');

-- Events table
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (length(name) >= 3),
  school TEXT NOT NULL,
  date DATE NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subjects table
CREATE TABLE subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  type subject_type NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT,
  couple_first_name TEXT,
  couple_last_name TEXT,
  family_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subject tokens table
CREATE TABLE subject_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL CHECK (length(token) >= 20),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Photos table
CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  storage_path TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  approved BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Price lists table
CREATE TABLE price_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID UNIQUE REFERENCES events(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Price list items table
CREATE TABLE price_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  price_list_id UUID REFERENCES price_lists(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  price_cents INTEGER NOT NULL CHECK (price_cents > 0),
  sort_order INTEGER DEFAULT 0,
  CONSTRAINT unique_price_item_per_list UNIQUE (price_list_id, label)
);

-- Orders table
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID REFERENCES subjects(id),
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  status order_status DEFAULT 'pending',
  mp_preference_id TEXT,
  mp_payment_id TEXT,
  mp_status TEXT,
  mp_external_reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ
);

-- Order items table
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  photo_id UUID REFERENCES photos(id),
  price_list_item_id UUID REFERENCES price_list_items(id),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0)
);

-- Email templates table (for future use)
CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email queue table (for future use)
CREATE TABLE email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email TEXT NOT NULL,
  template_id UUID REFERENCES email_templates(id),
  variables JSONB,
  status TEXT DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Egress metrics table
CREATE TABLE egress_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  bytes_served BIGINT DEFAULT 0 CHECK (bytes_served >= 0),
  requests_count INTEGER DEFAULT 0 CHECK (requests_count >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, date)
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to events table
CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Function to generate secure token
CREATE OR REPLACE FUNCTION generate_secure_token(length INT DEFAULT 20)
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..length LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::INT, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check single pending order per subject
CREATE OR REPLACE FUNCTION check_single_pending_order()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'pending' THEN
    IF EXISTS (
      SELECT 1 FROM orders 
      WHERE subject_id = NEW.subject_id 
      AND status = 'pending'
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
      RAISE EXCEPTION 'Ya existe un pedido pendiente para este sujeto';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply single pending order trigger
CREATE TRIGGER enforce_single_pending_order
  BEFORE INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION check_single_pending_order();