-- WhatsApp notifications migration (simplified to avoid deadlocks)

-- Step 1: Add photographer contact columns to events
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS photographer_name TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS photographer_email TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS photographer_phone TEXT;

-- Step 2: Create WhatsApp notifications table
CREATE TABLE IF NOT EXISTS public.whatsapp_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL,
  order_source TEXT NOT NULL DEFAULT 'orders',
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  photographer_phone TEXT,
  photographer_name TEXT,
  photographer_email TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  provider TEXT NOT NULL DEFAULT 'meta_whatsapp',
  provider_message_id TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  message_body TEXT NOT NULL,
  message_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  next_retry_at TIMESTAMPTZ,
  last_attempt_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Step 3: Add constraints separately
DO $$
BEGIN
  -- Add order_source constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'whatsapp_notifications_order_source_check'
  ) THEN
    ALTER TABLE public.whatsapp_notifications 
    ADD CONSTRAINT whatsapp_notifications_order_source_check 
    CHECK (order_source IN ('orders', 'unified_orders'));
  END IF;
  
  -- Add status constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'whatsapp_notifications_status_check'
  ) THEN
    ALTER TABLE public.whatsapp_notifications 
    ADD CONSTRAINT whatsapp_notifications_status_check 
    CHECK (status IN ('pending', 'sent', 'failed'));
  END IF;
END $$;

-- Step 4: Create indexes
CREATE INDEX IF NOT EXISTS idx_whatsapp_notifications_tenant
  ON public.whatsapp_notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_notifications_order
  ON public.whatsapp_notifications(order_id, order_source);
CREATE INDEX IF NOT EXISTS idx_whatsapp_notifications_status
  ON public.whatsapp_notifications(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_notifications_next_retry
  ON public.whatsapp_notifications(next_retry_at)
  WHERE next_retry_at IS NOT NULL;

-- Step 5: Create attempts table
CREATE TABLE IF NOT EXISTS public.whatsapp_notification_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES public.whatsapp_notifications(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL,
  status TEXT NOT NULL,
  request_payload JSONB DEFAULT '{}'::jsonb,
  response_payload JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Step 6: Add constraint to attempts table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'whatsapp_notification_attempts_status_check'
  ) THEN
    ALTER TABLE public.whatsapp_notification_attempts 
    ADD CONSTRAINT whatsapp_notification_attempts_status_check 
    CHECK (status IN ('sent', 'failed'));
  END IF;
END $$;

-- Step 7: Create indexes for attempts table
CREATE INDEX IF NOT EXISTS idx_whatsapp_notification_attempts_notification
  ON public.whatsapp_notification_attempts(notification_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_notification_attempts_tenant
  ON public.whatsapp_notification_attempts(tenant_id);

-- Step 8: Create trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 9: Create trigger
DROP TRIGGER IF EXISTS set_whatsapp_notifications_updated_at ON public.whatsapp_notifications;
CREATE TRIGGER set_whatsapp_notifications_updated_at
  BEFORE UPDATE ON public.whatsapp_notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
