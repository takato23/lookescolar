# Checklist QA - Flujo V1

- [ ] Anchor-detect: POST `/api/admin/anchor-detect { eventId }` → `detected >= 2`.
- [ ] Group: POST `/api/admin/group { eventId }` → `assigned > 0`, `unassigned >= 1`.
- [ ] Publish: POST `/api/admin/publish { codeId }` → retorna `token` y `url`.
- [ ] Gallery: GET `/api/family/gallery-simple/[token]?page=1&limit=60` → 200, `photos.length >= 3`.
  - [ ] Las respuestas públicas NO exponen `storage_path` ni `code_id`.
  - [ ] Todas las imágenes públicas provienen de `https://signed.local/` (mock) o patrón firmado.
- [ ] Selection: POST `/api/public/selection { token, selectedPhotoIds:[...], package:"Combo A" }` → `{ ok:true, orderId }`.
- [ ] Export: GET `/api/admin/orders/export?eventId=...` → CSV contiene fila con `SV-001`.
- [ ] Unpublish: POST `/api/admin/publish/unpublish { codeId }` → luego la galería devuelve 403.

# Checklist QA v1.1

- [ ] Imágenes públicas servidas vía URLs firmadas generadas en servidor con `signedUrlForKey()` (sin fetch a `/api/storage/signed-url`).
- [ ] Galería pública `/f/[token]` carga la primera página y continúa con infinite scroll hasta agotar (usa `page`/`limit` y `pagination.has_more`).
- [ ] Doble envío bloqueado en selección pública (marcado en `localStorage` y botón deshabilitado durante envío).
- [ ] Token despublicado devuelve 403 en API pública y UI muestra error amigable.

