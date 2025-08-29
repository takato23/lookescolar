-- AUDITORÍA SEGURA - Solo columnas que seguro existen
-- Ejecutá esto para encontrar todos tus datos

-- 1. ¿Qué tablas existen?
SELECT 'TABLAS PRINCIPALES' as section;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('events', 'photos', 'subjects', 'orders', 'codes', 'folders', 'assets')
ORDER BY table_name;

-- 2. Contar registros básicos
SELECT 'CONTEO DE DATOS' as section;
SELECT 
  'events' as tabla,
  COUNT(*) as registros
FROM events
UNION ALL
SELECT 
  'photos' as tabla,
  COUNT(*) as registros  
FROM photos
UNION ALL
SELECT 
  'subjects' as tabla,
  COUNT(*) as registros
FROM subjects
UNION ALL
SELECT 
  'folders' as tabla,
  COUNT(*) as registros
FROM folders;

-- 3. Eventos básicos
SELECT 'EVENTOS BÁSICOS' as section;
SELECT id, name, date 
FROM events 
LIMIT 5;

-- 4. ¿Hay fotos?
SELECT 'FOTOS BÁSICAS' as section;
SELECT COUNT(*) as total_fotos
FROM photos;

-- 5. ¿Hay estudiantes?
SELECT 'ESTUDIANTES BÁSICOS' as section; 
SELECT COUNT(*) as total_estudiantes
FROM subjects;