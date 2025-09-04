-- ============================================================
-- MIGRACIÓN SIMPLIFICADA: Corrección de Errores Assets
-- Fecha: 2025-01-03  
-- Propósito: Arreglar errores sin complejidad de queries dinámicas
-- ============================================================

BEGIN;

-- ============================================================
-- 1. AGREGAR COLUMNAS FALTANTES EN ASSETS
-- ============================================================

DO $$
BEGIN
    -- approved
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assets' AND column_name = 'approved'
    ) THEN
        ALTER TABLE assets ADD COLUMN approved BOOLEAN DEFAULT true;
        RAISE NOTICE 'Added approved column to assets';
    END IF;
    
    -- original_filename
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns a
        WHERE table_name = 'assets' AND column_name = 'original_filename'
    ) THEN
        ALTER TABLE assets ADD COLUMN original_filename TEXT;
        RAISE NOTICE 'Added original_filename column to assets';
    END IF;
    
    -- storage_path
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assets' AND column_name = 'storage_path'
    ) THEN
        ALTER TABLE assets ADD COLUMN storage_path TEXT;
        RAISE NOTICE 'Added storage_path column to assets';
    END IF;
    
    -- preview_path
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assets' AND column_name = 'preview_path'
    ) THEN
        ALTER TABLE assets ADD COLUMN preview_path TEXT;
        RAISE NOTICE 'Added preview_path column to assets';
    END IF;
    
    -- width
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assets' AND column_name = 'width'
    ) THEN
        ALTER TABLE assets ADD COLUMN width INTEGER;
        RAISE NOTICE 'Added width column to assets';
    END IF;
    
    -- height
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assets' AND column_name = 'height'
    ) THEN
        ALTER TABLE assets ADD COLUMN height INTEGER;
        RAISE NOTICE 'Added height column to assets';
    END IF;
    
    -- file_size
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assets' AND column_name = 'file_size'
    ) THEN
        ALTER TABLE assets ADD COLUMN file_size BIGINT DEFAULT 0;
        RAISE NOTICE 'Added file_size column to assets';
    END IF;
    
    -- event_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assets' AND column_name = 'event_id'
    ) THEN
        ALTER TABLE assets ADD COLUMN event_id UUID REFERENCES events(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added event_id column to assets';
    END IF;
END $$;

-- ============================================================
-- 2. MIGRAR DATOS DE PHOTOS A ASSETS (SIMPLE Y SEGURO)
-- ============================================================

DO $$
DECLARE
    migrated_count INTEGER := 0;
    photos_exists BOOLEAN;
    photos_has_original_filename BOOLEAN;
    photos_has_storage_path BOOLEAN;
    photos_has_preview_path BOOLEAN;
    photos_has_file_size BOOLEAN;
    photos_has_width BOOLEAN;
    photos_has_height BOOLEAN;
    photos_has_approved BOOLEAN;
    photos_has_event_id BOOLEAN;
BEGIN
    -- Verificar si la tabla photos existe
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'photos'
    ) INTO photos_exists;
    
    IF photos_exists THEN
        -- Verificar qué columnas existen en photos
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'photos' AND column_name = 'original_filename'
        ) INTO photos_has_original_filename;
        
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'photos' AND column_name = 'storage_path'
        ) INTO photos_has_storage_path;
        
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'photos' AND column_name = 'preview_path'
        ) INTO photos_has_preview_path;
        
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'photos' AND column_name = 'file_size'
        ) INTO photos_has_file_size;
        
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'photos' AND column_name = 'width'
        ) INTO photos_has_width;
        
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'photos' AND column_name = 'height'
        ) INTO photos_has_height;
        
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'photos' AND column_name = 'approved'
        ) INTO photos_has_approved;
        
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'photos' AND column_name = 'event_id'
        ) INTO photos_has_event_id;
        
        -- Migración con queries simples
        IF photos_has_original_filename AND photos_has_storage_path AND photos_has_width AND photos_has_height THEN
            -- Migración completa (todas las columnas existen)
            INSERT INTO assets (
                id, folder_id, filename, original_filename, storage_path, preview_path,
                file_size, width, height, approved, event_id, created_at, updated_at
            )
            SELECT 
                p.id, p.folder_id,
                COALESCE(p.original_filename, 'photo_' || p.id || '.jpg'),
                p.original_filename, p.storage_path, p.preview_path,
                COALESCE(p.file_size, 0), p.width, p.height,
                COALESCE(p.approved, true), p.event_id,
                COALESCE(p.created_at, NOW()), COALESCE(p.updated_at, NOW())
            FROM photos p
            WHERE NOT EXISTS (SELECT 1 FROM assets a WHERE a.id = p.id)
            AND p.id IS NOT NULL;
            
        ELSE
            -- Migración básica (solo campos esenciales)
            INSERT INTO assets (
                id, folder_id, filename, created_at, updated_at
            )
            SELECT 
                p.id, p.folder_id,
                'photo_' || p.id || '.jpg',
                COALESCE(p.created_at, NOW()), COALESCE(p.updated_at, NOW())
            FROM photos p
            WHERE NOT EXISTS (SELECT 1 FROM assets a WHERE a.id = p.id)
            AND p.id IS NOT NULL;
            
        END IF;
        
        GET DIAGNOSTICS migrated_count = ROW_COUNT;
        RAISE NOTICE 'Migrated % photos to assets', migrated_count;
    ELSE
        RAISE NOTICE 'Photos table does not exist - skipping migration';
    END IF;
END $$;

-- ============================================================
-- 3. CREAR ÍNDICES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_assets_approved 
ON assets(approved, created_at DESC) 
WHERE approved = true;

CREATE INDEX IF NOT EXISTS idx_assets_event_id 
ON assets(event_id) 
WHERE event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_assets_filename 
ON assets(filename);

CREATE INDEX IF NOT EXISTS idx_assets_folder_id 
ON assets(folder_id);

-- ============================================================
-- 4. ACTUALIZAR REFERENCIAS
-- ============================================================

DO $$
BEGIN
    -- Actualizar event_id en assets desde folders si falta
    UPDATE assets 
    SET event_id = f.event_id
    FROM folders f
    WHERE assets.folder_id = f.id 
    AND assets.event_id IS NULL
    AND f.event_id IS NOT NULL;
    
    RAISE NOTICE 'Updated event_id references in assets';
END $$;

-- ============================================================
-- 5. VISTA DE COMPATIBILIDAD
-- ============================================================

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

GRANT SELECT ON photos_compat TO service_role;
GRANT SELECT ON photos_compat TO authenticated;

-- ============================================================
-- 6. VERIFICACIÓN FINAL
-- ============================================================

DO $$
DECLARE
    assets_count INTEGER;
    photos_count INTEGER := 0;
    events_count INTEGER;
    photos_table_exists BOOLEAN;
BEGIN
    SELECT COUNT(*) INTO assets_count FROM assets;
    
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'photos'
    ) INTO photos_table_exists;
    
    IF photos_table_exists THEN
        SELECT COUNT(*) INTO photos_count FROM photos;
    END IF;
    
    SELECT COUNT(*) INTO events_count FROM events;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== MIGRACIÓN COMPLETADA ===';
    RAISE NOTICE 'Total assets: %', assets_count;
    RAISE NOTICE 'Total photos: %', photos_count;
    RAISE NOTICE 'Total events: %', events_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Sistema listo para funcionar.';
END $$;

COMMIT;
