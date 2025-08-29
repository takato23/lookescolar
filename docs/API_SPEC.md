# API_SPEC.md

## Publicación y Selección V1

### Publicación de Códigos

GET  /api/admin/publish/list?eventId={eventId}
  ->  { rows: [ { id, event_id, code_value, token, is_published, photos_count } ] }

POST /api/admin/publish
  Payload: { eventId } or { codeId }
  -> { rows: [ { id, event_id, code_value, token, is_published, photos_count } ] }

POST /api/admin/publish/revoke
  Payload: { codeId }
  -> { token: string }  (new token)

POST /api/admin/publish/unpublish
  Payload: { codeId }
  -> { ok: boolean }

### Export y etiquetas de pedidos

GET  /api/admin/orders/export?eventId={eventId}&courseId={courseId}
  -> CSV file

GET  /api/admin/orders/labels?eventId={eventId}&orderIds={orderId1,orderId2}
  -> PDF labels

### Selección Pública

POST /api/public/selection
  Payload: { token, selectedPhotoIds: string[], package: string, contact?: { name, email, phone } }
  -> { ok: boolean, orderId: string }

## Deprecated

- **/api/storage/signed-url** eliminado en producción. Usar siempre el helper server-side `signedUrlForKey()` y pasar la URL al cliente.