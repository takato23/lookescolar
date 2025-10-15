-- CREAR TABLA STORE_SETTINGS - SOLUCIÓN AL ERROR "column event_id does not exist"
-- Copiar y pegar este SQL en Supabase → SQL Editor → Run

CREATE TABLE IF NOT EXISTS public.store_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT false,
  template TEXT DEFAULT 'pixieset',
  currency TEXT DEFAULT 'ARS',
  products JSONB DEFAULT '{}'::jsonb,
  payment_methods JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_settings_event_id ON store_settings(event_id);
GRANT ALL ON store_settings TO service_role;
GRANT SELECT, INSERT, UPDATE ON store_settings TO authenticated;
