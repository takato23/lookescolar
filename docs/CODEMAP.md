# CODEMAP.md - LookEscolar Repo

Mapa completo del repositorio LookEscolar - Sistema de gestión de fotografía escolar y e-commerce.

---

## 🏗️ Arquitectura General

### **Framework y Tecnologías**
| Tecnología   | Versión   | Propósito                                   |
|--------------|-----------|---------------------------------------------|
| **Next.js**  | 15.4.5    | Framework React SSR/SSG                    |
| **React**    | 19.1.1    | Biblioteca de UI                            |
| **TypeScript**| 5.9.2    | Tipado estático                             |
| **Node.js**  | >=18.0.0  | Runtime servidor                            |

### **Base de Datos y Backend**
| Tecnología  | Propósito                                                      |
|-------------|----------------------------------------------------------------|
| **Supabase**| PostgreSQL + Auth + Storage + RLS                               |
| **SQL Raw** | Migraciones y queries directas                                  |
| **Sharp**   | Procesamiento de imágenes server-side                           |

### **Storage y CDN**
| Servicio          | Propósito                                       |
|-------------------|-------------------------------------------------|
| **Supabase Storage**| 2 buckets: `photo-private` (originales), `photos` (previews con watermark) |

### **Autenticación**
| Sistema           | Propósito                                          |
|-------------------|----------------------------------------------------|
| **Supabase Auth** | Admin: email/password                              |
| **JWT Tokens**    | Family & Commerce access con QR codes              |

### **Pagos**
| Sistema           | Propósito                                          |
|-------------------|----------------------------------------------------|
| **Mercado Pago**  | Pasarela de pagos (preferences, webhooks)          |

---

## 📂 Estructura de Directorios

```plaintext
LookEscolar/
├── app/                       # Next.js 13+ App Router
│   ├── admin/                 # Panel administrador
│   ├── api/                   # API routes (200+ endpoints)
│   ├── f/[token]/store/       # Tienda unificada (wizard checkout)
│   ├── gallery/               # Galerías públicas
│   ├── s/[token]/store/       # Shared store redirect
│   └── store-unified/         # Página unificada de tienda
├── components/                # Componentes React
│   ├── admin/                 # Componentes admin-only
│   ├── gallery/               # Galerías públicas/compartidas
│   ├── store/                 # Ecommerce Wizard (`UnifiedStore.tsx`)
│   └── ui/                    # Componentes UI base (shadcn/ui)
├── lib/                       # Lógica de negocio
│   ├── services/              # Servicios core
│   ├── stores/                # Estado con Zustand (`unified-store.ts`)
│   └── supabase/              # Clientes Supabase
├── supabase/                  # Migraciones y config
├── __tests__/                 # Test suite completo
└── docs/                      # Documentación
```

---

## 🔌 Endpoints API (Top 20)

| **Ruta**                                      | **Métodos** | **Función**                                          |
|-----------------------------------------------|-------------|------------------------------------------------------|
| `/api/admin/assets`                           | GET, POST   | **Assets management**                                |
| `/api/admin/photos`                           | GET, POST, DELETE | Photo CRUD                                   |
| `/api/admin/events`                           | GET, POST, PUT    | Event management                              |
| `/api/admin/events/[id]/photos`               | GET, POST   | Event photo management                             |
| `/api/family/gallery/[token]`                 | GET         | Family photo access                                 |
| `/api/store/create-preference`                | POST        | Create Mercado Pago payment preference              |
| `/api/webhooks/mercadopago/route.ts`          | POST        | Handle Mercado Pago webhook notifications           |
| `/api/store/orders/[orderId]`                 | GET         | Retrieve order details                              |
| `/api/admin/publish`                          | GET, POST   | Publish folders/photos                              |
| `/api/admin/qr/generate`                      | POST        | Generate QR codes                                   |
| `/api/f/[token]/store`                        | GET         | Family store entry point                            |
| `/api/s/[token]/store`                        | GET         | Shared store redirect                               |
| `/api/admin/storage/signed-url`               | POST        | Signed URLs for uploads                             |
| `/api/admin/tagging`                          | POST        | Batch photo tagging                                 |
| `/api/admin/subjects`                         | GET, POST, PUT | Subject/student management                      |
| `/api/gallery/[id]`                           | GET         | Public gallery access                               |
| `/api/admin/orders`                           | GET         | Order management                                    |
| `/api/admin/store/preview/[assetId]`          | GET         | Store preview URL proxy                             |
| `/api/health`                                 | GET         | Health check                                        |
| **Total API routes**: **200+ endpoints**                                                                    |

---

## 🗄️ Modelos de Base de Datos
...
