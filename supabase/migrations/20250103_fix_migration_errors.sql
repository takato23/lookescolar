-- ============================================================
-- MIGRACIÓN: Corrección de Errores del Sistema Consolidado
-- Fecha: 2025-01-03  
-- Propósito: Arreglar errores específicos encontrados
-- ============================================================

BEGIN;

-- ============================================================
-- 1. ARREGLAR TABLA ASSETS - AGREGAR CAMPOS FALTANTES
-- ============================================================

-- Agregar campo approved si no existe (necesario para compatibilidad)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assets' AND column_name = 'approved'
    ) THEN
        ALTER TABLE assets ADD COLUMN approved BOOLEAN DEFAULT true;
        RAISE NOTICE 'Added approved column to assets table';
    END IF;
END $$;

-- Agregar otros campos que pueden faltar en assets
DO $$
BEGIN
    -- original_filename si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assets' AND column_name = 'original_filename'
    ) THEN
        ALTER TABLE assets ADD COLUMN original_filename TEXT;
        RAISE NOTICE 'Added original_filename column to assets';
    END IF;
    
    -- storage_path si no existe  
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assets' AND column_name = 'storage_path'
    ) THEN
        ALTER TABLE assets ADD COLUMN storage_path TEXT;
        RAISE NOTICE 'Added storage_path column to assets';
    END IF;
    
    -- event_id si no existe (para compatibilidad)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assets' AND column_name = 'event_id'
    ) THEN
        ALTER TABLE assets ADD COLUMN event_id UUID REFERENCES events(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added event_id column to assets';
    END IF;
END $$;

-- ============================================================
-- 2. MIGRAR DATOS DE PHOTOS A ASSETS (SI ES NECESARIO)
-- ============================================================

-- Migrar fotos que no están en assets pero sí en photos
DO $$
DECLARE
    migrated_count INTEGER := 0;
BEGIN
    -- Solo migrar si photos tiene datos que assets no tiene
    INSERT INTO assets (
        id, 
        folder_id, 
        filename, 
        original_filename,
        original_path, 
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
        COALESCE(p.original_filename, 'photo_' || p.id || '.jpg'),
        p.original_filename,
        COALESCE(p.storage_path, '/photos/' || p.id),
        p.storage_path,
        p.preview_path,
        COALESCE(p.file_size, 0),
        p.width,
        p.height,
        COALESCE(p.approved, true),
        p.event_id,
        COALESCE(p.created_at, NOW()),
        COALESCE(p.updated_at, NOW())
    FROM photos p
    WHERE NOT EXISTS (
        SELECT 1 FROM assets a WHERE a.id = p.id
    )
    AND p.id IS NOT NULL;
    
    GET DIAGNOSTICS migrated_count = ROW_COUNT;
    RAISE NOTICE 'Migrated % photos to assets', migrated_count;
END $$;

-- ============================================================
-- 3. CREAR ÍNDICES QUE FALTARON (AHORA QUE APPROVED EXISTE)
-- ============================================================

-- Índice para assets aprovados (ahora que el campo existe)
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

-- ============================================================
-- 4. ACTUALIZAR event_id EN ASSETS DESDE FOLDERS
-- ============================================================

-- Actualizar event_id en assets usando la relación con folders
UPDATE assets 
SET event_id = f.event_id
FROM folders f
WHERE assets.folder_id = f.id 
AND assets.event_id IS NULL;

-- ============================================================
-- 5. CREAR VISTA PARA COMPATIBILIDAD CON PHOTOS
-- ============================================================

-- Vista que simula la tabla photos para compatibilidad con código existente
CREATE OR REPLACE VIEW photos_compat AS
SELECT 
    a.id,
    a.event_id,
    a.folder_id,
    a.filename as original_filename,
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
-- 6. FUNCIONES HELPER PARA COMPATIBILIDAD
-- ============================================================

-- Función para obtener fotos de un evento (compatibilidad)
CREATE OR REPLACE FUNCTION get_event_photos(p_event_id UUID)
RETURNS TABLE (
    id UUID,
    filename TEXT,
    storage_path TEXT,
    preview_path TEXT,
    approved BOOLEAN,
    created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
AS $$
    SELECT 
        a.id,
        a.filename,
        a.storage_path,
        a.preview_path,
        a.approved,
        a.created_at
    FROM assets a
    WHERE a.event_id = p_event_id
    AND a.approved = true
    ORDER BY a.created_at DESC;
$$;

-- Función para obtener fotos de una carpeta
CREATE OR REPLACE FUNCTION get_folder_photos(p_folder_id UUID)
RETURNS TABLE (
    id UUID,
    filename TEXT,
    storage_path TEXT,
    preview_path TEXT,
    approved BOOLEAN,
    created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
AS $$
    SELECT 
        a.id,
        a.filename,
        a.storage_path,
        a.preview_path,
        a.approved,
        a.created_at
    FROM assets a
    WHERE a.folder_id = p_folder_id
    AND a.approved = true
    ORDER BY a.created_at DESC;
$$;

-- ============================================================
-- 7. PERMISOS Y GRANTS
-- ============================================================

-- Dar permisos a la vista de compatibilidad
GRANT SELECT ON photos_compat TO service_role;
GRANT SELECT ON photos_compat TO authenticated;

-- Dar permisos a las funciones
GRANT EXECUTE ON FUNCTION get_event_photos(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_event_photos(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_folder_photos(UUID) TO service_role;  
GRANT EXECUTE ON FUNCTION get_folder_photos(UUID) TO authenticated;

-- ============================================================
-- 8. VERIFICACIÓN FINAL
-- ============================================================

DO $$
DECLARE
    assets_approved_exists BOOLEAN;
    assets_count INTEGER;
    photos_count INTEGER;
    events_count INTEGER;
BEGIN
    -- Verificar que approved existe en assets
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assets' AND column_name = 'approved'
    ) INTO assets_approved_exists;
    
    -- Contar registros
    SELECT COUNT(*) INTO assets_count FROM assets;
    SELECT COUNT(*) INTO photos_count FROM photos;
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
    RAISE NOTICE 'Funciones creadas:';
    RAISE NOTICE '- get_event_photos(event_id)';
    RAISE NOTICE '- get_folder_photos(folder_id)';
    RAISE NOTICE '';
    RAISE NOTICE 'Sistema corregido y listo para funcionar.';
END $$;

COMMIT;
