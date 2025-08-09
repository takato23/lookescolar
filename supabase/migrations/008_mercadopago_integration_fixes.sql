-- Mercado Pago integration fixes and optimizations
-- This migration ensures proper MP integration and adds missing indexes

-- STEP 1: Add constraints for MP-related fields
ALTER TABLE orders 
  ADD CONSTRAINT check_mp_payment_unique 
  UNIQUE (mp_payment_id) 
  WHERE mp_payment_id IS NOT NULL;

-- STEP 2: Add indexes for MP queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_mp_payment_id 
  ON orders(mp_payment_id) 
  WHERE mp_payment_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_mp_preference_id 
  ON orders(mp_preference_id) 
  WHERE mp_preference_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_status_created 
  ON orders(status, created_at);

-- STEP 3: Add composite index for admin order queries  
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_admin_filter 
  ON orders(status, contact_name, created_at);

-- STEP 4: Add constraint to ensure only one pending order per subject
-- This enforces the business rule that subjects can only have one pending order
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_subject_pending_unique 
  ON orders(subject_id) 
  WHERE status = 'pending';

-- STEP 5: Create function to validate MP status transitions
CREATE OR REPLACE FUNCTION validate_order_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate status transitions
  IF OLD.status IS NOT NULL AND OLD.status != NEW.status THEN
    -- Can't change from delivered
    IF OLD.status = 'delivered' AND NEW.status != 'delivered' THEN
      RAISE EXCEPTION 'Cannot change status from delivered to %', NEW.status;
    END IF;
    
    -- Can only go to delivered from approved
    IF NEW.status = 'delivered' AND OLD.status != 'approved' THEN
      RAISE EXCEPTION 'Can only mark as delivered from approved status, current status is %', OLD.status;
    END IF;
    
    -- Log status change for audit
    INSERT INTO audit_logs (
      table_name,
      operation,
      record_id,
      old_values,
      new_values,
      user_id
    ) VALUES (
      'orders',
      'STATUS_CHANGE',
      NEW.id,
      jsonb_build_object('status', OLD.status, 'mp_status', OLD.mp_status),
      jsonb_build_object('status', NEW.status, 'mp_status', NEW.mp_status),
      current_setting('request.jwt.claims', true)::jsonb ->> 'sub'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply status validation trigger
DROP TRIGGER IF EXISTS order_status_validation ON orders;
CREATE TRIGGER order_status_validation
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION validate_order_status_transition();

-- STEP 6: Create view for order statistics
CREATE OR REPLACE VIEW order_statistics AS
SELECT 
  COUNT(*) as total_orders,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_orders,
  COUNT(*) FILTER (WHERE status = 'approved') as approved_orders,
  COUNT(*) FILTER (WHERE status = 'delivered') as delivered_orders,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_orders,
  COALESCE(SUM(
    (SELECT SUM(pli.price_cents * oi.quantity) 
     FROM order_items oi 
     JOIN price_list_items pli ON oi.price_list_item_id = pli.id 
     WHERE oi.order_id = o.id)
  ) FILTER (WHERE status IN ('approved', 'delivered')), 0) as total_revenue_cents,
  AVG(
    (SELECT SUM(pli.price_cents * oi.quantity) 
     FROM order_items oi 
     JOIN price_list_items pli ON oi.price_list_item_id = pli.id 
     WHERE oi.order_id = o.id)
  ) FILTER (WHERE status IN ('approved', 'delivered')) as avg_order_value_cents,
  DATE_TRUNC('day', MIN(created_at)) as first_order_date,
  DATE_TRUNC('day', MAX(created_at)) as last_order_date
FROM orders o;

-- STEP 7: Create function to get order totals efficiently  
CREATE OR REPLACE FUNCTION calculate_order_total(order_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  total_cents INTEGER;
BEGIN
  SELECT COALESCE(SUM(pli.price_cents * oi.quantity), 0)
  INTO total_cents
  FROM order_items oi
  JOIN price_list_items pli ON oi.price_list_item_id = pli.id
  WHERE oi.order_id = order_uuid;
  
  RETURN total_cents;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- STEP 8: Add function to check for existing pending orders
CREATE OR REPLACE FUNCTION has_pending_order(subject_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM orders 
    WHERE subject_id = subject_uuid 
    AND status = 'pending'
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- STEP 9: Create function to clean up expired abandoned orders
CREATE OR REPLACE FUNCTION cleanup_expired_pending_orders(hours_threshold INTEGER DEFAULT 24)
RETURNS INTEGER AS $$
DECLARE
  cleaned_count INTEGER;
BEGIN
  -- Update old pending orders without MP payment to failed
  UPDATE orders 
  SET 
    status = 'failed',
    notes = COALESCE(notes || ' | ', '') || 'Auto-cancelled: abandoned after ' || hours_threshold || ' hours'
  WHERE 
    status = 'pending' 
    AND mp_payment_id IS NULL
    AND created_at < NOW() - INTERVAL '1 hour' * hours_threshold;
    
  GET DIAGNOSTICS cleaned_count = ROW_COUNT;
  
  RETURN cleaned_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 10: Create indexes for egress tracking  
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_egress_metrics_event_date 
  ON egress_metrics(event_id, date);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_egress_metrics_date_bytes 
  ON egress_metrics(date, bytes_served);

-- STEP 11: Add RLS policies for new MP integration
-- Policy for service role to access all orders (for webhook)
CREATE POLICY "Service role full access to orders" ON orders
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Policy for authenticated admin users to manage orders  
CREATE POLICY "Admin users can manage orders" ON orders
  FOR ALL USING (auth.jwt() ->> 'role' = 'authenticated');

-- Policy for families to view their own orders via token
CREATE POLICY "Families can view own orders via token" ON orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 
      FROM subject_tokens st 
      WHERE st.subject_id = orders.subject_id 
      AND st.expires_at > NOW()
      AND st.token = current_setting('request.token', true)
    )
  );

-- STEP 12: Add comments for documentation
COMMENT ON INDEX idx_orders_subject_pending_unique IS 'Ensures only one pending order per subject (business rule)';
COMMENT ON FUNCTION validate_order_status_transition() IS 'Validates business rules for order status changes';
COMMENT ON FUNCTION calculate_order_total(UUID) IS 'Efficiently calculates total price for an order';
COMMENT ON FUNCTION has_pending_order(UUID) IS 'Checks if subject has any pending orders';
COMMENT ON FUNCTION cleanup_expired_pending_orders(INTEGER) IS 'Cleans up abandoned pending orders older than threshold';
COMMENT ON VIEW order_statistics IS 'Real-time order statistics for admin dashboard';

-- STEP 13: Final validation
DO $$
BEGIN
  -- Verify unique constraint on MP payment ID
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_mp_payment_unique'
  ) THEN
    RAISE WARNING 'MP payment ID unique constraint not created properly';
  END IF;
  
  -- Verify pending order uniqueness
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_orders_subject_pending_unique'
  ) THEN
    RAISE WARNING 'Subject pending order unique index not created';
  END IF;
  
  RAISE NOTICE 'Mercado Pago integration migration completed successfully';
END $$;