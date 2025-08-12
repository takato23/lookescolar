## Reglas Cursor (v1.1)

- No usar fetch a `/api/storage/signed-url` en producción. Firmar siempre en servidor con `signedUrlForKey()`.
- Paginación pública: usar `page`/`limit` en la API y `IntersectionObserver` en el cliente para infinite scroll.



