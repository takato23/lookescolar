-- Verificar estructura de subjects y su relación con orders
-- Ejecutar en Supabase SQL Editor

-- 1. Ver estructura de subjects
SELECT 'ESTRUCTURA SUBJECTS:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'subjects' 
ORDER BY ordinal_position;

-- 2. Ver algunas filas de subjects
SELECT 'DATOS SUBJECTS:' as info;
SELECT * FROM subjects LIMIT 5;

-- 3. Ver constraints de foreign keys en orders
SELECT 'CONSTRAINTS ORDERS:' as info;
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

-- 4. Ver si hay subjects relacionados con el folder actual
SELECT 'SUBJECTS DEL FOLDER:' as info;
SELECT s.* FROM subjects s
JOIN folders f ON s.event_id = f.event_id
WHERE f.share_token = 'ff968b5f8da730facfe253895b641ce3';

-- 5. Ver opciones para subject_id
SELECT 'OPCIONES PARA SUBJECT_ID:' as info;
SELECT 
    'Usar subject existente' as opcion,
    s.id as subject_id,
    s.name as subject_name,
    f.name as folder_name
FROM subjects s
JOIN folders f ON s.event_id = f.event_id
WHERE f.share_token = 'ff968b5f8da730facfe253895b641ce3'
LIMIT 3;
