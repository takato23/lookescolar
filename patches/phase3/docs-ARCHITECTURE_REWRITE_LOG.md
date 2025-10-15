# Architecture Rewrite Log

> Fecha de corte: **2025-10-07** · Responsable: Codex agent

## Fase 1 · Servicio de tokens unificado (completada)

### Checklist
- [x] Migración `202510070001_public_access_tokens.sql` creada y probada (crea tabla, migra datos legacy, agrega columnas `public_access_token_id`).
- [x] Servicio `lib/services/public-access.service.ts` implementado (upserts legacy, resoluciones para share/family, métricas).
- [x] `ShareService` y `FamilyService` actualizados para consumir la capa unificada.
- [x] Endpoint público `GET /api/public/access/[token]` expuesto y wrappers `/f`, `/s` validados contra él.
- [x] CLI `scripts/seed-store-config.ts` para poblar `store_settings` con config base.
- [x] Documentación actualizada (`docs/public-access.md`, `docs/CODEMAP.md`, `docs/ROADMAP.md`, `docs/operations/admin-manual.md`).

### Validaciones
- ✅ **Lint:** `npm run lint` (0 errores, ~1.6k warnings existentes en código legacy).
- ✅ **Tests unitarios:** `npx vitest run __tests__/unit/api/public-access-endpoint.test.ts`.
- ✅ **Tests de integración:** `npx vitest run __tests__/integration/family-service-public-access.test.ts`.

### Pendientes para fases siguientes
- Diseñar catálogo y pipeline de checkout comunes (Fase 2).
- Implementar galería unificada con rate limiting y endpoints consolidados (Fase 3).
- Revisar reducción de warnings de ESLint heredados cuando se toque cada módulo.

## Fase 2 · Catálogo y checkout comunes (completada)

### Checklist
- [x] Servicio `lib/services/catalog.service.ts` resolviendo price lists + overrides por token/evento.
- [x] `lib/orders/order-pipeline.ts` como flujo único para validación de precios, creación de órdenes y touch de métricas.
- [x] `lib/payments/mercadopago.ts` centralizado, consumido por el pipeline.
- [x] Refactor `/api/family/checkout`, `/api/public/store/config`, `/app/store-unified/[token]` para usar los nuevos servicios.
- [x] Documentación y manual actualizados (CODEMAP, ROADMAP, admin-manual).

### Validaciones
- ✅ **Unit**: `npx vitest run __tests__/unit/api/public-access-endpoint.test.ts __tests__/api/family/checkout.test.ts`
- ✅ **Integration**: `npx vitest run __tests__/integration/family-service-public-access.test.ts __tests__/lib/orders/order-pipeline.test.ts`
- ✅ **Lint:** `npm run lint` (warnings legacy mantienen seguimiento).

### Notas
- Checkout legacy reusa pipeline unificado; fallback a URL sandbox cuando MercadoPago no responde (ver warning en respuesta API).
- Catálogo expuesto en `/api/public/store/config` para consumo front.

---

> Nota: continuar la reescritura retomando desde esta bitácora. Cada fase debe
> registrar comandos ejecutados, resultados de lint/tests y próximos pasos.

## 2025-10-07 – Fase 3 (Galería unificada) – Avance 1

### Entregables
- Nuevo servicio `lib/services/gallery.service.ts` con rate limiting propio, signed URLs y compatibilidad legacy.
- Refactor de `/api/family/gallery/[token]`, `/api/public/share/[token]/gallery` y `/api/store/[token]` para consumir el servicio (fallback legacy conservado).
- Clientes React actualizados: `ShareGalleryClient`, flujo `store-unified`, `FamilyGallery` (familias) usando la respuesta unificada.

### Validaciones
- ✅ **Unit**: `npx vitest run __tests__/lib/services/gallery.service.test.ts`
- ✅ **API**: `npx vitest run __tests__/api/family/gallery.test.ts __tests__/api/public/share-gallery.test.ts __tests__/api/public/share-favorites.test.ts`
- ✅ **Lint**: `npm run lint` (se mantiene backlog de warnings legacy registrados en fases previas).

### Notas
- El servicio expone `gallery.rateLimit` y `gallery_catalog` para instrumentación del store; documentar dashboards de seguimiento.
- Store unificado consume `gallery` pero mantiene `assets`/`pagination` legacy para compatibilidad durante la migración.
- Próximo hito: pruebas end-to-end con tokens reales (`family` + `share`) y limpieza de rutas `gallery-simple` cuando QA confirme.
- Clientes front (`components/gallery/UnifiedGalleryPage.tsx`, `components/public/shared-gallery.tsx`, `app/f/[token]/enhanced-page.tsx`) migrados al payload unificado conservando favoritos y modo fallback.
- Rutas legacy `/api/family/gallery-simple` y `/api/public/share/[token]/favorites` ahora delegan en `galleryService` (con validaciones adicionales de assets) manteniendo compatibilidad para apps existentes.
