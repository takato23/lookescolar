-- ============================================================
-- PROBAR TIENDA PÚBLICA - Usar datos reales existentes
-- ============================================================

-- PROBAR TIENDA: "Niñet" (5 fotos) 
SELECT * FROM get_store_data('ff968b5f8da730facfe253895b641ce3');

-- Ver todas las tiendas publicadas
SELECT 
  folder_name,
  store_url,
  asset_count,
  view_count,
  event_name
FROM published_stores;

