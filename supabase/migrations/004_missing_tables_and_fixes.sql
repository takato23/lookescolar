-- Fix missing tables and unify schema
-- This migration adds missing tables referenced in RLS policies

-- Create payments table (missing from initial schema)
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  mp_payment_id TEXT UNIQUE NOT NULL CHECK (length(mp_payment_id) > 0),
  mp_preference_id TEXT,
  mp_external_reference TEXT,
  mp_status TEXT NOT NULL DEFAULT 'pending',
  mp_status_detail TEXT,
  mp_payment_type TEXT,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  processed_at TIMESTAMPTZ,
  webhook_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create photo_subjects table for many-to-many relationship
-- (Replaces the direct subject_id in photos table for better flexibility)
CREATE TABLE photo_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID REFERENCES photos(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(photo_id, subject_id)
);

-- Add updated_at trigger to payments table
CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Add indexes for new tables
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_mp_payment_id ON payments(mp_payment_id);
CREATE INDEX idx_payments_mp_status ON payments(mp_status);
CREATE INDEX idx_photo_subjects_photo_id ON photo_subjects(photo_id);
CREATE INDEX idx_photo_subjects_subject_id ON photo_subjects(subject_id);

-- Create function to migrate existing photo-subject relationships
-- This is safe to run even if photos.subject_id is null
CREATE OR REPLACE FUNCTION migrate_photo_subjects()
RETURNS VOID AS $$
BEGIN
  -- Insert existing photo-subject relationships into the new table
  INSERT INTO photo_subjects (photo_id, subject_id)
  SELECT id, subject_id 
  FROM photos 
  WHERE subject_id IS NOT NULL
  ON CONFLICT (photo_id, subject_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Run the migration function
SELECT migrate_photo_subjects();

-- Drop the migration function after use
DROP FUNCTION migrate_photo_subjects();

-- Add constraint to ensure mp_payment_id is unique across payments
-- (Already added above, but ensuring it's clear this is critical for webhook idempotency)

-- Create function to validate token access for families
CREATE OR REPLACE FUNCTION validate_token_access(input_token TEXT)
RETURNS UUID AS $$
DECLARE
  subject_uuid UUID;
BEGIN
  -- Check if token exists and is not expired
  SELECT st.subject_id INTO subject_uuid
  FROM subject_tokens st
  WHERE st.token = input_token 
    AND st.expires_at > NOW();
  
  -- Return subject_id if valid, NULL if invalid
  RETURN subject_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function for secure token generation (enhanced version)
-- This replaces the simpler version from the initial migration
CREATE OR REPLACE FUNCTION generate_secure_token(length INT DEFAULT 20)
RETURNS TEXT AS $$
DECLARE
  -- Using crypto-safe character set (no ambiguous characters)
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  result TEXT := '';
  i INT;
  char_count INT;
BEGIN
  -- Ensure minimum length of 20 characters
  IF length < 20 THEN
    length := 20;
  END IF;
  
  char_count := length(chars);
  
  -- Generate cryptographically secure random token
  FOR i IN 1..length LOOP
    result := result || substr(chars, floor(random() * char_count + 1)::INT, 1);
  END LOOP;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to clean up expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM subject_tokens 
  WHERE expires_at < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update egress metrics
CREATE OR REPLACE FUNCTION update_egress_metrics(
  p_event_id UUID,
  p_bytes_served BIGINT,
  p_requests_count INTEGER DEFAULT 1
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO egress_metrics (event_id, date, bytes_served, requests_count)
  VALUES (p_event_id, CURRENT_DATE, p_bytes_served, p_requests_count)
  ON CONFLICT (event_id, date)
  DO UPDATE SET
    bytes_served = egress_metrics.bytes_served + p_bytes_served,
    requests_count = egress_metrics.requests_count + p_requests_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add constraint to ensure only one active order per subject
-- This enhances the existing trigger to be more robust
ALTER TABLE orders ADD CONSTRAINT unique_pending_order_per_subject 
  EXCLUDE (subject_id WITH =) WHERE (status = 'pending');