-- ============================================================
-- ARREGLAR FUNCIÓN get_store_data - Resolver ambigüedad
-- ============================================================

-- Reemplazar función con ambigüedad corregida
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
  -- Incrementar contador de vistas (especificando tabla explícitamente)
  UPDATE folders 
  SET 
    view_count = folders.view_count + 1,
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

