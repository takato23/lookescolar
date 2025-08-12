***
# Endpoints (extracto)

## GET /api/admin/photos
- Query: `event_id?`, `status? (approved|pending|tagged|untagged)`, `limit?`, `offset?`
- 200: `{ success, photos: [{ id, original_filename, storage_path, preview_path, preview_url?, ... }], meta }`
- 400: parámetros inválidos
- 401: prod sin auth
- Cache-Control: `private`

## POST /api/admin/photos/simple-upload
- Body: multipart `files[]`
- 200: `{ success, uploaded: [{ id, preview_path, storage_path }], errors[], total, successful, failed }`
- Header: `X-Request-Id` (correlación)

## (Solo desarrollo) GET/POST /api/storage/signed-url
- Disponible únicamente para debug en desarrollo.
- En producción: firmar desde servidor con `signedUrlForKey()` y pasar la URL al cliente.

## GET /api/health
- 200: `{ ok: true, nodeEnv, storageBucket }`