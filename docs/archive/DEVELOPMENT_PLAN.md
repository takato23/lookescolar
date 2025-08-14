# Plan de Desarrollo - LookEscolar

## 📋 CHECKLIST PRE-DESARROLLO

### Ambiente Local
- [ ] Node.js 20+ instalado
- [ ] Docker Desktop funcionando
- [ ] Git configurado
- [ ] VS Code con extensiones (Prettier, ESLint, Tailwind)
- [ ] Cuenta Supabase creada
- [ ] Cuenta Vercel creada
- [ ] Credenciales MP Sandbox

### Documentación Leída
- [ ] PRD.md completo
- [ ] CLAUDE.md (reglas del proyecto)
- [ ] Agentes en `/agents`
- [ ] Stack tecnológico decidido

---

## 🚀 FASE 1: SETUP BASE (2 días)

### Día 1: Configuración Inicial

#### 1.1 Crear Proyecto Next.js
```bash
npx create-next-app@latest lookescolar --typescript --tailwind --app
cd lookescolar
git init
git add .
git commit -m "Initial commit"
```

#### 1.2 Instalar Dependencias Core
```bash
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
npm install sharp p-limit nanoid zod
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu
npm install react-hook-form @hookform/resolvers
npm install @tanstack/react-query @tanstack/react-virtual
npm install zustand
npm install mercadopago

# Dev dependencies
npm install -D @types/node vitest @vitejs/plugin-react
npm install -D @testing-library/react @testing-library/user-event
npm install -D msw @mswjs/data
```

#### 1.3 Estructura de Carpetas
```bash
mkdir -p app/\(admin\)
mkdir -p app/f
mkdir -p app/api/admin
mkdir -p app/api/family  
mkdir -p app/api/payments
mkdir -p app/api/storage
mkdir -p components/admin
mkdir -p components/family
mkdir -p components/ui
mkdir -p lib/supabase
mkdir -p lib/services
mkdir -p lib/utils
mkdir -p lib/middleware
mkdir -p types
mkdir -p __tests__/api
mkdir -p __tests__/components
mkdir -p public/images
```

#### 1.4 Configuración Supabase
```bash
npx supabase init
npx supabase start
```

### Día 2: Base de Datos y Auth

#### 2.1 Crear Migraciones
- Crear `/supabase/migrations/001_initial_schema.sql`
- Crear `/supabase/migrations/002_indexes.sql`
- Crear `/supabase/migrations/003_rls_policies.sql`
- Aplicar con `npx supabase db push`

#### 2.2 Configurar Clientes Supabase
- Crear `lib/supabase/client.ts`
- Crear `lib/supabase/server.ts`
- Crear `lib/supabase/service.ts`

#### 2.3 Setup Middleware Auth
- Crear `middleware.ts` para protección de rutas
- Crear `lib/middleware/auth.ts`
- Crear `lib/middleware/rate-limit.ts`

#### 2.4 Variables de Entorno
- Crear `.env.local` desde `.env.example`
- Configurar Supabase keys
- Configurar MP sandbox keys

### ✅ Entregables Fase 1
- [ ] Proyecto Next.js funcionando
- [ ] Supabase conectado
- [ ] Base de datos con schema completo
- [ ] RLS policies activas
- [ ] Auth admin funcionando
- [ ] Middleware configurado
- [ ] Tests básicos pasando

---

## 📦 FASE 2: GESTIÓN DE EVENTOS Y SUJETOS (2 días)

### Día 3: CRUD de Eventos

#### 3.1 API Routes
- `app/api/admin/events/route.ts` (GET, POST)
- `app/api/admin/events/[id]/route.ts` (GET, PUT, DELETE)

#### 3.2 UI Admin
- `app/(admin)/events/page.tsx` - Listado
- `app/(admin)/events/new/page.tsx` - Crear
- `app/(admin)/events/[id]/page.tsx` - Detalle
- `components/admin/EventForm.tsx`

### Día 4: Sujetos y QRs

#### 4.1 Gestión de Sujetos
- `app/api/admin/subjects/route.ts`
- `app/(admin)/events/[id]/subjects/page.tsx`
- `components/admin/SubjectManager.tsx`

#### 4.2 Generación de Tokens y QRs
- `lib/services/token.service.ts`
- `lib/services/qrcode.service.ts`
- `lib/services/pdf.service.ts`
- `app/api/admin/subjects/[id]/pdf/route.ts`

#### 4.3 Lista de Precios
- `app/api/admin/pricing/route.ts`
- `app/(admin)/events/[id]/pricing/page.tsx`
- `components/admin/PricingEditor.tsx`

### ✅ Entregables Fase 2
- [ ] CRUD eventos completo
- [ ] Gestión de sujetos (student/couple/family)
- [ ] Tokens únicos generados
- [ ] PDF con QRs descargable
- [ ] Editor de precios por evento
- [ ] Tests de endpoints

---

## 🖼️ FASE 3: PIPELINE DE FOTOS (3 días)

### Día 5: Upload System

#### 5.1 Upload con Queue
- `lib/services/upload.service.ts`
- `lib/utils/queue.ts`
- `app/api/admin/photos/upload/route.ts`

#### 5.2 UI Upload
- `app/(admin)/events/[id]/upload/page.tsx`
- `components/admin/PhotoUploader.tsx`
- Progress bar y feedback

### Día 6: Procesamiento

#### 6.1 Watermark Service
- `lib/services/watermark.service.ts`
- Configuración Sharp
- Queue con p-limit

#### 6.2 Storage Service
- `lib/services/storage.service.ts`
- Paths privados
- Integración con Supabase Storage

### Día 7: URLs Firmadas

#### 7.1 Signed URLs
- `app/api/storage/signed-url/route.ts`
- Cache management
- Expiración 1h

#### 7.2 Testing
- Tests upload
- Tests watermark
- Tests storage

### ✅ Entregables Fase 3
- [ ] Upload batch funcionando
- [ ] Watermark automático aplicado
- [ ] Storage privado configurado
- [ ] URLs firmadas generadas
- [ ] Límite concurrencia respetado
- [ ] Tests de procesamiento

---

## 🏷️ FASE 4: SISTEMA DE TAGGING (2 días)

### Día 8: Scanner QR

#### 8.1 Componente Scanner
- `components/admin/TaggingScanner.tsx`
- BarcodeDetector API
- Fallback input manual

#### 8.2 API Tagging
- `app/api/admin/tagging/route.ts`
- Asignación foto-sujeto

### Día 9: Interface Tagging

#### 9.1 UI Tagging
- `app/(admin)/events/[id]/tagging/page.tsx`
- Filtros y búsqueda
- Bulk operations

#### 9.2 Testing
- Tests scanner
- Tests asignación

### ✅ Entregables Fase 4
- [ ] Scanner QR funcionando
- [ ] Fallback manual disponible
- [ ] Filtros implementados
- [ ] Asignación 1:1 funcionando
- [ ] Vista previa por sujeto
- [ ] Tests de tagging

---

## 👨‍👩‍👧 FASE 5: PORTAL FAMILIA (3 días)

### Día 10: Acceso por Token

#### 10.1 Validación Token
- `lib/services/token.service.ts`
- `app/f/[token]/layout.tsx`
- Middleware validación

### Día 11: Galería y Carrito

#### 11.1 Galería Personal
- `app/f/[token]/page.tsx`
- `components/family/PhotoGallery.tsx`
- Virtual scroll
- URLs firmadas

#### 11.2 Carrito
- `components/family/Cart.tsx`
- `lib/stores/cart.store.ts`
- SessionStorage persistence

### Día 12: Checkout

#### 12.1 Formulario Checkout
- `app/f/[token]/checkout/page.tsx`
- `components/family/CheckoutForm.tsx`
- Validación datos

#### 12.2 API Orders
- `app/api/family/orders/route.ts`
- Creación de orden
- Validación pedido único pending

### ✅ Entregables Fase 5
- [ ] Acceso por token funcionando
- [ ] Galería filtrada correctamente
- [ ] Carrito persistente
- [ ] Checkout con validación
- [ ] Orden creada en DB
- [ ] Tests de acceso familia

---

## 💳 FASE 6: INTEGRACIÓN MERCADO PAGO (2 días)

### Día 13: SDK y Preferencias

#### 13.1 Configuración MP
- `lib/mercadopago/client.ts`
- `lib/mercadopago/types.ts`
- Sandbox configuration

#### 13.2 Crear Preferencia
- `app/api/payments/preference/route.ts`
- Items desde orden
- URLs success/failure/pending

### Día 14: Webhook

#### 14.1 Webhook Handler
- `app/api/payments/webhook/route.ts`
- `lib/mercadopago/webhook.ts`
- HMAC verification
- Idempotencia

#### 14.2 Testing
- Tests preferencia
- Tests webhook
- Mock MP responses

### ✅ Entregables Fase 6
- [ ] SDK MP configurado
- [ ] Preferencias creadas
- [ ] Redirect a MP funcionando
- [ ] Webhook verificado con HMAC
- [ ] Idempotencia implementada
- [ ] Estados mapeados correctamente

---

## 📊 FASE 7: GESTIÓN DE PEDIDOS (2 días)

### Día 15: Dashboard Pedidos

#### 15.1 Listado Pedidos
- `app/(admin)/orders/page.tsx`
- `components/admin/OrdersTable.tsx`
- Filtros y búsqueda

#### 15.2 Detalle Pedido
- `app/(admin)/orders/[id]/page.tsx`
- Vista fotos pedidas
- Cambio de estado

### Día 16: Export y Cierre

#### 16.1 Export CSV
- `app/api/admin/orders/export/route.ts`
- Formato para impresión

#### 16.2 Testing Final
- Tests E2E completos
- Performance testing
- Security audit

### ✅ Entregables Fase 7
- [ ] Dashboard pedidos completo
- [ ] Export CSV funcionando
- [ ] Estados actualizables
- [ ] Marca de entrega
- [ ] Tests E2E pasando
- [ ] Documentación actualizada

---

## 🎯 CHECKLIST FINAL PRE-PRODUCCIÓN

### Seguridad
- [ ] RLS activo en todas las tablas
- [ ] Tokens ≥20 chars
- [ ] Rate limiting configurado
- [ ] CSP headers
- [ ] CORS configurado
- [ ] Logs sin datos sensibles

### Performance
- [ ] Response time <200ms
- [ ] Bundle <500KB
- [ ] Imágenes optimizadas
- [ ] Virtual scroll funcionando
- [ ] Cache implementado

### Testing
- [ ] Coverage >70%
- [ ] E2E principales flujos
- [ ] Manejo de errores
- [ ] Casos edge testeados

### Documentación
- [ ] README actualizado
- [ ] .env.example completo
- [ ] Comentarios en código complejo
- [ ] Guía de deployment

### Deployment
- [ ] Vercel configurado
- [ ] Supabase producción
- [ ] MP producción (cuando ready)
- [ ] Monitoring activo
- [ ] Backups configurados

---

## 📅 TIMELINE RESUMEN

| Semana | Fases | Entregable Principal |
|--------|-------|---------------------|
| 1 | Fase 1-3 | Upload y procesamiento funcionando |
| 2 | Fase 4-5 | Portal familia completo |
| 3 | Fase 6-7 | Sistema completo con pagos |

**Total: 16 días hábiles (3 semanas)**

---

## 🚨 PUNTOS DE CONTROL

### Después de cada fase:
1. Code review con agentes
2. Tests pasando
3. Commit con mensaje descriptivo
4. Update documentación
5. Demo al cliente (si aplica)

### Antes de producción:
1. Security audit completo
2. Performance testing
3. UAT con usuario real
4. Backup strategy probada
5. Rollback plan definido