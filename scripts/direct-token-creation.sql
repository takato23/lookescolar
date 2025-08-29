-- PLAN B: CREACIÓN DIRECTA DE TOKENS - Sin dependencias

-- Crear tabla access_tokens básica
CREATE TABLE IF NOT EXISTS public.access_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scope TEXT NOT NULL,
    event_id UUID,
    course_id UUID, 
    subject_id UUID,
    token_prefix TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    token_salt TEXT NOT NULL,
    access_level TEXT NOT NULL DEFAULT 'read_only',
    can_download BOOLEAN NOT NULL DEFAULT false,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'
);

-- Insertar tokens directamente
INSERT INTO access_tokens (id, scope, token_prefix, token_hash, token_salt, access_level, can_download, expires_at) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'event', 'E_', 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890', 'salt123', 'full', false, CURRENT_TIMESTAMP + INTERVAL '24 hours'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'course', 'C_', 'fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321', 'salt456', 'read_only', true, CURRENT_TIMESTAMP + INTERVAL '24 hours'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'family', 'F_', '123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0', 'salt789', 'read_only', false, CURRENT_TIMESTAMP + INTERVAL '24 hours')
ON CONFLICT (id) DO UPDATE SET token_hash = EXCLUDED.token_hash;

-- Función básica de validación
CREATE OR REPLACE FUNCTION public.get_token_context(p_token text)
RETURNS TABLE (scope text, resource_id uuid, resource_name text, access_level text, can_download boolean, is_valid boolean)
SECURITY DEFINER
LANGUAGE sql
AS $function$
  SELECT 
    t.scope,
    t.id as resource_id,
    'Test Resource' as resource_name,
    t.access_level,
    t.can_download,
    (t.expires_at > NOW()) as is_valid
  FROM access_tokens t
  WHERE t.token_prefix || t.token_hash = p_token;
$function$;

-- Revocar permisos
REVOKE ALL ON FUNCTION public.get_token_context(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_token_context(text) TO service_role;

-- Mostrar tokens creados
SELECT 
  'TOKEN DIRECTO: ' || token_prefix || token_hash as full_token,
  scope,
  can_download
FROM access_tokens 
WHERE id IN ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'cccccccc-cccc-cccc-cccc-cccccccccccc');