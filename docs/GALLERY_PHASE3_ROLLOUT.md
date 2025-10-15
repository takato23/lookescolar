# Galería Unificada – Checklist de Cierre

## 1. Pruebas previas
- [ ] Ejecutar smoke-tests automáticos (`scripts/smoke-gallery-phase3.ts`).
- [ ] Validar en staging: `/share/<token>`, `/store-unified/<token>`, `/f/<token>`.
- [ ] Confirmar sincronización de favoritos (GET/POST/DELETE) con un token de prueba.
- [ ] Revisar métricas de egress y rate-limit (console logs `Unified gallery fallback` deberían ser excepcionales).

## 2. Compatibilidad y monitoreo
- Mantener `/api/family/gallery-simple` como thin wrapper hasta que QA apruebe.
- Registrar cualquier fallback (`legacyFallbackUsed=true`) en logs y en `docs/ARCHITECTURE_REWRITE_LOG.md`.
- Asegurar que los front-ends históricos (`components/public/shared-gallery.tsx`, `FamilyGallery`, `store-unified`) ya consumen el payload unificado.

## 3. Retiro de legacy
Una vez aprobadas las validaciones anteriores:

1. Eliminar el endpoint `app/api/family/gallery-simple/[token]/route.ts` y referencias en scripts/tests.
2. Actualizar documentación pública (links en manuals) para apuntar a `/api/family/gallery`.
3. Depurar helpers legacy (`gallery-simple` references) y feature flags que ya no se utilicen.
4. Ejecutar nuevamente la suite completa (`npm run lint`, `npx vitest ...`, e2e Playwright si aplica).
5. Registrar el cierre de la fase en `docs/ARCHITECTURE_REWRITE_LOG.md` con fecha y responsables.

## 4. Incidentes / rollback
Si se detecta un comportamiento inesperado:
- Restaurar temporalmente el fallback (mantener wrapper sin cambios).
- Registrar tokens afectados y adjuntar respuestas de API.
- Priorizar la corrección en `feat/gallery-unificada-f3` antes de volver a producción.

## 5. Actualizaciones 13-oct-2025
- El endpoint `GET /api/family/gallery-enhanced/[token]` expone métricas de engagement (`stats.total_favorites`, `stats.total_in_cart`, `stats.total_purchased`) y la propiedad `photos[].engagement` para favoritos/carrito/compras por foto. **Pendiente**: actualizar `FamilyGallery` y plantillas públicas para leer estos datos al aplicar filtros `favorites/purchased/unpurchased`.
- La página `app/store-unified/[token]/page.tsx` ahora inicializa el estado vía `useUnifiedStore`, fusiona settings con `mergeWithGuaranteedSettings` y normaliza catálogos antes de renderizar. **Pendiente**: conectar badges/métricas de carrito al nuevo store unificado cuando se exponga en UI.
- Se consolidaron los stores de carrito (`@/store/useCartStore`, `@/lib/stores/cart-store`) en `useUnifiedCartStore`. Revisar integraciones personalizadas que dependían de métodos antiguos (`setEventId`, `getTotalItems`) y confirmar que persisten usando el alias.
- **13-oct-2025 – saneamiento TS parcial**: se reconstruyó `app/admin/events/[id]/actions.ts` para restablecer los server actions y métricas base, y se corrigieron los redirects/hocs de `/admin/events/[id]/*` junto con utilidades (`lib/utils/lazy-loading.tsx`, `lib/utils/logger.ts`, `lib/utils/egress-monitor.ts`, `lib/utils/schema-compatibility.ts`) afectadas por el patrón `}> {`. **Pendiente**: limpiar los servicios (`lib/services/**`, middlewares de rate-limit y seguridad) que siguen contaminados con `Promise<{ ... }` e impiden que `npm run typecheck` finalice; continuar la depuración antes de promover la fase 3.
