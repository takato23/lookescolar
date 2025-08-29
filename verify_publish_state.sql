-- VERIFICAR ESTADO DE PUBLICACIÓN
-- Ejecutá esto en Supabase SQL Editor

-- Ver estado directo de la tabla folders
SELECT 
  id,
  name,
  is_published,
  share_token,
  published_at,
  publish_settings
FROM folders 
WHERE name = 'Carpeta Test Event for Tokens';

-- Ver si la vista folders_with_sharing funciona
SELECT 
  id,
  name,
  is_published,
  share_token,
  family_url,
  qr_url
FROM folders_with_sharing 
WHERE name = 'Carpeta Test Event for Tokens';