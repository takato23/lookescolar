-- Database Schema Verification Script
-- Run this after applying migrations 010 and 011 to verify everything is correct

\echo '=== LOOKESCOLAR DATABASE SCHEMA VERIFICATION ==='

-- 1. Check all required tables exist
\echo '\n1. CHECKING REQUIRED TABLES...'
SELECT 
  'events' as table_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events') 
       THEN '✓ EXISTS' ELSE '✗ MISSING' END as status
UNION ALL
SELECT 'subjects', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subjects') THEN '✓ EXISTS' ELSE '✗ MISSING' END
UNION ALL
SELECT 'subject_tokens', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subject_tokens') THEN '✓ EXISTS' ELSE '✗ MISSING' END
UNION ALL
SELECT 'photos', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'photos') THEN '✓ EXISTS' ELSE '✗ MISSING' END
UNION ALL
SELECT 'photo_subjects', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'photo_subjects') THEN '✓ EXISTS' ELSE '✗ MISSING' END
UNION ALL
SELECT 'orders', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders') THEN '✓ EXISTS' ELSE '✗ MISSING' END
UNION ALL
SELECT 'order_items', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_items') THEN '✓ EXISTS' ELSE '✗ MISSING' END
UNION ALL
SELECT 'payments', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN '✓ EXISTS' ELSE '✗ MISSING' END
UNION ALL
SELECT 'price_lists', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'price_lists') THEN '✓ EXISTS' ELSE '✗ MISSING' END
UNION ALL
SELECT 'price_list_items', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'price_list_items') THEN '✓ EXISTS' ELSE '✗ MISSING' END
UNION ALL
SELECT 'egress_metrics', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'egress_metrics') THEN '✓ EXISTS' ELSE '✗ MISSING' END;

-- 2. Check critical columns in events table
\echo '\n2. CHECKING EVENTS TABLE STRUCTURE...'
SELECT 
  column_name,
  data_type,
  is_nullable,
  CASE 
    WHEN column_name = 'school' AND data_type = 'text' AND is_nullable = 'NO' THEN '✓ CORRECT'
    WHEN column_name = 'active' AND data_type = 'boolean' THEN '✓ CORRECT'
    WHEN column_name IN ('id', 'name', 'date', 'created_at', 'updated_at') THEN '✓ OK'
    ELSE '⚠ CHECK'
  END as status
FROM information_schema.columns 
WHERE table_name = 'events' 
ORDER BY ordinal_position;

-- 3. Check subjects table structure
\echo '\n3. CHECKING SUBJECTS TABLE STRUCTURE...'
SELECT 
  column_name,
  data_type,
  CASE 
    WHEN column_name = 'type' AND data_type = 'USER-DEFINED' THEN '✓ ENUM TYPE'
    WHEN column_name = 'first_name' AND is_nullable = 'NO' THEN '✓ REQUIRED'
    WHEN column_name IN ('last_name', 'couple_first_name', 'couple_last_name', 'family_name') THEN '✓ OPTIONAL'
    WHEN column_name IN ('id', 'event_id', 'created_at') THEN '✓ STANDARD'
    ELSE '⚠ CHECK'
  END as status
FROM information_schema.columns 
WHERE table_name = 'subjects' 
ORDER BY ordinal_position;

-- 4. Verify foreign key relationships
\echo '\n4. CHECKING FOREIGN KEY RELATIONSHIPS...'
SELECT 
  tc.table_name || '.' || kcu.column_name as source,
  '→',
  ccu.table_name || '.' || ccu.column_name as target,
  CASE 
    WHEN tc.table_name = 'subjects' AND kcu.column_name = 'event_id' AND ccu.table_name = 'events' THEN '✓ CRITICAL'
    WHEN tc.table_name = 'subject_tokens' AND kcu.column_name = 'subject_id' AND ccu.table_name = 'subjects' THEN '✓ CRITICAL'
    WHEN tc.table_name = 'photos' AND kcu.column_name = 'event_id' AND ccu.table_name = 'events' THEN '✓ CRITICAL'
    WHEN tc.table_name = 'photo_subjects' AND kcu.column_name = 'photo_id' AND ccu.table_name = 'photos' THEN '✓ CRITICAL'
    WHEN tc.table_name = 'photo_subjects' AND kcu.column_name = 'subject_id' AND ccu.table_name = 'subjects' THEN '✓ CRITICAL'
    WHEN tc.table_name = 'orders' AND kcu.column_name = 'subject_id' AND ccu.table_name = 'subjects' THEN '✓ CRITICAL'
    WHEN tc.table_name = 'order_items' AND kcu.column_name = 'order_id' AND ccu.table_name = 'orders' THEN '✓ CRITICAL'
    WHEN tc.table_name = 'order_items' AND kcu.column_name = 'price_list_item_id' AND ccu.table_name = 'price_list_items' THEN '✓ CRITICAL'
    WHEN tc.table_name = 'payments' AND kcu.column_name = 'order_id' AND ccu.table_name = 'orders' THEN '✓ CRITICAL'
    ELSE '✓ OK'
  END as importance
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- 5. Check RLS is enabled on all tables
\echo '\n5. CHECKING ROW LEVEL SECURITY...'
SELECT 
  tablename,
  CASE 
    WHEN rowsecurity = true THEN '✓ ENABLED'
    ELSE '✗ DISABLED'
  END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'events', 'subjects', 'subject_tokens', 'photos', 'photo_subjects',
    'orders', 'order_items', 'payments', 'price_lists', 'price_list_items',
    'egress_metrics'
  )
ORDER BY tablename;

-- 6. Check important indexes exist
\echo '\n6. CHECKING CRITICAL INDEXES...'
SELECT 
  schemaname,
  tablename,
  indexname,
  CASE 
    WHEN indexname LIKE '%_pkey' THEN '✓ PRIMARY KEY'
    WHEN indexname LIKE 'idx_%' THEN '✓ PERFORMANCE'
    WHEN indexname LIKE '%_key' THEN '✓ UNIQUE'
    ELSE '✓ INDEX'
  END as type
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename IN (
    'events', 'subjects', 'subject_tokens', 'photos', 'photo_subjects',
    'orders', 'order_items', 'payments', 'price_lists', 'price_list_items'
  )
ORDER BY tablename, indexname;

-- 7. Check for any remaining conflicting columns
\echo '\n7. CHECKING FOR CONFLICTING COLUMNS...'
SELECT 
  table_name,
  column_name,
  '⚠ POTENTIAL CONFLICT - Should be removed/renamed' as warning
FROM information_schema.columns 
WHERE table_schema = 'public'
  AND (
    (table_name = 'events' AND column_name IN ('location', 'status'))
    OR (table_name = 'subjects' AND column_name IN ('name', 'token', 'token_expires_at'))
    OR (table_name = 'order_items' AND column_name = 'unit_price' AND EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'order_items' AND column_name = 'price_list_item_id'
    ))
  );

-- 8. Validate enum types
\echo '\n8. CHECKING ENUM TYPES...'
SELECT 
  typname as enum_name,
  array_agg(enumlabel ORDER BY enumsortorder) as enum_values,
  CASE 
    WHEN typname = 'subject_type' THEN '✓ REQUIRED FOR SUBJECTS'
    WHEN typname = 'order_status' THEN '✓ REQUIRED FOR ORDERS'
    ELSE '✓ OK'
  END as status
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname IN ('subject_type', 'order_status')
GROUP BY typname;

-- 9. Check critical functions exist
\echo '\n9. CHECKING CRITICAL FUNCTIONS...'
SELECT 
  routine_name,
  CASE 
    WHEN routine_name = 'generate_secure_token' THEN '✓ TOKEN GENERATION'
    WHEN routine_name = 'validate_family_token_access' THEN '✓ FAMILY ACCESS'
    WHEN routine_name = 'update_updated_at' THEN '✓ TIMESTAMPS'
    WHEN routine_name = 'update_egress_metrics' THEN '✓ MONITORING'
    ELSE '✓ UTILITY'
  END as purpose
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN (
    'generate_secure_token',
    'validate_family_token_access', 
    'update_updated_at',
    'update_egress_metrics'
  );

-- 10. Summary check
\echo '\n10. MIGRATION SUMMARY...'
WITH table_check AS (
  SELECT COUNT(*) as table_count
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
    AND table_name IN (
      'events', 'subjects', 'subject_tokens', 'photos', 'photo_subjects',
      'orders', 'order_items', 'payments', 'price_lists', 'price_list_items',
      'egress_metrics'
    )
),
rls_check AS (
  SELECT COUNT(*) as rls_count
  FROM pg_tables 
  WHERE schemaname = 'public' 
    AND rowsecurity = true
    AND tablename IN (
      'events', 'subjects', 'subject_tokens', 'photos', 'photo_subjects',
      'orders', 'order_items', 'payments', 'price_lists', 'price_list_items',
      'egress_metrics'
    )
),
fk_check AS (
  SELECT COUNT(*) as fk_count
  FROM information_schema.table_constraints
  WHERE constraint_type = 'FOREIGN KEY'
    AND table_schema = 'public'
),
critical_columns AS (
  SELECT 
    COUNT(*) FILTER (WHERE table_name = 'events' AND column_name = 'school') +
    COUNT(*) FILTER (WHERE table_name = 'events' AND column_name = 'active') as critical_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
)
SELECT 
  'Tables: ' || t.table_count || '/11' as tables_status,
  'RLS: ' || r.rls_count || '/11' as rls_status,
  'Foreign Keys: ' || f.fk_count as fk_status,
  'Critical Columns: ' || c.critical_count || '/2' as columns_status,
  CASE 
    WHEN t.table_count = 11 AND r.rls_count = 11 AND c.critical_count = 2
    THEN '✅ MIGRATION SUCCESSFUL'
    ELSE '⚠️ ISSUES FOUND - CHECK ABOVE'
  END as overall_status
FROM table_check t, rls_check r, fk_check f, critical_columns c;

\echo '\n=== VERIFICATION COMPLETE ==='