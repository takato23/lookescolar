-- ============================================================
-- DEBUG: ¿Por qué no aparecen las fotos?
-- ============================================================

-- 1. ¿Qué hay en assets para esta carpeta?
SELECT 
  id, filename, status, folder_id
FROM assets 
WHERE folder_id = 'b0d178a1-90cb-45e4-bc7f-10838c5620b7';

-- 2. ¿Y en la tabla photos?
SELECT 
  id, filename, folder_id 
FROM photos 
WHERE folder_id = 'b0d178a1-90cb-45e4-bc7f-10838c5620b7'
LIMIT 3;

-- 3. ¿Cómo se llaman las columnas de assets?
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'assets';

-- 4. ¿Cómo se llaman las columnas de photos?
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'photos';

