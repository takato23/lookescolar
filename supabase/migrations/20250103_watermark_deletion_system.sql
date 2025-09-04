-- ============================================================
-- MIGRACIÓN: Sistema de Marcas de Agua y Eliminación Automática
-- Fecha: 2025-01-03
-- Propósito: Tabla para programar eliminaciones automáticas
-- ============================================================

BEGIN;

-- ============================================================
-- 1. TABLA PARA ELIMINACIONES PROGRAMADAS
-- ============================================================

CREATE TABLE IF NOT EXISTS scheduled_deletions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_path TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  deletion_type TEXT NOT NULL CHECK (deletion_type IN ('watermarked_asset', 'temp_file', 'preview', 'other')),
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT scheduled_deletions_expires_future CHECK (expires_at > created_at),
  CONSTRAINT scheduled_deletions_path_not_empty CHECK (length(file_path) > 0)
);

-- ============================================================
-- 2. ÍNDICES PARA PERFORMANCE
-- ============================================================

-- Índice para buscar archivos expirados (consulta más frecuente)
CREATE INDEX IF NOT EXISTS idx_scheduled_deletions_expired 
ON scheduled_deletions(expires_at, processed) 
WHERE processed = false;

-- Índice para limpiezas por tipo
CREATE INDEX IF NOT EXISTS idx_scheduled_deletions_type 
ON scheduled_deletions(deletion_type, created_at DESC);

-- Índice para archivos procesados (para auditoría)
CREATE INDEX IF NOT EXISTS idx_scheduled_deletions_processed 
ON scheduled_deletions(processed_at DESC) 
WHERE processed = true;

-- ============================================================
-- 3. FUNCIÓN PARA LIMPIAR REGISTROS ANTIGUOS
-- ============================================================

CREATE OR REPLACE FUNCTION cleanup_old_deletion_records()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Eliminar registros procesados más antiguos de 90 días
    DELETE FROM scheduled_deletions 
    WHERE processed = true 
    AND processed_at < NOW() - INTERVAL '90 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$;

-- ============================================================
-- 4. VISTA PARA MONITOREO
-- ============================================================

CREATE OR REPLACE VIEW deletion_stats AS
SELECT 
    deletion_type,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE processed = false) as pending,
    COUNT(*) FILTER (WHERE processed = true) as completed,
    COUNT(*) FILTER (WHERE expires_at < NOW() AND processed = false) as expired_pending,
    MIN(expires_at) FILTER (WHERE processed = false) as next_expiry,
    MAX(processed_at) as last_processed
FROM scheduled_deletions
GROUP BY deletion_type;

-- ============================================================
-- 5. AGREGAR CAMPOS DE WATERMARK A ASSETS SI NO EXISTEN
-- ============================================================

DO $$
BEGIN
    -- Agregar watermark_path si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assets' AND column_name = 'watermark_path'
    ) THEN
        ALTER TABLE assets ADD COLUMN watermark_path TEXT;
        CREATE INDEX IF NOT EXISTS idx_assets_watermark_path ON assets(watermark_path) WHERE watermark_path IS NOT NULL;
        RAISE NOTICE 'Added watermark_path column to assets table';
    END IF;

    -- Agregar campos de metadata a events si no existen
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'metadata'
    ) THEN
        ALTER TABLE events ADD COLUMN metadata JSONB DEFAULT '{}';
        RAISE NOTICE 'Added metadata column to events table';
    END IF;
END $$;

-- ============================================================
-- 6. FUNCIÓN PARA PROCESAR ELIMINACIONES (CRON JOB)
-- ============================================================

CREATE OR REPLACE FUNCTION process_scheduled_deletions()
RETURNS TABLE (
    processed_count INTEGER,
    error_count INTEGER,
    next_run_needed BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    file_record RECORD;
    processed INTEGER := 0;
    errors INTEGER := 0;
    batch_size INTEGER := 50;
BEGIN
    -- Procesar archivos expirados en lotes
    FOR file_record IN
        SELECT id, file_path, deletion_type
        FROM scheduled_deletions
        WHERE expires_at <= NOW()
        AND processed = false
        ORDER BY expires_at
        LIMIT batch_size
    LOOP
        BEGIN
            -- Marcar como procesado (el borrado real se hace desde la aplicación)
            UPDATE scheduled_deletions 
            SET processed = true, processed_at = NOW()
            WHERE id = file_record.id;
            
            processed := processed + 1;
            
        EXCEPTION WHEN OTHERS THEN
            -- Log error pero continuar con los demás
            INSERT INTO scheduled_deletions (
                file_path, 
                expires_at, 
                deletion_type, 
                metadata,
                processed
            ) VALUES (
                'ERROR: ' || file_record.file_path,
                NOW() + INTERVAL '1 day',
                'error_log',
                jsonb_build_object('original_id', file_record.id, 'error', SQLERRM),
                true
            );
            
            errors := errors + 1;
        END;
    END LOOP;
    
    -- Verificar si hay más pendientes
    RETURN QUERY SELECT 
        processed,
        errors,
        EXISTS(
            SELECT 1 FROM scheduled_deletions 
            WHERE expires_at <= NOW() + INTERVAL '1 hour'
            AND processed = false
        );
END;
$$;

-- ============================================================
-- 7. CONFIGURACIÓN INICIAL
-- ============================================================

-- Insertar configuración por defecto para watermarks en eventos existentes
UPDATE events 
SET metadata = COALESCE(metadata, '{}') || jsonb_build_object(
    'watermark', jsonb_build_object(
        'enabled', true,
        'watermarkUrl', '/watermarks/default-watermark.png',
        'quality', 'low',
        'autoDelete', jsonb_build_object(
            'enabled', true,
            'periodDays', 30
        )
    )
)
WHERE metadata IS NULL OR NOT (metadata ? 'watermark');

-- ============================================================
-- 8. PERMISSIONS Y SECURITY
-- ============================================================

-- RLS en scheduled_deletions
ALTER TABLE scheduled_deletions ENABLE ROW LEVEL SECURITY;

-- Policy para service role
CREATE POLICY "Service role full access" ON scheduled_deletions
FOR ALL TO service_role USING (true);

-- Policy para admin users  
CREATE POLICY "Admin read access" ON scheduled_deletions
FOR SELECT TO authenticated USING (true);

-- Grants en vista de stats
GRANT SELECT ON deletion_stats TO service_role;
GRANT SELECT ON deletion_stats TO authenticated;

-- ============================================================
-- 9. VERIFICACIÓN FINAL
-- ============================================================

DO $$
DECLARE
    deletion_table_exists BOOLEAN;
    assets_has_watermark BOOLEAN;
    events_has_metadata BOOLEAN;
BEGIN
    -- Verificar tabla scheduled_deletions
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'scheduled_deletions'
    ) INTO deletion_table_exists;
    
    -- Verificar watermark_path en assets
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'assets' AND column_name = 'watermark_path'
    ) INTO assets_has_watermark;
    
    -- Verificar metadata en events
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'metadata'
    ) INTO events_has_metadata;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== SISTEMA WATERMARK Y ELIMINACIÓN AUTOMÁTICA ===';
    RAISE NOTICE 'Tabla scheduled_deletions: %', CASE WHEN deletion_table_exists THEN '✅ CREADA' ELSE '❌ ERROR' END;
    RAISE NOTICE 'Assets.watermark_path: %', CASE WHEN assets_has_watermark THEN '✅ AGREGADO' ELSE '❌ ERROR' END;
    RAISE NOTICE 'Events.metadata: %', CASE WHEN events_has_metadata THEN '✅ AGREGADO' ELSE '❌ ERROR' END;
    RAISE NOTICE '';
    RAISE NOTICE 'Funciones creadas:';
    RAISE NOTICE '- cleanup_old_deletion_records()';
    RAISE NOTICE '- process_scheduled_deletions()';
    RAISE NOTICE '';
    RAISE NOTICE 'Vista creada: deletion_stats';
    RAISE NOTICE '';
    RAISE NOTICE 'Sistema listo para:';
    RAISE NOTICE '1. Generar versiones con marca de agua';
    RAISE NOTICE '2. Programar eliminación automática';
    RAISE NOTICE '3. Procesar eliminaciones vía cron job';
END $$;

COMMIT;
