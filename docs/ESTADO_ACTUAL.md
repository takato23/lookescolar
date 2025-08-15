## Estado actual de la aplicación (LookEscolar)

### Resumen ejecutivo
- Implementado: flujo MVP de punta a punta (eventos → carga y etiquetado de fotos → galerías → pedidos → pago con Mercado Pago → actualización de órdenes), con endpoints y pantallas admin/familia, y tests E2E/integración cubriendo los caminos críticos.
- Integraciones: Supabase (DB, RLS, storage, RPC) y Mercado Pago (preferencias, webhook, mapeo de estados, idempotencia). Rate limiting con Upstash en rutas sensibles.
- Gaps principales: drift de esquema entre entornos (campos `status/active`, `school/location`), corrección de APIs dinámicas de Next (`cookies()`/`params`), importación masiva CSV/Excel en UI/endpoint, unificación de flujos de checkout (selección pública vs carrito familiar), emails transaccionales y tablero de pedidos.

### Arquitectura funcional (alto nivel)
- Admin
  - `admin/events`: listado/creación de eventos; usa `GET /api/admin/events` (prod) o `GET /api/admin/events-simple` (dev) y `POST /api/admin/events`.
  - Subjetos y tokens: creación (y rotación), QR PDF por evento.
  - Fotos: `upload` con validaciones/límites; tagging sujeto↔foto; métricas de fotos por evento.
  - Pedidos: listado, export CSV, cambio de estado a entregado.
- Público/Familia
  - Galería pública por evento: `app/gallery/[eventId]` (SEO, SSR) con `PublicGallery`.
  - Galería por token familiar: `/f/[token]` (selección y compra), checkout en `/f/[token]/checkout`.
- Pagos (Mercado Pago)
  - Creación de preferencia: `POST /api/payments/create-preference` y `POST /api/family/checkout` (flujo familiar) o `POST /api/public/selection` + `POST /api/payments/create-preference` (flujo selección pública).
  - Webhook: `POST /api/payments/webhook` con verificación de firma, idempotencia y actualización atómica vía `process_payment_webhook` (RPC) o fallback manual.
- Infra/Seguridad
  - Supabase Service Client para SSR y mutaciones críticas. Buckets privados, URLs firmadas. Middlewares de auth, rate limit y logging de seguridad.

### Estado de implementación
- Hecho (endpoints y componentes clave)
  - Eventos: `app/api/admin/events` y `.../events-simple`; `app/admin/events/page.tsx` + `components/admin/EventsPageClient.tsx`.
  - Subjetos: creación individual y bulk (`app/api/admin/subjects/route.ts`, `app/api/admin/subjects/bulk/route.ts`), rotación de token.
  - Fotos: `POST /api/admin/photos/upload`, tagging `POST /api/admin/tagging` y vistas admin.
  - Galerías: pública `app/gallery/[eventId]` y familiar `/f/[token]` + selección pública `POST /api/public/selection`.
  - Checkout/pagos: `POST /api/family/checkout`, `POST /api/payments/create-preference`, `POST /api/payments/webhook`.
  - Métricas y utilidades: signed URLs, egress, caché API, rate-limit, seguridad de pagos.
  - Tests: E2E completos (admin y MVP), integración MP y seguridad/performance.
- Implementado pero oculto o parcial
  - `mercadopago.service.ts`: capa de servicio robusta (reintentos, verificación de firma, idempotencia) coexistiendo con `app/api/payments/webhook` (duplicación parcial de responsabilidades).
  - `events-simple`: endpoint de compatibilidad para desarrollo/entornos con drift de esquema.
  - RPC `process_payment_webhook`: vía Supabase, con fallback a transacción manual si la función no existe.
- Faltante/prioritario
  - Corrección Next.js APIs dinámicas en `app/gallery/[eventId]/page.tsx` (uso de `cookies()` y `params` conforme a versión actual de Next). Ver “Incidencias conocidas”.
  - Unificación de dominios de datos (`status/active`, `school/location`, `total_amount` vs `total_amount_cents/total_cents`).
  - Importación CSV/Excel: dependencias (p.ej., `xlsx`, `papaparse`), UI de carga/preview/validación, y conexión a `subjects/bulk`.
  - Unificación checkout (selección pública y carrito familiar) para una sola fuente de verdad de órdenes y precios.
  - Emails transaccionales (aprobado, pendiente, entregado) y notificaciones internas.
  - UI admin de pedidos (filtros, estados, exportaciones) y auditoría.
  - Accesibilidad: garantizar `aria-*`, `focus-visible` y outlines en todos los botones/modales.

### Flujo objetivo end-to-end
- Admin
  1) Crea evento → 2) Importa sujetos (CSV/Excel) y genera QR → 3) Sube fotos → 4) Tagging por sujeto/código → 5) Publica galería → 6) Monitorea pedidos y entrega.
- Familia (token)
  1) Accede con token → 2) Selecciona fotos/paquete → 3) Se crea `order` + `order_items` → 4) Se genera preferencia de MP → 5) Redirección → 6) Webhook actualiza orden → 7) Vistas de éxito/pendiente/error.
- Público (evento)
  1) Entra a `/gallery/[eventId]` → 2) Explora fotos aprobadas → 3) Selección rápida (opcional) → 4) Checkout por preferencia → 5) Webhook actualiza orden.

### Conexión de datos (holística)
- `events` → `subjects` → `photos` (con `photo_subjects`/`code_id`) → `orders`/`order_items` → pago MP → `payments` y actualización de `orders` por webhook.
- Storage: `photos/YYYY/MM/...` en bucket privado, vistas con URLs firmadas temporales.

### Incidencias conocidas y correcciones propuestas
- Next.js APIs dinámicas en `app/gallery/[eventId]/page.tsx`
  - Error: uso de `params.eventId` y `cookies().getAll()` sin `await` en `generateMetadata` y en cliente SSR. Acción: usar service client de Supabase sin cookies y `await params` (aplicado en esta rama).
- Drift de esquema y compatibilidad
  - `status` vs `active`, `school` vs `location`, totales `total_amount` vs `total_amount_cents/total_cents`. Acción: normalizar capa API para devolver un modelo estable al frontend y ejecutar migraciones de alineación.
- Duplicación en pagos
  - Lógica en `lib/mercadopago/mercadopago.service.ts` y en `app/api/payments/webhook`. Acción: centralizar verificación/parseo/registro en la capa de servicio y que la ruta sea un fino adaptador.
- Unificación de checkout
  - Hoy conviven: selección pública (`/api/public/selection` → preferencia) y carrito familiar (`/api/family/checkout`). Acción: consolidar en un único servicio/contrato (mismos cálculos/validaciones/precios).
- CSV/Excel
  - Faltan dependencias y UI de importación con validación y reporte de errores antes de insertar. Acción: `xlsx` (lectura), `papaparse` (CSV), validaciones con `zod`, preview en UI admin y envío a `subjects/bulk`.
- Emails y notificaciones
  - TODO al aprobar pagos (confirmación al cliente) y notificaciones admin.

### Variables de entorno críticas
- `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- `MP_ACCESS_TOKEN`, `NEXT_PUBLIC_MP_PUBLIC_KEY`, `MP_WEBHOOK_SECRET`, `NEXT_PUBLIC_MP_ENVIRONMENT`.
- Upstash/Redis para rate limit (opcional en dev).

### Pruebas existentes (indicativas)
- E2E: `__tests__/e2e/*` cubre login admin, eventos, sujetos/QR, upload/tagging, galerías, carrito/checkout, webhook y órdenes.
- Integración MP: `__tests__/lib/mercadopago/mercadopago.service.test.ts` y flujos de seguridad/DB.
- Performance y seguridad: suites dedicadas (`__tests__/performance`, `__tests__/security`).

### Próximos pasos recomendados (orden sugerido)
1) Consolidar la corrección `cookies()/params` y validar en entorno real.
2) Normalizar contrato API (mapear `status/active`, `school/location`, campos de totales) y alinear migraciones.
3) CSV/Excel: instalar dependencias, UI de importación, validaciones y conexión a `subjects/bulk`.
4) Unificar flujo de checkout y centralizar capa de pagos (webhook/servicio/errores/idempotencia).
5) Emails transaccionales y panel admin de pedidos (filtros/acciones/CSV).
6) Accesibilidad y trazabilidad (aria-*, focus-visible, logs y métricas).


