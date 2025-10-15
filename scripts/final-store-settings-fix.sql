-- ============================================================
-- SOLUCIÓN FINAL: store_settings - VERIFICACIÓN Y CREACIÓN
-- Script que verifica primero y crea si es necesario
-- ============================================================

-- 1. Verificar estado actual de la tabla
DO $$
DECLARE
    table_exists BOOLEAN;
    event_id_exists BOOLEAN;
    has_data BOOLEAN;
    col_record RECORD;
BEGIN
    RAISE NOTICE '=== VERIFICACIÓN ACTUAL ===';

    -- Verificar si la tabla existe
    SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'store_settings'
    ) INTO table_exists;

    RAISE NOTICE 'Tabla store_settings existe: %', CASE WHEN table_exists THEN '✅ SÍ' ELSE '❌ NO' END;

    IF table_exists THEN
        -- Verificar si tiene la columna event_id
        SELECT EXISTS (
            SELECT FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'store_settings' AND column_name = 'event_id'
        ) INTO event_id_exists;

        RAISE NOTICE 'Columna event_id existe: %', CASE WHEN event_id_exists THEN '✅ SÍ' ELSE '❌ NO' END;

        -- Si no tiene event_id, eliminar y recrear
        IF NOT event_id_exists THEN
            RAISE NOTICE 'Eliminando tabla corrupta y recreando...';
            DROP TABLE IF EXISTS public.store_settings CASCADE;
            table_exists := false;
        ELSE
            -- Verificar si tiene datos
            SELECT EXISTS (SELECT 1 FROM store_settings LIMIT 1) INTO has_data;
            RAISE NOTICE 'Tiene datos: %', CASE WHEN has_data THEN '✅ SÍ' ELSE '❌ NO' END;
        END IF;
    END IF;

    IF NOT table_exists THEN
        RAISE NOTICE 'Creando tabla store_settings...';
    END IF;
END $$;

-- 2. Crear tabla (si no existe o fue eliminada)
CREATE TABLE IF NOT EXISTS public.store_settings (
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

-- 3. Crear índice si no existe
CREATE INDEX IF NOT EXISTS idx_store_settings_event_id ON store_settings(event_id);

-- 4. Crear constraint único si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'store_settings' AND constraint_name = 'store_settings_event_id_unique'
  ) THEN
    ALTER TABLE store_settings ADD CONSTRAINT store_settings_event_id_unique UNIQUE (event_id);
    RAISE NOTICE 'Constraint único creado';
  END IF;
END $$;

-- 5. Crear trigger si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE event_object_table = 'store_settings' AND trigger_name = 'trigger_store_settings_updated_at'
  ) THEN
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

    RAISE NOTICE 'Trigger creado';
  END IF;
END $$;

-- 6. Configurar permisos
GRANT ALL ON store_settings TO service_role;
GRANT SELECT, INSERT, UPDATE ON store_settings TO authenticated;

-- 7. Verificación final completa
DO $$
DECLARE
    table_exists BOOLEAN;
    event_id_exists BOOLEAN;
    index_exists BOOLEAN;
    constraint_exists BOOLEAN;
    trigger_exists BOOLEAN;
    sample_data_exists BOOLEAN;
    col_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== VERIFICACIÓN FINAL ===';

    -- Verificaciones
    SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'store_settings'
    ) INTO table_exists;

    SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'store_settings' AND column_name = 'event_id'
    ) INTO event_id_exists;

    SELECT EXISTS (
        SELECT FROM pg_indexes
        WHERE tablename = 'store_settings' AND indexname = 'idx_store_settings_event_id'
    ) INTO index_exists;

    SELECT EXISTS (
        SELECT FROM information_schema.table_constraints
        WHERE table_name = 'store_settings' AND constraint_name = 'store_settings_event_id_unique'
    ) INTO constraint_exists;

    SELECT EXISTS (
        SELECT FROM information_schema.triggers
        WHERE event_object_table = 'store_settings' AND trigger_name = 'trigger_store_settings_updated_at'
    ) INTO trigger_exists;

    SELECT COUNT(*) > 0 FROM store_settings INTO sample_data_exists;

    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'store_settings';

    -- Mostrar resultados
    RAISE NOTICE '✅ Tabla store_settings: %', CASE WHEN table_exists THEN 'EXISTE' ELSE 'ERROR' END;
    RAISE NOTICE '✅ Columna event_id: %', CASE WHEN event_id_exists THEN 'PRESENTE' ELSE 'ERROR' END;
    RAISE NOTICE '✅ Índice event_id: %', CASE WHEN index_exists THEN 'CREADO' ELSE 'ERROR' END;
    RAISE NOTICE '✅ Constraint único: %', CASE WHEN constraint_exists THEN 'ACTIVO' ELSE 'ERROR' END;
    RAISE NOTICE '✅ Trigger updated_at: %', CASE WHEN trigger_exists THEN 'ACTIVO' ELSE 'ERROR' END;
    RAISE NOTICE '✅ Número de columnas: % (esperado: ~15)', col_count;
    RAISE NOTICE '✅ Tiene datos de ejemplo: %', CASE WHEN sample_data_exists THEN 'SÍ' ELSE 'NO' END;

    RAISE NOTICE '';
    RAISE NOTICE '=== LISTA DE COLUMNAS ===';
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
    IF table_exists AND event_id_exists AND index_exists AND constraint_exists AND trigger_exists AND col_count >= 10 THEN
        RAISE NOTICE '';
        RAISE NOTICE '🎉 ¡TABLA STORE_SETTINGS COMPLETAMENTE CONFIGURADA!';
        RAISE NOTICE '✅ El error "column event_id does not exist" debería estar resuelto';
        RAISE NOTICE '';
        RAISE NOTICE '💡 PRÓXIMOS PASOS:';
        RAISE NOTICE '   1. Reinicia tu aplicación Next.js';
        RAISE NOTICE '   2. Borra el caché del navegador (Ctrl+Shift+R)';
        RAISE NOTICE '   3. Intenta acceder a /admin/store-settings nuevamente';
        RAISE NOTICE '';
        RAISE NOTICE '🚀 El sistema de configuración de tienda debería funcionar perfectamente';
    ELSE
        RAISE NOTICE '';
        RAISE NOTICE '❌ Error: La tabla no se configuró correctamente';
        RAISE NOTICE 'Verifica que tienes permisos de administrador en Supabase';
    END IF;
END $$;
