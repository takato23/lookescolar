/**
 * CANONICAL API FUNCTIONS - Phase 1
 * 
 * Creates 5 core SECURITY DEFINER functions for token-based access
 * Applied manually on 2025-08-29 via SQL Editor
 * This migration file is for version control and repair purposes
 */

-- ============================================================
-- CANONICAL API FUNCTIONS (SECURITY DEFINER)
-- ============================================================

-- Create api schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS api;

-- Function 1: Get folders accessible by token
CREATE OR REPLACE FUNCTION api.folders_for_token(p_token text)
RETURNS TABLE (
  folder_id uuid,
  folder_name text,
  photo_count integer,
  depth integer
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $function$
DECLARE
  v_token_id uuid;
  v_scope text;
  v_resource_id uuid;
  v_access_level text;
  v_can_download boolean;
  v_is_valid boolean;
  v_reason text;
BEGIN
  -- Validate token first
  SELECT t.token_id, t.scope, t.resource_id, t.access_level, t.can_download, t.is_valid, t.reason
  INTO v_token_id, v_scope, v_resource_id, v_access_level, v_can_download, v_is_valid, v_reason
  FROM validate_access_token(p_token) t;
  
  -- Return empty if token invalid
  IF NOT v_is_valid THEN
    RETURN;
  END IF;
  
  -- Update token usage
  UPDATE access_tokens 
  SET used_count = used_count + 1, last_used_at = NOW()
  WHERE id = v_token_id;
  
  -- Return folders based on scope
  IF v_scope = 'event' THEN
    -- Event scope: all folders in the event
    RETURN QUERY
    SELECT f.id, f.name, f.photo_count, f.depth
    FROM folders f
    WHERE f.event_id = v_resource_id
      AND f.is_published = true
    ORDER BY f.depth, f.sort_order, f.name;
    
  ELSIF v_scope = 'course' THEN
    -- Course scope: folders linked to the course
    RETURN QUERY
    SELECT f.id, f.name, f.photo_count, f.depth
    FROM folders f
    INNER JOIN folder_courses fc ON fc.folder_id = f.id
    WHERE fc.course_id = v_resource_id
      AND f.is_published = true
    ORDER BY f.depth, f.sort_order, f.name;
    
  ELSIF v_scope = 'family' THEN
    -- Family scope: folders containing photos tagged with this subject
    RETURN QUERY
    SELECT DISTINCT f.id, f.name, f.photo_count, f.depth
    FROM folders f
    INNER JOIN assets a ON a.folder_id = f.id
    INNER JOIN asset_subjects asub ON asub.asset_id = a.id
    WHERE asub.subject_id = v_resource_id
      AND f.is_published = true
    ORDER BY f.depth, f.sort_order, f.name;
  END IF;
END;
$function$;

-- Function 2: Get assets accessible by token
CREATE OR REPLACE FUNCTION api.assets_for_token(p_token text, p_folder_id uuid DEFAULT NULL)
RETURNS TABLE (
  asset_id uuid,
  folder_id uuid,
  filename text,
  preview_path text,
  original_path text,
  file_size bigint,
  created_at timestamptz
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $function$
DECLARE
  v_token_id uuid;
  v_scope text;
  v_resource_id uuid;
  v_access_level text;
  v_can_download boolean;
  v_is_valid boolean;
  v_reason text;
BEGIN
  -- Validate token first
  SELECT t.token_id, t.scope, t.resource_id, t.access_level, t.can_download, t.is_valid, t.reason
  INTO v_token_id, v_scope, v_resource_id, v_access_level, v_can_download, v_is_valid, v_reason
  FROM validate_access_token(p_token) t;
  
  -- Return empty if token invalid
  IF NOT v_is_valid THEN
    RETURN;
  END IF;
  
  -- Update token usage
  UPDATE access_tokens 
  SET used_count = used_count + 1, last_used_at = NOW()
  WHERE id = v_token_id;
  
  -- Return assets based on scope and folder filter
  IF v_scope = 'event' THEN
    -- Event scope: all assets in event (optionally filtered by folder)
    RETURN QUERY
    SELECT a.id, a.folder_id, a.filename, a.preview_path, a.original_path, a.file_size, a.created_at
    FROM assets a
    INNER JOIN folders f ON f.id = a.folder_id
    WHERE f.event_id = v_resource_id
      AND f.is_published = true
      AND a.status = 'ready'
      AND (p_folder_id IS NULL OR a.folder_id = p_folder_id)
    ORDER BY a.created_at DESC;
    
  ELSIF v_scope = 'course' THEN
    -- Course scope: assets in folders linked to the course
    RETURN QUERY
    SELECT a.id, a.folder_id, a.filename, a.preview_path, a.original_path, a.file_size, a.created_at
    FROM assets a
    INNER JOIN folders f ON f.id = a.folder_id
    INNER JOIN folder_courses fc ON fc.folder_id = f.id
    WHERE fc.course_id = v_resource_id
      AND f.is_published = true
      AND a.status = 'ready'
      AND (p_folder_id IS NULL OR a.folder_id = p_folder_id)
    ORDER BY a.created_at DESC;
    
  ELSIF v_scope = 'family' THEN
    -- Family scope: only assets tagged with this subject
    RETURN QUERY
    SELECT a.id, a.folder_id, a.filename, a.preview_path, a.original_path, a.file_size, a.created_at
    FROM assets a
    INNER JOIN folders f ON f.id = a.folder_id
    INNER JOIN asset_subjects asub ON asub.asset_id = a.id
    WHERE asub.subject_id = v_resource_id
      AND f.is_published = true
      AND a.status = 'ready'
      AND (p_folder_id IS NULL OR a.folder_id = p_folder_id)
    ORDER BY a.created_at DESC;
  END IF;
END;
$function$;

-- Function 3: Check if token can access specific asset
CREATE OR REPLACE FUNCTION api.can_access_asset(p_token text, p_asset_id uuid)
RETURNS boolean
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $function$
DECLARE
  v_token_id uuid;
  v_scope text;
  v_resource_id uuid;
  v_is_valid boolean;
  v_can_access boolean := false;
BEGIN
  -- Validate token first
  SELECT t.token_id, t.scope, t.resource_id, t.is_valid
  INTO v_token_id, v_scope, v_resource_id, v_is_valid
  FROM validate_access_token(p_token) t;
  
  -- Return false if token invalid
  IF NOT v_is_valid THEN
    RETURN false;
  END IF;
  
  -- Check access based on scope
  IF v_scope = 'event' THEN
    -- Event scope: check if asset belongs to event
    SELECT EXISTS(
      SELECT 1 FROM assets a
      INNER JOIN folders f ON f.id = a.folder_id
      WHERE a.id = p_asset_id 
        AND f.event_id = v_resource_id
        AND f.is_published = true
        AND a.status = 'ready'
    ) INTO v_can_access;
    
  ELSIF v_scope = 'course' THEN
    -- Course scope: check if asset is in course-linked folder
    SELECT EXISTS(
      SELECT 1 FROM assets a
      INNER JOIN folders f ON f.id = a.folder_id
      INNER JOIN folder_courses fc ON fc.folder_id = f.id
      WHERE a.id = p_asset_id 
        AND fc.course_id = v_resource_id
        AND f.is_published = true
        AND a.status = 'ready'
    ) INTO v_can_access;
    
  ELSIF v_scope = 'family' THEN
    -- Family scope: check if asset is tagged with subject
    SELECT EXISTS(
      SELECT 1 FROM assets a
      INNER JOIN folders f ON f.id = a.folder_id
      INNER JOIN asset_subjects asub ON asub.asset_id = a.id
      WHERE a.id = p_asset_id 
        AND asub.subject_id = v_resource_id
        AND f.is_published = true
        AND a.status = 'ready'
    ) INTO v_can_access;
  END IF;
  
  RETURN v_can_access;
END;
$function$;

-- Function 4: Log token access for audit trail
CREATE OR REPLACE FUNCTION api.log_token_access(
  p_token text,
  p_action text,
  p_ip inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_path text DEFAULT NULL,
  p_response_time_ms integer DEFAULT NULL,
  p_ok boolean DEFAULT true,
  p_notes text DEFAULT NULL
)
RETURNS uuid
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $function$
DECLARE
  v_token_id uuid;
  v_log_id uuid;
BEGIN
  -- Get token ID from prefix lookup (faster than full validation)
  SELECT at.id INTO v_token_id
  FROM access_tokens at
  WHERE at.token_prefix = LEFT(p_token, POSITION('_' IN p_token) + 8)
  LIMIT 1;
  
  -- Don't fail if token not found, just log attempt
  IF v_token_id IS NULL THEN
    -- Create anonymous log entry for invalid tokens
    INSERT INTO token_access_logs (
      access_token_id,
      ip,
      user_agent,
      path,
      action,
      ok,
      response_time_ms,
      notes
    ) VALUES (
      '00000000-0000-0000-0000-000000000000'::uuid, -- Special UUID for invalid tokens
      p_ip,
      p_user_agent,
      p_path,
      p_action,
      false, -- Always false for invalid tokens
      p_response_time_ms,
      COALESCE(p_notes, 'Invalid token attempt')
    ) RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
  END IF;
  
  -- Log the access attempt
  INSERT INTO token_access_logs (
    access_token_id,
    ip,
    user_agent,
    path,
    action,
    ok,
    response_time_ms,
    notes
  ) VALUES (
    v_token_id,
    p_ip,
    p_user_agent,
    p_path,
    p_action,
    p_ok,
    p_response_time_ms,
    p_notes
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$function$;

-- Function 5: Get token context information
CREATE OR REPLACE FUNCTION api.get_token_context(p_token text)
RETURNS TABLE (
  scope text,
  resource_id uuid,
  resource_name text,
  access_level text,
  can_download boolean,
  expires_at timestamptz,
  usage_stats jsonb
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $function$
DECLARE
  v_token_id uuid;
  v_scope text;
  v_resource_id uuid;
  v_is_valid boolean;
  v_stats jsonb;
BEGIN
  -- Validate token first
  SELECT t.token_id, t.scope, t.resource_id, t.access_level, t.can_download, t.is_valid
  INTO v_token_id, v_scope, v_resource_id, access_level, can_download, v_is_valid
  FROM validate_access_token(p_token) t;
  
  -- Return empty if token invalid
  IF NOT v_is_valid THEN
    RETURN;
  END IF;
  
  -- Get token details
  SELECT at.expires_at INTO expires_at
  FROM access_tokens at WHERE at.id = v_token_id;
  
  -- Build usage stats
  SELECT jsonb_build_object(
    'totalAccesses', COUNT(*),
    'successfulAccesses', COUNT(*) FILTER (WHERE ok = true),
    'failedAccesses', COUNT(*) FILTER (WHERE ok = false),
    'uniqueIPs', COUNT(DISTINCT ip),
    'firstAccess', MIN(occurred_at),
    'lastAccess', MAX(occurred_at),
    'avgResponseTimeMs', AVG(response_time_ms)
  ) INTO v_stats
  FROM token_access_logs
  WHERE access_token_id = v_token_id;
  
  -- Get resource name based on scope
  scope := v_scope;
  resource_id := v_resource_id;
  usage_stats := v_stats;
  
  IF v_scope = 'event' THEN
    SELECT e.name INTO resource_name FROM events e WHERE e.id = v_resource_id;
  ELSIF v_scope = 'course' THEN
    SELECT c.name INTO resource_name FROM courses c WHERE c.id = v_resource_id;
  ELSIF v_scope = 'family' THEN
    SELECT CONCAT(s.first_name, ' ', s.last_name, 
                 CASE WHEN s.family_name IS NOT NULL THEN ' (' || s.family_name || ')' ELSE '' END)
    INTO resource_name FROM subjects s WHERE s.id = v_resource_id;
  END IF;
  
  RETURN NEXT;
END;
$function$;

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Token validation function (used by all API functions)
CREATE OR REPLACE FUNCTION validate_access_token(p_token_plain text)
RETURNS TABLE (
  token_id uuid,
  scope text,
  resource_id uuid,
  access_level text,
  can_download boolean,
  is_valid boolean,
  reason text
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $function$
DECLARE
  v_token_record access_tokens%ROWTYPE;
  v_computed_hash bytea;
  v_now timestamptz := NOW();
BEGIN
  -- Extract prefix for quick lookup
  SELECT * INTO v_token_record
  FROM access_tokens at
  WHERE at.token_prefix = LEFT(p_token_plain, POSITION('_' IN p_token_plain) + 8);
  
  -- Token not found
  IF NOT FOUND THEN
    token_id := NULL;
    scope := NULL;
    resource_id := NULL;
    access_level := NULL;
    can_download := false;
    is_valid := false;
    reason := 'Token not found';
    RETURN NEXT;
    RETURN;
  END IF;
  
  -- Verify hash
  v_computed_hash := digest(p_token_plain || encode(v_token_record.salt, 'hex'), 'sha256');
  IF v_computed_hash != v_token_record.token_hash THEN
    token_id := v_token_record.id;
    scope := v_token_record.scope;
    resource_id := COALESCE(v_token_record.event_id, v_token_record.course_id, v_token_record.subject_id);
    access_level := v_token_record.access_level;
    can_download := v_token_record.can_download;
    is_valid := false;
    reason := 'Invalid token hash';
    RETURN NEXT;
    RETURN;
  END IF;
  
  -- Check if revoked
  IF v_token_record.revoked_at IS NOT NULL THEN
    token_id := v_token_record.id;
    scope := v_token_record.scope;
    resource_id := COALESCE(v_token_record.event_id, v_token_record.course_id, v_token_record.subject_id);
    access_level := v_token_record.access_level;
    can_download := v_token_record.can_download;
    is_valid := false;
    reason := 'Token revoked';
    RETURN NEXT;
    RETURN;
  END IF;
  
  -- Check if expired
  IF v_token_record.expires_at IS NOT NULL AND v_token_record.expires_at <= v_now THEN
    token_id := v_token_record.id;
    scope := v_token_record.scope;
    resource_id := COALESCE(v_token_record.event_id, v_token_record.course_id, v_token_record.subject_id);
    access_level := v_token_record.access_level;
    can_download := v_token_record.can_download;
    is_valid := false;
    reason := 'Token expired';
    RETURN NEXT;
    RETURN;
  END IF;
  
  -- Check if exhausted (max uses reached)
  IF v_token_record.max_uses IS NOT NULL AND v_token_record.used_count >= v_token_record.max_uses THEN
    token_id := v_token_record.id;
    scope := v_token_record.scope;
    resource_id := COALESCE(v_token_record.event_id, v_token_record.course_id, v_token_record.subject_id);
    access_level := v_token_record.access_level;
    can_download := v_token_record.can_download;
    is_valid := false;
    reason := 'Token exhausted (max uses reached)';
    RETURN NEXT;
    RETURN;
  END IF;
  
  -- Token is valid
  token_id := v_token_record.id;
  scope := v_token_record.scope;
  resource_id := COALESCE(v_token_record.event_id, v_token_record.course_id, v_token_record.subject_id);
  access_level := v_token_record.access_level;
  can_download := v_token_record.can_download;
  is_valid := true;
  reason := 'valid';
  RETURN NEXT;
END;
$function$;

-- Token usage stats helper function
CREATE OR REPLACE FUNCTION get_token_usage_stats(p_token_id uuid)
RETURNS TABLE (
  total_accesses bigint,
  successful_accesses bigint,
  failed_accesses bigint,
  unique_ips bigint,
  first_access timestamptz,
  last_access timestamptz,
  avg_response_time_ms numeric
)
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
AS $function$
  SELECT 
    COUNT(*) as total_accesses,
    COUNT(*) FILTER (WHERE ok = true) as successful_accesses,
    COUNT(*) FILTER (WHERE ok = false) as failed_accesses,
    COUNT(DISTINCT ip) as unique_ips,
    MIN(occurred_at) as first_access,
    MAX(occurred_at) as last_access,
    AVG(response_time_ms) as avg_response_time_ms
  FROM token_access_logs
  WHERE access_token_id = p_token_id;
$function$;

-- Cleanup expired tokens (maintenance function)
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS TABLE (
  cleaned_tokens integer,
  cleaned_logs integer
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $function$
DECLARE
  v_cleaned_tokens integer;
  v_cleaned_logs integer;
  v_expired_token_ids uuid[];
BEGIN
  -- Get IDs of expired tokens
  SELECT ARRAY_AGG(id) INTO v_expired_token_ids
  FROM access_tokens
  WHERE (expires_at IS NOT NULL AND expires_at <= NOW() - INTERVAL '7 days')
     OR (revoked_at IS NOT NULL AND revoked_at <= NOW() - INTERVAL '30 days');
  
  -- Clean up logs for expired tokens
  DELETE FROM token_access_logs
  WHERE access_token_id = ANY(v_expired_token_ids);
  
  GET DIAGNOSTICS v_cleaned_logs = ROW_COUNT;
  
  -- Clean up expired tokens
  DELETE FROM access_tokens
  WHERE id = ANY(v_expired_token_ids);
  
  GET DIAGNOSTICS v_cleaned_tokens = ROW_COUNT;
  
  cleaned_tokens := v_cleaned_tokens;
  cleaned_logs := v_cleaned_logs;
  RETURN NEXT;
END;
$function$;

-- Helper functions for course management
CREATE OR REPLACE FUNCTION get_event_courses(p_event_id uuid)
RETURNS TABLE (
  course_id uuid,
  course_name text,
  member_count bigint,
  folder_count bigint,
  created_at timestamptz,
  updated_at timestamptz
)
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
AS $function$
  SELECT 
    c.id as course_id,
    c.name as course_name,
    COALESCE(member_counts.member_count, 0) as member_count,
    COALESCE(folder_counts.folder_count, 0) as folder_count,
    c.created_at,
    c.updated_at
  FROM courses c
  LEFT JOIN (
    SELECT course_id, COUNT(*) as member_count
    FROM course_members
    GROUP BY course_id
  ) member_counts ON member_counts.course_id = c.id
  LEFT JOIN (
    SELECT course_id, COUNT(*) as folder_count
    FROM folder_courses
    GROUP BY course_id
  ) folder_counts ON folder_counts.course_id = c.id
  WHERE c.event_id = p_event_id
  ORDER BY c.name;
$function$;

CREATE OR REPLACE FUNCTION get_course_families(p_course_id uuid)
RETURNS TABLE (
  subject_id uuid,
  first_name text,
  last_name text,
  family_name text,
  photo_count bigint
)
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
AS $function$
  SELECT 
    s.id as subject_id,
    s.first_name,
    s.last_name,
    s.family_name,
    COALESCE(photo_counts.photo_count, 0) as photo_count
  FROM course_members cm
  INNER JOIN subjects s ON s.id = cm.subject_id
  LEFT JOIN (
    SELECT asub.subject_id, COUNT(*) as photo_count
    FROM asset_subjects asub
    INNER JOIN assets a ON a.id = asub.asset_id
    WHERE a.status = 'ready'
    GROUP BY asub.subject_id
  ) photo_counts ON photo_counts.subject_id = s.id
  WHERE cm.course_id = p_course_id
  ORDER BY s.last_name, s.first_name;
$function$;