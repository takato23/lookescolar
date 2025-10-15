-- VERIFICACIÓN FINAL - CONFIRMAR QUE TODO ESTÁ LISTO

-- 1. Verificar tabla y columnas
SELECT
  'store_settings table' as check,
  CASE WHEN EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'store_settings'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

SELECT
  'event_id column' as check,
  CASE WHEN EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'store_settings' AND column_name = 'event_id'
  ) THEN '✅ PRESENT' ELSE '❌ MISSING' END as status;

-- 2. Verificar permisos
SELECT
  'service_role permissions' as check,
  CASE WHEN EXISTS (
    SELECT FROM information_schema.role_table_grants
    WHERE table_name = 'store_settings' AND grantee = 'service_role'
  ) THEN '✅ GRANTED' ELSE '❌ MISSING' END as status;

-- 3. Mostrar estructura completa
SELECT
  column_name as "Column",
  data_type as "Type",
  is_nullable as "Nullable",
  column_default as "Default"
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'store_settings'
ORDER BY ordinal_position;

-- 4. Verificar índices
SELECT
  indexname as "Index",
  indexdef as "Definition"
FROM pg_indexes
WHERE tablename = 'store_settings';

-- 5. Verificar constraints
SELECT
  constraint_name as "Constraint",
  constraint_type as "Type"
FROM information_schema.table_constraints
WHERE table_name = 'store_settings';
