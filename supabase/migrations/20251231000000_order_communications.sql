-- Migration: Create order_communications table for tracking all order-related communications
-- This consolidates email, WhatsApp, and other notification channels into a single audit log

-- Create the order_communications table
CREATE TABLE IF NOT EXISTS order_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('email', 'whatsapp', 'sms', 'push')),
  channel VARCHAR(50) NOT NULL, -- e.g., 'order_confirmation', 'order_ready', 'custom'
  recipient VARCHAR(20) NOT NULL DEFAULT 'customer' CHECK (recipient IN ('customer', 'photographer', 'admin')),
  recipient_email VARCHAR(255),
  recipient_phone VARCHAR(30),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'delivered', 'read')),
  error_message TEXT,
  provider_message_id VARCHAR(255),
  message_body TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_order_communications_order_id ON order_communications(order_id);
CREATE INDEX IF NOT EXISTS idx_order_communications_type ON order_communications(type);
CREATE INDEX IF NOT EXISTS idx_order_communications_status ON order_communications(status);
CREATE INDEX IF NOT EXISTS idx_order_communications_created_at ON order_communications(created_at DESC);

-- Add RLS policies
ALTER TABLE order_communications ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all communications
CREATE POLICY "Admins can view all order communications"
  ON order_communications
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Admins can insert communications
CREATE POLICY "Admins can insert order communications"
  ON order_communications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Admins can update communications
CREATE POLICY "Admins can update order communications"
  ON order_communications
  FOR UPDATE
  TO authenticated
  USING (true);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_order_communications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_order_communications_updated_at ON order_communications;
CREATE TRIGGER trigger_order_communications_updated_at
  BEFORE UPDATE ON order_communications
  FOR EACH ROW
  EXECUTE FUNCTION update_order_communications_updated_at();

-- Add comment
COMMENT ON TABLE order_communications IS 'Audit log for all order-related communications (email, WhatsApp, SMS)';
