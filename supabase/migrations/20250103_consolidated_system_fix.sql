-- ============================================================
-- MIGRACIÓN CONSOLIDADA: Sistema Unificado y Funcional
-- Fecha: 2025-01-03
-- Propósito: Simplificación y eliminación de redundancias
-- ============================================================

BEGIN;

-- ============================================================
-- 1. VERIFICAR Y CREAR TABLAS CORE SI NO EXISTEN
-- ============================================================

-- Tabla events (base del sistema)
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (length(name) >= 3),
  school TEXT,
  date DATE,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla subjects (familias/estudiantes)
CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  type TEXT DEFAULT 'family' CHECK (type IN ('student', 'couple', 'family')),
  first_name TEXT NOT NULL,
  last_name TEXT,
  couple_first_name TEXT,
  couple_last_name TEXT,
  family_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. CREAR JERARQUÍA DE 4 NIVELES UNIFICADA
-- ============================================================

-- Tabla folders - SISTEMA UNIFICADO (reemplaza event_folders)
CREATE TABLE IF NOT EXISTS folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (length(name) >= 1 AND length(name) <= 100),
  parent_id UUID REFERENCES folders(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  
  -- Campos para jerarquía optimizada
  depth INTEGER NOT NULL DEFAULT 0 CHECK (depth >= 0 AND depth <= 4), -- LÍMITE: 4 niveles
  level_type TEXT CHECK (level_type IN ('event', 'nivel', 'salon', 'familia')),
  sort_order INTEGER DEFAULT 0 CHECK (sort_order >= 0),
  photo_count INTEGER DEFAULT 0 CHECK (photo_count >= 0),
  
  -- Campos para compartir
  share_token TEXT UNIQUE,
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  
  -- Metadatos
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT folders_no_self_reference CHECK (id != parent_id),
  CONSTRAINT folders_unique_name_per_parent UNIQUE(parent_id, name, event_id),
  CONSTRAINT folders_level_depth_consistency CHECK (
    (level_type = 'event' AND depth = 0) OR
    (level_type = 'nivel' AND depth = 1) OR  
    (level_type = 'salon' AND depth = 2) OR
    (level_type = 'familia' AND depth = 3) OR
    (level_type IS NULL)
  )
);

-- Tabla assets - SISTEMA UNIFICADO (reemplaza photos)
CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  original_path TEXT NOT NULL,
  preview_path TEXT,
  watermark_path TEXT,
  file_size BIGINT DEFAULT 0,
  checksum TEXT,
  mime_type TEXT DEFAULT 'image/jpeg',
  width INTEGER,
  height INTEGER,
  status TEXT DEFAULT 'ready' CHECK (status IN ('pending', 'processing', 'ready', 'error')),
  approved BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. SISTEMA DE TOKENS UNIFICADO PARA 4 NIVELES
-- ============================================================

-- Tabla access_tokens - SISTEMA UNIFICADO
CREATE TABLE IF NOT EXISTS access_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL CHECK (scope IN ('event', 'nivel', 'salon', 'familia')),
  
  -- Referencias según scope (solo una será NOT NULL)
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES folders(id) ON DELETE CASCADE, -- Para nivel, salon
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE, -- Para familia
  
  -- Seguridad del token
  token_hash BYTEA NOT NULL,
  salt BYTEA NOT NULL,
  token_prefix TEXT NOT NULL CHECK (length(token_prefix) BETWEEN 8 AND 12),
  
  -- Control de acceso
  access_level TEXT DEFAULT 'read_only' CHECK (access_level IN ('full', 'read_only')),
  can_download BOOLEAN DEFAULT false,
  max_uses INTEGER,
  used_count INTEGER DEFAULT 0 CHECK (used_count >= 0),
  
  -- Gestión temporal
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  revoked_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  
  -- Metadatos
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  metadata JSONB DEFAULT '{}',
  
  -- Constraint para scope-resource consistency
  CONSTRAINT access_tokens_scope_resource_check CHECK (
    (scope = 'event' AND event_id IS NOT NULL AND folder_id IS NULL AND subject_id IS NULL) OR
    (scope = 'nivel' AND folder_id IS NOT NULL AND event_id IS NULL AND subject_id IS NULL) OR
    (scope = 'salon' AND folder_id IS NOT NULL AND event_id IS NULL AND subject_id IS NULL) OR
    (scope = 'familia' AND subject_id IS NOT NULL AND event_id IS NULL AND folder_id IS NULL)
  ),
  
  -- Constraint para uso de tokens
  CONSTRAINT access_tokens_usage_limit CHECK (max_uses IS NULL OR used_count <= max_uses)
);

-- ============================================================
-- 4. RELACIONES MANY-TO-MANY PARA FLEXIBILIDAD
-- ============================================================

-- Relación assets-subjects (fotos-familias)
CREATE TABLE IF NOT EXISTS asset_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(asset_id, subject_id)
);

-- ============================================================
-- 5. LOGS DE AUDITORÍA
-- ============================================================

-- Logs de acceso a tokens
CREATE TABLE IF NOT EXISTS token_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token_id UUID NOT NULL REFERENCES access_tokens(id) ON DELETE CASCADE,
  occurred_at TIMESTAMPTZ DEFAULT NOW(),
  ip INET,
  user_agent TEXT,
  path TEXT,
  action TEXT NOT NULL CHECK (action IN ('list_folders', 'list_assets', 'download', 'view')),
  success BOOLEAN DEFAULT true,
  response_time_ms INTEGER,
  notes TEXT
);

-- ============================================================
-- 6. ÍNDICES PARA PERFORMANCE
-- ============================================================

-- Índices para folders
CREATE INDEX IF NOT EXISTS idx_folders_event_id ON folders(event_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_folders_depth ON folders(depth);
CREATE INDEX IF NOT EXISTS idx_folders_published ON folders(is_published, published_at DESC) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_folders_share_token ON folders(share_token) WHERE share_token IS NOT NULL;

-- Índices para assets
CREATE INDEX IF NOT EXISTS idx_assets_folder_id ON assets(folder_id);
CREATE INDEX IF NOT EXISTS idx_assets_checksum ON assets(checksum) WHERE checksum IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_approved ON assets(approved, created_at DESC) WHERE approved = true;

-- Índices para access_tokens
CREATE INDEX IF NOT EXISTS idx_access_tokens_prefix ON access_tokens(token_prefix);
CREATE INDEX IF NOT EXISTS idx_access_tokens_scope ON access_tokens(scope, expires_at) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_access_tokens_event ON access_tokens(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_access_tokens_folder ON access_tokens(folder_id) WHERE folder_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_access_tokens_subject ON access_tokens(subject_id) WHERE subject_id IS NOT NULL;

-- Índices para asset_subjects
CREATE INDEX IF NOT EXISTS idx_asset_subjects_asset ON asset_subjects(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_subjects_subject ON asset_subjects(subject_id);

-- ============================================================
-- 7. FUNCIONES HELPER PARA JERARQUÍA
-- ============================================================

-- Función para calcular depth automáticamente
CREATE OR REPLACE FUNCTION calculate_folder_depth(folder_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    current_depth INTEGER := 0;
    parent_id_val UUID;
BEGIN
    SELECT parent_id INTO parent_id_val 
    FROM folders 
    WHERE id = folder_id;
    
    IF parent_id_val IS NULL THEN
        RETURN 0;
    END IF;
    
    WITH RECURSIVE depth_calc AS (
        SELECT id, parent_id, 0 as level
        FROM folders
        WHERE id = folder_id
        
        UNION ALL
        
        SELECT f.id, f.parent_id, dc.level + 1
        FROM folders f
        INNER JOIN depth_calc dc ON f.id = dc.parent_id
        WHERE dc.level < 10
    )
    SELECT MAX(level) INTO current_depth FROM depth_calc;
    
    RETURN COALESCE(current_depth, 0);
END;
$$;

-- Trigger para actualizar depth automáticamente
CREATE OR REPLACE FUNCTION update_folder_depth_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.depth := calculate_folder_depth(NEW.id);
    
    -- Asignar level_type basado en depth
    NEW.level_type := CASE NEW.depth
        WHEN 0 THEN 'event'
        WHEN 1 THEN 'nivel'  
        WHEN 2 THEN 'salon'
        WHEN 3 THEN 'familia'
        ELSE NULL
    END;
    
    IF NEW.depth > 3 THEN
        RAISE EXCEPTION 'Máximo de 4 niveles jerárquicos alcanzado';
    END IF;
    
    RETURN NEW;
END;
$$;

-- Crear trigger
DROP TRIGGER IF EXISTS folders_depth_update ON folders;
CREATE TRIGGER folders_depth_update
    BEFORE INSERT OR UPDATE OF parent_id ON folders
    FOR EACH ROW
    EXECUTE FUNCTION update_folder_depth_trigger();

-- ============================================================
-- 8. MIGRACIÓN DE DATOS EXISTENTES
-- ============================================================

-- Migrar desde event_folders si existe
DO $$
DECLARE
    event_folders_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'event_folders'
    ) INTO event_folders_exists;
    
    IF event_folders_exists THEN
        RAISE NOTICE 'Migrando datos desde event_folders...';
        
        INSERT INTO folders (id, name, parent_id, event_id, depth, sort_order, created_at, updated_at)
        SELECT 
            id, name, parent_id, event_id, depth, 
            COALESCE(sort_order, 0), 
            COALESCE(created_at, NOW()), 
            COALESCE(updated_at, NOW())
        FROM event_folders
        ON CONFLICT (id) DO NOTHING;
        
        RAISE NOTICE 'Migración desde event_folders completada';
    ELSE
        RAISE NOTICE 'Tabla event_folders no existe, omitiendo migración';
    END IF;
END $$;

-- Migrar desde photos si existe
DO $$
DECLARE
    photos_exists BOOLEAN;
    migrated_count INTEGER := 0;
BEGIN
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'photos'
    ) INTO photos_exists;
    
    IF photos_exists THEN
        RAISE NOTICE 'Migrando datos desde photos...';
        
        INSERT INTO assets (
            id, folder_id, filename, original_path, 
            file_size, width, height, approved, created_at, updated_at
        )
        SELECT 
            p.id,
            p.folder_id,
            COALESCE(p.original_filename, 'unknown_' || p.id || '.jpg'),
            COALESCE(p.storage_path, '/photos/' || p.id),
            COALESCE(p.file_size, 0),
            p.width,
            p.height,
            COALESCE(p.approved, true),
            COALESCE(p.created_at, NOW()),
            COALESCE(p.updated_at, NOW())
        FROM photos p
        WHERE p.folder_id IS NOT NULL
        ON CONFLICT (id) DO NOTHING;
        
        GET DIAGNOSTICS migrated_count = ROW_COUNT;
        RAISE NOTICE 'Migración desde photos completada: % registros', migrated_count;
    ELSE
        RAISE NOTICE 'Tabla photos no existe, omitiendo migración';
    END IF;
END $$;

-- Migrar desde subject_tokens si existe
DO $$
DECLARE
    subject_tokens_exists BOOLEAN;
    migrated_count INTEGER := 0;
BEGIN
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'subject_tokens'
    ) INTO subject_tokens_exists;
    
    IF subject_tokens_exists THEN
        RAISE NOTICE 'Migrando tokens desde subject_tokens...';
        
        INSERT INTO access_tokens (
            scope, subject_id, token_hash, salt, token_prefix,
            expires_at, created_at
        )
        SELECT 
            'familia',
            st.subject_id,
            digest(st.token || gen_random_bytes(16)::text, 'sha256'),  -- Hash simple
            gen_random_bytes(16),
            substring(st.token from 1 for 8),
            COALESCE(st.expires_at, NOW() + INTERVAL '30 days'),
            COALESCE(st.created_at, NOW())
        FROM subject_tokens st
        ON CONFLICT (id) DO NOTHING;
        
        GET DIAGNOSTICS migrated_count = ROW_COUNT;
        RAISE NOTICE 'Migración de tokens completada: % registros', migrated_count;
    ELSE
        RAISE NOTICE 'Tabla subject_tokens no existe, omitiendo migración';
    END IF;
END $$;

-- ============================================================
-- 9. CREAR CARPETAS RAÍZ PARA EVENTOS EXISTENTES
-- ============================================================

INSERT INTO folders (event_id, name, depth, level_type, sort_order)
SELECT 
    e.id,
    'Fotos',
    0,
    'event',
    0
FROM events e
WHERE NOT EXISTS (
    SELECT 1 FROM folders f 
    WHERE f.event_id = e.id AND f.parent_id IS NULL
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 10. VERIFICACIÓN FINAL
-- ============================================================

DO $$
DECLARE
    events_count INTEGER;
    folders_count INTEGER;
    assets_count INTEGER;
    tokens_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO events_count FROM events;
    SELECT COUNT(*) INTO folders_count FROM folders;
    SELECT COUNT(*) INTO assets_count FROM assets;
    SELECT COUNT(*) INTO tokens_count FROM access_tokens;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== MIGRACIÓN CONSOLIDADA COMPLETADA ===';
    RAISE NOTICE 'Eventos: %', events_count;
    RAISE NOTICE 'Carpetas: %', folders_count;
    RAISE NOTICE 'Assets: %', assets_count;
    RAISE NOTICE 'Tokens: %', tokens_count;
    RAISE NOTICE '';
    RAISE NOTICE 'JERARQUÍA IMPLEMENTADA:';
    RAISE NOTICE '1. Evento (depth=0, level_type=event)';
    RAISE NOTICE '2. Nivel (depth=1, level_type=nivel)';
    RAISE NOTICE '3. Salón (depth=2, level_type=salon)';
    RAISE NOTICE '4. Familia (depth=3, level_type=familia)';
    RAISE NOTICE '';
    RAISE NOTICE 'Sistema unificado y funcional implementado correctamente.';
END $$;

COMMIT;
