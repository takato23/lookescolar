-- SETUP COMPLETO DEL SISTEMA DE TOKENS - Ejecutar en Supabase SQL Editor

-- PASO 1: Crear esquema API si no existe
CREATE SCHEMA IF NOT EXISTS api;

-- PASO 2: Crear tabla access_tokens si no existe
CREATE TABLE IF NOT EXISTS public.access_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scope TEXT NOT NULL CHECK (scope IN ('event', 'course', 'family')),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    course_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    token_prefix TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    token_salt TEXT NOT NULL,
    access_level TEXT NOT NULL DEFAULT 'read_only' CHECK (access_level IN ('full', 'read_only')),
    can_download BOOLEAN NOT NULL DEFAULT false,
    max_uses INTEGER,
    used_count INTEGER NOT NULL DEFAULT 0,
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    CONSTRAINT valid_scope_resources CHECK (
        (scope = 'event' AND event_id IS NOT NULL AND course_id IS NULL AND subject_id IS NULL) OR
        (scope = 'course' AND event_id IS NOT NULL AND course_id IS NOT NULL AND subject_id IS NULL) OR
        (scope = 'family' AND event_id IS NOT NULL AND course_id IS NOT NULL AND subject_id IS NOT NULL)
    )
);

-- PASO 3: Crear tabla de logs si no existe
CREATE TABLE IF NOT EXISTS public.token_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    access_token_id UUID REFERENCES access_tokens(id) ON DELETE CASCADE,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip TEXT,
    user_agent TEXT,
    path TEXT,
    action TEXT NOT NULL CHECK (action IN ('list_folders', 'list_assets', 'view', 'download')),
    ok BOOLEAN NOT NULL,
    response_time_ms INTEGER,
    notes TEXT
);

-- PASO 4: Crear función api.create_access_token
CREATE OR REPLACE FUNCTION api.create_access_token(
    p_scope text,
    p_event_id uuid,
    p_course_id uuid DEFAULT NULL,
    p_subject_id uuid DEFAULT NULL,
    p_access_level text DEFAULT 'read_only',
    p_can_download boolean DEFAULT false,
    p_expires_at timestamptz DEFAULT NULL,
    p_created_by uuid DEFAULT '00000000-0000-0000-0000-000000000000'::uuid
) RETURNS text
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $function$
DECLARE
    v_token_id uuid;
    v_token_hash text;
    v_token_salt text;
    v_token_prefix text;
    v_full_token text;
BEGIN
    -- Generar ID y componentes del token
    v_token_id := gen_random_uuid();
    v_token_salt := encode(gen_random_bytes(32), 'hex');
    v_token_hash := encode(sha256((v_token_id::text || v_token_salt)::bytea), 'hex');
    
    -- Generar prefijo según scope
    v_token_prefix := CASE p_scope
        WHEN 'event' THEN 'E_'
        WHEN 'course' THEN 'C_' 
        WHEN 'family' THEN 'F_'
        ELSE 'T_'
    END;
    
    -- Token completo
    v_full_token := v_token_prefix || v_token_hash;
    
    -- Insertar en la tabla
    INSERT INTO access_tokens (
        id, scope, event_id, course_id, subject_id,
        token_prefix, token_hash, token_salt,
        access_level, can_download, expires_at, created_by
    ) VALUES (
        v_token_id, p_scope, p_event_id, p_course_id, p_subject_id,
        v_token_prefix, v_token_hash, v_token_salt,
        p_access_level, p_can_download, p_expires_at, p_created_by
    );
    
    RETURN v_full_token;
END;
$function$;

-- PASO 5: Crear funciones públicas wrapper
CREATE OR REPLACE FUNCTION public.folders_for_token(p_token text)
RETURNS TABLE (folder_id uuid, folder_name text, photo_count integer, depth integer)
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
AS $function$
  -- Placeholder: retornar datos dummy para testing
  SELECT 
    gen_random_uuid() as folder_id,
    'Test Folder' as folder_name,
    5 as photo_count,
    1 as depth
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.assets_for_token(p_token text)
RETURNS TABLE (asset_id uuid, filename text, file_path text, preview_path text, folder_id uuid, created_at timestamptz)
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
AS $function$
  -- Placeholder: retornar datos dummy para testing
  SELECT 
    '44444444-4444-4444-4444-444444444444'::uuid as asset_id,
    'test.jpg' as filename,
    'test/test.jpg' as file_path,
    'previews/test.jpg' as preview_path,
    gen_random_uuid() as folder_id,
    NOW() as created_at
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.get_token_context(p_token text)
RETURNS TABLE (scope text, resource_id uuid, resource_name text, access_level text, can_download boolean, is_valid boolean)
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
AS $function$
  -- Buscar token en la tabla
  SELECT 
    t.scope,
    COALESCE(t.event_id, t.course_id, t.subject_id) as resource_id,
    'Test Resource' as resource_name,
    t.access_level,
    t.can_download,
    (t.revoked_at IS NULL AND (t.expires_at IS NULL OR t.expires_at > NOW())) as is_valid
  FROM access_tokens t
  WHERE t.token_prefix || t.token_hash = p_token
  LIMIT 1;
$function$;

-- PASO 6: Crear datos de prueba
INSERT INTO events (id, name, description, location, date, status) 
VALUES ('11111111-1111-1111-1111-111111111111', 'Smoke Test Event', 'Evento para pruebas', 'Test Location', CURRENT_DATE, 'active')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO subjects (id, event_id, name, access_token) 
VALUES ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Test Course', 'TEST_COURSE_TOKEN')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO assets (id, event_id, filename, file_path, preview_path, file_size, mime_type)
VALUES ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'test.jpg', 'test/test.jpg', 'previews/test.jpg', 1024000, 'image/jpeg')
ON CONFLICT (id) DO UPDATE SET filename = EXCLUDED.filename;

-- PASO 7: Crear tokens de prueba
SELECT 'EVENT TOKEN: ' || api.create_access_token(
  'event',
  '11111111-1111-1111-1111-111111111111'::uuid,
  NULL::uuid,
  NULL::uuid,
  'full',
  false,
  (CURRENT_TIMESTAMP + INTERVAL '24 hours')::timestamptz
) as event_token;

SELECT 'COURSE TOKEN: ' || api.create_access_token(
  'course',
  '11111111-1111-1111-1111-111111111111'::uuid,
  '22222222-2222-2222-2222-222222222222'::uuid,
  NULL::uuid,
  'read_only',
  true,
  (CURRENT_TIMESTAMP + INTERVAL '24 hours')::timestamptz
) as course_token;

SELECT 'FAMILY TOKEN: ' || api.create_access_token(
  'family',
  '11111111-1111-1111-1111-111111111111'::uuid,
  '22222222-2222-2222-2222-222222222222'::uuid,
  '22222222-2222-2222-2222-222222222222'::uuid,
  'read_only',
  false,
  (CURRENT_TIMESTAMP + INTERVAL '24 hours')::timestamptz
) as family_token;

-- PASO 8: Aplicar permisos de seguridad
REVOKE ALL ON FUNCTION public.folders_for_token(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.assets_for_token(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_token_context(text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.folders_for_token(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.assets_for_token(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_token_context(text) TO service_role;

-- PASO 9: Verificar permisos finales
SELECT routine_name, grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema='public'
  AND routine_name IN ('folders_for_token','assets_for_token','get_token_context')
ORDER BY routine_name, grantee;