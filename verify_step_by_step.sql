-- ============================================================
-- VERIFICACIÓN PASO A PASO - Ejecutar una consulta a la vez
-- ============================================================

-- PASO 1: ¿Qué tablas principales existen?
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('events', 'folders', 'assets', 'photos')
ORDER BY table_name;
| table_name |
| ---------- |
| assets     |
| events     |
| folders    |
| photos     |
-- DESPUÉS DE EJECUTAR EL PASO 1, CONTINÚA CON EL PASO 2:

-- PASO 2: ¿Qué columnas tiene la tabla folders?
-- SELECT column_name, data_type
-- FROM information_schema.columns 
-- WHERE table_name = 'folders' AND table_schema = 'public'
-- ORDER BY ordinal_position;

---

| column_name      | data_type                |
| ---------------- | ------------------------ |
| id               | uuid                     |
| name             | text                     |
| parent_id        | uuid                     |
| event_id         | uuid                     |
| depth            | integer                  |
| sort_order       | integer                  |
| photo_count      | integer                  |
| created_at       | timestamp with time zone |
| updated_at       | timestamp with time zone |
| share_token      | text                     |
| is_published     | boolean                  |
| publish_settings | jsonb                    |
| published_at     | timestamp with time zone |
| store_settings   | jsonb                    |
| view_count       | integer                  |
| last_viewed_at   | timestamp with time zone |




-- PASO 3: ¿Se crearon nuestras funciones?
-- SELECT routine_name
-- FROM information_schema.routines 
-- WHERE routine_schema = 'public' 
--   AND routine_name IN ('generate_store_token', 'publish_store', 'get_store_data', 'unpublish_store');

| routine_name         |
| -------------------- |
| generate_store_token |
| get_store_data       |
| publish_store        |
| unpublish_store      |


-- PASO 4: ¿Cuántos registros hay en cada tabla?
-- SELECT 'events' as tabla, COUNT(*) as cantidad FROM events
-- UNION ALL
-- SELECT 'folders' as tabla, COUNT(*) as cantidad FROM folders
-- UNION ALL
-- SELECT 'assets' as tabla, COUNT(*) as cantidad FROM assets;

| tabla   | cantidad |
| ------- | -------- |
| events  | 2        |
| folders | 3        |
| assets  | 8        |
