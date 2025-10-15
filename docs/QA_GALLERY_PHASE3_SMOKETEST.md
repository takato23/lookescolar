# Smoke Test – Galería Unificada (Fase 3)

Guía rápida para validar los endpoints unificados en entornos QA/Staging.

## 1. Variables necesarias
Configurar tokens reales antes de ejecutar los tests:

```env
SMOKE_BASE_URL=https://staging.tu-dominio.com  # opcional, default http://localhost:3000
GALLERY_FAMILY_TOKEN=...
GALLERY_SHARE_TOKEN=...
GALLERY_STORE_TOKEN=...
```

El token de tienda suele coincidir con el share token (si la tienda apunta al mismo álbum).

## 2. Ejecución automática

```bash
SMOKE_BASE_URL=https://staging.tu-dominio.com \
GALLERY_FAMILY_TOKEN=... \
GALLERY_SHARE_TOKEN=... \
GALLERY_STORE_TOKEN=... \
npx tsx scripts/smoke-gallery-phase3.ts
```

- El script consulta:
  - `/api/family/gallery/<token>`
  - `/api/public/share/<token>/gallery`
  - `/api/store/<token>?include_assets=true`
- Si algún endpoint responde distinto de 2xx, se aborta (puedes añadir `SMOKE_ABORT_ON_ERROR=0` para continuar).

## 3. Validación manual complementaria

1. **Favoritos públicos**
   ```bash
   curl -X GET "$SMOKE_BASE_URL/api/public/share/$GALLERY_SHARE_TOKEN/favorites"
   ```
   Debe devolver `{ success: true, favorites: [...] }`.

2. **Agregar/Quitar favorito** (solo si el token permite cambios)
   ```bash
   curl -X POST "$SMOKE_BASE_URL/api/public/share/$GALLERY_SHARE_TOKEN/favorites" \
     -H 'Content-Type: application/json' \
     -d '{"assetId":"<asset-id-existente>"}'

   curl -X DELETE "$SMOKE_BASE_URL/api/public/share/$GALLERY_SHARE_TOKEN/favorites?assetId=<asset-id-existente>"
   ```
   > ⚠️ Ejecutar solo en ambientes de prueba; documentar cualquier cambio.

3. **Store unified**
   - Navegar a `https://.../store-unified/<token>` y verificar:
     - Carga paginada de fotos.
     - Modal de compra y favoritos.

4. **Familia**
   - Acceder `https://.../f/<token>` (o `/app/f/.../enhanced-page`) y revisar
     - Galería paginada.
     - Selección de fotos y carrito.

## 4. Registro de resultados

- Registrar resultados y capturas en `docs/ARCHITECTURE_REWRITE_LOG.md`.
- Anotar cualquier incidencia para coordinar con QA antes de retirar `gallery-simple`.
