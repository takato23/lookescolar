-- SETUP MÍNIMO DEL SISTEMA DE TOKENS - Ejecutar en Supabase SQL Editor

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

-- PASO 3: Crear función api.create_access_token
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

-- PASO 4: Crear funciones públicas wrapper (dummy para testing)
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

-- PASO 5: Usar evento y curso existentes (evitar crear nuevos)
-- Obtener el primer evento disponible
DO $$
DECLARE
    v_event_id uuid;
    v_subject_id uuid;
    v_event_token text;
    v_course_token text;
    v_family_token text;
BEGIN
    -- Obtener primer evento
    SELECT id INTO v_event_id FROM events WHERE status IN ('active', 'published') LIMIT 1;
    
    IF v_event_id IS NULL THEN
        RAISE NOTICE 'No hay eventos disponibles. Creando evento de prueba...';
        INSERT INTO events (id, name, description, location, date, status) 
        VALUES ('11111111-1111-1111-1111-111111111111', 'Smoke Test Event', 'Evento para pruebas', 'Test Location', CURRENT_DATE, 'active');
        v_event_id := '11111111-1111-1111-1111-111111111111';
    END IF;
    
    -- Obtener primer subject
    SELECT id INTO v_subject_id FROM subjects LIMIT 1;
    
    IF v_subject_id IS NULL THEN
        RAISE NOTICE 'No hay subjects disponibles. Creando subject de prueba...';
        -- Generar token válido para subjects (debe cumplir constraint de longitud)
        INSERT INTO subjects (id, event_id, name, access_token) 
        VALUES (
            '22222222-2222-2222-2222-222222222222', 
            v_event_id, 
            'Test Course', 
            'TEST_' || encode(gen_random_bytes(16), 'hex') -- Token de 36 caracteres
        );
        v_subject_id := '22222222-2222-2222-2222-222222222222';
    END IF;
    
    -- Crear tokens de prueba
    v_event_token := api.create_access_token('event', v_event_id, NULL, NULL, 'full', false, (CURRENT_TIMESTAMP + INTERVAL '24 hours')::timestamptz);
    
    v_course_token := api.create_access_token('course', v_event_id, v_subject_id, NULL, 'read_only', true, (CURRENT_TIMESTAMP + INTERVAL '24 hours')::timestamptz);
    
    v_family_token := api.create_access_token('family', v_event_id, v_subject_id, v_subject_id, 'read_only', false, (CURRENT_TIMESTAMP + INTERVAL '24 hours')::timestamptz);
    
    -- Mostrar resultados
    RAISE NOTICE 'EVENT TOKEN: %', v_event_token;
    RAISE NOTICE 'COURSE TOKEN: %', v_course_token;
    RAISE NOTICE 'FAMILY TOKEN: %', v_family_token;
    RAISE NOTICE 'ASSET ID: 44444444-4444-4444-4444-444444444444';
    RAISE NOTICE 'EVENT ID: %', v_event_id;
    RAISE NOTICE 'SUBJECT ID: %', v_subject_id;
END $$;

-- PASO 6: Crear asset de prueba
INSERT INTO assets (id, filename, file_path, preview_path, file_size, mime_type)
VALUES ('44444444-4444-4444-4444-444444444444', 'test.jpg', 'test/test.jpg', 'previews/test.jpg', 1024000, 'image/jpeg')
ON CONFLICT (id) DO UPDATE SET filename = EXCLUDED.filename;

-- PASO 7: Aplicar permisos de seguridad
REVOKE ALL ON FUNCTION public.get_token_context(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_token_context(text) TO service_role;

-- PASO 8: Mostrar tokens creados
SELECT 
    scope || ' TOKEN: ' || token_prefix || token_hash as full_token,
    can_download,
    expires_at
FROM access_tokens 
WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '1 minute'
ORDER BY created_at DESC;

RAISE NOTICE 'SETUP COMPLETO! Use los tokens mostrados arriba para testing.';