-- Hacer subject_id opcional en orders para desarrollo
-- Ejecutar en Supabase SQL Editor

-- 1. Ver constraint actual
SELECT 'CONSTRAINT ACTUAL:' as info;
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name='orders';

-- 2. Eliminar constraint existente
DO $$ 
BEGIN
  -- Buscar y eliminar el constraint
  EXECUTE (
    'ALTER TABLE orders DROP CONSTRAINT IF EXISTS ' || 
    (SELECT constraint_name FROM information_schema.table_constraints 
     WHERE table_name = 'orders' 
     AND constraint_type = 'FOREIGN KEY' 
     AND constraint_name LIKE '%subject_id%')
  );
  RAISE NOTICE 'Constraint eliminado';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'No se pudo eliminar constraint: %', SQLERRM;
END $$;

-- 3. Hacer subject_id nullable
ALTER TABLE orders ALTER COLUMN subject_id DROP NOT NULL;

-- 4. Verificar cambios
SELECT 'ESTRUCTURA FINAL:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'orders' AND column_name = 'subject_id';

-- 5. Verificar que no hay constraints
SELECT 'CONSTRAINTS FINALES:' as info;
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name='orders';
