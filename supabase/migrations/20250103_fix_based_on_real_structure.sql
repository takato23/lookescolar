-- ============================================================
-- MIGRACIÓN BASADA EN ESTRUCTURA REAL DE ASSETS
-- Fecha: 2025-01-03  
-- Propósito: Trabajar con la estructura real existente
-- ============================================================

BEGIN;

-- ============================================================
-- 1. AGREGAR SOLO LAS COLUMNAS QUE REALMENTE FALTAN
-- ============================================================

DO $$
BEGIN
    RAISE NOTICE '=== VERIFICANDO Y AGREGANDO COLUMNAS FALTANTES ===';
    
    -- approved (para el sistema de aprobación)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assets' AND column_name = 'approved'
    ) THEN
        ALTER TABLE assets ADD COLUMN approved BOOLEAN DEFAULT true;
        RAISE NOTICE '✅ Added approved column to assets';
    ELSE
        RAISE NOTICE '⏩ approved column already exists';
    END IF;
    
    -- event_id (para relacionar con eventos)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assets' AND column_name = 'event_id'
    ) THEN
        ALTER TABLE assets ADD COLUMN event_id UUID REFERENCES events(id) ON DELETE CASCADE;
        RAISE NOTICE '✅ Added event_id column to assets';
    ELSE
        RAISE NOTICE '⏩ event_id column already exists';
    END IF;
    
    -- original_filename (alias para original_path si no existe)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assets' AND column_name = 'original_filename'
    ) THEN
        ALTER TABLE assets ADD COLUMN original_filename TEXT;
        RAISE NOTICE '✅ Added original_filename column to assets';
    ELSE
        RAISE NOTICE '⏩ original_filename column already exists';
    END IF;
    
    -- storage_path (para compatibilidad con código existente)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assets' AND column_name = 'storage_path'
    ) THEN
        ALTER TABLE assets ADD COLUMN storage_path TEXT;
        RAISE NOTICE '✅ Added storage_path column to assets';
    ELSE
        RAISE NOTICE '⏩ storage_path column already exists';
    END IF;
END $$;

-- ============================================================
-- 2. ACTUALIZAR DATOS EXISTENTES PARA COMPATIBILIDAD
-- ============================================================

DO $$
DECLARE
    updated_count INTEGER := 0;
BEGIN
    RAISE NOTICE '=== ACTUALIZANDO DATOS EXISTENTES ===';
    
    -- Poblar original_filename desde original_path si está vacío
    UPDATE assets 
    SET original_filename = 
        CASE 
            WHEN original_path IS NOT NULL THEN 
                CASE 
                    WHEN original_path LIKE '%/%' THEN 
                        substring(original_path from '[^/]*$')
                    ELSE 
                        original_path 
                END
            ELSE 
                filename 
        END
    WHERE original_filename IS NULL;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE '✅ Updated % records with original_filename', updated_count;
    
    -- Poblar storage_path desde original_path si está vacío
    UPDATE assets 
    SET storage_path = COALESCE(original_path, '/photos/' || id::text)
    WHERE storage_path IS NULL;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE '✅ Updated % records with storage_path', updated_count;
    
    -- Actualizar event_id desde folders si está disponible
    UPDATE assets 
    SET event_id = f.event_id
    FROM folders f
    WHERE assets.folder_id = f.id 
    AND assets.event_id IS NULL
    AND f.event_id IS NOT NULL;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE '✅ Updated % records with event_id from folders', updated_count;
END $$;

-- ============================================================
-- 3. CREAR FUNCIONES DE COMPATIBILIDAD PARA WIDTH/HEIGHT
-- ============================================================

-- Función para extraer width desde dimensions JSONB
CREATE OR REPLACE FUNCTION get_asset_width(asset_dimensions JSONB)
RETURNS INTEGER
LANGUAGE SQL
IMMUTABLE
AS $$
    SELECT COALESCE((asset_dimensions->>'width')::INTEGER, 0);
$$;

-- Función para extraer height desde dimensions JSONB
CREATE OR REPLACE FUNCTION get_asset_height(asset_dimensions JSONB)
RETURNS INTEGER
LANGUAGE SQL
IMMUTABLE
AS $$
    SELECT COALESCE((asset_dimensions->>'height')::INTEGER, 0);
$$;

RAISE NOTICE '✅ Created width/height extraction functions';

-- ============================================================
-- 4. VISTA DE COMPATIBILIDAD COMPLETA CON ESTRUCTURA REAL
-- ============================================================

CREATE OR REPLACE VIEW photos_compat AS
SELECT 
    a.id,
    a.event_id,
    a.folder_id,
    a.filename,
    COALESCE(a.original_filename, a.filename) as original_filename,
    a.original_path,
    COALESCE(a.storage_path, a.original_path) as storage_path,
    a.preview_path,
    a.file_size,
    get_asset_width(a.dimensions) as width,
    get_asset_height(a.dimensions) as height,
    a.dimensions,
    COALESCE(a.approved, true) as approved,
    a.status,
    a.metadata,
    a.checksum,
    a.mime_type,
    a.watermark_path,
    a.created_at,
    a.updated_at,
    a.created_by
FROM assets a;

RAISE NOTICE '✅ Created comprehensive photos_compat view';

-- ============================================================
-- 5. VERIFICAR SI PHOTOS EXISTE Y MIGRAR SI ES NECESARIO
-- ============================================================

DO $$
DECLARE
    photos_exists BOOLEAN;
    photos_columns TEXT[];
    migrated_count INTEGER := 0;
BEGIN
    -- Verificar si la tabla photos existe
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'photos'
    ) INTO photos_exists;
    
    IF photos_exists THEN
        RAISE NOTICE '';
        RAISE NOTICE '=== TABLA PHOTOS ENCONTRADA - INICIANDO MIGRACIÓN ===';
        
        -- Obtener columnas de photos
        SELECT array_agg(column_name) INTO photos_columns
        FROM information_schema.columns 
        WHERE table_name = 'photos' AND table_schema = 'public';
        
        RAISE NOTICE 'Columnas en photos: %', photos_columns;
        
        -- Migración básica y segura (solo id, folder_id, filename)
        INSERT INTO assets (
            id, 
            folder_id,
            filename,
            created_at,
            updated_at
        )
        SELECT 
            p.id,
            p.folder_id,
            COALESCE(p.filename, 'photo_' || p.id::text),
            COALESCE(p.created_at, NOW()),
            COALESCE(p.updated_at, NOW())
        FROM photos p
        WHERE NOT EXISTS (
            SELECT 1 FROM assets a WHERE a.id = p.id
        )
        AND p.id IS NOT NULL;
        
        GET DIAGNOSTICS migrated_count = ROW_COUNT;
        RAISE NOTICE '✅ Migrated % basic records from photos to assets', migrated_count;
        
    ELSE
        RAISE NOTICE '📝 Tabla photos NO existe - no hay datos legacy para migrar';
    END IF;
END $$;

-- ============================================================
-- 6. CREAR ÍNDICES OPTIMIZADOS
-- ============================================================

-- Índice para assets aprobados
CREATE INDEX IF NOT EXISTS idx_assets_approved 
ON assets(approved, created_at DESC) 
WHERE approved = true;

-- Índice para event_id
CREATE INDEX IF NOT EXISTS idx_assets_event_id 
ON assets(event_id) 
WHERE event_id IS NOT NULL;

-- Índice para folder_id (probablemente ya existe)
CREATE INDEX IF NOT EXISTS idx_assets_folder_id 
ON assets(folder_id);

-- Índice para status
CREATE INDEX IF NOT EXISTS idx_assets_status 
ON assets(status);

-- Índice JSONB para dimensions
CREATE INDEX IF NOT EXISTS idx_assets_dimensions 
ON assets USING GIN(dimensions);

RAISE NOTICE '✅ Created optimized indexes';

-- ============================================================
-- 7. PERMISOS
-- ============================================================

GRANT SELECT ON photos_compat TO service_role;
GRANT SELECT ON photos_compat TO authenticated;
GRANT EXECUTE ON FUNCTION get_asset_width(JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION get_asset_width(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_asset_height(JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION get_asset_height(JSONB) TO authenticated;

-- ============================================================
-- 8. VERIFICACIÓN FINAL Y REPORTE
-- ============================================================

DO $$
DECLARE
    assets_count INTEGER;
    photos_count INTEGER := 0;
    events_count INTEGER;
    folders_count INTEGER;
    photos_table_exists BOOLEAN;
    approved_assets INTEGER;
    assets_with_event INTEGER;
BEGIN
    -- Conteos
    SELECT COUNT(*) INTO assets_count FROM assets;
    SELECT COUNT(*) INTO events_count FROM events;
    SELECT COUNT(*) INTO folders_count FROM folders;
    SELECT COUNT(*) INTO approved_assets FROM assets WHERE approved = true;
    SELECT COUNT(*) INTO assets_with_event FROM assets WHERE event_id IS NOT NULL;
    
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'photos'
    ) INTO photos_table_exists;
    
    IF photos_table_exists THEN
        SELECT COUNT(*) INTO photos_count FROM photos;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '🎉 === MIGRACIÓN BASADA EN ESTRUCTURA REAL COMPLETADA ===';
    RAISE NOTICE '';
    RAISE NOTICE '📊 ESTADÍSTICAS:';
    RAISE NOTICE '   • Total assets: %', assets_count;
    RAISE NOTICE '   • Assets aprobados: %', approved_assets;
    RAISE NOTICE '   • Assets con event_id: %', assets_with_event;
    RAISE NOTICE '   • Total events: %', events_count;
    RAISE NOTICE '   • Total folders: %', folders_count;
    RAISE NOTICE '   • Total photos (legacy): %', photos_count;
    RAISE NOTICE '';
    RAISE NOTICE '✅ COMPLETADO:';
    RAISE NOTICE '   • Columnas agregadas: approved, event_id, original_filename, storage_path';
    RAISE NOTICE '   • Datos actualizados para compatibilidad';
    RAISE NOTICE '   • Funciones width/height para dimensions JSONB';
    RAISE NOTICE '   • Vista photos_compat completa';
    RAISE NOTICE '   • Índices optimizados';
    RAISE NOTICE '   • Migración de photos (si existía)';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Sistema listo para funcionar con estructura real';
    RAISE NOTICE '';
END $$;

COMMIT;
