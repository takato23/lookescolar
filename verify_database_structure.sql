-- ============================================================
-- VERIFICACIÓN COMPLETA DE LA ESTRUCTURA DE BASE DE DATOS
-- Ejecutar en Supabase para entender el estado actual
-- ============================================================

-- 1. Verificar tablas existentes
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('events', 'folders', 'assets', 'photos')
ORDER BY table_name;

-- 2. Verificar estructura de la tabla events
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'events' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Verificar estructura de la tabla folders
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'folders' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Verificar estructura de la tabla assets
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'assets' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. Verificar que nuestras funciones se crearon correctamente
SELECT 
  routine_name,
  routine_type,
  external_language
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('generate_store_token', 'publish_store', 'get_store_data', 'unpublish_store')
ORDER BY routine_name;

-- 6. Verificar que la vista se creó
SELECT 
  v.table_name,
  'VIEW' as table_type
FROM information_schema.views v
WHERE v.table_schema = 'public' 
  AND v.table_name = 'published_stores';

-- 7. Verificar constraint único en share_token
SELECT 
  constraint_name,
  constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'folders' 
  AND constraint_name LIKE '%share_token%';

-- 8. Contar datos existentes (para saber si hay contenido)
SELECT 
  'events' as tabla, COUNT(*) as cantidad FROM events
UNION ALL
SELECT 
  'folders' as tabla, COUNT(*) as cantidad FROM folders
UNION ALL
SELECT 
  'assets' as tabla, COUNT(*) as cantidad FROM assets;

-- 9. Verificar si hay carpetas con tokens existentes
SELECT 
  COUNT(*) as folders_with_tokens
FROM folders 
WHERE share_token IS NOT NULL;

-- 10. Probar función de generar token
SELECT generate_store_token() as token_generado;
