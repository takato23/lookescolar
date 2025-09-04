-- ============================================================
-- MIGRACIÓN CONSERVADORA: Solo Agregar Columnas a Assets
-- Fecha: 2025-01-03  
-- Propósito: Agregar columnas faltantes sin migrar datos hasta verificar estructura
-- ============================================================

BEGIN;

-- ============================================================
-- 1. SOLO AGREGAR COLUMNAS FALTANTES EN ASSETS
-- ============================================================

DO $$
BEGIN
    RAISE NOTICE '=== AGREGANDO COLUMNAS FALTANTES A ASSETS ===';
    
    -- approved
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assets' AND column_name = 'approved'
    ) THEN
        ALTER TABLE assets ADD COLUMN approved BOOLEAN DEFAULT true;
        RAISE NOTICE '✅ Added approved column to assets';
    ELSE
        RAISE NOTICE '⏩ approved column already exists';
    END IF;
    
    -- original_filename
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assets' AND column_name = 'original_filename'
    ) THEN
        ALTER TABLE assets ADD COLUMN original_filename TEXT;
        RAISE NOTICE '✅ Added original_filename column to assets';
    ELSE
        RAISE NOTICE '⏩ original_filename column already exists';
    END IF;
    
    -- storage_path
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assets' AND column_name = 'storage_path'
    ) THEN
        ALTER TABLE assets ADD COLUMN storage_path TEXT;
        RAISE NOTICE '✅ Added storage_path column to assets';
    ELSE
        RAISE NOTICE '⏩ storage_path column already exists';
    END IF;
    
    -- preview_path
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assets' AND column_name = 'preview_path'
    ) THEN
        ALTER TABLE assets ADD COLUMN preview_path TEXT;
        RAISE NOTICE '✅ Added preview_path column to assets';
    ELSE
        RAISE NOTICE '⏩ preview_path column already exists';
    END IF;
    
    -- width
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assets' AND column_name = 'width'
    ) THEN
        ALTER TABLE assets ADD COLUMN width INTEGER;
        RAISE NOTICE '✅ Added width column to assets';
    ELSE
        RAISE NOTICE '⏩ width column already exists';
    END IF;
    
    -- height
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assets' AND column_name = 'height'
    ) THEN
        ALTER TABLE assets ADD COLUMN height INTEGER;
        RAISE NOTICE '✅ Added height column to assets';
    ELSE
        RAISE NOTICE '⏩ height column already exists';
    END IF;
    
    -- file_size
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assets' AND column_name = 'file_size'
    ) THEN
        ALTER TABLE assets ADD COLUMN file_size BIGINT DEFAULT 0;
        RAISE NOTICE '✅ Added file_size column to assets';
    ELSE
        RAISE NOTICE '⏩ file_size column already exists';
    END IF;
    
    -- event_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assets' AND column_name = 'event_id'
    ) THEN
        ALTER TABLE assets ADD COLUMN event_id UUID REFERENCES events(id) ON DELETE CASCADE;
        RAISE NOTICE '✅ Added event_id column to assets';
    ELSE
        RAISE NOTICE '⏩ event_id column already exists';
    END IF;
    
    RAISE NOTICE '=== COLUMNAS DE ASSETS COMPLETADAS ===';
END $$;

-- ============================================================
-- 2. VERIFICAR ESTRUCTURA DE PHOTOS (PARA DEBUGGING)
-- ============================================================

DO $$
DECLARE
    photos_exists BOOLEAN;
    column_record RECORD;
BEGIN
    -- Verificar si la tabla photos existe
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'photos'
    ) INTO photos_exists;
    
    IF photos_exists THEN
        RAISE NOTICE '';
        RAISE NOTICE '=== ESTRUCTURA DE TABLA PHOTOS ===';
        
        FOR column_record IN 
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'photos' AND table_schema = 'public'
            ORDER BY ordinal_position
        LOOP
            RAISE NOTICE 'Column: % | Type: % | Nullable: %', 
                column_record.column_name, 
                column_record.data_type, 
                column_record.is_nullable;
        END LOOP;
        
        RAISE NOTICE '=== FIN ESTRUCTURA PHOTOS ===';
        RAISE NOTICE '';
    ELSE
        RAISE NOTICE '📝 Tabla photos NO existe - no hay datos para migrar';
    END IF;
END $$;

-- ============================================================
-- 3. VERIFICAR ESTRUCTURA DE ASSETS (PARA DEBUGGING)
-- ============================================================

DO $$
DECLARE
    column_record RECORD;
BEGIN
    RAISE NOTICE '=== ESTRUCTURA DE TABLA ASSETS ===';
    
    FOR column_record IN 
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'assets' AND table_schema = 'public'
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE 'Column: % | Type: % | Nullable: %', 
            column_record.column_name, 
            column_record.data_type, 
            column_record.is_nullable;
    END LOOP;
    
    RAISE NOTICE '=== FIN ESTRUCTURA ASSETS ===';
    RAISE NOTICE '';
END $$;

-- ============================================================
-- 4. CREAR ÍNDICES BÁSICOS
-- ============================================================

DO $$
BEGIN
    RAISE NOTICE '=== CREANDO ÍNDICES ===';
    
    -- Índice para assets aprobados
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'assets' AND indexname = 'idx_assets_approved'
    ) THEN
        CREATE INDEX idx_assets_approved 
        ON assets(approved, created_at DESC) 
        WHERE approved = true;
        RAISE NOTICE '✅ Created idx_assets_approved';
    ELSE
        RAISE NOTICE '⏩ idx_assets_approved already exists';
    END IF;
    
    -- Índice para event_id
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'assets' AND indexname = 'idx_assets_event_id'
    ) THEN
        CREATE INDEX idx_assets_event_id 
        ON assets(event_id) 
        WHERE event_id IS NOT NULL;
        RAISE NOTICE '✅ Created idx_assets_event_id';
    ELSE
        RAISE NOTICE '⏩ idx_assets_event_id already exists';
    END IF;
    
    -- Índice para folder_id
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'assets' AND indexname = 'idx_assets_folder_id'
    ) THEN
        CREATE INDEX idx_assets_folder_id 
        ON assets(folder_id);
        RAISE NOTICE '✅ Created idx_assets_folder_id';
    ELSE
        RAISE NOTICE '⏩ idx_assets_folder_id already exists';
    END IF;
    
    RAISE NOTICE '=== ÍNDICES COMPLETADOS ===';
END $$;

-- ============================================================
-- 5. VISTA DE COMPATIBILIDAD
-- ============================================================

DO $$
BEGIN
    CREATE OR REPLACE VIEW photos_compat AS
    SELECT 
        a.id,
        a.event_id,
        a.folder_id,
        COALESCE(a.original_filename, a.filename) as original_filename,
        a.filename,
        a.storage_path,
        a.preview_path,
        a.file_size,
        a.width,
        a.height,
        a.approved,
        a.created_at,
        a.updated_at
    FROM assets a;
    
    RAISE NOTICE '✅ Created photos_compat view';
END $$;

-- Permisos
GRANT SELECT ON photos_compat TO service_role;
GRANT SELECT ON photos_compat TO authenticated;

-- ============================================================
-- 6. RESUMEN FINAL
-- ============================================================

DO $$
DECLARE
    assets_count INTEGER;
    photos_count INTEGER := 0;
    events_count INTEGER;
    photos_table_exists BOOLEAN;
BEGIN
    SELECT COUNT(*) INTO assets_count FROM assets;
    SELECT COUNT(*) INTO events_count FROM events;
    
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'photos'
    ) INTO photos_table_exists;
    
    IF photos_table_exists THEN
        SELECT COUNT(*) INTO photos_count FROM photos;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '🎉 === MIGRACIÓN CONSERVADORA COMPLETADA ===';
    RAISE NOTICE '📊 Total assets: %', assets_count;
    RAISE NOTICE '📊 Total photos: %', photos_count;
    RAISE NOTICE '📊 Total events: %', events_count;
    RAISE NOTICE '';
    RAISE NOTICE '✅ Columnas agregadas a assets table';
    RAISE NOTICE '✅ Índices creados';
    RAISE NOTICE '✅ Vista photos_compat creada';
    RAISE NOTICE '';
    RAISE NOTICE '📝 PRÓXIMO PASO: Revisar estructura de photos en los logs';
    RAISE NOTICE '📝 y crear migración específica de datos si es necesario';
    RAISE NOTICE '';
END $$;

COMMIT;
