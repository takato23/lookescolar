-- ============================================================
-- SOLUCIÓN URGENTE: Crear tabla store_settings
-- Este script debe ejecutarse en Supabase SQL Editor
-- ============================================================

-- 1. Crear la tabla store_settings
CREATE TABLE IF NOT EXISTS public.store_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,

  -- Configuración básica
  enabled BOOLEAN DEFAULT false,
  template TEXT DEFAULT 'pixieset',
  currency TEXT DEFAULT 'ARS',

  -- Colores
  colors JSONB DEFAULT '{"primary": "#1f2937", "secondary": "#6b7280", "accent": "#3b82f6", "background": "#f9fafb", "surface": "#ffffff", "text": "#111827", "text_secondary": "#6b7280"}'::jsonb,

  -- Textos
  texts JSONB DEFAULT '{"hero_title": "Galería Fotográfica", "hero_subtitle": "Encuentra tus mejores momentos escolares", "footer_text": "© 2024 LookEscolar - Fotografía Escolar", "contact_email": "", "contact_phone": "", "terms_url": "", "privacy_url": ""}'::jsonb,

  -- Configuración de tema
  theme_customization JSONB DEFAULT '{"custom_css": "", "header_style": "default", "gallery_layout": "grid", "photo_aspect_ratio": "auto", "show_photo_numbers": true, "enable_zoom": true, "enable_fullscreen": true, "mobile_columns": 2, "desktop_columns": 4, "template_variant": "pixieset"}'::jsonb,

  -- Productos
  products JSONB DEFAULT '{}'::jsonb,

  -- Métodos de pago
  payment_methods JSONB DEFAULT '{"mercadopago": {"enabled": true, "name": "Mercado Pago", "description": "Pago online con tarjetas y billeteras virtuales", "icon": "CreditCard"}}'::jsonb,

  -- URLs
  logo_url TEXT DEFAULT '',
  banner_url TEXT DEFAULT '',

  -- Características
  features JSONB DEFAULT '{"allowExtrasOnly": true, "showFAQ": true, "showBadges": true}'::jsonb,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Crear índice para event_id
CREATE INDEX IF NOT EXISTS idx_store_settings_event_id ON store_settings(event_id);

-- 3. Crear constraint único para event_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'store_settings' AND constraint_name = 'store_settings_event_id_unique'
  ) THEN
    ALTER TABLE store_settings ADD CONSTRAINT store_settings_event_id_unique UNIQUE (event_id);
  END IF;
END $$;

-- 4. Crear trigger para updated_at
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

-- 5. Configurar permisos
GRANT ALL ON store_settings TO service_role;
GRANT SELECT, INSERT, UPDATE ON store_settings TO authenticated;
GRANT EXECUTE ON FUNCTION update_store_settings_updated_at() TO service_role, authenticated;

-- 6. Verificar que se creó correctamente
DO $$
DECLARE
    table_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'store_settings'
    ) INTO table_exists;

    IF table_exists THEN
        RAISE NOTICE '✅ Tabla store_settings creada exitosamente';
        RAISE NOTICE '✅ Índices y constraints configurados';
        RAISE NOTICE '✅ Permisos configurados';
        RAISE NOTICE '✅ Sistema de configuración de tienda listo!';
    ELSE
        RAISE EXCEPTION '❌ Error: La tabla store_settings no se pudo crear';
    END IF;
END $$;
