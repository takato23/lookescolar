# Roadmap – Unificación Compartición/Tienda

| Fase | Objetivo | Estado (2025-10-07) | Entregables clave |
|------|----------|----------------------|--------------------|
| **1. Servicio de tokens unificado** | Consolida `share_tokens`, `subject/student_tokens`, `folders.share_token` en `public_access_tokens`; expone servicio y endpoint público. | ✅ Completado | Migración `202510070001_public_access_tokens.sql`, `public-access.service.ts`, endpoint `/api/public/access/[token]`, wrappers `/f` `/s`, script `seed-store-config.ts`. |
| **2. Catálogo y checkout comunes** | Centralizar catálogo (price list + overrides), pipeline de órdenes y MercadoPago en servicios compartidos. | ✅ Completado | `lib/services/catalog.service.ts`, `lib/orders/order-pipeline.ts`, `lib/payments/mercadopago.ts`, `/api/family/checkout` y `/api/public/store/config` refactorizados, store unified consumiendo catálogo. |
| **3. Galería unificada** | Servicio unificado para galerías públicas/familiares con rate limiting y signed URLs. | 🚧 En progreso | `lib/services/gallery.service.ts`, `/api/family/gallery`, `/api/public/share/[token]/gallery`, `/api/store/[token]` consumiendo el servicio, front `ShareGalleryClient` y `store-unified` migrados con fallback legacy. |

## Próximas acciones
1. Completar rollout del servicio de galería: validar endpoints `/api/family/gallery`, `/api/public/share`, `/api/store` en staging con tokens reales.
2. Añadir cobertura adicional (API e2e) para flujos de favoritos/familia y compatibilidad legacy (`gallery-simple`).
3. Documentar checklist de mantenimiento (regenerar signed URLs, rate limit dashboards) en el manual admin.
4. Preparar plan de cleanup para rutas legacy una vez confirmada la migración (eliminar `/gallery-simple`, view-models duplicados).

> Cada fase debe cerrarse con despliegues controlados, documentación y pruebas
> (lint + unit + integration) registradas en `docs/ARCHITECTURE_REWRITE_LOG.md`.
