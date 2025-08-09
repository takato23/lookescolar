-- Additional utility and validation functions for the photo management system

-- Function to generate QR code data for subjects
CREATE OR REPLACE FUNCTION generate_qr_data_for_event(event_uuid UUID)
RETURNS TABLE(
  subject_id UUID,
  token TEXT,
  qr_data TEXT,
  display_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id as subject_id,
    st.token,
    CONCAT('https://lookescolar.com/f/', st.token) as qr_data,
    CASE 
      WHEN s.type = 'student' THEN CONCAT(s.first_name, ' ', COALESCE(s.last_name, ''))
      WHEN s.type = 'couple' THEN CONCAT(s.first_name, ' & ', s.couple_first_name)
      WHEN s.type = 'family' THEN CONCAT('Familia ', s.family_name)
      ELSE 'Desconocido'
    END as display_name
  FROM subjects s
  JOIN subject_tokens st ON s.id = st.subject_id
  WHERE s.event_id = event_uuid
    AND st.expires_at > NOW()
  ORDER BY display_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate and process order creation
CREATE OR REPLACE FUNCTION create_order_with_validation(
  p_subject_id UUID,
  p_contact_name TEXT,
  p_contact_email TEXT,
  p_contact_phone TEXT,
  p_photo_ids UUID[],
  p_price_item_ids UUID[],
  p_quantities INTEGER[]
)
RETURNS UUID AS $$
DECLARE
  new_order_id UUID;
  i INTEGER;
BEGIN
  -- Validate input arrays have same length
  IF array_length(p_photo_ids, 1) != array_length(p_price_item_ids, 1) 
     OR array_length(p_photo_ids, 1) != array_length(p_quantities, 1) THEN
    RAISE EXCEPTION 'Los arrays de fotos, precios y cantidades deben tener la misma longitud';
  END IF;

  -- Check if subject already has pending order
  IF EXISTS (
    SELECT 1 FROM orders 
    WHERE subject_id = p_subject_id 
    AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'Ya existe un pedido pendiente para este sujeto';
  END IF;

  -- Create the order
  INSERT INTO orders (subject_id, contact_name, contact_email, contact_phone)
  VALUES (p_subject_id, p_contact_name, p_contact_email, p_contact_phone)
  RETURNING id INTO new_order_id;

  -- Add order items
  FOR i IN 1..array_length(p_photo_ids, 1) LOOP
    INSERT INTO order_items (order_id, photo_id, price_list_item_id, quantity)
    VALUES (new_order_id, p_photo_ids[i], p_price_item_ids[i], p_quantities[i]);
  END LOOP;

  RETURN new_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update order status with payment info
CREATE OR REPLACE FUNCTION update_order_payment(
  p_order_id UUID,
  p_mp_preference_id TEXT,
  p_mp_payment_id TEXT DEFAULT NULL,
  p_mp_status TEXT DEFAULT 'pending',
  p_mp_external_reference TEXT DEFAULT NULL,
  p_amount_cents INTEGER DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  -- Update order
  UPDATE orders SET
    mp_preference_id = p_mp_preference_id,
    mp_payment_id = COALESCE(p_mp_payment_id, mp_payment_id),
    mp_status = p_mp_status,
    mp_external_reference = COALESCE(p_mp_external_reference, mp_external_reference),
    status = CASE 
      WHEN p_mp_status IN ('approved', 'authorized') THEN 'approved'::order_status
      WHEN p_mp_status IN ('cancelled', 'rejected') THEN 'failed'::order_status
      ELSE status
    END
  WHERE id = p_order_id;

  -- Create or update payment record if payment info provided
  IF p_mp_payment_id IS NOT NULL AND p_amount_cents IS NOT NULL THEN
    INSERT INTO payments (
      order_id, 
      mp_payment_id, 
      mp_preference_id, 
      mp_external_reference,
      mp_status,
      amount_cents,
      processed_at
    )
    VALUES (
      p_order_id,
      p_mp_payment_id,
      p_mp_preference_id,
      p_mp_external_reference,
      p_mp_status,
      p_amount_cents,
      NOW()
    )
    ON CONFLICT (mp_payment_id) DO UPDATE SET
      mp_status = EXCLUDED.mp_status,
      processed_at = NOW(),
      webhook_data = payments.webhook_data; -- Preserve existing webhook data
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get order summary for admin
CREATE OR REPLACE FUNCTION get_order_summary(p_order_id UUID)
RETURNS TABLE(
  order_id UUID,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  order_status order_status,
  total_items BIGINT,
  total_amount_cents BIGINT,
  mp_payment_id TEXT,
  mp_status TEXT,
  created_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  subject_name TEXT,
  event_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.contact_name,
    o.contact_email,
    o.contact_phone,
    o.status,
    COUNT(oi.id) as total_items,
    COALESCE(SUM(pli.price_cents * oi.quantity), 0) as total_amount_cents,
    o.mp_payment_id,
    o.mp_status,
    o.created_at,
    o.delivered_at,
    CASE 
      WHEN s.type = 'student' THEN CONCAT(s.first_name, ' ', COALESCE(s.last_name, ''))
      WHEN s.type = 'couple' THEN CONCAT(s.first_name, ' & ', s.couple_first_name)
      WHEN s.type = 'family' THEN CONCAT('Familia ', s.family_name)
      ELSE 'Desconocido'
    END as subject_name,
    e.name as event_name
  FROM orders o
  LEFT JOIN subjects s ON o.subject_id = s.id
  LEFT JOIN events e ON s.event_id = e.id
  LEFT JOIN order_items oi ON o.id = oi.order_id
  LEFT JOIN price_list_items pli ON oi.price_list_item_id = pli.id
  WHERE o.id = p_order_id
  GROUP BY o.id, o.contact_name, o.contact_email, o.contact_phone, o.status,
           o.mp_payment_id, o.mp_status, o.created_at, o.delivered_at,
           s.type, s.first_name, s.last_name, s.couple_first_name, s.family_name, e.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark order as delivered
CREATE OR REPLACE FUNCTION mark_order_delivered(p_order_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE orders 
  SET 
    status = 'delivered',
    delivered_at = NOW()
  WHERE id = p_order_id
    AND status = 'approved'; -- Only allow delivered status for approved orders
    
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Orden no encontrada o no está en estado aprobado';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to rotate token (security feature)
CREATE OR REPLACE FUNCTION rotate_subject_token(p_subject_id UUID)
RETURNS TEXT AS $$
DECLARE
  new_token TEXT;
BEGIN
  -- Generate new token
  new_token := generate_secure_token(24); -- Slightly longer for rotated tokens
  
  -- Update existing token
  UPDATE subject_tokens 
  SET 
    token = new_token,
    expires_at = NOW() + INTERVAL '30 days',
    created_at = NOW()
  WHERE subject_id = p_subject_id;
  
  IF NOT FOUND THEN
    -- Create new token if none exists
    INSERT INTO subject_tokens (subject_id, token, expires_at)
    VALUES (p_subject_id, new_token, NOW() + INTERVAL '30 days');
  END IF;
  
  RETURN new_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get storage statistics
CREATE OR REPLACE FUNCTION get_storage_stats()
RETURNS TABLE(
  event_id UUID,
  event_name TEXT,
  total_photos BIGINT,
  approved_photos BIGINT,
  total_egress_bytes BIGINT,
  total_requests BIGINT,
  last_activity DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.name,
    COUNT(p.id) as total_photos,
    COUNT(p.id) FILTER (WHERE p.approved = true) as approved_photos,
    COALESCE(SUM(em.bytes_served), 0) as total_egress_bytes,
    COALESCE(SUM(em.requests_count), 0) as total_requests,
    MAX(em.date) as last_activity
  FROM events e
  LEFT JOIN photos p ON e.id = p.event_id
  LEFT JOIN egress_metrics em ON e.id = em.event_id
  WHERE e.active = true
  GROUP BY e.id, e.name
  ORDER BY e.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old data (maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_data(days_old INTEGER DEFAULT 90)
RETURNS TABLE(
  table_name TEXT,
  records_deleted BIGINT
) AS $$
DECLARE
  expired_tokens_deleted BIGINT;
  old_egress_deleted BIGINT;
  old_emails_deleted BIGINT;
BEGIN
  -- Clean up expired tokens (older than specified days)
  DELETE FROM subject_tokens 
  WHERE expires_at < NOW() - INTERVAL '1 day' * days_old;
  GET DIAGNOSTICS expired_tokens_deleted = ROW_COUNT;
  
  -- Clean up old egress metrics (keep last 12 months)
  DELETE FROM egress_metrics 
  WHERE date < CURRENT_DATE - INTERVAL '365 days';
  GET DIAGNOSTICS old_egress_deleted = ROW_COUNT;
  
  -- Clean up old email queue (sent emails older than 30 days)
  DELETE FROM email_queue 
  WHERE status = 'sent' AND sent_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS old_emails_deleted = ROW_COUNT;
  
  -- Return results
  RETURN QUERY VALUES
    ('subject_tokens', expired_tokens_deleted),
    ('egress_metrics', old_egress_deleted),
    ('email_queue', old_emails_deleted);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get event dashboard data
CREATE OR REPLACE FUNCTION get_event_dashboard(p_event_id UUID)
RETURNS TABLE(
  event_name TEXT,
  total_subjects BIGINT,
  total_photos BIGINT,
  approved_photos BIGINT,
  tagged_photos BIGINT,
  total_orders BIGINT,
  pending_orders BIGINT,
  approved_orders BIGINT,
  delivered_orders BIGINT,
  total_revenue_cents BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.name,
    COUNT(DISTINCT s.id) as total_subjects,
    COUNT(DISTINCT p.id) as total_photos,
    COUNT(DISTINCT p.id) FILTER (WHERE p.approved = true) as approved_photos,
    COUNT(DISTINCT ps.photo_id) as tagged_photos,
    COUNT(DISTINCT o.id) as total_orders,
    COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'pending') as pending_orders,
    COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'approved') as approved_orders,
    COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'delivered') as delivered_orders,
    COALESCE(SUM(pli.price_cents * oi.quantity) FILTER (WHERE o.status IN ('approved', 'delivered')), 0) as total_revenue_cents
  FROM events e
  LEFT JOIN subjects s ON e.id = s.event_id
  LEFT JOIN photos p ON e.id = p.event_id
  LEFT JOIN photo_subjects ps ON p.id = ps.photo_id
  LEFT JOIN orders o ON s.id = o.subject_id
  LEFT JOIN order_items oi ON o.id = oi.order_id
  LEFT JOIN price_list_items pli ON oi.price_list_item_id = pli.id
  WHERE e.id = p_event_id
  GROUP BY e.id, e.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON FUNCTION generate_qr_data_for_event(UUID) IS 
'Generates QR code data for all subjects in an event with their access tokens';

COMMENT ON FUNCTION create_order_with_validation(UUID, TEXT, TEXT, TEXT, UUID[], UUID[], INTEGER[]) IS 
'Creates a new order with validation, ensuring no duplicate pending orders';

COMMENT ON FUNCTION update_order_payment(UUID, TEXT, TEXT, TEXT, TEXT, INTEGER) IS 
'Updates order and payment information, typically called from Mercado Pago webhook';

COMMENT ON FUNCTION rotate_subject_token(UUID) IS 
'Security function to rotate compromised or expiring tokens';

COMMENT ON FUNCTION cleanup_old_data(INTEGER) IS 
'Maintenance function to clean up expired tokens and old metrics data';