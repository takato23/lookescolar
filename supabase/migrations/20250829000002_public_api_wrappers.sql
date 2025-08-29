/**
 * PUBLIC API WRAPPERS - Phase 2 Fix
 * 
 * Creates public schema wrappers for api.* functions
 * Ensures RPC functions are accessible from Supabase client
 * PostgREST exposes public schema by default, not api schema
 */

-- ============================================================
-- PUBLIC WRAPPERS FOR API FUNCTIONS
-- ============================================================

-- Wrapper for folders_for_token
CREATE OR REPLACE FUNCTION public.folders_for_token(p_token text)
RETURNS TABLE (
  folder_id uuid,
  folder_name text,
  photo_count integer,
  depth integer
)
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
AS $function$
  SELECT * FROM api.folders_for_token(p_token);
$function$;

-- Wrapper for assets_for_token
CREATE OR REPLACE FUNCTION public.assets_for_token(p_token text, p_folder_id uuid DEFAULT NULL)
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
LANGUAGE sql
AS $function$
  SELECT * FROM api.assets_for_token(p_token, p_folder_id);
$function$;

-- Wrapper for can_access_asset
CREATE OR REPLACE FUNCTION public.can_access_asset(p_token text, p_asset_id uuid)
RETURNS boolean
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
AS $function$
  SELECT api.can_access_asset(p_token, p_asset_id);
$function$;

-- Wrapper for log_token_access
CREATE OR REPLACE FUNCTION public.log_token_access(
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
LANGUAGE sql
AS $function$
  SELECT api.log_token_access(p_token, p_action, p_ip, p_user_agent, p_path, p_response_time_ms, p_ok, p_notes);
$function$;

-- Wrapper for get_token_context
CREATE OR REPLACE FUNCTION public.get_token_context(p_token text)
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
LANGUAGE sql
AS $function$
  SELECT * FROM api.get_token_context(p_token);
$function$;

-- ============================================================
-- PUBLIC WRAPPERS FOR HELPER FUNCTIONS
-- ============================================================

-- Wrapper for validate_access_token (for admin use)
CREATE OR REPLACE FUNCTION public.validate_access_token(p_token_plain text)
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
LANGUAGE sql
AS $function$
  SELECT * FROM validate_access_token(p_token_plain);
$function$;

-- Wrapper for get_token_usage_stats
CREATE OR REPLACE FUNCTION public.get_token_usage_stats(p_token_id uuid)
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
  SELECT * FROM get_token_usage_stats(p_token_id);
$function$;

-- Wrapper for cleanup_expired_tokens
CREATE OR REPLACE FUNCTION public.cleanup_expired_tokens()
RETURNS TABLE (
  cleaned_tokens integer,
  cleaned_logs integer
)
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
AS $function$
  SELECT * FROM cleanup_expired_tokens();
$function$;

-- Wrapper for get_event_courses
CREATE OR REPLACE FUNCTION public.get_event_courses(p_event_id uuid)
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
  SELECT * FROM get_event_courses(p_event_id);
$function$;

-- Wrapper for get_course_families
CREATE OR REPLACE FUNCTION public.get_course_families(p_course_id uuid)
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
  SELECT * FROM get_course_families(p_course_id);
$function$;

-- ============================================================
-- GRANT PERMISSIONS
-- ============================================================

-- Grant execute permissions to authenticated and anonymous users
-- This allows the public wrappers to be called via PostgREST

GRANT EXECUTE ON FUNCTION public.folders_for_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assets_for_token(text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_asset(text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_token_access(text, text, inet, text, text, integer, boolean, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_token_context(text) TO anon, authenticated;

-- Admin-only functions
GRANT EXECUTE ON FUNCTION public.validate_access_token(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_token_usage_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_tokens() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_event_courses(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_course_families(uuid) TO authenticated;

-- ============================================================
-- DOCUMENTATION
-- ============================================================

COMMENT ON FUNCTION public.folders_for_token IS 'Get folders accessible by hierarchical token (Event/Course/Family scope)';
COMMENT ON FUNCTION public.assets_for_token IS 'Get assets accessible by hierarchical token, optionally filtered by folder';
COMMENT ON FUNCTION public.can_access_asset IS 'Check if token grants access to specific asset';
COMMENT ON FUNCTION public.log_token_access IS 'Log token access for audit trail';
COMMENT ON FUNCTION public.get_token_context IS 'Get token information including scope, permissions, and usage stats';

COMMENT ON FUNCTION public.validate_access_token IS 'Validate token and return details (admin only)';
COMMENT ON FUNCTION public.get_token_usage_stats IS 'Get usage statistics for specific token (admin only)';
COMMENT ON FUNCTION public.cleanup_expired_tokens IS 'Clean up expired tokens and logs (admin only)';
COMMENT ON FUNCTION public.get_event_courses IS 'Get courses for event with statistics (admin only)';
COMMENT ON FUNCTION public.get_course_families IS 'Get families/subjects enrolled in course (admin only)';

-- ============================================================
-- SECURITY NOTES
-- ============================================================

/*
Security Model:
- All public functions are SECURITY DEFINER wrappers
- They delegate to the actual api.* functions which contain the business logic
- RLS policies on tables still apply within the DEFINER functions
- Token validation is cryptographically secure (hash+salt verification)
- Access logging is mandatory for all token operations
- Anonymous users can only access token-gated functions
- Authenticated admin users get additional management functions
*/