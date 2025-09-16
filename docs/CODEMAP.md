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
| `StoreSettingsPage.tsx` | `eventId?` | `/api/admin/store-settings` | Panel de configuración de tienda global y por evento |

---

## 📂 Estructura de Directorios

```
LookEscolar/
├── 📁 app/                      # Next.js 13+ App Router
│   ├── 📁 admin/               # Panel administrador
│   │   ├── events/            # Pages de eventos
│   │   ├── photos/            # PhotoAdmin principal
│   │   ├── publish/           # Publicación de carpetas
│   │   ├── orders/            # Gestión de pedidos
│   │   ├── settings/          # Configuraciones generales
│   │   └── store-settings/    # Configuración de tienda
│   └── 📁 api/                # API routes (193 endpoints)
... (rest unchanged)```

## 📱 Rutas de Usuario

### **Admin Routes** (`/admin/*`):
- `/admin` - Dashboard principal
- `/admin/events` - Gestión de eventos  
- `/admin/events/[id]` - Detalle de evento
- `/admin/photos` ⭐ - **Sistema PhotoAdmin principal**
- `/admin/publish` - Publicación de carpetas
- `/admin/orders` - Gestión de pedidos
- `/admin/settings` - Configuraciones
- `/admin/store-settings` - Configuración de tienda (global y por evento)
