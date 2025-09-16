# CODEMAP.md - LookEscolar Repo

Mapa completo del repositorio LookEscolar - Sistema de gestión de fotografía escolar.

---

## 🏗️ Arquitectura General

### **Framework y Tecnologías**
| Tecnología   | Versión   | Propósito                       |
|--------------|-----------|---------------------------------|
| **Next.js**  | 15.4.5    | Framework React SSR/SSG         |
| **React**    | 19.1.1    | Biblioteca de UI                |
| **TypeScript** | 5.9.2   | Tipado estático                 |
| **Node.js**  | >=18.0.0  | Runtime servidor                |

### **Base de Datos y Backend**
| Tecnología   | Propósito                                |
|--------------|------------------------------------------|
| **Supabase** | PostgreSQL + Auth + Storage + RLS        |
| **SQL Raw**  | Migraciones y queries directas           |
| **Sharp**    | Procesamiento de imágenes server-side    |

### **Storage y CDN**
| Servicio           | Propósito                                              |
|--------------------|--------------------------------------------------------|
| **Supabase Storage** | 2 buckets: `photo-private` (originales), `photos` (previews con watermark) |

### **Autenticación**
| Sistema         | Propósito                          |
|-----------------|------------------------------------|
| **Supabase Auth** | Admin: email/password           |
| **Tokens JWT**    | Family access con QR codes       |

### **Pagos**
| Sistema         | Propósito                         |
|-----------------|-----------------------------------|
| **Mercado Pago** | Pasarela de pagos con webhooks    |

---

## 📂 Estructura de Directorios

```
LookEscolar/
├── 📁 app/                    # Next.js 13+ App Router
│   ├── 📁 admin/             # Panel administrador
│   ├── 📁 api/               # API routes (193 endpoints)
│   ├── 📁 f/[token]/        # Galerías familiares
│   ├── 📁 gallery/          # Galerías públicas
│   └── 📁 s/[token]/        # Shared galleries 
├── 📁 components/            # Componentes React
│   ├── 📁 admin/            # Componentes admin-only
│   ├── 📁 family/           # Componentes family-facing
│   ├── 📁 gallery/          # Galerías públicas/compartidas
│   └── 📁 ui/               # Componentes UI base (shadcn/ui)
├── 📁 lib/                  # Lógica de negocio
│   ├── 📁 services/         # Servicios core del negocio
│   ├── 📁 security/         # Auth y validación
│   ├── 📁 supabase/        # Clientes Supabase
│   └── 📁 utils/           # Utilidades compartidas
├── 📁 supabase/             # Migraciones y config
│   └── 📁 migrations/      # 80+ archivos .sql
├── 📁 __tests__/            # Test suite completo
└── 📁 types/                # TypeScript definitions
```

---

## 🔌 Endpoints API (Top 20)

*(...sección recortada para brevedad...)*

**Total API routes**: 193 archivos `route.ts`

---

## 🎯 Componentes Admin Principales

*(...sección recortada para brevedad...)*

---

## 🗄️ Modelos de Base de Datos

*(...sección recortada para brevedad...)*

---

## 🔑 Variables de Entorno

### **Actuales** (detectadas en el código):
```plaintext
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://exaighpowgvbdappydyx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_EMTXt6SpU3aAPVR49xXasQ_rInjz0i7
SUPABASE_SERVICE_ROLE_KEY=sb_secret_NzrbdSf8lGB1pEErXUjbrQ_33yCrBgI

# Storage
STORAGE_BUCKET_ORIGINAL=photo-private
STORAGE_BUCKET_PREVIEW=photos
STORAGE_BUCKET=photo-private

# Application
NEXT_PUBLIC_SITE_URL=https://lookescolar-git-production-january-2025-baloskys-projects.vercel.app
NEXT_PUBLIC_APP_URL=https://lookescolar-git-production-january-2025-baloskys-projects.vercel.app
NODE_ENV=production
ALLOW_DEV_BYPASS=false

# Mercado Pago
NEXT_PUBLIC_MP_PUBLIC_KEY=TEST-fecda42a-2122-45d9-8197-7d3ec2600db5
MP_ACCESS_TOKEN=TEST-4339246343596066-080822-20fe555587c7ba5222e76eda6ee52a4e-15482461
MERCADOPAGO_ACCESS_TOKEN=TEST-4339246343596066-080822-20fe555587c7ba5222e76eda6ee52a4e-15482461
NEXT_PUBLIC_MP_ENVIRONMENT=sandbox

# Feature Flags
NEXT_PUBLIC_CENTRALITA_ENABLED=true
NEXT_PUBLIC_BASE_PRICE=1000
PHOTOS_DEFAULT_APPROVED=false
FF_UNIFIED_GALLERY_ENABLED=true
FF_EVENT_PHOTO_LIBRARY_ENABLED=true
FF_EVENT_PHOTO_LIBRARY_VIRTUALIZATION=true

# Rate Limiting (si aplica)
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

### **`.env.example` Propuesto**:
```env
# === SUPABASE ===
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key-aqui

# === STORAGE BUCKETS ===
STORAGE_BUCKET_ORIGINAL=photo-private
STORAGE_BUCKET_PREVIEW=photos
STORAGE_BUCKET=photo-private

# === APPLICATION ===
NODE_ENV=development
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
ALLOW_DEV_BYPASS=false

# === MERCADO PAGO ===
MP_ACCESS_TOKEN=APP_USR-tu-access-token-mp
NEXT_PUBLIC_MP_PUBLIC_KEY=APP_USR-tu-public-key-mp
MERCADOPAGO_ACCESS_TOKEN=APP_USR-tu-client-secret-mp
NEXT_PUBLIC_MP_ENVIRONMENT=sandbox

# === FEATURE FLAGS ===
NEXT_PUBLIC_CENTRALITA_ENABLED=false
NEXT_PUBLIC_BASE_PRICE=1000
PHOTOS_DEFAULT_APPROVED=false
FF_UNIFIED_GALLERY_ENABLED=false
FF_EVENT_PHOTO_LIBRARY_ENABLED=false
FF_EVENT_PHOTO_LIBRARY_VIRTUALIZATION=false

# === RATE LIMITING ===
UPSTASH_REDIS_REST_URL=https://tu-upstash.upstash.io
UPSTASH_REDIS_REST_TOKEN=tu-token-upstash

# === OPTIONAL ===
ADMIN_EMAIL=admin@tu-escuela.com
JWT_SECRET=tu-jwt-secret-256-bits
MP_WEBHOOK_SECRET=tu-webhook-secret-opcional
PHOTO_UPLOAD_MAX_SIZE=50000000
```
