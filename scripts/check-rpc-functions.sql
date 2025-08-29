-- VERIFICAR FUNCIONES RPC - Ejecutar en Supabase SQL Editor

-- 1. Verificar si las funciones públicas existen
SELECT 
  routine_name,
  routine_schema,
  routine_type,
  is_updatable
FROM information_schema.routines 
WHERE routine_schema IN ('public', 'api')
  AND routine_name IN ('folders_for_token', 'assets_for_token', 'get_token_context')
ORDER BY routine_schema, routine_name;

-- 2. Verificar permisos actuales
SELECT 
  routine_name, 
  routine_schema,
  grantee, 
  privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema IN ('public', 'api')
  AND routine_name IN ('folders_for_token', 'assets_for_token', 'get_token_context')
ORDER BY routine_name, grantee;

-- 3. Si las funciones no existen en public, crearlas manualmente:
-- (Solo ejecutar si el SELECT anterior muestra que no existen en public)

/*
CREATE OR REPLACE FUNCTION public.folders_for_token(p_token text)
RETURNS TABLE (folder_id uuid, folder_name text, photo_count integer, depth integer)
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
AS $function$
  SELECT * FROM api.folders_for_token(p_token);
$function$;

CREATE OR REPLACE FUNCTION public.assets_for_token(p_token text)
RETURNS TABLE (asset_id uuid, filename text, file_path text, preview_path text, folder_id uuid, created_at timestamptz)
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
AS $function$
  SELECT * FROM api.assets_for_token(p_token);
$function$;

CREATE OR REPLACE FUNCTION public.get_token_context(p_token text)
RETURNS TABLE (scope text, resource_id uuid, resource_name text, access_level text, can_download boolean, is_valid boolean)
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
AS $function$
  SELECT * FROM api.get_token_context(p_token);
$function$;
*/