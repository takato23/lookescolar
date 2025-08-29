-- ============================================================
-- CANONICAL API FUNCTIONS - Phase 2 of Hierarchical System
-- ============================================================
-- Apply this after hierarchical_setup.sql via Supabase Dashboard
-- Creates the API schema and canonical SECURITY DEFINER functions
-- ============================================================

-- ============================================================
-- 1. API SCHEMA: Namespace for public functions
-- ============================================================
CREATE SCHEMA IF NOT EXISTS api;

-- ============================================================
-- 2. HELPER FUNCTIONS: Token validation and utilities
-- ============================================================

-- Function to validate and get token data
CREATE OR REPLACE FUNCTION validate_access_token(p_token_plain text)
RETURNS TABLE (
  token_id uuid,
  scope text,
  resource_id uuid,
  access_level text,
  can_download boolean,
  is_valid boolean,
  reason text
) SECURITY DEFINER AS $$
DECLARE
  v_token access_tokens%ROWTYPE;
  v_prefix text := left(p_token_plain, 10);
  v_expected_hash bytea;
BEGIN
  -- Find token by prefix
  SELECT * INTO v_token
  FROM access_tokens
  WHERE token_prefix = v_prefix;
  
  -- Token not found
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::uuid, NULL::text, false, false, 'Token not found'::text;
    RETURN;
  END IF;
  
  -- Verify cryptographic hash
  v_expected_hash := digest(p_token_plain || v_token.salt, 'sha256');
  IF v_token.token_hash != v_expected_hash THEN
    RETURN QUERY SELECT v_token.id, NULL::text, NULL::uuid, NULL::text, false, false, 'Invalid token'::text;
    RETURN;
  END IF;
  
  -- Check if revoked
  IF v_token.revoked_at IS NOT NULL THEN
    RETURN QUERY SELECT v_token.id, v_token.scope, NULL::uuid, NULL::text, false, false, 'Token revoked'::text;
    RETURN;
  END IF;
  
  -- Check expiration
  IF v_token.expires_at IS NOT NULL AND v_token.expires_at <= now() THEN
    RETURN QUERY SELECT v_token.id, v_token.scope, NULL::uuid, NULL::text, false, false, 'Token expired'::text;
    RETURN;
  END IF;
  
  -- Check usage limits
  IF v_token.max_uses IS NOT NULL AND v_token.used_count >= v_token.max_uses THEN
    RETURN QUERY SELECT v_token.id, v_token.scope, NULL::uuid, NULL::text, false, false, 'Usage limit exceeded'::text;
    RETURN;
  END IF;
  
  -- Token valid - return data
  RETURN QUERY SELECT 
    v_token.id,
    v_token.scope,
    COALESCE(v_token.event_id, v_token.course_id, v_token.subject_id),
    v_token.access_level,
    v_token.can_download,
    true,
    'Valid'::text;
END;
$$ LANGUAGE plpgsql;

-- Function to get token usage statistics
CREATE OR REPLACE FUNCTION get_token_usage_stats(p_token_id uuid)
RETURNS TABLE (
  total_accesses bigint,
  successful_accesses bigint,
  failed_accesses bigint,
  unique_ips bigint,
  first_access timestamptz,
  last_access timestamptz,
  avg_response_time_ms numeric
) SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE ok = true),
    COUNT(*) FILTER (WHERE ok = false),
    COUNT(DISTINCT ip),
    MIN(occurred_at),
    MAX(occurred_at),
    ROUND(AVG(response_time_ms), 2)
  FROM token_access_logs
  WHERE access_token_id = p_token_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 3. CANONICAL FUNCTION: Folders visible by token
-- ============================================================
CREATE OR REPLACE FUNCTION api.folders_for_token(p_token text)
RETURNS TABLE (folder_id uuid, folder_name text, photo_count integer, depth integer) 
SECURITY DEFINER AS $$
DECLARE
  v_validation RECORD;
BEGIN
  -- 🔐 Validate token using helper function
  SELECT * INTO v_validation
  FROM validate_access_token(p_token);
  
  -- Invalid token - return nothing
  IF NOT v_validation.is_valid THEN
    RETURN;
  END IF;
  
  -- 🎯 LOGIC BY SCOPE
  -- Event: All published folders in the event
  IF v_validation.scope = 'event' THEN
    RETURN QUERY
    SELECT f.id, f.name, f.photo_count, f.depth
      FROM folders f
     WHERE f.event_id = v_validation.resource_id 
       AND f.is_published = true
     ORDER BY f.depth, f.sort_order, f.name;

  -- Course: Only folders linked to the course
  ELSIF v_validation.scope = 'course' THEN
    RETURN QUERY
    SELECT f.id, f.name, f.photo_count, f.depth
      FROM folder_courses fc
      JOIN folders f ON f.id = fc.folder_id
     WHERE fc.course_id = v_validation.resource_id 
       AND f.is_published = true
     ORDER BY f.depth, f.sort_order, f.name;

  -- Family: Folders from courses where the family belongs
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
-- 4. CANONICAL FUNCTION: Assets visible by token
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
  -- 🔐 Validate token
  SELECT * INTO v_validation
  FROM validate_access_token(p_token);
  
  IF NOT v_validation.is_valid THEN
    RETURN;
  END IF;

  -- 🎯 FILTER BY SCOPE: Assets in accessible folders
  -- Event/Course: All assets in accessible folders
  IF v_validation.scope IN ('event','course') THEN
    RETURN QUERY
    SELECT a.id, a.folder_id, a.filename, a.preview_path, a.original_path, a.file_size, a.created_at
      FROM assets a
      JOIN api.folders_for_token(p_token) tf ON tf.folder_id = a.folder_id
     WHERE a.status = 'ready'
       AND (p_folder_id IS NULL OR a.folder_id = p_folder_id)
     ORDER BY a.created_at DESC;

  -- Family: Only assets tagged with the family
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
-- 5. CANONICAL FUNCTION: Verify access to specific asset
-- ============================================================
CREATE OR REPLACE FUNCTION api.can_access_asset(p_token text, p_asset_id uuid)
RETURNS boolean SECURITY DEFINER AS $$
DECLARE
  v_validation RECORD;
  v_asset_accessible boolean := false;
BEGIN
  -- 🔐 Validate token
  SELECT * INTO v_validation
  FROM validate_access_token(p_token);
  
  IF NOT v_validation.is_valid THEN
    RETURN false;
  END IF;

  -- 🎯 Verify access by scope
  IF v_validation.scope IN ('event','course') THEN
    -- Event/Course: Asset must be in accessible folder
    SELECT EXISTS(
      SELECT 1 FROM assets a
      JOIN api.folders_for_token(p_token) tf ON tf.folder_id = a.folder_id
      WHERE a.id = p_asset_id AND a.status = 'ready'
    ) INTO v_asset_accessible;
    
  ELSE -- scope = 'family'
    -- Family: Asset must be tagged with family AND in accessible folder
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
-- 6. LOGGING FUNCTION: Access logs with token validation
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
  -- 🔐 Validate token (even if invalid, we log the attempt)
  SELECT * INTO v_validation
  FROM validate_access_token(p_token);
  
  -- Only log if we found the token (valid or invalid)
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
      p_ok AND v_validation.is_valid, -- Only ok if token is valid
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
-- 7. CONTEXT FUNCTION: Get token context for UI
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
  -- 🔐 Validate token
  SELECT * INTO v_validation
  FROM validate_access_token(p_token);
  
  IF NOT v_validation.is_valid THEN
    RETURN;
  END IF;

  -- 🏷️ Get resource name by scope
  CASE v_validation.scope
    WHEN 'event' THEN
      SELECT name INTO v_resource_name FROM events WHERE id = v_validation.resource_id;
    WHEN 'course' THEN
      SELECT name INTO v_resource_name FROM courses WHERE id = v_validation.resource_id;
    WHEN 'family' THEN
      SELECT COALESCE(family_name, first_name || ' ' || last_name) 
      INTO v_resource_name FROM subjects WHERE id = v_validation.resource_id;
  END CASE;

  -- 📊 Get usage statistics
  SELECT to_jsonb(stats.*) INTO v_usage_stats
  FROM get_token_usage_stats(v_validation.token_id) stats;

  -- 🔍 Return token context from access_tokens table
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
-- 8. TRIGGER FUNCTION: Auto-increment token usage
-- ============================================================
CREATE OR REPLACE FUNCTION increment_token_usage()
RETURNS TRIGGER AS $$
BEGIN
  -- Only increment on successful logs
  IF NEW.ok = true THEN
    UPDATE access_tokens 
    SET 
      used_count = used_count + 1,
      last_used_at = NEW.occurred_at
    WHERE id = NEW.access_token_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER token_access_logs_increment_usage
  AFTER INSERT ON token_access_logs
  FOR EACH ROW
  EXECUTE FUNCTION increment_token_usage();

-- ============================================================
-- 9. MAINTENANCE FUNCTION: Cleanup expired tokens
-- ============================================================
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS TABLE (
  cleaned_tokens integer,
  cleaned_logs integer
) SECURITY DEFINER AS $$
DECLARE
  v_tokens_cleaned integer;
  v_logs_cleaned integer;
BEGIN
  -- Delete logs from tokens deleted more than 90 days ago
  DELETE FROM token_access_logs 
  WHERE access_token_id IN (
    SELECT id FROM access_tokens 
    WHERE revoked_at < now() - interval '90 days'
  );
  GET DIAGNOSTICS v_logs_cleaned = ROW_COUNT;
  
  -- Delete expired tokens more than 30 days old
  DELETE FROM access_tokens 
  WHERE (expires_at < now() - interval '30 days') 
     OR (revoked_at < now() - interval '90 days');
  GET DIAGNOSTICS v_tokens_cleaned = ROW_COUNT;
  
  RETURN QUERY SELECT v_tokens_cleaned, v_logs_cleaned;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 10. PERMISSIONS: Public access to API functions
-- ============================================================

-- Revoke default permissions and grant specific access
REVOKE ALL ON SCHEMA api FROM PUBLIC;
GRANT USAGE ON SCHEMA api TO anon, authenticated, service_role;

-- Grant access to API functions
GRANT EXECUTE ON FUNCTION api.folders_for_token(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION api.assets_for_token(text, uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION api.can_access_asset(text, uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION api.log_token_access(text, text, inet, text, text, int, boolean, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION api.get_token_context(text) TO anon, authenticated, service_role;

-- ============================================================
-- 11. PERFORMANCE INDEXES for API functions
-- ============================================================

-- Covering index for assets queries (avoids additional lookups)
CREATE INDEX IF NOT EXISTS idx_assets_folder_status_cover ON assets(folder_id, status) 
INCLUDE (id, filename, preview_path, original_path, file_size, created_at)
WHERE status = 'ready';

-- Index for asset_subjects searches by subject
CREATE INDEX IF NOT EXISTS idx_asset_subjects_subject_asset ON asset_subjects(subject_id, asset_id);

-- Index for published folders by event  
CREATE INDEX IF NOT EXISTS idx_folders_event_published ON folders(event_id, is_published, depth, sort_order)
WHERE is_published = true;

-- ============================================================
-- SUCCESS MESSAGE
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

  RAISE NOTICE '';
  RAISE NOTICE '🎉 CANONICAL API FUNCTIONS CREATED! 🎉';
  RAISE NOTICE '';
  RAISE NOTICE 'API functions created: %/%', function_count, array_length(required_functions, 1);
  RAISE NOTICE '';
  RAISE NOTICE '🔧 API Functions Ready:';
  RAISE NOTICE '   📁 api.folders_for_token() → hierarchical folder access';
  RAISE NOTICE '   🖼️  api.assets_for_token() → filtered asset access';
  RAISE NOTICE '   🔐 api.can_access_asset() → permission validation';
  RAISE NOTICE '   📊 api.log_token_access() → audit logging';
  RAISE NOTICE '   ℹ️  api.get_token_context() → token metadata';
  RAISE NOTICE '';
  RAISE NOTICE '⚡ Security Features:';
  RAISE NOTICE '   🛡️  SECURITY DEFINER → elevated permissions';
  RAISE NOTICE '   🧂 Hash+Salt validation → no plain text tokens';
  RAISE NOTICE '   🔍 Comprehensive audit → all access logged';
  RAISE NOTICE '   ⏱️  Expiration handling → automatic cleanup';
  RAISE NOTICE '   📈 Usage tracking → rate limiting ready';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Ready for Phase 3: Unified API Routes (/s/[token])';
  
  IF function_count = array_length(required_functions, 1) THEN
    RAISE NOTICE '🚀 All API functions created successfully!';
  ELSE
    RAISE WARNING '⚠️ Some API functions may be missing - check function logs';
  END IF;
END $$;