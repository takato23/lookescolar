*** Agregar: docs/DESARROLLO.md
# Guía de Desarrollo

## Checklist de entorno
- Variables `.env` configuradas (ver `.env.example`).
- Bucket de storage existente y accesible: `STORAGE_BUCKET`.
- Previews en `.webp` bajo `.../previews/`.
- En dev: bypass de auth activo y logs visibles.

## Flags y comportamiento en desarrollo
- Auth API: bypass para `/admin` y `/api/admin/*`.
- Firmado de URLs: en dev intenta `STORAGE_BUCKET` y fallback `photos`.
- Endpoints de fotos: datos reales (sin mocks).

## Flujo de fotos
1. POST `/api/admin/photos/simple-upload`.
2. Inserta en `photos`:
   - `storage_path`: `events/{eventId|unassigned}/originals/*.ext`
   - `preview_path`: `events/{eventId|unassigned}/previews/*.webp`
3. GET `/api/admin/photos` (server firma con `signedUrlForKey()` y devuelve `preview_url`).

## Logging y trazabilidad
- Subida: `photo_upload_attempt`, `photo_upload_success`, `photo_upload_complete`.
- Respuestas exponen `X-Request-Id` para correlación.

## Datos de prueba
- Usar “Subir fotos” en `/admin/photos`.
- Si no hay eventos, crear uno con seed o usar `unassigned/*`.

## Errores frecuentes
- Bucket incorrecto → 404 en firmado.
- Parámetros vacíos → ya normalizados en `/api/admin/photos`.
- Preview debe ser `.webp`.