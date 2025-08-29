-- ============================================================
-- MIGRACIÓN: Funciones SQL Canónicas (SECURITY DEFINER)
-- Fecha: 2025-08-28
-- Propósito: Una sola fuente de verdad para consultas por token
-- ============================================================

BEGIN;

-- ============================================================
-- 1. ESQUEMA API: Espacio de nombres para funciones públicas
-- ============================================================
CREATE SCHEMA IF NOT EXISTS api;

-- ============================================================
-- 2. FUNCIÓN CANÓNICA: Carpetas visibles por token
-- ============================================================
CREATE OR REPLACE FUNCTION api.folders_for_token(p_token text)
RETURNS TABLE (folder_id uuid, folder_name text, photo_count integer, depth integer) 
SECURITY DEFINER AS $$
DECLARE
  v_validation RECORD;
BEGIN
  -- 🔐 Validar token usando función auxiliar
  SELECT * INTO v_validation
  FROM validate_access_token(p_token);
  
  -- Token inválido - no devolver nada
  IF NOT v_validation.is_valid THEN
    RETURN;
  END IF;
  
  -- 🎯 LOGIC BY SCOPE
  -- Event: Todas las carpetas publicadas del evento
  IF v_validation.scope = 'event' THEN
    RETURN QUERY
    SELECT f.id, f.name, f.photo_count, f.depth
      FROM folders f
     WHERE f.event_id = v_validation.resource_id 
       AND f.is_published = true
     ORDER BY f.depth, f.sort_order, f.name;

  -- Course: Solo carpetas vinculadas al curso
  ELSIF v_validation.scope = 'course' THEN
    RETURN QUERY
    SELECT f.id, f.name, f.photo_count, f.depth
      FROM folder_courses fc
      JOIN folders f ON f.id = fc.folder_id
     WHERE fc.course_id = v_validation.resource_id 
       AND f.is_published = true
     ORDER BY f.depth, f.sort_order, f.name;

  -- Family: Carpetas de cursos donde pertenece la familia
  ELSE -- scope = 'family'
    RETURN QUERY
    SELECT DISTINCT f.id, f.name, f.photo_count, f.depth
      FROM course_members cm
      JOIN folder_courses fc ON fc.course_id = cm.course_id
      JOIN folders f ON f.id = fc.folder_id
     WHERE cm.subject_id = v_validation.resource_id 
       AND f.is_published = true
     ORDER BY f.depth, f.sort_order, f.name;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 3. FUNCIÓN CANÓNICA: Assets visibles por token
-- ============================================================
CREATE OR REPLACE FUNCTION api.assets_for_token(p_token text, p_folder_id uuid DEFAULT NULL)
RETURNS TABLE (
  asset_id uuid, 
  folder_id uuid, 
  filename text, 
  preview_path text, 
  original_path text,
  file_size bigint,
  created_at timestamptz
) SECURITY DEFINER AS $$
DECLARE
  v_validation RECORD;
BEGIN
  -- 🔐 Validar token
  SELECT * INTO v_validation
  FROM validate_access_token(p_token);
  
  IF NOT v_validation.is_valid THEN
    RETURN;
  END IF;

  -- 🎯 FILTRO BASE: Assets en carpetas accesibles
  -- Event/Course: Todos los assets de carpetas accesibles
  IF v_validation.scope IN ('event','course') THEN
    RETURN QUERY
    SELECT a.id, a.folder_id, a.filename, a.preview_path, a.original_path, a.file_size, a.created_at
      FROM assets a
      JOIN api.folders_for_token(p_token) tf ON tf.folder_id = a.folder_id
     WHERE a.status = 'ready'
       AND (p_folder_id IS NULL OR a.folder_id = p_folder_id)
     ORDER BY a.created_at DESC;

  -- Family: Solo assets etiquetados con la familia
  ELSE -- scope = 'family'
    RETURN QUERY
    SELECT a.id, a.folder_id, a.filename, a.preview_path, a.original_path, a.file_size, a.created_at
      FROM assets a
      JOIN asset_subjects ats ON ats.asset_id = a.id
      JOIN api.folders_for_token(p_token) tf ON tf.folder_id = a.folder_id
     WHERE ats.subject_id = v_validation.resource_id
       AND a.status = 'ready'
       AND (p_folder_id IS NULL OR a.folder_id = p_folder_id)
     ORDER BY a.created_at DESC;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 4. FUNCIÓN CANÓNICA: Verificar acceso a asset específico
-- ============================================================
CREATE OR REPLACE FUNCTION api.can_access_asset(p_token text, p_asset_id uuid)
RETURNS boolean SECURITY DEFINER AS $$
DECLARE
  v_validation RECORD;
  v_asset_accessible boolean := false;
BEGIN
  -- 🔐 Validar token
  SELECT * INTO v_validation
  FROM validate_access_token(p_token);
  
  IF NOT v_validation.is_valid THEN
    RETURN false;
  END IF;

  -- 🎯 Verificar acceso según scope
  IF v_validation.scope IN ('event','course') THEN
    -- Event/Course: Asset debe estar en carpeta accesible
    SELECT EXISTS(
      SELECT 1 FROM assets a
      JOIN api.folders_for_token(p_token) tf ON tf.folder_id = a.folder_id
      WHERE a.id = p_asset_id AND a.status = 'ready'
    ) INTO v_asset_accessible;
    
  ELSE -- scope = 'family'
    -- Family: Asset debe estar etiquetado con la familia Y en carpeta accesible
    SELECT EXISTS(
      SELECT 1 FROM assets a
      JOIN asset_subjects ats ON ats.asset_id = a.id
      JOIN api.folders_for_token(p_token) tf ON tf.folder_id = a.folder_id
      WHERE a.id = p_asset_id 
        AND ats.subject_id = v_validation.resource_id
        AND a.status = 'ready'
    ) INTO v_asset_accessible;
  END IF;
  
  RETURN v_asset_accessible;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 5. FUNCIÓN AUXILIAR: Log de acceso con token
-- ============================================================
CREATE OR REPLACE FUNCTION api.log_token_access(
  p_token text,
  p_action text,
  p_ip inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_path text DEFAULT NULL,
  p_response_time_ms int DEFAULT NULL,
  p_ok boolean DEFAULT true,
  p_notes text DEFAULT NULL
)
RETURNS uuid SECURITY DEFINER AS $$
DECLARE
  v_validation RECORD;
  v_log_id uuid;
BEGIN
  -- 🔐 Validar token (incluso si no es válido, loggeamos el intento)
  SELECT * INTO v_validation
  FROM validate_access_token(p_token);
  
  -- Solo loggear si encontramos el token (válido o no)
  IF v_validation.token_id IS NOT NULL THEN
    INSERT INTO token_access_logs (
      access_token_id,
      action,
      ip,
      user_agent,
      path,
      response_time_ms,
      ok,
      notes
    ) VALUES (
      v_validation.token_id,
      p_action,
      p_ip,
      p_user_agent,
      p_path,
      p_response_time_ms,
      p_ok AND v_validation.is_valid, -- Solo ok si token es válido
      CASE 
        WHEN NOT v_validation.is_valid THEN v_validation.reason
        ELSE p_notes
      END
    )
    RETURNING id INTO v_log_id;
  END IF;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 6. FUNCIÓN AUXILIAR: Obtener contexto del token (para UI)
-- ============================================================
CREATE OR REPLACE FUNCTION api.get_token_context(p_token text)
RETURNS TABLE (
  scope text,
  resource_id uuid,
  resource_name text,
  access_level text,
  can_download boolean,
  expires_at timestamptz,
  usage_stats jsonb
) SECURITY DEFINER AS $$
DECLARE
  v_validation RECORD;
  v_resource_name text;
  v_usage_stats jsonb;
BEGIN
  -- 🔐 Validar token
  SELECT * INTO v_validation
  FROM validate_access_token(p_token);
  
  IF NOT v_validation.is_valid THEN
    RETURN;
  END IF;

  -- 🏷️ Obtener nombre del recurso según scope
  CASE v_validation.scope
    WHEN 'event' THEN
      SELECT name INTO v_resource_name FROM events WHERE id = v_validation.resource_id;
    WHEN 'course' THEN
      SELECT name INTO v_resource_name FROM courses WHERE id = v_validation.resource_id;
    WHEN 'family' THEN
      SELECT COALESCE(family_name, first_name || ' ' || last_name) 
      INTO v_resource_name FROM subjects WHERE id = v_validation.resource_id;
  END CASE;

  -- 📊 Obtener estadísticas de uso
  SELECT to_jsonb(stats.*) INTO v_usage_stats
  FROM get_token_usage_stats(v_validation.token_id) stats;

  -- 🔍 Obtener token info desde access_tokens
  RETURN QUERY
  SELECT 
    v_validation.scope,
    v_validation.resource_id,
    v_resource_name,
    v_validation.access_level,
    v_validation.can_download,
    at.expires_at,
    v_usage_stats
  FROM access_tokens at
  WHERE at.id = v_validation.token_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 7. PERMISOS: Acceso público a funciones API
-- ============================================================

-- Revocar permisos por defecto y dar acceso específico
REVOKE ALL ON SCHEMA api FROM PUBLIC;
GRANT USAGE ON SCHEMA api TO anon, authenticated, service_role;

-- Dar acceso a las funciones API
GRANT EXECUTE ON FUNCTION api.folders_for_token(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION api.assets_for_token(text, uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION api.can_access_asset(text, uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION api.log_token_access(text, text, inet, text, text, int, boolean, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION api.get_token_context(text) TO anon, authenticated, service_role;

-- ============================================================
-- 8. PERFORMANCE: Índices adicionales para funciones
-- ============================================================

-- Índice covering para assets queries (evita lookups adicionales)
CREATE INDEX IF NOT EXISTS idx_assets_folder_status_cover ON assets(folder_id, status) 
INCLUDE (id, filename, preview_path, original_path, file_size, created_at)
WHERE status = 'ready';

-- Índice para búsquedas de asset_subjects por subject
CREATE INDEX IF NOT EXISTS idx_asset_subjects_subject_asset ON asset_subjects(subject_id, asset_id);

-- Índice para folders publicadas por evento
CREATE INDEX IF NOT EXISTS idx_folders_event_published ON folders(event_id, is_published, depth, sort_order)
WHERE is_published = true;

COMMIT;

-- ============================================================
-- VERIFICACIÓN: Probar las funciones creadas
-- ============================================================

DO $$
DECLARE
  function_count INTEGER := 0;
  required_functions TEXT[] := ARRAY[
    'api.folders_for_token', 
    'api.assets_for_token', 
    'api.can_access_asset',
    'api.log_token_access',
    'api.get_token_context'
  ];
  func TEXT;
BEGIN
  FOREACH func IN ARRAY required_functions
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.routines 
      WHERE routine_schema = 'api' 
      AND routine_name = split_part(func, '.', 2)
    ) THEN
      function_count := function_count + 1;
    END IF;
  END LOOP;

  RAISE NOTICE '✅ Canonical API functions created: %/%', function_count, array_length(required_functions, 1);
  
  IF function_count = array_length(required_functions, 1) THEN
    RAISE NOTICE '🎯 Canonical SQL functions ready!';
  ELSE
    RAISE WARNING '⚠️ Some API functions may be missing';
  END IF;
END $$;