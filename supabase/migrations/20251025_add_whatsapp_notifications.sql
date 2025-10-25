BEGIN;

-- Ensure photographer contact columns exist on events
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS photographer_name TEXT,
  ADD COLUMN IF NOT EXISTS photographer_email TEXT,
  ADD COLUMN IF NOT EXISTS photographer_phone TEXT;

-- WhatsApp notification master table
CREATE TABLE IF NOT EXISTS public.whatsapp_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL,
  order_source TEXT NOT NULL DEFAULT 'orders'
    CHECK (order_source IN ('orders', 'unified_orders')),
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  photographer_phone TEXT,
  photographer_name TEXT,
  photographer_email TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed')),
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

CREATE INDEX IF NOT EXISTS idx_whatsapp_notifications_tenant
  ON public.whatsapp_notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_notifications_order
  ON public.whatsapp_notifications(order_id, order_source);
CREATE INDEX IF NOT EXISTS idx_whatsapp_notifications_status
  ON public.whatsapp_notifications(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_notifications_next_retry
  ON public.whatsapp_notifications(next_retry_at)
  WHERE next_retry_at IS NOT NULL;

-- Attempt log table for WhatsApp notifications
CREATE TABLE IF NOT EXISTS public.whatsapp_notification_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES public.whatsapp_notifications(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
  request_payload JSONB DEFAULT '{}'::jsonb,
  response_payload JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_notification_attempts_notification
  ON public.whatsapp_notification_attempts(notification_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_notification_attempts_tenant
  ON public.whatsapp_notification_attempts(tenant_id);

-- Trigger to keep updated_at in sync
DROP TRIGGER IF EXISTS set_whatsapp_notifications_updated_at
  ON public.whatsapp_notifications;
CREATE TRIGGER set_whatsapp_notifications_updated_at
  BEFORE UPDATE ON public.whatsapp_notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMIT;
