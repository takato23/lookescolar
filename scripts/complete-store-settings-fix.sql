-- ============================================================
-- SOLUCIÓN COMPLETA: store_settings FALTANTE
-- Script con diagnóstico y solución paso a paso
-- ============================================================

BEGIN;

-- ============================================================
-- 1. DIAGNÓSTICO INICIAL
-- ============================================================

DO $$
DECLARE
    table_exists BOOLEAN;
    event_table_exists BOOLEAN;
    col_record RECORD;
BEGIN
    RAISE NOTICE '=== DIAGNÓSTICO INICIAL ===';

    -- Verificar tabla events (debe existir)
    SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'events'
    ) INTO event_table_exists;

    IF NOT event_table_exists THEN
        RAISE EXCEPTION '❌ ERROR CRÍTICO: La tabla events no existe. Debes crear el esquema base primero.';
    END IF;

    RAISE NOTICE '✅ Tabla events: EXISTE';

    -- Verificar tabla store_settings
    SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'store_settings'
    ) INTO table_exists;

    RAISE NOTICE 'Tabla store_settings: %', CASE WHEN table_exists THEN '✅ EXISTE' ELSE '❌ NO EXISTE' END;

    IF table_exists THEN
        RAISE NOTICE '';
        RAISE NOTICE '=== COLUMNAS ACTUALES ===';

        FOR col_record IN
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'store_settings'
            ORDER BY ordinal_position
        LOOP
            RAISE NOTICE '% | % | %',
                col_record.column_name,
                col_record.data_type,
                CASE WHEN col_record.is_nullable = 'YES' THEN 'NULLABLE' ELSE 'NOT NULL' END;
        END LOOP;

        -- Verificar si existe event_id
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'store_settings' AND column_name = 'event_id'
        ) THEN
            RAISE NOTICE '';
            RAISE NOTICE '✅ Columna event_id: PRESENTE';
        ELSE
            RAISE NOTICE '';
            RAISE NOTICE '❌ Columna event_id: FALTANTE - Recreando tabla...';
        END IF;
    END IF;
END $$;

-- ============================================================
-- 2. CREAR/RECREAR TABLA STORE_SETTINGS
-- ============================================================

-- Eliminar tabla si existe (para recrearla completamente)
DROP TABLE IF EXISTS public.store_settings CASCADE;

-- Crear tabla nueva con estructura correcta
CREATE TABLE public.store_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,

  -- Configuración básica
  enabled BOOLEAN DEFAULT false,
  template TEXT DEFAULT 'pixieset',
  currency TEXT DEFAULT 'ARS',

  -- Colores del tema
  colors JSONB DEFAULT '{
    "primary": "#1f2937",
    "secondary": "#6b7280",
    "accent": "#3b82f6",
    "background": "#f9fafb",
    "surface": "#ffffff",
    "text": "#111827",
    "text_secondary": "#6b7280"
  }'::jsonb,

  -- Textos personalizables
  texts JSONB DEFAULT '{
    "hero_title": "Galería Fotográfica",
    "hero_subtitle": "Encuentra tus mejores momentos escolares",
    "footer_text": "© 2024 LookEscolar - Fotografía Escolar",
    "contact_email": "",
    "contact_phone": "",
    "terms_url": "",
    "privacy_url": ""
  }'::jsonb,

  -- Configuración avanzada del tema
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

  -- Productos disponibles
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

  -- Branding
  logo_url TEXT DEFAULT '',
  banner_url TEXT DEFAULT '',

  -- Características adicionales
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
-- 3. CREAR ÍNDICES Y CONSTRAINTS
-- ============================================================

-- Índice para event_id (búsqueda rápida)
CREATE INDEX idx_store_settings_event_id ON store_settings(event_id);

-- Constraint único: un evento = una configuración
ALTER TABLE store_settings ADD CONSTRAINT store_settings_event_id_unique UNIQUE (event_id);

-- Trigger para actualizar updated_at automáticamente
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
-- 4. CONFIGURAR PERMISOS
-- ============================================================

-- Permisos completos para service_role
GRANT ALL PRIVILEGES ON store_settings TO service_role;

-- Permisos de lectura/escritura para usuarios autenticados
GRANT SELECT, INSERT, UPDATE ON store_settings TO authenticated;

-- Permisos para la función trigger
GRANT EXECUTE ON FUNCTION update_store_settings_updated_at() TO service_role, authenticated;

-- ============================================================
-- 5. VERIFICACIÓN FINAL COMPLETA
-- ============================================================

DO $$
DECLARE
    table_exists BOOLEAN;
    event_id_exists BOOLEAN;
    index_exists BOOLEAN;
    constraint_exists BOOLEAN;
    trigger_exists BOOLEAN;
    col_record RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== VERIFICACIÓN FINAL COMPLETA ===';

    -- Verificar tabla
    SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'store_settings'
    ) INTO table_exists;

    -- Verificar columna event_id
    SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'store_settings' AND column_name = 'event_id'
    ) INTO event_id_exists;

    -- Verificar índice
    SELECT EXISTS (
        SELECT FROM pg_indexes
        WHERE tablename = 'store_settings' AND indexname = 'idx_store_settings_event_id'
    ) INTO index_exists;

    -- Verificar constraint
    SELECT EXISTS (
        SELECT FROM information_schema.table_constraints
        WHERE table_name = 'store_settings' AND constraint_name = 'store_settings_event_id_unique'
    ) INTO constraint_exists;

    -- Verificar trigger
    SELECT EXISTS (
        SELECT FROM information_schema.triggers
        WHERE event_object_table = 'store_settings' AND trigger_name = 'trigger_store_settings_updated_at'
    ) INTO trigger_exists;

    -- Mostrar resultados
    RAISE NOTICE '✅ Tabla store_settings: %', CASE WHEN table_exists THEN 'CREADA' ELSE 'ERROR' END;
    RAISE NOTICE '✅ Columna event_id: %', CASE WHEN event_id_exists THEN 'PRESENTE' ELSE 'ERROR' END;
    RAISE NOTICE '✅ Índice event_id: %', CASE WHEN index_exists THEN 'CREADO' ELSE 'ERROR' END;
    RAISE NOTICE '✅ Constraint único: %', CASE WHEN constraint_exists THEN 'ACTIVO' ELSE 'ERROR' END;
    RAISE NOTICE '✅ Trigger updated_at: %', CASE WHEN trigger_exists THEN 'ACTIVO' ELSE 'ERROR' END;

    RAISE NOTICE '';
    RAISE NOTICE '=== TODAS LAS COLUMNAS ===';
    FOR col_record IN
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'store_settings'
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE '  % | % | %',
            col_record.column_name,
            col_record.data_type,
            CASE WHEN col_record.is_nullable = 'YES' THEN 'NULLABLE' ELSE 'NOT NULL' END;
    END LOOP;

    -- Verificación final
    IF table_exists AND event_id_exists AND index_exists AND constraint_exists AND trigger_exists THEN
        RAISE NOTICE '';
        RAISE NOTICE '🎉 ¡TABLA STORE_SETTINGS COMPLETAMENTE CONFIGURADA!';
        RAISE NOTICE '✅ El error "column event_id does not exist" debería estar resuelto';
        RAISE NOTICE '💡 Si el error persiste:';
        RAISE NOTICE '   1. Reinicia tu aplicación Next.js completamente';
        RAISE NOTICE '   2. Borra el caché del navegador';
        RAISE NOTICE '   3. Verifica que no hay otras sesiones ejecutándose';
    ELSE
        RAISE EXCEPTION '❌ Error: La tabla no se configuró correctamente';
    END IF;
END $$;

COMMIT;
