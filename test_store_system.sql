-- ============================================================
-- PRUEBAS DEL SISTEMA DE TIENDAS
-- Ejecutar paso a paso para probar funcionalidad
-- ============================================================

-- PRUEBA 1: Ver estado actual de carpetas
SELECT 
  f.id,
  f.name,
  f.share_token,
  f.is_published,
  e.name as event_name,
  (SELECT COUNT(*) FROM assets a WHERE a.folder_id = f.id) as asset_count
FROM folders f
LEFT JOIN events e ON f.event_id = e.id
ORDER BY f.created_at;


| id                                   | name                          | share_token                      | is_published | event_name              | asset_count |
| ------------------------------------ | ----------------------------- | -------------------------------- | ------------ | ----------------------- | ----------- |
| 1d4fe778-f4fa-4d11-8b8e-647f63a485d2 | Carpeta Test Event for Tokens | aea4249861591dbfbec379e078d24912 | true         | Test Event for Tokens   | 2           |
| b0d178a1-90cb-45e4-bc7f-10838c5620b7 | Niñet                         | ff968b5f8da730facfe253895b641ce3 | true         | Escuela Margarita Negra | 5           |
| 15726467-d1ff-4d3c-812e-e5bc5f6a5d71 | Niñot                         | wpvLV5X2JfqI_h5MYE4_RpPBgBqr5esf | true         | Escuela Margarita Negra | 1           |


-- PRUEBA 2: Generar un token de prueba
-- SELECT generate_store_token() as nuevo_token;
Success. No rows returned


-- PRUEBA 3: Publicar una carpeta como tienda (usando el ID de una carpeta real)
-- SELECT * FROM publish_store(
--   'aquí-va-el-id-de-una-carpeta'::uuid,
--   '{"store_title": "Tienda de Prueba", "store_description": "Esta es una prueba"}'::jsonb
-- );

Success. No rows returned
-- PRUEBA 4: Ver tiendas publicadas
-- SELECT * FROM published_stores;

-- PRUEBA 5: Probar función de obtener datos de tienda (usando token real)
-- SELECT * FROM get_store_data('token-aquí');


Success. No rows returned



