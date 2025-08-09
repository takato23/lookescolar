*** Agregar: docs/ENDPOINTS.md
+# Endpoints (extracto)
+
+## GET /api/admin/photos
+- Query: `event_id?`, `status? (approved|pending|tagged|untagged)`, `limit?`, `offset?`
+- 200: `{ success, photos: [{ id, original_filename, storage_path, preview_path, ... }], meta }`
+- 400: parámetros inválidos
+- 401: prod sin auth
+- Cache-Control: `private`
+
+## POST /api/admin/photos/simple-upload
+- Body: multipart `files[]`
+- 200: `{ success, uploaded: [{ id, preview_path, storage_path }], errors[], total, successful, failed }`
+- Header: `X-Request-Id` (correlación)
+
+## GET /api/storage/signed-url?path=...
+- 200: `{ url }`
+- 404: objeto no encontrado
+- Dev: intenta `STORAGE_BUCKET` y fallback `photos`
+
+## GET /api/health
+- 200: `{ ok: true, nodeEnv, storageBucket }`