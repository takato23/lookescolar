***
# Runbooks

## Firmado de imágenes (producción)
- Usar helper de servidor `signedUrlForKey()`.
- Pasar `preview_url` ya firmada al cliente desde los endpoints.
- No consumir `/api/storage/signed-url` en producción.

## Galería pública
- Endpoint `/api/family/gallery-simple/[token]` con `page` y `limit`.
- Cliente usa `IntersectionObserver` para cargar páginas hasta `pagination.has_more=false`.

## Cómo correr tests integrales

1) Seed mínimo V1

```bash
pnpm run seed:v1
```

2) Variables de entorno de test

- Crear `.env.test` basado en `.env.test.example` con stubs seguros.
- Si `.env.test` no existe, `vitest.setup.ts` usa defaults:
  - `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321`
  - `SUPABASE_SERVICE_ROLE_KEY=stub`
  - `STORAGE_BUCKET=photos`
  - `APPROX_PREVIEW_BYTES=200000`
  - `UPSTASH_*` y `MP_*` en `stub`

3) Mocks

- Upstash: `lib/limits/rateLimit` y `@upstash/*` se mockean en los tests para siempre permitir.
- Mercado Pago: `lib/mercadopago/client` se mockea con respuestas estáticas.
- Storage firmado: `signedUrlForKey` devuelve `https://signed.local/<key>?sig=fake&exp=...`.

4) Ejecutar integración

```bash
pnpm run test:comprehensive:integration
```

El flujo V1 cubre: anchor-detect, group, publish, gallery-simple, selection, export y unpublish.