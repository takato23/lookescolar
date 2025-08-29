-- CREAR TOKENS DE PRUEBA MANUALMENTE - Ejecutar en Supabase SQL Editor

-- 1. Verificar/crear datos de prueba básicos
INSERT INTO events (id, name, description, location, date, status) 
VALUES ('11111111-1111-1111-1111-111111111111', 'Smoke Test Event', 'Evento para pruebas', 'Test Location', CURRENT_DATE, 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO subjects (id, event_id, name, access_token) 
VALUES ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Test Course', 'TEST_COURSE_TOKEN')
ON CONFLICT (id) DO NOTHING;

-- 2. Crear tokens de prueba usando la función api.create_access_token
-- (Si esta función no existe, crear directamente en la tabla access_tokens)

-- Token EVENT (E_*) - can_download=false
SELECT api.create_access_token(
  'event'::text,
  '11111111-1111-1111-1111-111111111111'::uuid,
  NULL::uuid,
  NULL::uuid,
  'full'::text,
  false::boolean,
  (CURRENT_TIMESTAMP + INTERVAL '24 hours')::timestamptz,
  '00000000-0000-0000-0000-000000000000'::uuid
);

-- Token COURSE (C_*) - can_download=true  
SELECT api.create_access_token(
  'course'::text,
  '11111111-1111-1111-1111-111111111111'::uuid,
  '22222222-2222-2222-2222-222222222222'::uuid,
  NULL::uuid,
  'read_only'::text,
  true::boolean,
  (CURRENT_TIMESTAMP + INTERVAL '24 hours')::timestamptz,
  '00000000-0000-0000-0000-000000000000'::uuid
);

-- Token FAMILY (F_*) - can_download=false
SELECT api.create_access_token(
  'family'::text,
  '11111111-1111-1111-1111-111111111111'::uuid,
  '22222222-2222-2222-2222-222222222222'::uuid,
  '33333333-3333-3333-3333-333333333333'::uuid,
  'read_only'::text,
  false::boolean,
  (CURRENT_TIMESTAMP + INTERVAL '24 hours')::timestamptz,
  '00000000-0000-0000-0000-000000000000'::uuid
);

-- 3. Mostrar los tokens generados
SELECT 
  scope,
  CONCAT(
    CASE 
      WHEN scope = 'event' THEN 'E_'
      WHEN scope = 'course' THEN 'C_'  
      WHEN scope = 'family' THEN 'F_'
    END,
    encode(sha256((token_hash || token_salt)::bytea), 'hex')
  ) as full_token,
  can_download,
  expires_at
FROM access_tokens 
WHERE event_id = '11111111-1111-1111-1111-111111111111'
ORDER BY created_at DESC
LIMIT 3;

-- 4. URLs de prueba (reemplazar <SITE_URL> con tu dominio)
-- EVENT: <SITE_URL>/s/E_<hash>
-- COURSE: <SITE_URL>/s/C_<hash>  
-- FAMILY: <SITE_URL>/s/F_<hash>

-- 5. Crear un asset de prueba para testing
INSERT INTO assets (id, event_id, filename, file_path, preview_path, file_size, mime_type)
VALUES ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'test.jpg', 'test/test.jpg', 'previews/test.jpg', 1024000, 'image/jpeg')
ON CONFLICT (id) DO NOTHING;

-- AssetId para pruebas: 44444444-4444-4444-4444-444444444444