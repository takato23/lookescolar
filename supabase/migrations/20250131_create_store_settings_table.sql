-- ============================================================
-- MIGRACIÓN: Crear tabla store_settings
-- Fecha: 2025-01-31
-- Propósito: Crear tabla para configuración de tienda por evento
-- ============================================================

BEGIN;

-- ============================================================
-- 1. CREAR TABLA STORE_SETTINGS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.store_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,

  -- Configuración básica
  enabled BOOLEAN DEFAULT false,
  template TEXT DEFAULT 'pixieset',
  currency TEXT DEFAULT 'ARS',

  -- Colores
  colors JSONB DEFAULT '{
    "primary": "#1f2937",
    "secondary": "#6b7280",
    "accent": "#3b82f6",
    "background": "#f9fafb",
    "surface": "#ffffff",
    "text": "#111827",
    "text_secondary": "#6b7280"
  }'::jsonb,

  -- Textos
  texts JSONB DEFAULT '{
    "hero_title": "Galería Fotográfica",
    "hero_subtitle": "Encuentra tus mejores momentos escolares",
    "footer_text": "© 2024 LookEscolar - Fotografía Escolar",
    "contact_email": "",
    "contact_phone": "",
    "terms_url": "",
    "privacy_url": ""
  }'::jsonb,

  -- Configuración de tema
  theme_customization JSONB DEFAULT '{
    "custom_css": "",
    "header_style": "default",
    "gallery_layout": "grid",
    "photo_aspect_ratio": "auto",
    "show_photo_numbers": true,
    "enable_zoom": true,
    "enable_fullscreen": true,
    "mobile_columns": 2,
    "desktop_columns": 4,
    "template_variant": "pixieset"
  }'::jsonb,

  -- Productos
  products JSONB DEFAULT '{}'::jsonb,

  -- Métodos de pago
  payment_methods JSONB DEFAULT '{
    "mercadopago": {
      "enabled": true,
      "name": "Mercado Pago",
      "description": "Pago online con tarjetas y billeteras virtuales",
      "icon": "CreditCard"
    }
  }'::jsonb,

  -- URLs
  logo_url TEXT DEFAULT '',
  banner_url TEXT DEFAULT '',

  -- Características
  features JSONB DEFAULT '{
    "allowExtrasOnly": true,
    "showFAQ": true,
    "showBadges": true
  }'::jsonb,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. ÍNDICES Y CONSTRAINTS
-- ============================================================

-- Índice para event_id
CREATE INDEX IF NOT EXISTS idx_store_settings_event_id ON store_settings(event_id);

-- Constraint único para event_id (un evento puede tener solo una configuración)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'store_settings' AND constraint_name = 'store_settings_event_id_unique'
  ) THEN
    ALTER TABLE store_settings ADD CONSTRAINT store_settings_event_id_unique UNIQUE (event_id);
  END IF;
END $$;

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_store_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_store_settings_updated_at
  BEFORE UPDATE ON store_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_store_settings_updated_at();

-- ============================================================
-- 3. PERMISOS
-- ============================================================

-- Permisos para la tabla
GRANT ALL ON store_settings TO service_role;
GRANT SELECT, INSERT, UPDATE ON store_settings TO authenticated;

-- Permisos para la función
GRANT EXECUTE ON FUNCTION update_store_settings_updated_at() TO service_role, authenticated;

-- ============================================================
-- 4. MIGRAR DATOS EXISTENTES
-- ============================================================

-- Si hay configuraciones en folders.store_settings, migrarlas a la nueva tabla
DO $$
DECLARE
  folder_record RECORD;
BEGIN
  -- Migrar configuraciones de folders a store_settings
  FOR folder_record IN
    SELECT
      f.event_id,
      f.store_settings,
      f.is_published as enabled
    FROM folders f
    WHERE f.store_settings IS NOT NULL
      AND f.store_settings != '{}'::jsonb
      AND f.event_id IS NOT NULL
  LOOP
    -- Insertar en store_settings si no existe
    INSERT INTO store_settings (
      event_id,
      enabled,
      products,
      created_at,
      updated_at
    ) VALUES (
      folder_record.event_id,
      COALESCE(folder_record.enabled, false),
      COALESCE(folder_record.store_settings->'products', '{}'::jsonb),
      NOW(),
      NOW()
    )
    ON CONFLICT (event_id) DO UPDATE SET
      enabled = EXCLUDED.enabled,
      products = EXCLUDED.products,
      updated_at = NOW();

    -- Limpiar el campo store_settings de folders para evitar duplicación
    UPDATE folders
    SET store_settings = '{
      "allow_download": false,
      "watermark_enabled": true,
      "store_title": null,
      "store_description": null,
      "contact_info": null
    }'::jsonb
    WHERE event_id = folder_record.event_id;
  END LOOP;
END $$;

-- ============================================================
-- 5. MENSAJES DE CONFIRMACIÓN
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE 'Tabla store_settings creada correctamente';
  RAISE NOTICE 'Configuraciones migradas desde folders.store_settings';
  RAISE NOTICE 'Sistema de configuración de tienda listo!';
END $$;

COMMIT;
