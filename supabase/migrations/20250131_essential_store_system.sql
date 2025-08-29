-- ============================================================
-- MIGRACIÓN ESENCIAL: Sistema de Tienda Simplificado
-- Solo agrega lo mínimo necesario a las tablas existentes
-- ============================================================

BEGIN;

-- ============================================================
-- 1. VERIFICAR Y CREAR TABLAS BÁSICAS SI NO EXISTEN
-- ============================================================

-- Tabla de eventos (solo si no existe)
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  school TEXT,
  date DATE,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de carpetas (solo si no existe)
CREATE TABLE IF NOT EXISTS folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  parent_id UUID REFERENCES folders(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  depth INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  photo_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de assets (solo si no existe) 
CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID REFERENCES folders(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  storage_path TEXT,
  preview_url TEXT,
  watermark_url TEXT,
  file_size BIGINT,
  status TEXT DEFAULT 'ready' CHECK (status IN ('ready', 'processing', 'error')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. AGREGAR CAMPOS PARA SISTEMA DE TIENDA
-- ============================================================

-- Agregar campos de tienda a folders si no existen
ALTER TABLE folders 
ADD COLUMN IF NOT EXISTS share_token TEXT,
ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS store_settings JSONB DEFAULT '{
  "allow_download": false,
  "watermark_enabled": true,
  "store_title": null,
  "store_description": null,
  "contact_info": null
}'::jsonb,
ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMPTZ NULL;

-- ============================================================
-- 3. CREAR ÍNDICES Y CONSTRAINTS
-- ============================================================

-- Índices básicos si no existen
CREATE INDEX IF NOT EXISTS idx_folders_event_id ON folders(event_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_assets_folder_id ON assets(folder_id);

-- Constraint único para share_token
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'folders' AND constraint_name = 'folders_share_token_unique'
  ) THEN
    ALTER TABLE folders ADD CONSTRAINT folders_share_token_unique UNIQUE (share_token);
  END IF;
END $$;

-- Índices para sistema de tienda
CREATE INDEX IF NOT EXISTS idx_folders_share_token_published 
  ON folders(share_token, is_published) 
  WHERE share_token IS NOT NULL AND is_published = true;

-- ============================================================
-- 4. FUNCIONES ESENCIALES
-- ============================================================

-- Función para generar token único
CREATE OR REPLACE FUNCTION generate_store_token()
RETURNS TEXT AS $$
DECLARE
  token_value TEXT;
  token_exists BOOLEAN;
BEGIN
  LOOP
    -- Generar token de 16 caracteres alfanumérico
    token_value := lower(encode(gen_random_bytes(12), 'base64'));
    token_value := regexp_replace(token_value, '[^a-z0-9]', '', 'g');
    token_value := substr(token_value, 1, 16);
    
    -- Verificar que no exista
    SELECT EXISTS(SELECT 1 FROM folders WHERE share_token = token_value) INTO token_exists;
    
    EXIT WHEN NOT token_exists;
  END LOOP;
  
  RETURN token_value;
END;
$$ LANGUAGE plpgsql;

-- Función para publicar una tienda
CREATE OR REPLACE FUNCTION publish_store(
  p_folder_id UUID,
  p_store_settings JSONB DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  token TEXT,
  store_url TEXT,
  message TEXT
) AS $$
DECLARE
  folder_record folders%ROWTYPE;
  new_token TEXT;
BEGIN
  -- Verificar que el folder existe
  SELECT * INTO folder_record FROM folders WHERE id = p_folder_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::TEXT, NULL::TEXT, 'Folder not found';
    RETURN;
  END IF;
  
  -- Generar token si no existe
  IF folder_record.share_token IS NULL THEN
    new_token := generate_store_token();
  ELSE
    new_token := folder_record.share_token;
  END IF;
  
  -- Actualizar folder con configuración de tienda
  UPDATE folders 
  SET 
    share_token = new_token,
    is_published = true,
    published_at = NOW(),
    store_settings = COALESCE(p_store_settings, store_settings)
  WHERE id = p_folder_id;
  
  -- Retornar resultado
  RETURN QUERY SELECT 
    true,
    new_token,
    '/store/' || new_token,
    'Store published successfully';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener datos de tienda
CREATE OR REPLACE FUNCTION get_store_data(p_token TEXT)
RETURNS TABLE(
  folder_id UUID,
  folder_name TEXT,
  event_id UUID,
  event_name TEXT,
  event_date DATE,
  store_settings JSONB,
  view_count INTEGER,
  asset_count BIGINT
) AS $$
BEGIN
  -- Incrementar contador de vistas
  UPDATE folders 
  SET 
    view_count = view_count + 1,
    last_viewed_at = NOW()
  WHERE share_token = p_token AND is_published = true;
  
  -- Retornar datos de la tienda
  RETURN QUERY 
  SELECT 
    f.id,
    f.name,
    f.event_id,
    COALESCE(e.name, 'Evento sin nombre'),
    e.date,
    f.store_settings,
    f.view_count,
    COUNT(a.id) as asset_count
  FROM folders f
  LEFT JOIN events e ON f.event_id = e.id
  LEFT JOIN assets a ON a.folder_id = f.id AND a.status = 'ready'
  WHERE f.share_token = p_token AND f.is_published = true
  GROUP BY f.id, f.name, f.event_id, e.name, e.date, f.store_settings, f.view_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para despublicar tienda
CREATE OR REPLACE FUNCTION unpublish_store(p_folder_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE folders 
  SET 
    is_published = false,
    published_at = NULL
  WHERE id = p_folder_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 5. VISTA PARA ADMIN
-- ============================================================

CREATE OR REPLACE VIEW published_stores AS
SELECT 
  f.id as folder_id,
  f.name as folder_name,
  f.share_token,
  f.is_published,
  f.published_at,
  f.view_count,
  f.last_viewed_at,
  f.store_settings,
  '/store/' || f.share_token as store_url,
  
  -- Event info
  e.id as event_id,
  e.name as event_name,
  e.date as event_date,
  e.school,
  
  -- Asset count
  COUNT(a.id) as asset_count,
  
  -- URLs útiles
  '/admin/events/' || e.id || '/folders/' || f.id as admin_url,
  'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' || 
    encode(('/store/' || f.share_token)::bytea, 'escape') as qr_code_url
  
FROM folders f
LEFT JOIN events e ON f.event_id = e.id
LEFT JOIN assets a ON a.folder_id = f.id AND a.status = 'ready'
WHERE f.is_published = true AND f.share_token IS NOT NULL
GROUP BY f.id, f.name, f.share_token, f.is_published, f.published_at, 
         f.view_count, f.last_viewed_at, f.store_settings,
         e.id, e.name, e.date, e.school;

-- ============================================================
-- 6. PERMISOS
-- ============================================================

-- Permisos para las funciones
GRANT EXECUTE ON FUNCTION generate_store_token() TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION publish_store(UUID, JSONB) TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION unpublish_store(UUID) TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION get_store_data(TEXT) TO service_role, authenticated, anon;

-- Permisos para la vista
GRANT SELECT ON published_stores TO service_role, authenticated;

-- ============================================================
-- 7. MENSAJES DE CONFIRMACIÓN
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE 'Sistema de tiendas simplificado instalado correctamente';
  RAISE NOTICE 'Tablas verificadas: events, folders, assets';
  RAISE NOTICE 'Funciones creadas: generate_store_token, publish_store, get_store_data, unpublish_store';
  RAISE NOTICE 'Vista creada: published_stores';
  RAISE NOTICE 'Sistema listo para usar!';
END $$;

COMMIT;

