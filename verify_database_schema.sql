-- ============================================================
-- DATABASE SCHEMA VERIFICATION SCRIPT
-- Run this in Supabase SQL Editor to verify complete setup
-- ============================================================

-- This script will verify that all required components are properly installed

-- =======================
-- 1. CHECK ALL REQUIRED TABLES EXIST
-- =======================

SELECT 
  'TABLE CHECK' as check_type,
  table_name,
  CASE 
    WHEN table_name IN (
      'events', 'subjects', 'subject_tokens', 'photos', 'photo_subjects',
      'orders', 'order_items', 'payments', 'price_lists', 'price_list_items',
      'egress_metrics'
    ) THEN '✅ REQUIRED'
    ELSE '❌ UNEXPECTED'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
  AND table_name NOT IN ('schema_migrations', 'supabase_migrations')
ORDER BY table_name;

-- =======================
-- 2. CHECK ROW LEVEL SECURITY IS ENABLED
-- =======================

SELECT 
  'RLS CHECK' as check_type,
  tablename as table_name,
  CASE 
    WHEN rowsecurity = true THEN '✅ ENABLED'
    ELSE '❌ DISABLED'
  END as status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename NOT IN ('schema_migrations', 'supabase_migrations')
ORDER BY tablename;

-- =======================
-- 3. CHECK CRITICAL FOREIGN KEY RELATIONSHIPS
-- =======================

SELECT 
  'FOREIGN KEY CHECK' as check_type,
  tc.table_name || '.' || kcu.column_name || ' -> ' || 
  ccu.table_name || '.' || ccu.column_name as relationship,
  '✅ EXISTS' as status
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- =======================
-- 4. CHECK CRITICAL UNIQUE CONSTRAINTS
-- =======================

SELECT 
  'UNIQUE CONSTRAINT CHECK' as check_type,
  table_name || '.' || column_name as constraint_location,
  constraint_name,
  CASE 
    WHEN constraint_name IN (
      'payments_mp_payment_id_key',
      'subject_tokens_token_unique', 
      'egress_metrics_event_date_unique'
    ) THEN '✅ CRITICAL'
    ELSE '✅ EXISTS'
  END as status
FROM information_schema.key_column_usage kcu
JOIN information_schema.table_constraints tc 
  ON kcu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'UNIQUE' 
  AND tc.table_schema = 'public'
ORDER BY table_name;

-- =======================
-- 5. CHECK CRITICAL INDEXES FOR PERFORMANCE
-- =======================

SELECT 
  'INDEX CHECK' as check_type,
  indexname as index_name,
  tablename as table_name,
  CASE 
    WHEN indexname IN (
      'idx_payments_mp_payment_id',
      'idx_photo_subjects_subject_id',
      'idx_subject_tokens_valid',
      'idx_events_active',
      'idx_photos_event_approved'
    ) THEN '✅ CRITICAL'
    ELSE '✅ EXISTS'
  END as status
FROM pg_indexes 
WHERE schemaname = 'public'
  AND indexname NOT LIKE '%_pkey'  -- Exclude primary keys
  AND indexname NOT LIKE '%_fkey'  -- Exclude auto-generated FK indexes
ORDER BY tablename, indexname;

-- =======================
-- 6. CHECK ESSENTIAL FUNCTIONS EXIST
-- =======================

SELECT 
  'FUNCTION CHECK' as check_type,
  routine_name as function_name,
  CASE 
    WHEN routine_name IN (
      'validate_family_token',
      'get_subject_photos', 
      'assign_photo_to_subject',
      'calculate_order_total',
      'update_egress_metrics',
      'get_event_statistics'
    ) THEN '✅ CRITICAL'
    ELSE '✅ EXISTS'
  END as status,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_type = 'FUNCTION'
ORDER BY routine_name;

-- =======================
-- 7. CHECK CRITICAL CHECK CONSTRAINTS
-- =======================

SELECT 
  'CHECK CONSTRAINT' as check_type,
  table_name,
  constraint_name,
  CASE 
    WHEN constraint_name IN (
      'subject_tokens_min_length',
      'payments_amount_positive',
      'events_school_min_length'
    ) THEN '✅ CRITICAL'
    ELSE '✅ EXISTS'
  END as status
FROM information_schema.check_constraints cc
JOIN information_schema.table_constraints tc 
  ON cc.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'public'
ORDER BY table_name, constraint_name;

-- =======================
-- 8. CHECK ENUMS EXIST
-- =======================

SELECT 
  'ENUM CHECK' as check_type,
  typname as enum_name,
  '✅ EXISTS' as status,
  array_agg(enumlabel ORDER BY enumsortorder) as values
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE typname IN ('subject_type', 'order_status', 'payment_status')
GROUP BY typname
ORDER BY typname;

-- =======================
-- 9. CHECK RLS POLICIES EXIST
-- =======================

SELECT 
  'RLS POLICY CHECK' as check_type,
  tablename,
  policyname,
  CASE 
    WHEN policyname LIKE '%Service role%' THEN '✅ CRITICAL'
    WHEN policyname LIKE '%Admin%' THEN '✅ ADMIN'
    ELSE '✅ EXISTS'
  END as status,
  roles
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =======================
-- 10. SECURITY VALIDATION TESTS
-- =======================

-- Test token validation function (should return NULL for invalid tokens)
SELECT 
  'SECURITY TEST' as check_type,
  'Token Validation - Invalid' as test_name,
  CASE 
    WHEN validate_family_token('too_short') IS NULL THEN '✅ PASSED'
    ELSE '❌ FAILED'
  END as status;

SELECT 
  'SECURITY TEST' as check_type,
  'Token Validation - Empty' as test_name,
  CASE 
    WHEN validate_family_token('') IS NULL THEN '✅ PASSED'
    ELSE '❌ FAILED'  
  END as status;

SELECT 
  'SECURITY TEST' as check_type,
  'Token Validation - NULL' as test_name,
  CASE 
    WHEN validate_family_token(NULL) IS NULL THEN '✅ PASSED'
    ELSE '❌ FAILED'
  END as status;

-- =======================
-- 11. DATA INTEGRITY TESTS
-- =======================

-- Check if any orders exist without proper totals
SELECT 
  'DATA INTEGRITY' as check_type,
  'Orders with Items' as test_name,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ PASSED (No test data)'
    WHEN COUNT(*) = COUNT(CASE WHEN total > 0 THEN 1 END) THEN '✅ PASSED'
    ELSE '❌ FAILED'
  END as status,
  COUNT(*) as total_orders,
  COUNT(CASE WHEN total > 0 THEN 1 END) as valid_orders
FROM (
  SELECT 
    o.id,
    calculate_order_total(o.id) as total
  FROM orders o
  WHERE EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id)
  LIMIT 10  -- Limit to avoid performance issues
) order_totals;

-- =======================
-- 12. PERMISSIONS CHECK
-- =======================

SELECT 
  'PERMISSIONS CHECK' as check_type,
  'Service Role Tables' as test_name,
  CASE 
    WHEN COUNT(*) > 10 THEN '✅ PASSED'
    ELSE '❌ FAILED'
  END as status,
  COUNT(*) as accessible_tables
FROM information_schema.table_privileges 
WHERE grantee = 'service_role' 
  AND table_schema = 'public'
  AND privilege_type = 'SELECT';

-- =======================
-- 13. FINAL SUMMARY
-- =======================

WITH checks AS (
  SELECT 'Tables' as component, COUNT(*) as count
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    AND table_name NOT IN ('schema_migrations', 'supabase_migrations')
  
  UNION ALL
  
  SELECT 'Functions', COUNT(*)
  FROM information_schema.routines
  WHERE routine_schema = 'public'
    AND routine_type = 'FUNCTION'
  
  UNION ALL
  
  SELECT 'Indexes', COUNT(*)
  FROM pg_indexes 
  WHERE schemaname = 'public'
  
  UNION ALL
  
  SELECT 'RLS Policies', COUNT(*)
  FROM pg_policies 
  WHERE schemaname = 'public'
  
  UNION ALL
  
  SELECT 'Foreign Keys', COUNT(*)
  FROM information_schema.table_constraints 
  WHERE table_schema = 'public' 
    AND constraint_type = 'FOREIGN KEY'
)
SELECT 
  'SUMMARY' as check_type,
  component,
  count,
  CASE 
    WHEN component = 'Tables' AND count >= 11 THEN '✅'
    WHEN component = 'Functions' AND count >= 6 THEN '✅'
    WHEN component = 'Indexes' AND count >= 15 THEN '✅'
    WHEN component = 'RLS Policies' AND count >= 15 THEN '✅'
    WHEN component = 'Foreign Keys' AND count >= 8 THEN '✅'
    ELSE '⚠️'
  END as status
FROM checks
ORDER BY component;

-- =======================
-- COMPLETION MESSAGE
-- =======================

SELECT 
  'VERIFICATION COMPLETE' as message,
  'If all checks show ✅, your database schema is ready!' as details,
  'Run the Next.js application and check for any remaining errors.' as next_step;

-- =======================
-- TROUBLESHOOTING QUERIES (UNCOMMENT IF NEEDED)
-- =======================

/*
-- If you see issues, uncomment these queries for detailed information:

-- Show all table structures:
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name NOT IN ('schema_migrations', 'supabase_migrations')
ORDER BY table_name, ordinal_position;

-- Show all constraint definitions:
SELECT 
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc 
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_type;

-- Show detailed index information:
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
*/