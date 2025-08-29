-- Verificar estructura real de la tabla folders
-- Ejecutar en Supabase SQL Editor

-- 1. Ver todas las tablas que contengan "folder"
SELECT table_name 
FROM information_schema.tables 
WHERE table_name LIKE '%folder%' 
AND table_schema = 'public';

-- 2. Ver estructura de la tabla folders
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'folders' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Ver estructura de la tabla events
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'events' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Ver estructura de la tabla assets
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'assets' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. Ver algunas filas de ejemplo de folders
SELECT * FROM folders LIMIT 3;

-- 6. Ver algunas filas de ejemplo de events
SELECT * FROM events LIMIT 3;

-- 7. Ver algunas filas de ejemplo de assets
SELECT * FROM assets LIMIT 3;
