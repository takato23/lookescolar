-- ============================================================
-- MIGRACIÓN CORREGIDA: Solución de Errores del Sistema Consolidado
-- Fecha: 2025-01-03  
-- Propósito: Arreglar errores considerando estructura real de assets
-- ============================================================

BEGIN;

-- ============================================================
-- 1. VERIFICAR Y CREAR COLUMNAS FALTANTES EN ASSETS
-- ============================================================

-- Agregar campos que pueden faltar en assets (con verificación)
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
        SELECT 1 FROM information_schema.columns 
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
    
    -- event_id (para compatibilidad)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assets' AND column_name = 'event_id'
    ) THEN
        ALTER TABLE assets ADD COLUMN event_id UUID REFERENCES events(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added event_id column to assets';
    END IF;
END $$;

-- ============================================================
-- 2. MIGRAR DATOS DE PHOTOS A ASSETS (CON MANEJO SEGURO)
-- ============================================================

-- Migrar fotos que no están en assets pero sí en photos
DO $$
DECLARE
    migrated_count INTEGER := 0;
    photos_exists BOOLEAN;
BEGIN
    -- Verificar si la tabla photos existe
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'photos'
    ) INTO photos_exists;
    
    IF photos_exists THEN
        -- Migración dinámica basada en columnas existentes
        INSERT INTO assets (
            id, 
            folder_id, 
            filename, 
            original_filename,
            storage_path,
            preview_path,
            file_size, 
            width, 
            height, 
            approved,
            event_id,
            created_at, 
            updated_at
        )
        SELECT 
            p.id,
            p.folder_id,
            COALESCE(
                CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'photos' AND column_name = 'original_filename') 
                     THEN p.original_filename 
                     ELSE NULL END,
                CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'photos' AND column_name = 'filename') 
                     THEN p.filename 
                     ELSE 'photo_' || p.id || '.jpg' END
            ),
            CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'photos' AND column_name = 'original_filename') 
                 THEN p.original_filename 
                 ELSE NULL END,
            CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'photos' AND column_name = 'storage_path') 
                 THEN p.storage_path 
                 ELSE '/photos/' || p.id END,
            CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'photos' AND column_name = 'preview_path') 
                 THEN p.preview_path 
                 ELSE NULL END,
            CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'photos' AND column_name = 'file_size') 
                 THEN COALESCE(p.file_size, 0)
                 ELSE 0 END,
            CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'photos' AND column_name = 'width') 
                 THEN p.width 
                 ELSE NULL END,
            CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'photos' AND column_name = 'height') 
                 THEN p.height 
                 ELSE NULL END,
            CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'photos' AND column_name = 'approved') 
                 THEN COALESCE(p.approved, true)
                 ELSE true END,
            CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'photos' AND column_name = 'event_id') 
                 THEN p.event_id 
                 ELSE NULL END,
            COALESCE(p.created_at, NOW()),
            COALESCE(p.updated_at, NOW())
        FROM photos p
        WHERE NOT EXISTS (
            SELECT 1 FROM assets a WHERE a.id = p.id
        )
        AND p.id IS NOT NULL;
        
        GET DIAGNOSTICS migrated_count = ROW_COUNT;
        RAISE NOTICE 'Migrated % photos to assets', migrated_count;
    ELSE
        RAISE NOTICE 'Photos table does not exist - skipping migration';
    END IF;
END $$;

-- ============================================================
-- 3. CREAR ÍNDICES QUE FALTARON (AHORA QUE LAS COLUMNAS EXISTEN)
-- ============================================================

-- Índice para assets aprovados
CREATE INDEX IF NOT EXISTS idx_assets_approved 
ON assets(approved, created_at DESC) 
WHERE approved = true;

-- Índice para assets por evento
CREATE INDEX IF NOT EXISTS idx_assets_event_id 
ON assets(event_id) 
WHERE event_id IS NOT NULL;

-- Índice para filename
CREATE INDEX IF NOT EXISTS idx_assets_filename 
ON assets(filename);

-- Índice para folder_id
CREATE INDEX IF NOT EXISTS idx_assets_folder_id 
ON assets(folder_id);

-- ============================================================
-- 4. ACTUALIZAR event_id EN ASSETS DESDE FOLDERS
-- ============================================================

-- Actualizar event_id en assets usando la relación con folders
DO $$
BEGIN
    UPDATE assets 
    SET event_id = f.event_id
    FROM folders f
    WHERE assets.folder_id = f.id 
    AND assets.event_id IS NULL
    AND f.event_id IS NOT NULL;
    
    RAISE NOTICE 'Updated event_id references in assets';
END $$;

-- ============================================================
-- 5. CREAR VISTA PARA COMPATIBILIDAD CON PHOTOS
-- ============================================================

-- Vista que simula la tabla photos para compatibilidad con código existente
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
    a.updated_at,
    -- Campos adicionales que puede necesitar el código existente
    a.watermark_path,
    a.checksum,
    a.mime_type,
    a.status
FROM assets a;

-- ============================================================
-- 6. PERMISOS Y GRANTS
-- ============================================================

-- Dar permisos a la vista de compatibilidad
GRANT SELECT ON photos_compat TO service_role;
GRANT SELECT ON photos_compat TO authenticated;

-- ============================================================
-- 7. VERIFICACIÓN FINAL
-- ============================================================

DO $$
DECLARE
    assets_approved_exists BOOLEAN;
    assets_count INTEGER;
    photos_count INTEGER := 0;
    events_count INTEGER;
    photos_table_exists BOOLEAN;
BEGIN
    -- Verificar que approved existe en assets
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assets' AND column_name = 'approved'
    ) INTO assets_approved_exists;
    
    -- Contar registros
    SELECT COUNT(*) INTO assets_count FROM assets;
    
    -- Verificar si photos existe antes de contar
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'photos'
    ) INTO photos_table_exists;
    
    IF photos_table_exists THEN
        SELECT COUNT(*) INTO photos_count FROM photos;
    END IF;
    
    SELECT COUNT(*) INTO events_count FROM events;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== CORRECCIÓN DE ERRORES COMPLETADA ===';
    RAISE NOTICE 'Assets.approved existe: %', CASE WHEN assets_approved_exists THEN '✅ SÍ' ELSE '❌ NO' END;
    RAISE NOTICE 'Total assets: %', assets_count;
    RAISE NOTICE 'Total photos: %', photos_count;
    RAISE NOTICE 'Total events: %', events_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Vistas creadas:';
    RAISE NOTICE '- photos_compat (compatibilidad con código existente)';
    RAISE NOTICE '';
    RAISE NOTICE 'Sistema corregido y listo para funcionar.';
END $$;

COMMIT;
