# Database Guidelines

This document outlines the standards and best practices for database design and optimization with PostgreSQL and Supabase in the LookEscolar system.

## Purpose
Specialist in PostgreSQL database design and optimization with Supabase, focused on security with RLS, performance with indexes, and integrity with constraints.

## Core Technologies
- PostgreSQL 15+
- Supabase (RLS, Functions, Triggers)
- SQL and PL/pgSQL
- Versioned migrations
- Query optimization
- Database indexing

## Specialties
- Row Level Security (RLS)
- Database constraints
- Performance tuning
- Transaction management
- Backup strategies
- Data integrity

## Schema Design and Migrations

### Initial Schema Example
```sql
-- supabase/migrations/001_initial_schema.sql

-- Enums for type safety
CREATE TYPE subject_type AS ENUM ('student', 'couple', 'family');
CREATE TYPE order_status AS ENUM ('pending', 'approved', 'delivered', 'failed');

-- Main events table
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (length(name) >= 3),
  school TEXT NOT NULL,
  date DATE NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for frequent listings
CREATE INDEX idx_events_active ON events(active) WHERE active = true;
CREATE INDEX idx_events_date ON events(date DESC);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
```

## Row Level Security (RLS)

### Security Standard
- **Single policy per table**: Service role access only
- **No direct access**: Client never queries tables directly
- **API validation**: All business logic in API routes

### RLS Policies
```sql
-- Enable RLS on ALL tables
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Policy: Admin can do everything
CREATE POLICY "Admin full access on events"
  ON events
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

-- Policy: Families only see their photos
CREATE POLICY "Families view own photos"
  ON photos
  FOR SELECT
  TO anon  -- Token-based, no auth
  USING (
    EXISTS (
      SELECT 1 FROM subject_tokens st
      WHERE st.subject_id = photos.subject_id
      AND st.token = current_setting('app.current_token', true)
      AND st.expires_at > NOW()
    )
  );

-- Policy: Prevent modification of approved orders
CREATE POLICY "Prevent approved order modification"
  ON orders
  FOR UPDATE
  TO authenticated
  USING (status != 'approved')
  WITH CHECK (status != 'approved' OR OLD.status = NEW.status);
```

## Functions and Stored Procedures

### Security Functions

```sql
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

-- Function to validate single pending order
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
      RAISE EXCEPTION 'Already exists a pending order for this subject';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_single_pending_order
  BEFORE INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION check_single_pending_order();
```

## Query Optimization

### Key Indexes
```sql
-- Index for token access (critical)
CREATE INDEX idx_subject_tokens_token_expires 
  ON subject_tokens(token, expires_at);

-- Queries for photos by event/subject
CREATE INDEX idx_photos_event_subject 
  ON photos(event_id, subject_id) 
  WHERE approved = true;

-- Dashboard queries
CREATE INDEX idx_orders_subject_status 
  ON orders(subject_id, status);

-- Search index
CREATE INDEX idx_subjects_name_search 
  ON subjects USING gin(
    to_tsvector('spanish', first_name || ' ' || COALESCE(last_name, ''))
  );

-- Materialized view for statistics
CREATE MATERIALIZED VIEW event_stats AS
SELECT 
  e.id as event_id,
  e.name as event_name,
  COUNT(DISTINCT s.id) as subject_count,
  COUNT(DISTINCT p.id) as photo_count,
  COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'approved') as approved_orders,
  SUM(oi.quantity * pli.price_cents) / 100.0 as total_revenue
FROM events e
LEFT JOIN subjects s ON s.event_id = e.id
LEFT JOIN photos p ON p.event_id = e.id
LEFT JOIN orders o ON o.subject_id = s.id
LEFT JOIN order_items oi ON oi.order_id = o.id
LEFT JOIN price_list_items pli ON pli.id = oi.price_list_item_id
GROUP BY e.id, e.name;

CREATE UNIQUE INDEX ON event_stats(event_id);
```

## Metrics and Monitoring

### Egress Tracking
```sql
-- Table for egress tracking
CREATE TABLE egress_metrics (
```