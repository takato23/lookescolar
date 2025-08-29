-- ============================================================
-- ARREGLAR MAPEO DE COLUMNAS - Usar las que SÍ existen
-- ============================================================

-- 1. ¿Qué columnas SÍ tiene la tabla assets?
SELECT column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'assets' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. ¿Qué columnas SÍ tiene la tabla photos?
SELECT column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'photos' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. ¿Dónde están realmente las fotos de la carpeta "Niñet"?
SELECT 
  'assets' as tabla,
  COUNT(*) as cantidad,
  'folder_id = b0d178a1-90cb-45e4-bc7f-10838c5620b7' as filtro
FROM assets 
WHERE folder_id = 'b0d178a1-90cb-45e4-bc7f-10838c5620b7'

UNION ALL

SELECT 
  'photos' as tabla,
  COUNT(*) as cantidad,
  'folder_id = 'b0d178a1-90cb-45e4-bc7f-10838c5620b7' as filtro
FROM photos 
WHERE folder_id = 'b0d178a1-90cb-45e4-bc7f-10838c5620b7';