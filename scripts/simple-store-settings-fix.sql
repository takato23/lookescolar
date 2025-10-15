-- CREAR TABLA STORE_SETTINGS - VERSIÓN SIMPLE
-- Solución directa al error "column event_id does not exist"

-- 1. Crear tabla store_settings
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

-- 2. Crear índice para event_id
CREATE INDEX IF NOT EXISTS idx_store_settings_event_id ON store_settings(event_id);

-- 3. Configurar permisos
GRANT ALL ON store_settings TO service_role;
GRANT SELECT, INSERT, UPDATE ON store_settings TO authenticated;

-- 4. Verificación
SELECT
  'Tabla store_settings' as component,
  CASE WHEN EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'store_settings'
  ) THEN '✅ CREADA' ELSE '❌ ERROR' END as status;

SELECT
  'Columna event_id' as component,
  CASE WHEN EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'store_settings' AND column_name = 'event_id'
  ) THEN '✅ PRESENTE' ELSE '❌ ERROR' END as status;

SELECT
  'Índice event_id' as component,
  CASE WHEN EXISTS (
    SELECT FROM pg_indexes
    WHERE tablename = 'store_settings' AND indexname = 'idx_store_settings_event_id'
  ) THEN '✅ CREADO' ELSE '❌ ERROR' END as status;
