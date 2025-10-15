-- PASOS PARA VERIFICAR QUE EL PROBLEMA ESTÁ RESUELTO

-- 1. Verificar que la tabla existe
SELECT
  'Tabla store_settings' as verificacion,
  CASE WHEN EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'store_settings'
  ) THEN '✅ EXISTE' ELSE '❌ NO EXISTE' END as resultado;

-- 2. Verificar que tiene la columna event_id
SELECT
  'Columna event_id' as verificacion,
  CASE WHEN EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'store_settings' AND column_name = 'event_id'
  ) THEN '✅ PRESENTE' ELSE '❌ FALTANTE' END as resultado;

-- 3. Verificar permisos
SELECT
  'Permisos service_role' as verificacion,
  CASE WHEN EXISTS (
    SELECT FROM information_schema.role_table_grants
    WHERE table_name = 'store_settings' AND grantee = 'service_role' AND privilege_type = 'SELECT'
  ) THEN '✅ CONFIGURADOS' ELSE '❌ FALTANTES' END as resultado;

-- 4. Contar registros existentes
SELECT
  'Registros en store_settings' as verificacion,
  COUNT(*) as cantidad
FROM store_settings;

-- 5. Mostrar estructura de la tabla
SELECT
  column_name as columna,
  data_type as tipo,
  is_nullable as nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'store_settings'
ORDER BY ordinal_position;
