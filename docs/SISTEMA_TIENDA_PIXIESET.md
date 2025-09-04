# 🛒 SISTEMA DE TIENDA ESTILO PIXIESET - LookEscolar

## 🎯 **OBJETIVO: Sistema Robusto, Simple y Funcional**

### **📊 Modelo PixieSet Analizado:**
```
EVENTO (Carpeta Principal)
  ├── COLECCIÓN 1 (Nivel Secundario) 
  │   ├── SUBCARPETA A (6to A) - 15 fotos
  │   └── SUBCARPETA B (6to B) - 12 fotos
  └── COLECCIÓN 2 (Nivel Primario)
      └── SUBCARPETA A (4to A) - 8 fotos

TIENDA INTEGRADA:
• Opción A: Comprar fotos individuales
• Opción B: Comprar álbum completo (carpeta/colección)
• Checkout simple y robusto
```

---

## 🏗️ **ARQUITECTURA DEL SISTEMA**

### **1. FLUJO PRINCIPAL DEL CLIENTE**
```
📱 QR/Enlace → 🎪 Galería Pública → 🛒 Selección → 💳 Checkout → ✅ Compra
```

### **2. ESTRUCTURA DE DATOS**
```typescript
interface EventStore {
  evento: {
    id: string;
    nombre: string;
    colecciones: Coleccion[];
  }
}

interface Coleccion {
  id: string;
  nombre: string; // "Nivel Secundario"
  subcarpetas: Subcarpeta[];
  precio_album: number; // Precio del álbum completo
}

interface Subcarpeta {
  id: string;
  nombre: string; // "6to A"
  fotos: Foto[];
  precio_individual: number; // Precio por foto
}

interface OpcionCompra {
  tipo: 'individual' | 'album_subcarpeta' | 'album_coleccion' | 'evento_completo';
  precio: number;
  descripcion: string;
}
```

---

## 🎪 **INTERFAZ DE GALERÍA PÚBLICA**

### **Página Principal: `/gallery/[eventId]`**
```
┌─────────────────────────────────────────┐
│ 📸 EVENTO FOTOGRAFICO ESCUELA XYZ       │
│ 📅 Fecha: 15 de Marzo 2024             │
├─────────────────────────────────────────┤
│                                         │
│ 📁 NIVEL SECUNDARIO (27 fotos) 👉      │
│   ├── 📚 6to A (15 fotos)              │
│   └── 📚 6to B (12 fotos)              │
│                                         │
│ 📁 NIVEL PRIMARIO (8 fotos) 👉         │
│   └── 📚 4to A (8 fotos)               │
│                                         │
├─────────────────────────────────────────┤
│ 🛒 MI CARRITO (0 items) | 💰 $0        │
└─────────────────────────────────────────┘
```

### **Página de Colección: `/gallery/[eventId]/[coleccionId]`**
```
┌─────────────────────────────────────────┐
│ ← Volver | 📁 NIVEL SECUNDARIO          │
├─────────────────────────────────────────┤
│                                         │
│ 🛒 OPCIONES DE COMPRA:                  │
│ ┌─────────────────────────────────────┐ │
│ │ 📦 ÁLBUM COMPLETO - $25             │ │
│ │ Todas las fotos del nivel (27)     │ │
│ │ [AGREGAR AL CARRITO]                │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ 📚 CURSOS DISPONIBLES:                  │
│ ┌─────────────────────────────────────┐ │
│ │ 6to A (15 fotos) - Ver fotos 👉    │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ 6to B (12 fotos) - Ver fotos 👉    │ │
│ └─────────────────────────────────────┘ │
│                                         │
├─────────────────────────────────────────┤
│ 🛒 MI CARRITO (0 items) | 💰 $0        │
└─────────────────────────────────────────┘
```

### **Página de Subcarpeta: `/gallery/[eventId]/[coleccionId]/[subcarpetaId]`**
```
┌─────────────────────────────────────────┐
│ ← Volver | 📚 6to A                     │
├─────────────────────────────────────────┤
│                                         │
│ 🛒 OPCIONES DE COMPRA:                  │
│ ┌─────────────────────────────────────┐ │
│ │ 📦 ÁLBUM 6to A - $12                │ │
│ │ Todas las fotos del curso (15)     │ │
│ │ [AGREGAR AL CARRITO]                │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ 📸 FOTOS INDIVIDUALES ($2 c/u):         │
│ ┌──┬──┬──┬──┬──┐                       │
│ │🖼️│🖼️│🖼️│🖼️│🖼️│ ← Click para selec.   │
│ └──┴──┴──┴──┴──┘                       │
│ ┌──┬──┬──┬──┬──┐                       │
│ │🖼️│🖼️│🖼️│🖼️│🖼️│                       │
│ └──┴──┴──┴──┴──┘                       │
│                                         │
│ ✅ Seleccionadas: 3 fotos ($6)          │
│ [AGREGAR SELECCIÓN AL CARRITO]          │
│                                         │
├─────────────────────────────────────────┤
│ 🛒 MI CARRITO (0 items) | 💰 $0        │
└─────────────────────────────────────────┘
```

---

## 🛒 **SISTEMA DE CARRITO Y CHECKOUT**

### **Carrito Drawer (Sidebar deslizable):**
```
┌─────────────────────────┐
│ 🛒 MI CARRITO          │
├─────────────────────────┤
│                         │
│ 📦 Álbum 6to A         │
│ 15 fotos - $12         │
│ [QUITAR]               │
│                         │
│ 🖼️ 3 Fotos individuales │
│ Nivel Secundario - $6   │
│ [VER FOTOS] [QUITAR]   │
│                         │
├─────────────────────────┤
│ SUBTOTAL: $18          │
│ DESCUENTO: -$2         │
│ TOTAL: $16             │
│                         │
│ [💳 CHECKOUT]          │
│                         │
└─────────────────────────┘
```

### **Página de Checkout: `/gallery/[eventId]/checkout`**
```
┌─────────────────────────────────────────┐
│ 💳 FINALIZAR COMPRA                     │
├─────────────────────────────────────────┤
│                                         │
│ 📋 RESUMEN DEL PEDIDO:                  │
│ • Álbum 6to A (15 fotos) - $12         │
│ • 3 Fotos individuales - $6            │
│ TOTAL: $16                              │
│                                         │
│ 📝 DATOS DE CONTACTO:                   │
│ [Nombre completo]                       │
│ [Email]                                 │
│ [Teléfono]                              │
│                                         │
│ 📦 MÉTODO DE ENTREGA:                   │
│ ( ) Email (digital) - GRATIS           │
│ ( ) Retiro en escuela - GRATIS          │
│ ( ) Envío a domicilio - +$5             │
│                                         │
│ 💳 MÉTODO DE PAGO:                      │
│ [PAGAR CON MERCADOPAGO]                 │
│                                         │
└─────────────────────────────────────────┘
```

---

## 🔧 **IMPLEMENTACIÓN TÉCNICA**

### **APIs Necesarias:**
```
GET /api/public/gallery/event/[eventId]
├── Retorna: evento + colecciones + subcarpetas
├── Sin fotos (solo metadata y contadores)
└── Para página principal de galería

GET /api/public/gallery/event/[eventId]/[coleccionId]
├── Retorna: colección + subcarpetas + opciones de compra
└── Para página de colección

GET /api/public/gallery/event/[eventId]/[coleccionId]/[subcarpetaId]
├── Retorna: subcarpeta + fotos + opciones de compra
└── Para página de subcarpeta con fotos

POST /api/public/cart
├── Body: { eventId, items: [{ tipo, id, precio }] }
├── Retorna: carrito actualizado
└── Para agregar/quitar items del carrito

POST /api/public/checkout
├── Body: { carrito, datos_contacto, metodo_entrega }
├── Integra con MercadoPago
└── Retorna: link de pago
```

### **Componentes React:**
```
components/public/
├── EventGallery.tsx          # Página principal
├── CollectionGallery.tsx     # Vista de colección  
├── SubfolderGallery.tsx      # Vista de subcarpeta con fotos
├── CartDrawer.tsx            # Carrito deslizable
├── CheckoutForm.tsx          # Formulario de checkout
├── ProductCard.tsx           # Tarjeta de producto (álbum/foto)
└── PurchaseOptions.tsx       # Opciones de compra
```

---

## 🎯 **PRICING STRATEGY**

### **Estructura de Precios:**
```typescript
interface PricingTiers {
  foto_individual: 200; // $2 ARS
  album_subcarpeta: 1200; // $12 ARS (15 fotos)
  album_coleccion: 2500; // $25 ARS (27 fotos) 
  evento_completo: 4000; // $40 ARS (35 fotos)
  
  // Descuentos automáticos:
  descuento_3_fotos: 10; // 10% off en 3+ fotos individuales
  descuento_album: 20; // 20% off vs precio individual
}
```

### **Lógica de Descuentos:**
- **3+ fotos individuales**: 10% descuento automático
- **Álbum vs Individual**: Siempre 20% más barato que fotos individuales
- **Evento completo**: Mejor precio posible

---

## 📱 **EXPERIENCIA MÓVIL FIRST**

### **Optimizaciones:**
- **Touch gestures** para navegación entre fotos
- **Lazy loading** para cargar fotos progresivamente  
- **PWA** para funcionamiento offline
- **Carrito persistente** en localStorage
- **Interfaz táctil** optimizada para dedos

---

## 🚀 **FASES DE IMPLEMENTACIÓN**

### **Fase 1: MVP (2-3 días)**
- ✅ Galería pública básica
- ✅ Sistema de carrito simple
- ✅ Checkout con MercadoPago
- ✅ Estructura de eventos/colecciones/subcarpetas

### **Fase 2: Optimización (1-2 días)**
- ✅ Descuentos automáticos
- ✅ Mejoras UX/UI
- ✅ Optimización móvil
- ✅ Notificaciones de estado

### **Fase 3: Avanzado (1-2 días)**
- ✅ Analytics de ventas
- ✅ Gestión de inventario
- ✅ Múltiples métodos de entrega
- ✅ Personalización de precios por evento

---

## 🏆 **RESULTADO ESPERADO**

**Un sistema de tienda que sea:**
- ✅ **Robusto**: Maneja errores, estados de carga, fallbacks
- ✅ **Simple**: Flujo intuitivo en 3 clicks máximo
- ✅ **Funcional**: Integración completa con pagos y entrega
- ✅ **Completo**: Desde galería hasta venta, todo conectado

**Como PixieSet pero mejor integrado con tu flujo actual.**



