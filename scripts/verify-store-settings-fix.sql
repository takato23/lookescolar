-- VERIFICAR Y CREAR TABLA STORE_SETTINGS
-- Script completo para diagnosticar y resolver el problema

-- 1. Verificar si la tabla existe
DO $$
DECLARE
    table_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'store_settings'
    ) INTO table_exists;

    RAISE NOTICE '=== DIAGNÓSTICO ===';
    RAISE NOTICE 'Tabla store_settings existe: %', CASE WHEN table_exists THEN '✅ SÍ' ELSE '❌ NO' END;

    IF NOT table_exists THEN
        RAISE NOTICE 'Creando tabla store_settings...';
    END IF;
END $$;

-- 2. Crear tabla si no existe
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

-- 3. Verificar columnas de la tabla
DO $$
DECLARE
    col_record RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== COLUMNAS DE STORE_SETTINGS ===';

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
END $$;

-- 4. Crear índice
CREATE INDEX IF NOT EXISTS idx_store_settings_event_id ON store_settings(event_id);

-- 5. Configurar permisos
GRANT ALL ON store_settings TO service_role;
GRANT SELECT, INSERT, UPDATE ON store_settings TO authenticated;

-- 6. Verificación final
DO $$
DECLARE
    table_exists BOOLEAN;
    column_exists BOOLEAN;
    index_exists BOOLEAN;
BEGIN
    -- Verificar tabla
    SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'store_settings'
    ) INTO table_exists;

    -- Verificar columna event_id
    SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'store_settings' AND column_name = 'event_id'
    ) INTO column_exists;

    -- Verificar índice
    SELECT EXISTS (
        SELECT FROM pg_indexes
        WHERE tablename = 'store_settings' AND indexname = 'idx_store_settings_event_id'
    ) INTO index_exists;

    RAISE NOTICE '';
    RAISE NOTICE '=== VERIFICACIÓN FINAL ===';
    RAISE NOTICE '✅ Tabla store_settings: %', CASE WHEN table_exists THEN 'CREADA' ELSE 'ERROR' END;
    RAISE NOTICE '✅ Columna event_id: %', CASE WHEN column_exists THEN 'EXISTE' ELSE 'ERROR' END;
    RAISE NOTICE '✅ Índice: %', CASE WHEN index_exists THEN 'CREADO' ELSE 'ERROR' END;

    IF table_exists AND column_exists AND index_exists THEN
        RAISE NOTICE '';
        RAISE NOTICE '🎉 ¡TODO LISTO! El error debería estar resuelto.';
        RAISE NOTICE '💡 Si el error persiste, reinicia tu aplicación Next.js';
    ELSE
        RAISE EXCEPTION '❌ Error: No se pudo crear la tabla correctamente';
    END IF;
END $$;
