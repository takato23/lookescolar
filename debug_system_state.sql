-- DIAGNÓSTICO COMPLETO DEL ESTADO DEL SISTEMA
-- Ejecutá esto en Supabase SQL Editor para ver qué datos tenés

-- 1. ¿Qué eventos existen?
SELECT 'EVENTOS EXISTENTES' as section;
SELECT id, name, date, active, created_at 
FROM events 
ORDER BY created_at DESC;

-- 2. ¿Cuántas fotos hay por evento?
SELECT 'FOTOS POR EVENTO' as section;
SELECT 
  e.name as event_name,
  e.id as event_id,
  COUNT(p.id) as photo_count,
  MIN(p.created_at) as first_photo,
  MAX(p.created_at) as last_photo
FROM events e
LEFT JOIN photos p ON p.event_id = e.id
GROUP BY e.id, e.name
ORDER BY photo_count DESC;

-- 3. ¿Qué carpetas existen?
SELECT 'CARPETAS EXISTENTES' as section;
SELECT 
  f.name as folder_name,
  e.name as event_name,
  f.photo_count,
  f.is_published,
  f.created_at
FROM folders f
LEFT JOIN events e ON f.event_id = e.id
ORDER BY f.created_at DESC;

-- 4. ¿Hay tabla assets?
SELECT 'TABLA ASSETS' as section;
SELECT 
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assets')
    THEN 'Existe tabla assets'
    ELSE 'NO existe tabla assets'
  END as status;

-- Si existe assets, mostrar contenido
SELECT 'CONTENIDO ASSETS' as section;
SELECT COUNT(*) as total_assets 
FROM assets 
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assets');

-- 5. ¿Qué students/subjects existen?
SELECT 'ESTUDIANTES/SUBJECTS' as section;
SELECT 
  COUNT(*) as total_subjects,
  COUNT(DISTINCT event_id) as events_with_subjects
FROM subjects;

-- 6. ¿Hay fotos etiquetadas?
SELECT 'FOTOS ETIQUETADAS' as section;
SELECT 
  COUNT(DISTINCT ps.photo_id) as tagged_photos,
  COUNT(DISTINCT ps.subject_id) as students_with_photos,
  COUNT(*) as total_tags
FROM photo_subjects ps;