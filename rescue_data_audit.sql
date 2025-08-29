-- AUDITORÍA COMPLETA DE DATOS EXISTENTES
-- Ejecutá esto para encontrar TODOS tus datos

-- 1. EVENTOS
SELECT '=== EVENTOS EXISTENTES ===' as section;
SELECT id, name, date, created_at 
FROM events 
ORDER BY created_at DESC LIMIT 10;

-- 2. FOTOS
SELECT '=== FOTOS SUBIDAS ===' as section;
SELECT 
  COUNT(*) as total_photos,
  COUNT(DISTINCT event_id) as events_with_photos,
  MIN(created_at) as first_photo,
  MAX(created_at) as last_photo
FROM photos;

-- Detalle por evento
SELECT '=== FOTOS POR EVENTO ===' as section;
SELECT 
  e.name as event_name,
  COUNT(p.id) as photo_count,
  MAX(p.created_at) as last_photo_uploaded
FROM events e
LEFT JOIN photos p ON p.event_id = e.id
GROUP BY e.id, e.name
ORDER BY photo_count DESC;

-- 3. ESTUDIANTES/SUBJECTS
SELECT '=== ESTUDIANTES ===' as section;
SELECT 
  COUNT(*) as total_students,
  COUNT(DISTINCT event_id) as events_with_students
FROM subjects;

-- 4. ÓRDENES/PAGOS
SELECT '=== SISTEMA DE PAGOS ===' as section;
SELECT 
  COUNT(*) as total_orders,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_orders,
  SUM(total_amount) as total_revenue
FROM orders;

-- 5. CÓDIGOS QR/TOKENS
SELECT '=== TOKENS DE ACCESO ===' as section;
SELECT 
  COUNT(DISTINCT s.token) as family_tokens,
  COUNT(DISTINCT c.token) as qr_codes
FROM subjects s
FULL OUTER JOIN codes c ON true;

-- 6. PHOTO TAGGING
SELECT '=== FOTOS ETIQUETADAS ===' as section;
SELECT 
  COUNT(*) as total_tags,
  COUNT(DISTINCT photo_id) as tagged_photos,
  COUNT(DISTINCT subject_id) as students_with_photos
FROM photo_subjects;

-- 7. STORAGE USAGE
SELECT '=== ARCHIVOS EN STORAGE ===' as section;
SELECT 
  COUNT(*) as photos_with_storage_path,
  COUNT(CASE WHEN preview_path IS NOT NULL THEN 1 END) as photos_with_preview
FROM photos
WHERE storage_path IS NOT NULL;