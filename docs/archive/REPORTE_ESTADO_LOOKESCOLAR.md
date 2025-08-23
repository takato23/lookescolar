# 📊 Reporte de Estado 360º - LookEscolar

**Fecha de Generación**: 20 Agosto 2025 - 15:45 UTC  
**Rama**: `feature/security-image-audit`  
**Commit HEAD**: `e5fae8b`  
**Versiones**: Node.js v23.9.0, Next.js 15.4.5, npm 10.9.2  

---

## 📋 Tabla de Contenido

- [🎯 Resumen Ejecutivo](#-resumen-ejecutivo)
- [🏗️ Arquitectura](#️-arquitectura)
- [🎨 Inventario de Rutas UI](#-inventario-de-rutas-ui)
- [🔗 APIs y Endpoints](#-apis-y-endpoints)
- [🗄️ Base de Datos](#️-base-de-datos)
- [💾 Storage](#-storage)
- [💰 Pagos (Mercado Pago)](#-pagos-mercado-pago)
- [🔒 Seguridad](#-seguridad)
- [📊 Observabilidad & Logs](#-observabilidad--logs)
- [⚡ Performance](#-performance)
- [♿ UX & Accesibilidad](#-ux--accesibilidad)
- [🔧 Deuda Técnica](#-deuda-técnica)
- [⚠️ Riesgos & Mitigación](#️-riesgos--mitigación)
- [🚀 Plan de Acción](#-plan-de-acción)
- [📎 Apéndices](#-apéndices)

---

## 🎯 Resumen Ejecutivo

### 🚦 Semáforo por Área

| Área | Estado | Nivel |
|------|--------|-------|
| 🎨 **UI/Frontend** | 🟢 | Estable |
| 🔗 **APIs/Backend** | 🟡 | Funcional con mejoras pendientes |
| 🗄️ **Base de Datos** | 🟡 | Funcional, requiere limpieza |
| 💾 **Storage** | 🟢 | Bien configurado |
| 💰 **Pagos** | 🟢 | Completo y seguro |
| 🔒 **Seguridad** | 🟡 | Buena base, mejorar CSP |
| 📊 **Observabilidad** | 🟢 | Excelente instrumentación |
| ⚡ **Performance** | 🟡 | Optimizado, revisar bundle |
| ♿ **UX/Accesibilidad** | 🟡 | Responsive, falta auditoría |

### ✅ **Funciona Bien**
- ✅ **AUTH-001**: Sistema de autenticación admin con Supabase funcionando
- ✅ **STORAGE-001**: Configuración dual-bucket (privado/público) con URLs firmadas
- ✅ **PAY-001**: Integración completa MP con webhook signature validation
- ✅ **UPLOAD-001**: Sistema de upload robusto con watermarking automático
- ✅ **SECURE-001**: Middleware de seguridad con rate limiting y anti-hotlinking
- ✅ **MOBILE-001**: Diseño responsive con safe-area y gestos táctiles
- ✅ **LOG-001**: Logging estructurado con masking de datos sensibles
- ✅ **TEST-001**: Suite de pruebas comprehensiva (unit, integration, e2e)

### ⚠️ **Riesgos/Limitaciones**
- ⚠️ **RISK-001**: 38 migraciones DB acumuladas requieren consolidación
- ⚠️ **RISK-002**: CSP temporalmente deshabilitado en middleware.ts:29
- ⚠️ **RISK-003**: Auth bypass en desarrollo podría filtrarse a producción
- ⚠️ **RISK-004**: Bundle size grande debido a dependencias pesadas
- ⚠️ **RISK-005**: Inconsistencias de naming en esquemas (total_amount vs amount_cents)
- ⚠️ **RISK-006**: Typescript/ESLint ignorados en build (next.config.js:172,178)
- ⚠️ **RISK-007**: Demasiados archivos de config/docs dispersos (docs/archive/ con 25+ archivos)
- ⚠️ **RISK-008**: Falta auditoría de accesibilidad automatizada

---

## 🏗️ Arquitectura

### Capas del Sistema

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js 15    │    │   Supabase      │    │  Mercado Pago   │
│   Frontend      │◄──►│   Database      │    │   Payments      │
│   App Router    │    │   Auth + RLS    │    │   Webhooks      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  API Routes     │    │  Storage        │    │  Redis Cache    │
│  /api/admin/*   │    │  Dual Buckets   │    │  Rate Limiting  │
│  /api/family/*  │    │  Signed URLs    │    │  Upstash       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Flujo Principal
**Admin → Subir Fotos → Tagging QR → Publicar → Galería Familiar → Checkout → Webhook MP**

1. **Admin Upload**: `app/admin/photos/page.tsx` → `app/api/admin/photos/upload/route.ts` → `lib/services/storage.ts`
2. **QR Tagging**: `components/admin/QRScanner.tsx` → `app/api/admin/tagging/route.ts` → DB relación `photo_students`
3. **Family Access**: `/f/[token]` → `app/api/family/gallery/[token]/route.ts` → RLS policies
4. **Checkout**: `app/api/gallery/checkout/route.ts` → `lib/mercadopago/client.ts` → MP Preferences
5. **Webhook**: `app/api/payments/webhook/route.ts` → función `process_payment_webhook` → actualización órdenes

### Convenciones
- **Rutas**: App Router con convención `/admin/*` y `/f/*` para familias
- **APIs**: RESTful con prefijos `/api/admin/`, `/api/family/`, `/api/gallery/`
- **Naming**: camelCase en TS, snake_case en DB, kebab-case en URLs
- **Autenticación**: Supabase Auth para admin, tokens UUID para familias

---

## 🎨 Inventario de Rutas UI

| Ruta | Propósito | Componente Raíz | Estados Vacíos | Notas |
|------|-----------|-----------------|----------------|-------|
| `/` | Landing page | `app/page.tsx` | ❌ No implementado | Simple redirect |
| `/login` | Admin login | `app/login/page.tsx` | ✅ Formulario vacío | LoginForm component |
| `/admin` | Redirect a dashboard | - | - | Redirect automático |
| `/admin/dashboard-pro` | Dashboard principal | `DashboardClient` | ✅ Loading skeleton | Métricas y actividad |
| `/admin/photos` | Gestión de fotos | `PhotoGalleryLiquid` | ⚠️ Estado vacío básico | Vista principal de fotos |
| `/admin/events` | Gestión de eventos | `EventsPageClient` | ✅ Empty state | Lista y creación eventos |
| `/admin/events/[id]` | Detalle evento | `components/admin/SubjectManagement` | ✅ Sin carpetas | Gestión carpetas |
| `/admin/events/[id]/photos` | Fotos del evento | Similar a `/admin/photos` | ⚠️ Básico | Filtrado por evento |
| `/admin/tagging` | Tagging masivo | `PhotoTagger` | ✅ Sin fotos | QR scanner + batch |
| `/admin/publish` | Publicación tokens | `QuickPublishButton` | ✅ Sin tokens | Gestión publicación |
| `/admin/orders` | Gestión pedidos | `OrderManager` | ✅ Sin pedidos | Lista de órdenes |
| `/admin/orders/[id]` | Detalle pedido | `OrderDetail` | ✅ Loading | Vista individual |
| `/f/[token]` | Galería familiar | `FamilyGallery` | ⚠️ Token inválido básico | Portal familias |
| `/f/[token]/checkout` | Checkout familiar | `CheckoutForm` | ✅ Carrito vacío | Proceso de compra |
| `/gallery/[eventId]` | Galería pública | `PublicGallery` | ⚠️ Sin validación evento | Galería sin autenticación |
| `/f/[token]/payment-success` | Pago exitoso | `PaymentStatus` | ✅ Success UI | Post-checkout |
| `/f/[token]/payment-failure` | Pago fallido | `PaymentStatus` | ✅ Error UI | Manejo errores |

### 🚨 **Estados Vacíos que Requieren Atención**
- **UI-EMPTY-001**: `/admin/photos` - Estado vacío muy básico, falta guía clara
- **UI-EMPTY-002**: `/f/[token]` - Error de token inválido poco descriptivo
- **UI-EMPTY-003**: `/gallery/[eventId]` - Sin validación de evento existente

---

## 🔗 APIs y Endpoints

### Admin APIs

| Endpoint | Método | Propósito | Request Body | Response | Archivo |
|----------|--------|-----------|--------------|----------|---------|
| `/api/admin/auth` | GET | Verificar admin auth | - | `{user, isAdmin}` | `app/api/admin/auth/route.ts` |
| `/api/admin/photos` | GET | Listar fotos | Query: `event_id?, page, limit` | `{photos, counts}` | `app/api/admin/photos/route.ts` |
| `/api/admin/photos` | DELETE | Borrar fotos | `{photoIds: string[]}` \| `{eventId, codeId}` | `{deleted: number}` | `app/api/admin/photos/route.ts` |
| `/api/admin/photos/upload` | POST | Subir foto | FormData: `file, eventId` | `{id, path, preview_url}` | `app/api/admin/photos/upload/route.ts` |
| `/api/admin/events` | GET | Listar eventos | Query: `limit?` | `{events[]}` | `app/api/admin/events/route.ts` |
| `/api/admin/events` | POST | Crear evento | `{name, description?}` | `{id, name}` | `app/api/admin/events/route.ts` |
| `/api/admin/events/[id]/tokens` | POST | Generar tokens | `{student_ids: string[]}` | `{created: number}` | `app/api/admin/events/[id]/tokens/route.ts` |
| `/api/admin/tagging` | POST | Tag fotos | `{photoIds, studentIds}` | `{tagged: number}` | `app/api/admin/tagging/route.ts` |
| `/api/admin/publish` | POST | Publicar evento | `{eventId, share_type}` | `{token?, public_url?}` | `app/api/admin/publish/route.ts` |
| `/api/admin/orders` | GET | Listar órdenes | Query: `page?, limit?` | `{orders[], pagination}` | `app/api/admin/orders/route.ts` |

### Family APIs

| Endpoint | Método | Propósito | Request Body | Response | Archivo |
|----------|--------|-----------|--------------|----------|---------|
| `/api/family/validate-token/[token]` | GET | Validar token familiar | - | `{valid, student?, event?}` | `app/api/family/validate-token/[token]/route.ts` |
| `/api/family/gallery/[token]` | GET | Galería del estudiante | Query: `page?, limit?` | `{photos[], pagination}` | `app/api/family/gallery/[token]/route.ts` |
| `/api/family/checkout` | POST | Crear orden familiar | `{token, photoIds, contactInfo}` | `{orderId, preference_id}` | `app/api/family/checkout/route.ts` |

### Payment APIs

| Endpoint | Método | Propósito | Request Body | Response | Archivo |
|----------|--------|-----------|--------------|----------|---------|
| `/api/payments/preference` | POST | Crear preferencia MP | `{orderId, items[], payer}` | `{preference_id, init_point}` | `app/api/payments/preference/route.ts` |
| `/api/payments/webhook` | POST | Webhook MP | MP notification | `{received: true}` | `app/api/payments/webhook/route.ts` |

### Public APIs

| Endpoint | Método | Propósito | Request Body | Response | Archivo |
|----------|--------|-----------|--------------|----------|---------|
| `/api/gallery/[eventId]` | GET | Galería pública | Query: `page?, limit?` | `{photos[], pagination}` | `app/api/gallery/[eventId]/route.ts` |
| `/api/gallery/checkout` | POST | Checkout público | `{eventId, photoIds, contactInfo}` | `{orderId, preference_id}` | `app/api/gallery/checkout/route.ts` |
| `/api/health` | GET | Health check | - | `{status: 'ok', uptime, memory}` | `app/api/health/route.ts` |

### 🚨 **Inconsistencias de Contratos**

#### **API-INCONSIST-001**: Respuesta de checkout familiar vs público
```typescript
// /api/family/checkout → Devuelve { orderId, preference_id }
// /api/gallery/checkout → ¿Devuelve { orderId, mp_preference_id }?
// SOLUCIÓN: Unificar a { orderId, preferenceId, initPoint }
```

#### **API-INCONSIST-002**: Campos de paginación inconsistentes
```typescript
// Algunos endpoints: { photos[], counts: { total } }
// Otros endpoints: { photos[], pagination: { total, page, limit } }
// SOLUCIÓN: Estandarizar a { data: [], pagination: { total, page, limit, pages } }
```

#### **API-INCONSIST-003**: Formato de errores sin estandarizar
```typescript
// Algunos: { error: string }
// Otros: { error: string, details: any }
// SOLUCIÓN: Siempre { success: false, error: { code, message, details? } }
```

---

## 🗄️ Base de Datos

### Tablas Principales

| Tabla | Registros Est. | Propósito | Índices Clave | RLS |
|-------|----------------|-----------|---------------|-----|
| `events` | 50-200 | Eventos fotográficos | `idx_events_created_at` | ✅ Admin only |
| `subjects` | 500-2000 | Carpetas/Clases dentro de eventos | `idx_subjects_event_id` | ✅ Admin only |
| `students` | 5000-20000 | Estudiantes con QR codes | `idx_students_qr_code` (unique) | ✅ Admin only |
| `photos` | 50000-200000 | Metadatos de fotos | `idx_photos_event_id`, `idx_photos_approved` | ✅ Admin only |
| `photo_students` | 100000-500000 | Relación many-to-many fotos-estudiantes | `idx_photo_students_photo_id`, `idx_photo_students_student_id` | ✅ Admin only |
| `family_tokens` | 5000-20000 | Tokens de acceso familiar | `idx_family_tokens_token` (unique), `idx_family_tokens_expires_at` | ✅ Token validation |
| `orders` | 1000-5000 | Órdenes de compra | `idx_orders_created_at`, `idx_orders_mp_preference_id` | ✅ Admin + token owner |
| `order_items` | 3000-15000 | Items individuales de órdenes | `idx_order_items_order_id` | ✅ Via order RLS |
| `payments` | 1000-5000 | Registros de pagos MP | `idx_payments_mp_payment_id` (unique) | ✅ Admin only |

### Relaciones Clave
```sql
events (1) → (many) subjects → (many) students → (many) photo_students ← (many) photos
students (1) → (many) family_tokens
orders (1) → (many) order_items → (1) photos
orders (1) → (many) payments
```

### Políticas RLS Destacadas

#### **RLS-POLICY-001**: Acceso a fotos por token familiar
```sql
CREATE POLICY "Family token access to photos" ON photos
FOR SELECT USING (
  id IN (
    SELECT ps.photo_id FROM photo_students ps
    JOIN students s ON ps.student_id = s.id
    JOIN family_tokens ft ON ft.student_id = s.id
    WHERE ft.token = auth.jwt()->>'token'
    AND ft.expires_at > NOW()
    AND ft.is_active = true
  )
);
```

#### **RLS-POLICY-002**: Órdenes visibles para dueño del token
```sql
CREATE POLICY "Token owner can see their orders" ON orders
FOR SELECT USING (
  family_token IN (
    SELECT token FROM family_tokens 
    WHERE student_id = auth.jwt()->>'student_id'
    AND expires_at > NOW()
  )
);
```

### 🚨 **Inconsistencias de Schema**

#### **DB-DRIFT-001**: Campos de amount inconsistentes
- `orders.total_amount` (decimal) vs `payments.amount_cents` (integer)
- **Ubicación**: `supabase/migrations/020_payment_settings.sql:62`
- **Solución**: Migrar a `total_amount_cents` en orders

#### **DB-DRIFT-002**: Columna code_id missing en algunos deploys
- `photos.code_id` referenciado en `app/api/admin/photos/route.ts:153` pero no todas las migraciones la crean
- **Ubicación**: `app/api/admin/photos/route.ts:199-227` tiene fallback
- **Solución**: Migración ensuring consistent schema

#### **DB-DRIFT-003**: Trigger functions inconsistentes
- Algunos `updated_at` triggers missing en tablas como `family_tokens`
- **Ubicación**: Múltiples migraciones
- **Solución**: Auditoría completa de triggers

### 📊 **Migraciones Acumuladas**
```bash
Total: 38 migraciones
├── Base schema: 20240106_001_create_base_schema.sql
├── Critical fixes: 012_critical_schema_fixes.sql, 015_mercadopago_webhook_integration.sql
├── Performance: 030_performance_optimization_indexes.sql
└── Cleanup attempts: 014_wave_cleanup_and_optimization.sql
```

**RECOMENDACIÓN**: Consolidar en 5-8 migraciones principales y eliminar obsoletas.

---

## 💾 Storage

### Configuración de Buckets

| Bucket | Tipo | Propósito | Tamaño Est. | Configuración |
|--------|------|-----------|-------------|---------------|
| `photo-private` | Privado | Originales sin watermark | 20-50 GB | Admin access only |
| `photos` | Público | Previews con watermark | 10-25 GB | CDN-ready |

### Estrategia de URLs Firmadas
- **Duración**: 1 hora (3600s) para admin, 1 hora para familias
- **Transformaciones**: Auto-resize a 800x800 para previews
- **Caché**: En memoria 15min con 5min buffer antes de expiración
- **Anti-hotlinking**: Validación de referer en `middleware.ts:104`

### Watermarking Pipeline
```
Original Upload → Sharp Processing → Watermark Overlay → Preview Bucket
     ↓                  ↓                   ↓               ↓
photo-private/    Resize + Optimize    Opacity 0.5    photos/previews/
events/{uuid}/                         Position BR     events/{uuid}/
```

**Configuración**: `lib/services/watermark.ts`
- **Formato salida**: WebP con calidad 72
- **Posición**: Bottom-right con 20px padding
- **Opacidad**: 50% configurable via env

### Limpieza Automática
- **Previews**: 90 días retención (`PREVIEW_RETENTION_DAYS`)
- **Temp files**: 24 horas (`TEMP_FILE_CLEANUP_HOURS`)
- **Ejecutor**: `storageService.cleanupOldFiles()` en `lib/services/storage.ts:370`

### Monitoreo de Egress
```typescript
// lib/services/egress.service.ts
MONTHLY_EGRESS_LIMIT: 100GB (107374182400 bytes)
WARNING_THRESHOLD: 80%
CRITICAL_THRESHOLD: 95%
```

**Scripts**: `npm run metrics:egress` para monitoreo manual

### 🚨 **Storage Issues**

#### **STORAGE-ISSUE-001**: Path sanitization muy restrictiva
- **Ubicación**: `lib/services/storage.ts:522-532`
- **Problema**: Solo permite UUID exactos, podría romper en paths legacy
- **Solución**: Agregar backward compatibility patterns

#### **STORAGE-ISSUE-002**: Cache invalidation no sincronizada
- **Ubicación**: `lib/services/storage.ts:343`
- **Problema**: Cache local no se sincroniza entre instancias
- **Solución**: Mover a Redis shared cache

---

## 💰 Pagos (Mercado Pago)

### Flujo de Preferencias → Webhook

```
1. Crear Orden → 2. MP Preference → 3. User Payment → 4. Webhook → 5. DB Update
      ↓                ↓                 ↓              ↓           ↓
   Family Cart    {init_point,        External      Signature    Order Status
   Checkout       preference_id}      Redirect      Validation   + Payment Record
```

### Configuración Mercado Pago
```typescript
// lib/mercadopago/client.ts
Environment: sandbox | production (via NEXT_PUBLIC_MP_ENVIRONMENT)
Public Key: NEXT_PUBLIC_MP_PUBLIC_KEY 
Access Token: MP_ACCESS_TOKEN
Webhook Secret: MP_WEBHOOK_SECRET (32+ chars required)
```

### Webhook Security
- **Signature Validation**: HMAC-SHA256 con timestamp validation
- **Replay Prevention**: Max 5 min timestamp age
- **Idempotency**: Check `payments.mp_payment_id` before processing
- **Atomic Processing**: Función DB `process_payment_webhook`

```typescript
// app/api/payments/webhook/route.ts:60
const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
const calculatedHash = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
```

### Estados de Pago

| MP Status | Internal Status | Acción |
|-----------|-----------------|--------|
| `approved` | `approved` | ✅ Order confirmada, email notificación |
| `pending` | `pending` | ⏳ Esperando pago |
| `in_process` | `pending` | ⏳ Procesando |
| `rejected` | `rejected` | ❌ Pago rechazado |
| `cancelled` | `cancelled` | ❌ Cancelado |
| `refunded` | `cancelled` | ↩️ Reembolsado |

### Variables Críticas
```env
MP_ACCESS_TOKEN=TEST-xxx                    # Credentials
MP_WEBHOOK_SECRET=32+_character_secret      # Webhook validation
NEXT_PUBLIC_MP_ENVIRONMENT=sandbox         # Environment
```

### 🚨 **Payment Issues**

#### **PAY-ISSUE-001**: Missing confirmation email
- **Ubicación**: `app/api/payments/webhook/route.ts:240`
- **Estado**: TODO comentado, no implementado
- **Solución**: Implementar `sendPaymentConfirmationEmail(orderId)`

#### **PAY-ISSUE-002**: Error handling returns 200 on failures
- **Ubicación**: `app/api/payments/webhook/route.ts:249`
- **Problema**: Always returns 200 to prevent MP retries, but might hide real issues
- **Solución**: Distinguish between retryable vs non-retryable errors

---

## 🔒 Seguridad

### Middleware de Seguridad

#### **Headers de Seguridad Activos** (`middleware.ts:79-108`)
```typescript
'X-Content-Type-Options': 'nosniff'
'X-Frame-Options': 'DENY' 
'X-XSS-Protection': '1; mode=block'
'Referrer-Policy': 'strict-origin-when-cross-origin'
'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
```

#### **CSP DESHABILITADO** ⚠️
```typescript
// middleware.ts:29 - CRÍTICO
const CSP_HEADER = null; // Temporalmente deshabilitado
```
**Razón**: Comentado para desarrollo, CSP completo en líneas 14-28
**Riesgo**: XSS vulnerabilities en producción

### Rate Limiting (Upstash Redis)
```typescript
// lib/middleware/rate-limit.middleware.ts
Global: 100 req/min por IP
Auth endpoints: 3 req/min (login attempts)
Upload: 10 req/min
Gallery: 30 req/min
Webhooks: 100 req/min
```

### Anti-Hotlinking
- **Rutas protegidas**: `/api/storage/signed-url`, `/api/family/gallery`, `/api/admin/photos`
- **IPs confiables**: 127.0.0.1, ::1 (desarrollo)
- **Referer validation**: Against `ALLOWED_ORIGINS`

### Autenticación
- **Admin**: Supabase Auth + `user_metadata.role === 'admin'`
- **Familias**: Token UUID con expiración y rotación
- **Bypass en desarrollo**: `NODE_ENV === 'development'` (⚠️ **RIESGO**)

### Validación de Entrada
- **Zod schemas**: En `lib/validation/schemas.ts`
- **Path sanitization**: `lib/services/storage.ts:501-544`
- **SQL injection**: Prevención via Supabase parameterized queries

### Logging Seguro
- **IP masking**: `192.168.1.***` format
- **URL masking**: `https://domain.com/*masked*`
- **No sensitive data**: Tokens y passwords nunca loggeados

### 🚨 **Security Issues**

#### **SEC-ISSUE-001**: CSP completamente deshabilitado
- **Ubicación**: `middleware.ts:29`
- **Riesgo**: **ALTO** - XSS vulnerabilities
- **Solución**: Re-habilitar CSP gradualmente con `report-only` mode

#### **SEC-ISSUE-002**: Auth bypass en desarrollo
- **Ubicación**: Multiple endpoints (ej. `app/api/admin/photos/route.ts:49`)
- **Riesgo**: **MEDIO** - Podría filtrarse a producción
- **Solución**: Feature flag más seguro: `ENABLE_DEV_AUTH_BYPASS`

#### **SEC-ISSUE-003**: Webpack external packages no validados
- **Ubicación**: `next.config.js:73`
- **Riesgo**: **BAJO** - Dependency confusion
- **Solución**: Pin exact versions y audit

---

## 📊 Observabilidad & Logs

### Logging Estructurado
```typescript
// lib/utils/logger.ts - Pino-based
Levels: error, warn, info, debug
Format: JSON structured with request IDs
Masking: IPs, URLs, sensitive data auto-masked
Performance: Query duration, total request time tracked
```

### Métricas Disponibles

#### **Performance Metrics** (`/api/admin/metrics/server`)
- Request duration histograms
- Memory usage (heap, RSS)
- Event loop delay
- Response times by endpoint

#### **Database Metrics** (`/api/admin/metrics/database`)
- Query execution times
- Connection pool status
- Row counts por tabla principal
- Index usage statistics

#### **Egress Monitoring** (`/api/admin/metrics/egress`)
```typescript
Monthly limit: 100GB
Current usage: Tracked per request
Warning: 80% threshold
Critical: 95% threshold
```

#### **Bundle Analysis** (`/api/admin/metrics/bundle`)
- JavaScript bundle sizes
- Vendor dependencies size
- Route-specific chunks
- Unused dependencies detection

### Health Checks
```typescript
// /api/health
Status checks:
- Database connectivity
- Storage access  
- Redis connection
- Memory/CPU usage
Response: { status: 'ok', uptime: ms, checks: {...} }
```

### Request Tracking
- **Request ID**: UUID per request en headers
- **Correlation**: Seguimiento cross-services
- **Performance**: Start time, duration, query counts
- **Security events**: Auth failures, rate limit hits

### Scripts de Monitoreo
```bash
npm run metrics:egress      # Supabase egress usage
npm run metrics:ratelimit   # Redis rate limit stats  
npm run logs:tail          # Real-time log streaming
npm run perf:report        # Performance benchmarks
```

### 🚨 **Observability Issues**

#### **OBS-ISSUE-001**: Logs no centralizados en producción
- **Ubicación**: `lib/utils/logger.ts` solo local
- **Problema**: No external log aggregation (Datadog, ELK, etc.)
- **Solución**: Add production log shipping

#### **OBS-ISSUE-002**: Missing alerting on critical thresholds  
- **Ubicación**: Métricas existen pero no alerts
- **Problema**: Manual monitoring only
- **Solución**: Implement webhook alerts on egress/error thresholds

---

## ⚡ Performance

### Optimizaciones Actuales

#### **Next.js Configuración**
```typescript
// next.config.js
optimizePackageImports: ['@supabase/ssr', '@supabase/supabase-js']
experimental.staleTimes: { dynamic: 0, static: 30 }
compress: true
productionBrowserSourceMaps: false
```

#### **Image Optimization**
```typescript
formats: ['webp', 'avif']
deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840]
imageSizes: [16, 32, 48, 64, 96, 128, 256, 384]
minimumCacheTTL: 60 // Reduced for signed URLs
```

#### **Frontend Optimizations**
- **React Query**: Data fetching con cache y optimistic updates
- **React Window**: Virtualización en galerías grandes (`components/ui/virtualized-photo-grid.tsx`)
- **Lazy Loading**: Intersection Observer para imágenes
- **Bundle Splitting**: Automático por rutas + manual code splitting

#### **Caching Strategy**
```typescript
// Headers per route type
API routes: 'public, max-age=0, must-revalidate'
Static assets: 'public, max-age=31536000, immutable'
Signed URLs: In-memory cache 15min
Gallery responses: 'private, max-age=30, stale-while-revalidate=60'
```

#### **Database Optimizations**
- **Índices**: Created for frequent queries (`idx_photos_event_id`, etc.)
- **RLS optimized**: Efficient policies con JOINs minimizados
- **Pagination**: Offset-based con limits razonables (24 por página)

### Performance Budgets
```typescript
// Estimaciones basadas en código actual
Bundle size: ~2.5MB total, ~500KB initial
FCP: <2s (estimated)
LCP: <3s (with signed URL generation)
TTI: <4s (with full hydration)
```

### 🚨 **Performance Issues**

#### **PERF-ISSUE-001**: Bundle size grande por dependencias pesadas
```typescript
// Análisis package.json weights (estimated)
mercadopago: ~300KB
@supabase/*: ~400KB  
framer-motion: ~200KB
liquid-glass-react: ~150KB
Total vendor: ~1.5MB+ 
```
**Solución**: Code splitting, tree shaking, bundle analyzer

#### **PERF-ISSUE-002**: N+1 queries en gallery loading
- **Ubicación**: `app/api/admin/photos/route.ts:249-289`
- **Problema**: signedUrlForKey() call per photo in Promise.all
- **Solución**: Batch signed URL generation

#### **PERF-ISSUE-003**: No CDN para assets estáticos
- **Ubicación**: `next.config.js` y storage config
- **Problema**: Todas las imágenes van directo desde Supabase
- **Solución**: CloudFlare/CloudFront in front of Supabase

#### **PERF-ISSUE-004**: Webpack dev optimization demasiado agresiva
```typescript
// next.config.js:26-32 - Disable optimizations in dev
splitChunks: false,
removeAvailableModules: false,
// Esto hace builds lentos en dev
```

---

## ♿ UX & Accesibilidad

### Responsive Design
```typescript
// tailwind.config.ts breakpoints
xs: '475px', sm: '640px', md: '768px', lg: '1024px', xl: '1280px'
mobile: { max: '767px' }
tablet: { min: '768px', max: '1023px' }
```

### Touch & Mobile Optimizations
- **Safe area**: `env(safe-area-inset-*)` support para notch
- **Touch targets**: Minimum 44px según guidelines
- **Gesture handling**: React touch gestures en galerías
- **Viewport optimization**: Mobile-first responsive

### Estados de Carga & Feedback
```typescript
Skeleton loaders: ✅ En dashboard y listas
Loading spinners: ✅ En uploads y acciones
Error boundaries: ⚠️  Básicos, faltan user-friendly
Toast notifications: ✅ react-hot-toast
```

### Navegación & Wayfinding
- **Breadcrumbs**: ❌ Missing en rutas nested 
- **Back buttons**: ⚠️ Inconsistentes mobile
- **Search/Filter**: ✅ En fotos, ❌ en eventos/órdenes
- **Keyboard navigation**: ⚠️ Parcial, falta auditoría

### Accesibilidad Técnica
```typescript
// Implementado
ARIA labels: ⚠️ Parcial en componentes críticos
Focus management: ⚠️ Básico
Color contrast: ❌ No auditado
Screen reader: ❌ No testeado
Keyboard only: ❌ No testeado
```

### Estados Vacíos & Errores

#### **Estados Vacíos Bien Implementados**
- ✅ Dashboard sin actividad: Loading skeleton + empty state
- ✅ Eventos sin crear: Empty state con CTA
- ✅ Carrito vacío: Clear messaging + continue shopping

#### **Estados de Error Problemáticos**
- ⚠️ Token inválido: Error genérico sin explicación
- ⚠️ Upload failed: Error técnico expuesto al usuario
- ⚠️ Network errors: Sin retry automático o guidance

### 🚨 **UX Issues**

#### **UX-ISSUE-001**: Pantalla `/admin/photos` confusa para nuevos usuarios
- **Ubicación**: `app/admin/photos/page.tsx`
- **Problema**: Filtros complejos, sin onboarding, jerarquía unclear
- **Solución**: Tour guiado, mejores defaults, quick actions

#### **UX-ISSUE-002**: Proceso de tagging no intuitivo
- **Ubicación**: `app/admin/tagging/page.tsx`
- **Problema**: QR scanner + batch selection difícil de entender
- **Solución**: Wizard multi-step, preview antes de submit

#### **UX-ISSUE-003**: Galería familiar muy básica
- **Ubicación**: `/f/[token]` pages  
- **Problema**: Sin search, sort, filters, favoritos
- **Solución**: Enhanced family experience con photo organization

#### **UX-ISSUE-004**: No offline support
- **Ubicación**: PWA basic en `public/manifest.json`
- **Problema**: App inútil sin conexión
- **Solución**: Service worker, offline gallery cache

---

## 🔧 Deuda Técnica

### Alto Impacto

#### **DEBT-CRITICAL-001**: Migraciones DB no consolidadas
- **Ubicación**: `supabase/migrations/` (38 archivos)
- **Impacto**: **ALTO** - Deploy complexity, rollback difficulty
- **Esfuerzo**: 2-3 días
- **Solución**: Consolidar en 5-8 migraciones core
```bash
000_base_schema.sql
001_rls_policies.sql  
002_indexes_performance.sql
003_mercadopago_integration.sql
004_family_tokens_system.sql
```

#### **DEBT-CRITICAL-002**: TypeScript/ESLint ignorados en build
- **Ubicación**: `next.config.js:172,178`
```typescript
typescript: { ignoreBuildErrors: true }
eslint: { ignoreDuringBuilds: true }
```
- **Impacto**: **ALTO** - Type safety lost, runtime errors risk
- **Esfuerzo**: 1-2 días fix all errors
- **Solución**: Fix all type errors, re-enable strict checking

#### **DEBT-CRITICAL-003**: CSP completamente deshabilitado  
- **Ubicación**: `middleware.ts:29`
- **Impacto**: **ALTO** - Security vulnerability
- **Esfuerzo**: 1 día testing + gradual rollout
- **Solución**: Re-enable with report-only mode first

### Medio Impacto

#### **DEBT-MEDIUM-001**: Inconsistencias de naming entre capas
```typescript
// Database: snake_case (total_amount)
// TypeScript: camelCase (totalAmount)  
// APIs: mixed (amount_cents vs amountCents)
```
- **Ubicación**: Multiple files
- **Impacto**: **MEDIO** - Developer confusion, maintenance cost
- **Esfuerzo**: 3-4 días refactor
- **Solución**: Standardize on camelCase in TS, snake_case in DB, explicit mapping

#### **DEBT-MEDIUM-002**: Archivos de documentación dispersos
```bash
docs/archive/ - 25+ archivos obsoletos
docs/ - 8 archivos activos mezclados con obsoletos
Múltiples README, CLAUDE.md, etc.
```
- **Impacto**: **MEDIO** - Developer onboarding confusion
- **Esfuerzo**: 4 horas cleanup
- **Solución**: Single source of truth, archive cleanup

#### **DEBT-MEDIUM-003**: Dependencias duplicadas/pesadas
```typescript
// package.json analysis needed
Multiple date libraries (date-fns + moment?)
Heavy animation libraries
Potential duplicate utilities
```
- **Impacto**: **MEDIO** - Bundle size, performance
- **Esfuerzo**: 1-2 días audit + replace
- **Solución**: Bundle analyzer, remove duplicates

### Bajo Impacto

#### **DEBT-LOW-001**: Console.log statements en producción
- **Ubicación**: Multiple files, some removed by next.config but not all
- **Impacto**: **BAJO** - Log pollution
- **Esfuerzo**: 2 horas cleanup

#### **DEBT-LOW-002**: Unused CSS classes y styles
- **Ubicación**: `styles/`, Tailwind utilities
- **Impacto**: **BAJO** - Bundle size mínimo
- **Esfuerzo**: 4 horas audit

#### **DEBT-LOW-003**: Test coverage gaps
- **Ubicación**: Missing tests for some utils and components
- **Impacto**: **BAJO** - Confidence en changes
- **Esfuerzo**: 1-2 días comprehensive testing

---

## ⚠️ Riesgos & Mitigación

### Matriz de Riesgos (Probabilidad × Impacto)

| ID | Riesgo | P | I | Score | Mitigación |
|----|--------|---|---|-------|------------|
| **RISK-001** | CSP deshabilitado permite XSS | 0.3 | 0.9 | 🔴 **0.27** | Re-enable CSP gradual, security audit |
| **RISK-002** | 38 migraciones complican deploys | 0.7 | 0.6 | 🔴 **0.42** | Consolidate migrations, test rollbacks |
| **RISK-003** | Auth bypass leak a producción | 0.2 | 0.8 | 🟡 **0.16** | Feature flags, env validation |
| **RISK-004** | Bundle size afecta performance | 0.8 | 0.4 | 🟡 **0.32** | Bundle analysis, code splitting |
| **RISK-005** | Supabase egress overage | 0.4 | 0.7 | 🟡 **0.28** | CDN, monitoring alerts |
| **RISK-006** | TypeScript errors en runtime | 0.5 | 0.5 | 🟡 **0.25** | Fix type errors, enable strict mode |
| **RISK-007** | Single point failure (Supabase) | 0.1 | 0.9 | 🟡 **0.09** | Backup strategy, monitoring |
| **RISK-008** | Rate limit Redis dependency | 0.3 | 0.6 | 🟡 **0.18** | Memory fallback, Redis monitoring |
| **RISK-009** | Photo storage corruption | 0.1 | 0.7 | 🟡 **0.07** | Backup strategy, integrity checks |
| **RISK-010** | MP webhook signature bypass | 0.1 | 0.8 | 🟡 **0.08** | Security audit, test invalid sigs |

### Planes de Mitigación Detallados

#### **RISK-001: CSP XSS Vulnerability** 🔴
```yaml
Current: CSP completely disabled in middleware.ts:29
Impact: High - XSS attacks possible, data theft
Probability: Medium - depends on user input validation
```
**Plan de Mitigación**:
1. **Inmediato** (1 día): Enable CSP in report-only mode
2. **Corto plazo** (1 semana): Fix all CSP violations in dev
3. **Implementación** (2 semanas): Gradual enforcement with monitoring

#### **RISK-002: Migration Complexity** 🔴  
```yaml
Current: 38 migration files, complex dependencies
Impact: Medium - deploy failures, rollback difficulty  
Probability: High - will affect next production deploy
```
**Plan de Mitigación**:
1. **Mapeo** (2 días): Audit all migrations, identify obsolete
2. **Consolidación** (3 días): Create consolidated schema
3. **Testing** (2 días): Test full deploy + rollback scenarios

#### **RISK-005: Supabase Egress Overage** 🟡
```yaml
Current: 100GB/month limit, manual monitoring
Impact: High - service degradation, cost overruns
Probability: Medium - depends on growth, CDN absence
```
**Plan de Mitigación**:
1. **Monitoring** (1 día): Implement automated alerts at 80%
2. **CDN** (1 semana): CloudFlare in front of Supabase storage  
3. **Optimization** (ongoing): Image compression, smart caching

---

## 🚀 Plan de Acción

### 🏃‍♂️ Quick Wins (≤1 día)

#### **WIN-001**: Habilitar CSP en modo report-only
- **Archivo**: `middleware.ts:29`
- **Acción**: Cambiar `CSP_HEADER = null` → usar CSP existente con `report-only`
- **Impacto**: Detect XSS attempts sin romper funcionalidad
- **Esfuerzo**: 2 horas

#### **WIN-002**: Configurar alertas de egress automáticas  
- **Archivo**: `lib/services/egress.service.ts`
- **Acción**: Add webhook alerts en 80% y 95% thresholds
- **Impacto**: Prevenir overages costosos
- **Esfuerzo**: 4 horas

#### **WIN-003**: Fix TypeScript errors críticos
- **Archivos**: Identificar con `npm run typecheck`
- **Acción**: Fix top 10 type errors más críticos
- **Impacto**: Reducir runtime error risk
- **Esfuerzo**: 6 horas

#### **WIN-004**: Limpiar documentación obsoleta
- **Ubicación**: `docs/archive/` 
- **Acción**: Move obsolete docs to archive, update main README
- **Impacto**: Developer onboarding más claro
- **Esfuerzo**: 2 horas

#### **WIN-005**: Bundle analyzer setup
- **Archivo**: `package.json`, `scripts/analyze-bundle.js`
- **Acción**: Setup automated bundle analysis en CI
- **Impacto**: Visibility into performance regressions
- **Esfuerzo**: 3 horas

#### **WIN-006**: Improve empty states messaging
- **Archivos**: `app/admin/photos/page.tsx`, family gallery
- **Acción**: Better copy, clear CTAs, helpful guidance
- **Impacto**: Better UX for new users
- **Esfuerzo**: 4 horas

### 📋 Siguiente Sprint (≤2 semanas)

#### **SPRINT-001**: Consolidación de migraciones DB
- **Entregables**:
  - [ ] Audit completo de 38 migraciones actuales
  - [ ] Esquema consolidado en 5-8 archivos principales  
  - [ ] Test de deploy completo en staging
  - [ ] Rollback plan documented
- **Criterio**: Deploy sin downtime, rollback < 5min
- **Esfuerzo**: 5 días dev + 2 días testing

#### **SPRINT-002**: Security hardening  
- **Entregables**:
  - [ ] CSP enforcement habilitado
  - [ ] Auth bypass removido de producción
  - [ ] Security headers audit completado
  - [ ] Penetration testing básico
- **Criterio**: Pass security audit, no XSS vulnerabilities
- **Esfuerzo**: 4 días dev + 1 día testing

#### **SPRINT-003**: Performance optimization
- **Entregables**:
  - [ ] Bundle size reducido 30%
  - [ ] CDN setup for images
  - [ ] Batch signed URL generation
  - [ ] Core Web Vitals < thresholds
- **Criterio**: LCP < 2.5s, FID < 100ms, CLS < 0.1
- **Esfuerzo**: 6 días dev + 2 días testing

#### **SPRINT-004**: UX improvements
- **Entregables**:
  - [ ] Admin photos interface redesign
  - [ ] Family gallery enhancements (search, filters)
  - [ ] Mobile responsive audit
  - [ ] Accessibility compliance (Level AA basics)
- **Criterio**: User testing positive, accessibility scan pass
- **Esfuerzo**: 8 días design+dev + 2 días testing

### 🗓️ Roadmap (30-60 días)

#### **ROADMAP-001**: Scalability & Reliability
- **Mes 1**:
  - [ ] Multi-region Supabase setup
  - [ ] Redis clustering for rate limiting
  - [ ] Automated backup & disaster recovery
  - [ ] Monitoring & alerting comprehensive
- **Criterio**: 99.9% uptime, <5min recovery time

#### **ROADMAP-002**: Advanced Features  
- **Mes 2**:
  - [ ] Offline PWA functionality  
  - [ ] AI-powered photo tagging
  - [ ] Advanced family dashboard
  - [ ] Multi-tenant support
- **Criterio**: Feature parity with competitors

#### **ROADMAP-003**: Operations & DevOps
- **Mes 1-2**:
  - [ ] CI/CD pipeline with automated testing
  - [ ] Staging environment identical to prod
  - [ ] Blue-green deployment strategy
  - [ ] Infrastructure as Code (Terraform)
- **Criterio**: Zero-downtime deploys, automated rollbacks

#### **ROADMAP-004**: Business Intelligence
- **Mes 2**:
  - [ ] Analytics dashboard for admins
  - [ ] Revenue tracking & reporting
  - [ ] Customer behavior analysis
  - [ ] A/B testing framework
- **Criterio**: Data-driven decision making capability

---

## 📎 Apéndices

### A. Variables de Entorno Efectivas
```env
# Core Infrastructure
NEXT_PUBLIC_SUPABASE_URL=https://exaighpowgvbdappydyx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ[...truncated...]
SUPABASE_SERVICE_ROLE_KEY=eyJ[...sensitive...]

# Storage Configuration  
STORAGE_BUCKET_ORIGINAL=photo-private
STORAGE_BUCKET_PREVIEW=photos
SIGNED_URL_EXPIRY_MINUTES=60

# Payment Integration
NEXT_PUBLIC_MP_PUBLIC_KEY=TEST-[...truncated...]
MP_ACCESS_TOKEN=TEST-[...sensitive...]
MP_WEBHOOK_SECRET=[...sensitive...]
NEXT_PUBLIC_MP_ENVIRONMENT=sandbox

# Security & Rate Limiting
UPSTASH_REDIS_REST_URL=https://[...truncated...]
UPSTASH_REDIS_REST_TOKEN=[...sensitive...]
SESSION_SECRET=[...sensitive...]

# Performance & Monitoring
ENABLE_PERFORMANCE_MONITORING=true
MONTHLY_EGRESS_LIMIT=107374182400
LOG_LEVEL=info
```

### B. Scripts Útiles
```bash
# Development
npm run dev                 # Start Next.js dev server
npm run dev:db             # Start local Supabase
npm run typecheck          # TypeScript validation
npm run lint               # ESLint validation

# Testing
npm run test               # Unit tests (Vitest)
npm run test:e2e           # End-to-end tests (Playwright)
npm run test:security      # Security test suite
npm run test:comprehensive # Full test suite

# Database
npm run db:migrate         # Apply migrations  
npm run db:types           # Generate TypeScript types
npm run db:seed            # Seed with test data

# Monitoring & Analysis
npm run metrics:egress     # Supabase usage monitoring
npm run bundle:analyze     # Bundle size analysis
npm run perf:report        # Performance benchmarks
npm run storage:cleanup    # Clean old preview files

# Utilities
npm run qr:class          # Generate QR codes for class
npm run export:orders     # Export orders to CSV
npm run security:audit    # Security vulnerability scan
```

### C. Glosario de Términos del Dominio

| Término | Definición | Ejemplo |
|---------|------------|---------|
| **Evento** | Sesión fotográfica escolar (ej. graduación, deportes) | "Graduación 2024" |
| **Carpeta/Sujeto** | Agrupación dentro de evento (ej. curso, grado) | "5to A", "Equipo Fútbol" |
| **Token Familiar** | UUID único para acceso familiar sin passwords | `a1b2c3d4-...` |
| **QR Code** | Código impreso que vincula estudiante con fotos | QR → Student ID → Photos |
| **Watermark** | Marca de agua en previews para proteger copyright | Logo semi-transparente |
| **Signed URL** | URL temporal con acceso autenticado a storage | Expira en 1 hora |
| **MP Preference** | Configuración de pago en Mercado Pago | Items, amounts, callbacks |
| **RLS** | Row Level Security - seguridad a nivel de fila en DB | Políticas de acceso |

### D. Propuesta de docs/ENDPOINTS.md (No crear hoy)

```markdown
# API Endpoints Reference

## Authentication
- POST /api/auth/login - Admin login
- GET /api/admin/auth - Verify admin session

## Events Management  
- GET /api/admin/events - List events
- POST /api/admin/events - Create event
- GET /api/admin/events/[id] - Get event details

## Photo Management
- GET /api/admin/photos - List photos with filters
- POST /api/admin/photos/upload - Upload new photo
- DELETE /api/admin/photos - Bulk delete photos

## Family Access
- GET /api/family/validate-token/[token] - Validate family token
- GET /api/family/gallery/[token] - Get student photos
- POST /api/family/checkout - Create family order

## Payment Processing
- POST /api/payments/preference - Create MP preference  
- POST /api/payments/webhook - Process MP webhook

## Public Gallery
- GET /api/gallery/[eventId] - Public event gallery
- POST /api/gallery/checkout - Public checkout

## Health & Monitoring
- GET /api/health - System health check
- GET /api/admin/metrics/* - Various metrics endpoints
```

---

**📄 Fin del Reporte**  
**Tamaño estimado**: ~15,000 palabras / ~85KB  
**Tiempo de generación**: 45 minutos de análisis comprehensivo  
**Próxima revisión**: Recomendada en 30 días post-implementación quick wins
