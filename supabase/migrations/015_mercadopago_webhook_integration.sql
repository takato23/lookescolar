-- ============================================================
-- Migration 015: Mercado Pago Webhook Integration
-- Creates atomic function for processing webhook payments
-- ============================================================

BEGIN;

-- Create atomic function to process payment webhooks
-- This ensures both orders and payments tables are updated atomically
CREATE OR REPLACE FUNCTION process_payment_webhook(
  p_order_id UUID,
  p_mp_payment_id TEXT,
  p_mp_preference_id TEXT,
  p_mp_external_reference TEXT,
  p_mp_status TEXT,
  p_mp_status_detail TEXT,
  p_mp_payment_type TEXT,
  p_amount_cents INTEGER,
  p_internal_status TEXT,
  p_webhook_data JSONB
)
RETURNS VOID AS $$
DECLARE
  order_exists_count INTEGER;
  payment_exists_count INTEGER;
BEGIN
  -- Validate input parameters
  IF p_order_id IS NULL OR p_mp_payment_id IS NULL THEN
    RAISE EXCEPTION 'Order ID and MP Payment ID are required';
  END IF;
  
  IF p_amount_cents <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than zero';
  END IF;
  
  -- Check if order exists
  SELECT COUNT(*) INTO order_exists_count
  FROM orders
  WHERE id = p_order_id;
  
  IF order_exists_count = 0 THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;
  
  -- Check for duplicate payment (idempotency)
  SELECT COUNT(*) INTO payment_exists_count
  FROM payments
  WHERE mp_payment_id = p_mp_payment_id;
  
  IF payment_exists_count > 0 THEN
    RAISE EXCEPTION 'Payment already processed: %', p_mp_payment_id;
  END IF;
  
  -- Create payment record
  INSERT INTO payments (
    order_id,
    mp_payment_id,
    mp_preference_id,
    mp_external_reference,
    mp_status,
    mp_status_detail,
    mp_payment_type,
    amount_cents,
    processed_at,
    webhook_data,
    created_at,
    updated_at
  ) VALUES (
    p_order_id,
    p_mp_payment_id,
    p_mp_preference_id,
    p_mp_external_reference,
    p_mp_status,
    p_mp_status_detail,
    p_mp_payment_type,
    p_amount_cents,
    CASE WHEN p_internal_status = 'approved' THEN NOW() ELSE NULL END,
    p_webhook_data,
    NOW(),
    NOW()
  );
  
  -- Update order status and MP reference
  UPDATE orders 
  SET 
    mp_payment_id = p_mp_payment_id,
    mp_status = p_mp_status,
    mp_external_reference = p_mp_external_reference,
    status = p_internal_status,
    approved_at = CASE WHEN p_internal_status = 'approved' THEN NOW() ELSE approved_at END,
    updated_at = NOW()
  WHERE id = p_order_id;
  
  -- Log successful processing
  RAISE LOG 'Payment webhook processed successfully - Order: %, Payment: %, Status: %', 
           p_order_id, p_mp_payment_id, p_internal_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION process_payment_webhook(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, JSONB) 
TO service_role, authenticated;

-- Create function to get payment status for family portal
CREATE OR REPLACE FUNCTION get_order_payment_status(p_order_id UUID)
RETURNS TABLE(
  order_id UUID,
  order_status TEXT,
  mp_status TEXT,
  amount_cents INTEGER,
  processed_at TIMESTAMPTZ,
  payment_method TEXT,
  payment_type TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.status,
    p.mp_status,
    p.amount_cents,
    p.processed_at,
    (p.webhook_data->>'payment_method_id')::TEXT,
    p.mp_payment_type
  FROM orders o
  LEFT JOIN payments p ON o.id = p.order_id
  WHERE o.id = p_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_order_payment_status(UUID) TO service_role, authenticated, anon;

-- Create enhanced order status view with payment information
CREATE OR REPLACE VIEW order_status_with_payments AS
SELECT 
  o.id as order_id,
  o.subject_id,
  o.contact_name,
  o.contact_email,
  o.status as order_status,
  o.total_amount_cents,
  o.created_at as order_created_at,
  o.updated_at as order_updated_at,
  o.approved_at,
  -- Payment information
  p.id as payment_id,
  p.mp_payment_id,
  p.mp_status,
  p.mp_status_detail,
  p.mp_payment_type,
  p.amount_cents as payment_amount_cents,
  p.processed_at,
  p.webhook_data,
  -- Subject information
  s.first_name,
  s.last_name,
  s.type as subject_type,
  -- Event information
  e.name as event_name,
  e.school as event_school
FROM orders o
LEFT JOIN payments p ON o.id = p.order_id
LEFT JOIN subjects s ON o.subject_id = s.id
LEFT JOIN events e ON s.event_id = e.id;

-- Enable RLS on the view (inherits from underlying tables)
ALTER VIEW order_status_with_payments SET (security_invoker = on);

-- Create indexes for better performance on payments table
CREATE INDEX IF NOT EXISTS idx_payments_order_status 
  ON payments(order_id, mp_status);

CREATE INDEX IF NOT EXISTS idx_payments_processed_at 
  ON payments(processed_at DESC) 
  WHERE processed_at IS NOT NULL;

-- Create trigger to update order total_amount_cents from payments
CREATE OR REPLACE FUNCTION sync_order_amount_from_payment()
RETURNS TRIGGER AS $$
BEGIN
  -- Update order total when payment is approved
  IF NEW.mp_status = 'approved' AND (OLD.mp_status IS NULL OR OLD.mp_status != 'approved') THEN
    UPDATE orders 
    SET total_amount_cents = NEW.amount_cents
    WHERE id = NEW.order_id 
      AND (total_amount_cents IS NULL OR total_amount_cents != NEW.amount_cents);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on payments table
CREATE TRIGGER trigger_sync_order_amount
  AFTER INSERT OR UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION sync_order_amount_from_payment();

COMMIT;