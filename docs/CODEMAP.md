# CODEMAP.md - LookEscolar Repo

Mapa completo del repositorio LookEscolar - Sistema de gestión de fotografía escolar.

---

## 🏗️ Arquitectura General

### **Framework y Tecnologías**
| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **Next.js** | 15.4.5 | Framework React SSR/SSG |
| **React** | 19.1.1 | Biblioteca de UI |
| **TypeScript** | 5.9.2 | Tipado estático |
| **Node.js** | >=18.0.0 | Runtime servidor |

### **Base de Datos y Backend**
| Tecnología | Propósito |
|------------|-----------|
| **Supabase** | PostgreSQL + Auth + Storage + RLS |
| **SQL Raw** | Migraciones y queries directas |
| **Sharp** | Procesamiento de imágenes server-side |

### **Storage y CDN**
| Servicio | Propósito |
|----------|-----------|
| **Supabase Storage** | 2 buckets: `photo-private` (originales), `photos` (previews con watermark) |

### **Autenticación**
| Sistema | Propósito |
|---------|-----------|
| **Supabase Auth** | Admin: email/password |
| **Tokens JWT** | Family access con QR codes |

### **Pagos**
| Sistema | Propósito |
|---------|-----------|
| **Mercado Pago** | Pasarela de pagos con webhooks |

---

## 📂 Estructura de Directorios

```
LookEscolar/
├── 📁 app/                      # Next.js 13+ App Router
│   ├── 📁 admin/               # Panel administrador
│   ├── 📁 api/                 # API routes (193 endpoints)
│   ├── 📁 f/[token]/          # Galerías familiares
│   ├── 📁 gallery/            # Galerías públicas
│   └── 📁 s/[token]/          # Shared galleries 
├── 📁 components/              # Componentes React
│   ├── 📁 admin/              # Componentes admin-only
│   ├── 📁 family/             # Componentes family-facing
│   ├── 📁 gallery/            # Galerías públicas/compartidas
│   └── 📁 ui/                 # Componentes UI base (shadcn/ui)
├── 📁 lib/                    # Lógica de negocio
│   ├── 📁 services/           # Servicios core del negocio
│   ├── 📁 security/           # Auth y validación
│   ├── 📁 supabase/          # Clientes Supabase
│   └── 📁 utils/             # Utilidades compartidas
├── 📁 supabase/               # Migraciones y config
│   └── 📁 migrations/        # 80+ archivos .sql
├── 📁 __tests__/              # Test suite completo
└── 📁 types/                  # TypeScript definitions
```

---

## 🔌 Endpoints API (Top 20)

| **Ruta** | **Métodos** | **Función** | **Tablas Principales** |
|----------|-------------|-------------|------------------------|
| `/api/admin/assets` | GET, POST | **⭐ Assets management** | `assets`, `folders` |
| `/api/admin/photos` | GET, POST, DELETE | Photo CRUD operations | `photos`, `photo_subjects` |
| `/api/admin/events` | GET, POST, PUT | Event management | `events`, `subjects` |
| `/api/admin/events/[id]/photos` | GET, POST | Event photo management | `photos`, `events` |
| `/api/family/gallery/[token]` | GET | Family photo access | `subjects`, `photos`, `orders` |
| `/api/payments/webhook` | POST | Mercado Pago webhooks | `orders`, `order_items` |
| `/api/admin/publish` | GET, POST | Publish folders/photos | `folders`, `assets`, `tokens` |
| `/api/admin/qr/generate` | POST | Generate QR codes | `subjects`, `events` |
| `/api/family/checkout` | POST | Family checkout flow | `orders`, `order_items`, `subjects` |
| `/api/admin/storage/signed-url` | POST | Signed URLs for uploads | `photos`, `assets` |
| `/api/admin/tagging` | POST | Batch photo tagging | `photos`, `photo_subjects` |
| `/api/admin/subjects` | GET, POST, PUT | Subject/student management | `subjects`, `events` |
| `/api/gallery/[id]` | GET | Public gallery access | `events`, `photos` |
| `/api/admin/orders` | GET | Order management | `orders`, `order_items`, `subjects` |
| `/api/qr/validate` | POST | QR code validation | `subjects`, `events` |
| `/api/admin/metrics/egress` | GET | Supabase usage monitoring | `egress_metrics` |
| `/api/health` | GET | Health check | - |
| `/api/admin/settings/mercadopago` | GET, POST | Payment config | `app_settings` |
| `/api/public/gallery/[token]` | GET | Public shared galleries | `tokens`, `folders`, `assets` |
| `/api/s/[token]/preview/[assetId]` | GET | Asset preview proxy | `assets`, `tokens` |

**Total API routes**: 193 archivos `route.ts`

---

## 🎯 Componentes Admin Principales

| **Archivo** | **Props Clave** | **Endpoints Que Consume** | **Propósito** |
|-------------|-----------------|----------------------------|---------------|
| **`PhotoAdmin.tsx`** ⭐ | `eventId?`, `folderId?`, `initialView?` | `/admin/assets`, `/admin/photos`, `/admin/photos/upload` | Sistema unificado de gestión de fotos |
| `EventsPageClient.tsx` | `initialEvents` | `/admin/events`, `/admin/events/[id]` | Lista y gestión de eventos |
| `FolderTree.tsx` | `eventId`, `onSelectFolder`, `publishedOnly?` | `/admin/folders`, `/admin/events/[id]/folders` | Navegación jerárquica de carpetas |
| `BulkPhotoUploader.tsx` | `eventId`, `onUploadComplete` | `/admin/photos/bulk-upload` | Subida masiva de fotos |
| `TaggingModal.tsx` | `photoId`, `eventId`, `onTagged` | `/admin/tagging`, `/admin/subjects` | Etiquetado de fotos con estudiantes |
| `OrderManager.tsx` | `eventId?`, `status?` | `/admin/orders`, `/admin/orders/analytics` | Gestión de pedidos de familias |
| `QRManagement.tsx` | `eventId` | `/admin/qr/generate`, `/admin/subjects` | Generación y gestión de QR codes |
| `PublishSuccessToast.tsx` | `folderCount`, `photoCount` | `/admin/publish/list` | Feedback de publicación exitosa |

---

## 🗄️ Modelos de Base de Datos

### **Tablas Core**
| **Tabla** | **Propósito** | **Campos Clave** |
|-----------|---------------|------------------|
| `events` | Sesiones fotográficas | `id`, `name`, `school`, `date`, `active` |
| `subjects` | Estudiantes/familias | `id`, `first_name`, `last_name`, `family_name`, `qr_code`, `event_id` |
| `photos` *(legacy)* | Metadatos de fotos | `id`, `filename`, `watermark_path`, `original_path`, `event_id` |
| `assets` *(nuevo)* | Sistema unificado de assets | `id`, `folder_id`, `filename`, `type`, `preview_path` |
| `folders` | Estructura jerárquica | `id`, `event_id`, `name`, `parent_folder_id`, `published` |

### **Tablas de Negocio**
| **Tabla** | **Propósito** | **Campos Clave** |
|-----------|---------------|------------------|
| `orders` | Pedidos de familias | `id`, `subject_id`, `status`, `total_amount`, `mercadopago_payment_id` |
| `order_items` | Items de pedidos | `id`, `order_id`, `photo_id`, `quantity`, `unit_price` |
| `photo_subjects` | Relación fotos ↔ estudiantes | `photo_id`, `subject_id`, `confidence_score` |
| `tokens` | Access tokens para compartir | `id`, `folder_id`, `token`, `expires_at`, `public` |

### **Tablas de Sistema**
| **Tabla** | **Propósito** | **Campos Clave** |
|-----------|---------------|------------------|
| `admin_users` | Usuarios administradores | `id`, `email`, `role`, `active` |
| `egress_metrics` | Monitoreo de uso Supabase | `id`, `bytes_downloaded`, `operation_type`, `timestamp` |
| `app_settings` | Configuraciones del sistema | `key`, `value`, `encrypted` |

---

## 🔑 Variables de Entorno

### **Actuales** (detectadas en el código):
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://exaighpowgvbdappydyx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhb...
SUPABASE_SERVICE_ROLE_KEY=eyJhb...

# Storage
STORAGE_BUCKET_ORIGINAL=photo-private
STORAGE_BUCKET_PREVIEW=photos

# Mercado Pago
MP_ACCESS_TOKEN=APP_USR-...
NEXT_PUBLIC_MP_PUBLIC_KEY=APP_USR-...

# Rate Limiting
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

### **`.env.example` Propuesto**:
```env
# === DATABASE === 
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key-aqui

# === STORAGE BUCKETS ===
STORAGE_BUCKET_ORIGINAL=photo-private
STORAGE_BUCKET_PREVIEW=photos

# === PAYMENTS ===
MP_ACCESS_TOKEN=APP_USR-tu-access-token-mp
NEXT_PUBLIC_MP_PUBLIC_KEY=APP_USR-tu-public-key-mp
MP_WEBHOOK_SECRET=tu-webhook-secret-opcional

# === SECURITY & RATE LIMITING ===
UPSTASH_REDIS_REST_URL=https://tu-upstash.upstash.io
UPSTASH_REDIS_REST_TOKEN=tu-token-upstash
JWT_SECRET=tu-jwt-secret-256-bits

# === DEVELOPMENT ===
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# === OPTIONAL ===
ADMIN_EMAIL=admin@tuescuela.com
WEBHOOK_TIMEOUT=30000
PHOTO_UPLOAD_MAX_SIZE=50000000
```

---

## 📱 Rutas de Usuario

### **Admin Routes** (`/admin/*`):
- `/admin` - Dashboard principal
- `/admin/events` - Gestión de eventos  
- `/admin/events/[id]` - Detalle de evento
- `/admin/photos` ⭐ - **Sistema PhotoAdmin principal**
- `/admin/publish` - Publicación de carpetas
- `/admin/orders` - Gestión de pedidos
- `/admin/settings` - Configuraciones

### **Family Routes** (`/f/[token]`):
- `/f/[token]` - Galería familiar
- `/f/[token]/checkout` - Proceso de compra
- `/f/[token]/payment-success` - Confirmación pago

### **Public Routes**:
- `/gallery/[id]` - Galerías públicas de eventos
- `/s/[token]` - Shared galleries con token

---

## ⚡ Flujos Críticos

### **1. Admin → Family (Upload → Purchase)**
1. Admin sube fotos en `/admin/photos` → `POST /api/admin/photos/upload`
2. Admin etiqueta con QR → `POST /api/admin/tagging`
3. Admin genera tokens → `POST /api/admin/events/[id]/tokens`
4. Family accede con QR → `GET /api/family/gallery/[token]`
5. Family hace checkout → `POST /api/family/checkout`
6. Mercado Pago webhook → `POST /api/payments/webhook`

### **2. Asset Management (Nuevo Sistema)**
1. Upload asset → `POST /api/admin/assets`
2. Procesar preview → watermark + WebP conversion
3. Asignar a folder → `PUT /api/admin/folders/[id]`
4. Publicar folder → `POST /api/admin/publish`
5. Generar link compartible → `GET /api/s/[token]`

---

## 🚨 Puntos de Atención

### **Storage Strategy**
- **Buckets**: `photo-private` (originales) + `photos` (previews con watermark)
- **Formato**: WebP 512px/1024px para previews  
- **Seguridad**: RLS policies + signed URLs

### **Performance Critical**
- **PhotoAdmin Component**: Virtual scrolling + infinite queries
- **API Rate Limiting**: Redis-based con Upstash
- **Egress Monitoring**: Métricas para evitar sobrecostos Supabase

### **Security**
- **Admin Auth**: Supabase Auth con role-based access
- **Family Access**: JWT tokens con QR codes
- **Payment Security**: Webhook signature validation MP

---

**Fecha**: 2025-08-28  
**Total Endpoints**: 193 rutas API  
**Total Tests**: 150+ archivos de testing  
**Core Component**: `PhotoAdmin.tsx` en `/components/admin/`