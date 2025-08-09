-- Add support for public checkout (orders without tokens)
-- This migration allows orders to be created without a subject_id for public gallery purchases

-- STEP 1: Add columns to support public orders
ALTER TABLE orders 
  ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS is_public_order BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_by TEXT DEFAULT 'admin',
  ADD COLUMN IF NOT EXISTS total_amount_cents INTEGER CHECK (total_amount_cents >= 0);

-- STEP 2: Update existing orders to have is_public_order = false and created_by = 'legacy'
UPDATE orders 
SET 
  is_public_order = false,
  created_by = 'legacy'
WHERE is_public_order IS NULL;

-- STEP 3: Make the new columns NOT NULL with proper defaults
ALTER TABLE orders 
  ALTER COLUMN is_public_order SET NOT NULL,
  ALTER COLUMN created_by SET NOT NULL;

-- STEP 4: Add order_items price tracking columns
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS unit_price_cents INTEGER CHECK (unit_price_cents > 0),
  ADD COLUMN IF NOT EXISTS total_price_cents INTEGER CHECK (total_price_cents > 0);

-- STEP 5: Create check constraint for subject_id vs event_id
-- Either subject_id OR event_id must be set (for private vs public orders)
ALTER TABLE orders 
  ADD CONSTRAINT check_subject_or_event_id 
  CHECK (
    (subject_id IS NOT NULL AND event_id IS NULL AND is_public_order = false) OR
    (subject_id IS NULL AND event_id IS NOT NULL AND is_public_order = true)
  );

-- STEP 6: Add indexes for public order queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_event_id 
  ON orders(event_id) 
  WHERE event_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_public_status 
  ON orders(is_public_order, status, created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_email_pending 
  ON orders(contact_email, status) 
  WHERE status = 'pending';

-- STEP 7: Add subjects table columns for public visibility
ALTER TABLE subjects 
  ADD COLUMN IF NOT EXISTS public_visible BOOLEAN DEFAULT false;

-- STEP 8: Add events table columns for public gallery
ALTER TABLE events 
  ADD COLUMN IF NOT EXISTS public_gallery_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS school_name TEXT;

-- Update existing events to populate school_name from school column
UPDATE events 
SET school_name = school 
WHERE school_name IS NULL AND school IS NOT NULL;

-- STEP 9: Update price_list_items to support types
ALTER TABLE price_list_items
  ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'base';

-- STEP 10: Create constraint to prevent multiple pending orders per email (anti-spam)
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_email_pending_unique 
  ON orders(contact_email, event_id) 
  WHERE status = 'pending' AND is_public_order = true;

-- STEP 11: Update has_pending_order function to support public orders  
CREATE OR REPLACE FUNCTION has_pending_order_by_email(user_email TEXT, order_event_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
  IF order_event_id IS NOT NULL THEN
    -- Check for pending public orders by email for specific event
    RETURN EXISTS (
      SELECT 1 
      FROM orders 
      WHERE contact_email = user_email 
      AND event_id = order_event_id
      AND status = 'pending'
      AND is_public_order = true
    );
  ELSE
    -- Check for any pending orders by email
    RETURN EXISTS (
      SELECT 1 
      FROM orders 
      WHERE contact_email = user_email 
      AND status = 'pending'
    );
  END IF;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- STEP 12: Create function to get order details with all info
CREATE OR REPLACE FUNCTION get_order_details(order_uuid UUID)
RETURNS TABLE (
  order_id UUID,
  order_status order_status,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  total_amount_cents INTEGER,
  is_public BOOLEAN,
  event_name TEXT,
  school_name TEXT,
  subject_name TEXT,
  item_count BIGINT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.status,
    o.contact_name,
    o.contact_email,
    o.contact_phone,
    o.total_amount_cents,
    o.is_public_order,
    COALESCE(e.name, se.name) as event_name,
    COALESCE(e.school_name, se.school_name) as school_name,
    CASE 
      WHEN s.type = 'student' THEN s.first_name || ' ' || COALESCE(s.last_name, '')
      WHEN s.type = 'couple' THEN s.first_name || ' & ' || s.couple_first_name
      WHEN s.type = 'family' THEN s.family_name
      ELSE 'Public Order'
    END as subject_name,
    (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) as item_count,
    o.created_at
  FROM orders o
  LEFT JOIN events e ON o.event_id = e.id  -- For public orders
  LEFT JOIN subjects s ON o.subject_id = s.id  -- For private orders
  LEFT JOIN events se ON s.event_id = se.id  -- Event via subject for private orders
  WHERE o.id = order_uuid;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- STEP 13: Update order statistics view to include public orders
CREATE OR REPLACE VIEW order_statistics AS
SELECT 
  COUNT(*) as total_orders,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_orders,
  COUNT(*) FILTER (WHERE status = 'approved') as approved_orders,
  COUNT(*) FILTER (WHERE status = 'delivered') as delivered_orders,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_orders,
  COUNT(*) FILTER (WHERE is_public_order = true) as public_orders,
  COUNT(*) FILTER (WHERE is_public_order = false) as private_orders,
  COALESCE(SUM(total_amount_cents) FILTER (WHERE status IN ('approved', 'delivered')), 0) as total_revenue_cents,
  AVG(total_amount_cents) FILTER (WHERE status IN ('approved', 'delivered')) as avg_order_value_cents,
  DATE_TRUNC('day', MIN(created_at)) as first_order_date,
  DATE_TRUNC('day', MAX(created_at)) as last_order_date
FROM orders;

-- STEP 14: Add RLS policies for public orders
-- Policy for public order access (anyone can view their order by order_id + email)
CREATE POLICY "Public order access" ON orders
  FOR SELECT USING (
    is_public_order = true 
    AND contact_email = current_setting('request.email', true)
  );

-- Policy for public order items access
CREATE POLICY "Public order items access" ON order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders o 
      WHERE o.id = order_items.order_id 
      AND o.is_public_order = true
      AND o.contact_email = current_setting('request.email', true)
    )
  );

-- STEP 15: Create function to update order totals from items
CREATE OR REPLACE FUNCTION update_order_total(order_uuid UUID)
RETURNS VOID AS $$
DECLARE
  calculated_total INTEGER;
BEGIN
  SELECT COALESCE(SUM(total_price_cents), 0)
  INTO calculated_total
  FROM order_items
  WHERE order_id = order_uuid;
  
  UPDATE orders 
  SET total_amount_cents = calculated_total
  WHERE id = order_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 16: Add trigger to automatically update order totals
CREATE OR REPLACE FUNCTION trigger_update_order_total()
RETURNS TRIGGER AS $$
BEGIN
  -- Update total when items are inserted, updated, or deleted
  IF TG_OP = 'DELETE' THEN
    PERFORM update_order_total(OLD.order_id);
    RETURN OLD;
  ELSE
    PERFORM update_order_total(NEW.order_id);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS order_items_total_update ON order_items;
CREATE TRIGGER order_items_total_update
  AFTER INSERT OR UPDATE OR DELETE ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_order_total();

-- STEP 17: Add comments for documentation
COMMENT ON COLUMN orders.event_id IS 'For public orders - direct reference to event (subject_id will be NULL)';
COMMENT ON COLUMN orders.is_public_order IS 'True for public gallery orders, false for private family orders';
COMMENT ON COLUMN orders.created_by IS 'Source of order creation: admin, family_checkout, public_checkout, etc';
COMMENT ON COLUMN orders.total_amount_cents IS 'Cached total amount in cents for performance';
COMMENT ON COLUMN subjects.public_visible IS 'Whether this subject photos are visible in public gallery';
COMMENT ON COLUMN events.public_gallery_enabled IS 'Whether this event allows public gallery purchases';
COMMENT ON COLUMN price_list_items.type IS 'Type of price: base, premium, etc';
COMMENT ON FUNCTION has_pending_order_by_email(TEXT, UUID) IS 'Checks for pending orders by email, optionally for specific event';
COMMENT ON FUNCTION get_order_details(UUID) IS 'Gets complete order information including event and subject details';
COMMENT ON FUNCTION update_order_total(UUID) IS 'Recalculates and updates order total from order items';

-- STEP 18: Final validation and cleanup
DO $$
BEGIN
  -- Verify new columns exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'event_id'
  ) THEN
    RAISE WARNING 'event_id column not created in orders table';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'is_public_order'
  ) THEN
    RAISE WARNING 'is_public_order column not created in orders table';
  END IF;
  
  -- Verify constraint exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_subject_or_event_id'
  ) THEN
    RAISE WARNING 'Subject/Event ID check constraint not created';
  END IF;
  
  RAISE NOTICE 'Public checkout support migration completed successfully';
  RAISE NOTICE 'New features: Public orders, email-based order limits, automatic total calculation';
END $$;