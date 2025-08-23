-- ============================================
-- SCHEMA STANDARDIZATION AND AUDIT TRAIL
-- Migration: 20250122_schema_standardization
-- ============================================

-- 1. Standardize price fields to use cents consistently
BEGIN;

-- Check if total_amount exists and rename to total_cents if needed
DO $$
BEGIN
    IF EXISTS (
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'total_amount'
    ) THEN
        -- Rename total_amount to total_cents
        ALTER TABLE orders RENAME COLUMN total_amount TO total_cents;
        
        -- Update any existing data to convert from pesos to cents (multiply by 100)
        UPDATE orders 
        SET total_cents = total_cents * 100 
        WHERE total_cents < 1000; -- Only convert values that seem to be in pesos
    END IF;
END $$;

-- 2. Add audit trail fields to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS status_history JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS last_status_change TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS status_changed_by UUID REFERENCES admin_users(id),
ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- 3. Add enhanced order tracking fields
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS estimated_delivery_date DATE,
ADD COLUMN IF NOT EXISTS actual_delivery_date DATE,
ADD COLUMN IF NOT EXISTS delivery_method TEXT CHECK (delivery_method IN ('pickup', 'email', 'postal', 'hand_delivery')),
ADD COLUMN IF NOT EXISTS tracking_number TEXT,
ADD COLUMN IF NOT EXISTS priority_level INTEGER DEFAULT 1 CHECK (priority_level BETWEEN 1 AND 5);

-- 4. Improve order_items table with better tracking
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS unit_price_cents INTEGER,
ADD COLUMN IF NOT EXISTS subtotal_cents INTEGER,
ADD COLUMN IF NOT EXISTS discount_cents INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_cents INTEGER DEFAULT 0;

-- Migrate existing price data to cents if needed
UPDATE order_items 
SET 
    unit_price_cents = COALESCE(unit_price * 100, 0),
    subtotal_cents = COALESCE(subtotal * 100, 0)
WHERE unit_price_cents IS NULL AND unit_price IS NOT NULL;

-- 5. Create comprehensive indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_status_priority 
    ON orders(status, priority_level DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_event_status_date 
    ON orders(event_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_subject_status 
    ON orders(subject_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_mp_payment_status 
    ON orders(mp_payment_id, status) WHERE mp_payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_delivery_date 
    ON orders(estimated_delivery_date) WHERE estimated_delivery_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_status_history 
    ON orders USING GIN(status_history);

-- 6. Create order_audit_log table for detailed tracking
CREATE TABLE IF NOT EXISTS order_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL CHECK (action_type IN (
        'created', 'status_changed', 'payment_updated', 'delivered', 
        'cancelled', 'refunded', 'notes_added', 'admin_action'
    )),
    old_values JSONB,
    new_values JSONB,
    changed_by UUID REFERENCES admin_users(id),
    changed_by_type TEXT DEFAULT 'admin' CHECK (changed_by_type IN ('admin', 'system', 'webhook')),
    ip_address INET,
    user_agent TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_order_id ON order_audit_log(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action_type ON order_audit_log(action_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_by ON order_audit_log(changed_by, created_at DESC);

-- 7. Create function to automatically update audit trail
CREATE OR REPLACE FUNCTION update_order_audit_trail()
RETURNS TRIGGER AS $$
DECLARE
    audit_data JSONB;
BEGIN
    -- Only log for actual changes
    IF TG_OP = 'UPDATE' AND NEW = OLD THEN
        RETURN NEW;
    END IF;
    
    -- Determine action type
    audit_data := jsonb_build_object(
        'operation', TG_OP,
        'table', TG_TABLE_NAME,
        'timestamp', NOW()
    );
    
    IF TG_OP = 'UPDATE' THEN
        -- Log status changes
        IF OLD.status != NEW.status THEN
            INSERT INTO order_audit_log (
                order_id, action_type, old_values, new_values, changed_by_type
            ) VALUES (
                NEW.id, 
                'status_changed',
                jsonb_build_object('status', OLD.status),
                jsonb_build_object('status', NEW.status),
                'system'
            );
            
            -- Update status history
            NEW.status_history := COALESCE(NEW.status_history, '[]'::jsonb) || 
                jsonb_build_object(
                    'from_status', OLD.status,
                    'to_status', NEW.status,
                    'changed_at', NOW(),
                    'changed_by_type', 'system'
                );
            NEW.last_status_change := NOW();
        END IF;
        
        -- Log payment updates
        IF OLD.mp_payment_id != NEW.mp_payment_id OR OLD.mp_status != NEW.mp_status THEN
            INSERT INTO order_audit_log (
                order_id, action_type, old_values, new_values, changed_by_type
            ) VALUES (
                NEW.id,
                'payment_updated',
                jsonb_build_object(
                    'mp_payment_id', OLD.mp_payment_id,
                    'mp_status', OLD.mp_status
                ),
                jsonb_build_object(
                    'mp_payment_id', NEW.mp_payment_id,
                    'mp_status', NEW.mp_status
                ),
                'webhook'
            );
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 8. Create trigger for automatic audit trail
DROP TRIGGER IF EXISTS trigger_order_audit_trail ON orders;
CREATE TRIGGER trigger_order_audit_trail
    AFTER INSERT OR UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_order_audit_trail();

-- 9. Create view for enhanced order details with audit info (with fallback for missing columns)
CREATE OR REPLACE VIEW order_details_with_audit AS
SELECT 
    o.*,
    -- Audit information (with fallback for missing columns)
    (
        SELECT COUNT(*) 
        FROM order_audit_log oal 
        WHERE oal.order_id = o.id
    ) as audit_log_count,
    (
        SELECT jsonb_agg(
            jsonb_build_object(
                'action_type', oal.action_type,
                'created_at', oal.created_at,
                'changed_by_type', oal.changed_by_type,
                'notes', oal.notes
            ) ORDER BY oal.created_at DESC
        )
        FROM order_audit_log oal 
        WHERE oal.order_id = o.id
        LIMIT 10
    ) as recent_audit_events,
    -- Enhanced status information (with fallback for missing columns)
    CASE 
        WHEN o.status = 'pending' AND o.created_at < NOW() - INTERVAL '24 hours' THEN 'pending_overdue'
        WHEN o.status = 'approved' AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'estimated_delivery_date') AND o.estimated_delivery_date IS NOT NULL AND o.estimated_delivery_date < CURRENT_DATE THEN 'delivery_overdue'
        ELSE o.status
    END as enhanced_status,
    -- Time calculations (with fallback for missing columns)
    EXTRACT(EPOCH FROM (NOW() - o.created_at)) / 3600 as hours_since_created,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'last_status_change') AND o.last_status_change IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (NOW() - o.last_status_change)) / 3600 
        ELSE NULL 
    END as hours_since_status_change,
    -- Event and subject info
    e.name as event_name,
    e.school as event_school,
    e.date as event_date,
    s.name as subject_name,
    s.email as subject_email,
    s.phone as subject_phone
FROM orders o
LEFT JOIN events e ON o.event_id = e.id
LEFT JOIN subjects s ON o.subject_id = s.id;

-- 10. Update RLS policies for new tables
ALTER TABLE order_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all audit logs" ON order_audit_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE id = auth.uid() AND active = true
        )
    );

-- Grant permissions
GRANT SELECT ON order_details_with_audit TO authenticated;
GRANT ALL ON order_audit_log TO service_role;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify the migration
DO $$
BEGIN
    RAISE NOTICE 'Schema standardization migration completed!';
    RAISE NOTICE 'Orders table columns: %', (
        SELECT string_agg(column_name, ', ') 
        FROM information_schema.columns 
        WHERE table_name = 'orders'
    );
    RAISE NOTICE 'New audit log table created with % columns', (
        SELECT count(*) 
        FROM information_schema.columns 
        WHERE table_name = 'order_audit_log'
    );
END $$;