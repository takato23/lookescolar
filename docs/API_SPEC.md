## Publicación y Selección V1

POST /api/admin/publish { codeId } -> { token, url }

POST /api/admin/publish/revoke { codeId } -> { token, url }
POST /api/admin/publish/unpublish { codeId } -> { ok }

GET /api/admin/orders/export?eventId=...&courseId=...

GET /api/admin/orders/labels?eventId=...&orderIds=...

POST /api/public/selection { token, selectedPhotoIds[], package, contact? } -> { ok, orderId }

- Todas las rutas bajo `/api/admin/*` requieren autenticación de admin (middleware `withAuth`) y aplican rate limiting.
- Las APIs públicas nunca exponen `storage_path` ni `code_id`. Las imágenes públicas solo se sirven mediante URLs firmadas generadas en servidor.

## Deprecated

- GET/POST `/api/storage/signed-url` eliminado en producción. Usar siempre el helper server-side `signedUrlForKey()` para firmar y pasar la URL al cliente. Mantener el endpoint solo en desarrollo para debug.


