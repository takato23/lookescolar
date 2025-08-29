# 🏪 **SISTEMA DE TIENDAS UNIFICADO - LookEscolar**

## 🎯 **Visión General**

El **Sistema de Tiendas Unificado** es la solución centralizada para todas las tiendas de fotos de LookEscolar. En lugar de tener múltiples componentes de tienda diferentes, ahora existe **UNA SOLA TIENDA** que se adapta según el tipo de token de acceso.

## 🚀 **Beneficios de la Unificación**

### **Antes (Sistema Fragmentado):**
- ❌ 4-5 componentes de tienda diferentes
- ❌ Lógica duplicada en cada uno
- ❌ Mantenimiento complejo
- ❌ UX inconsistente entre rutas
- ❌ Diferentes sistemas de carrito

### **Después (Sistema Unificado):**
- ✅ **1 componente de tienda** (`UnifiedStore`)
- ✅ **Lógica centralizada** en un solo lugar
- ✅ **Mantenimiento simple** y eficiente
- ✅ **UX consistente** para todas las familias
- ✅ **Sistema de carrito unificado**

## 🏗️ **Arquitectura del Sistema**

### **Flujo de Acceso Unificado:**
```
Cualquier Token → Validación → Tienda Unificada → Contenido Filtrado
     ↓              ↓              ↓              ↓
/s/[token]    hierarchical    /store-unified/   Fotos según
/f/[token]    Gallery        [token]           scope del token
/store/[token] Service       ↓
/public/gallery/[token]      UnifiedStore
```

### **Componentes Principales:**

1. **`/store-unified/[token]`** - Página principal unificada
2. **`UnifiedStore`** - Componente de tienda único
3. **`hierarchicalGalleryService`** - Validación y scope de tokens
4. **`useUnifiedStore`** - Estado centralizado de la tienda

## 🔑 **Sistema de Tokens y Scope**

### **Tipos de Tokens Soportados:**

| Tipo | Scope | Acceso | Ejemplo |
|------|-------|---------|---------|
| **Event** | `event` | Todas las fotos del evento | `/s/event_token_123` |
| **Course** | `course` | Fotos del curso específico | `/s/course_token_456` |
| **Family** | `family` | Solo fotos del estudiante | `/s/family_token_789` |
| **Store** | `store` | Tienda específica | `/store/store_token_abc` |

### **Validación Inteligente:**
```typescript
// El servicio determina automáticamente el scope
const validation = await hierarchicalGalleryService.validateAccess(token);

if (validation.isValid) {
  const context = validation.context!;
  // context.scope = 'event' | 'course' | 'family'
  // context.resourceId = ID del recurso
  // context.resourceName = Nombre del recurso
}
```

## 🛍️ **Funcionalidades de la Tienda Unificada**

### **Características Principales:**
- 🖼️ **Galería de Fotos** con thumbnails con watermark
- 📦 **Sistema de Paquetes** predefinidos
- 🛒 **Carrito de Compras** unificado
- 💳 **Checkout** integrado con MercadoPago
- 🎨 **Temas Visuales** según el evento
- 📱 **Responsive Design** para todos los dispositivos

### **Sistema de Precios:**
```typescript
const PRICING = {
  individual: 1500,    // $15.00 por foto individual
  package_5: 6000,     // $60.00 por paquete de 5
  package_10: 10000,   // $100.00 por paquete de 10
  shipping: 2000       // $20.00 envío
};
```

## 🔄 **Sistema de Redirecciones**

### **Rutas que Redirigen a Tienda Unificada:**

| Ruta Original | Redirección | Propósito |
|---------------|--------------|-----------|
| `/s/[token]` | `/store-unified/[token]` | Tokens jerárquicos |
| `/f/[token]` | `/store-unified/[token]` | Tokens familiares |
| `/store/[token]` | `/store-unified/[token]` | Tokens de tienda |
| `/public/gallery/[token]` | Mantiene funcionalidad | Galerías públicas |

### **Implementación de Redirecciones:**
```typescript
// Todas las rutas redirigen a la tienda unificada
export default async function LegacyPage({ params }: PageProps) {
  const { token } = await params;
  redirect(`/store-unified/${token}`);
}
```

## 🎨 **Sistema de Temas**

### **Temas Disponibles:**
1. **Default** - Tema estándar
2. **Jardín** - Colores suaves y amigables
3. **Secundaria** - Estilo moderno y profesional
4. **Bautismo** - Tema elegante y formal

### **Aplicación Automática:**
```typescript
// El tema se determina según el evento
const eventTheme = subject.event.theme || 'default';
// Se aplica automáticamente en la tienda
```

## 🔒 **Seguridad y Privacidad**

### **Protecciones Implementadas:**
- ✅ **Validación de Tokens** en cada acceso
- ✅ **Scope-based Access** (cada familia ve solo sus fotos)
- ✅ **Watermark Automático** en todas las previews
- ✅ **Rate Limiting** para prevenir abuso
- ✅ **Audit Logging** de todos los accesos

### **Filtrado de Contenido:**
```typescript
// Las fotos se filtran automáticamente según el scope
const photos = assets.assets.filter(asset => {
  if (context.scope === 'family') {
    return asset.taggedStudents.includes(context.resourceId);
  }
  // Otros scopes...
});
```

## 📊 **Manejo de Errores**

### **Página de Error Unificada:**
- `/error?reason=invalid-token` - Token inválido
- `/error?reason=expired-token` - Token expirado
- `/error?reason=validation-failed` - Error de validación

### **Acciones de Recuperación:**
- 🔄 Reintentar acceso
- 📞 Contactar a la escuela
- 📧 Solicitar nuevo enlace
- 🏠 Volver al inicio

## 🚀 **Implementación Técnica**

### **Archivos Principales:**
```
app/
├── store-unified/[token]/page.tsx    # Página unificada principal
├── s/[token]/page.tsx               # Redirección a tienda unificada
├── f/[token]/page.tsx               # Redirección a tienda unificada
├── store/[token]/page.tsx           # Redirección a tienda unificada
└── error/page.tsx                   # Página de errores

components/
└── store/
    └── UnifiedStore.tsx             # Componente de tienda único

lib/
├── services/
│   └── hierarchical-gallery.service.ts  # Validación de tokens
└── stores/
    └── unified-store.ts             # Estado de la tienda
```

### **Flujo de Datos:**
```typescript
// 1. Usuario accede con cualquier token
// 2. Se valida el token y se determina el scope
// 3. Se obtienen las fotos según el scope
// 4. Se renderiza UnifiedStore con datos filtrados
// 5. Usuario ve la misma interfaz pero contenido personalizado
```

## 🔧 **Mantenimiento y Escalabilidad**

### **Ventajas del Sistema Unificado:**
- 🎯 **Un solo lugar** para cambios en la tienda
- 📈 **Escalabilidad** automática para nuevos tipos de tokens
- 🐛 **Debugging** centralizado
- 🚀 **Performance** optimizado (una sola implementación)
- 📱 **Consistencia** en todas las plataformas

### **Agregar Nuevos Tipos de Tokens:**
```typescript
// Solo agregar el nuevo scope en el servicio
// La tienda se adapta automáticamente
const newScope = 'workshop'; // Nuevo tipo
// No hay que tocar el componente de tienda
```

## 📈 **Métricas y Monitoreo**

### **Logs del Sistema:**
- ✅ Accesos exitosos a la tienda
- ❌ Intentos de acceso fallidos
- 📊 Tiempo de respuesta por token
- 🔍 Scope y recursos accedidos

### **Dashboard de Monitoreo:**
```typescript
// Ejemplo de log de acceso
await hierarchicalGalleryService.logAccess(token, 'store_access', {
  success: true,
  responseTimeMs: 150,
  notes: `Unified store access to ${context.scope} gallery`
});
```

## 🎉 **Resultado Final**

### **Lo que Logramos:**
1. **✅ Una sola tienda** para todas las familias
2. **✅ Misma experiencia** sin importar cómo lleguen
3. **✅ Mantenimiento simple** y eficiente
4. **✅ Escalabilidad automática** para nuevos tokens
5. **✅ UX consistente** en toda la plataforma
6. **✅ Seguridad centralizada** y robusta

### **Compatibilidad hacia Atrás:**
- 🔄 **Todas las URLs existentes** siguen funcionando
- 🔄 **Redirección automática** a la nueva tienda
- 🔄 **No se pierde tráfico** ni funcionalidad
- 🔄 **Migración transparente** para los usuarios

---

**🎯 El Sistema de Tiendas Unificado es la solución definitiva para escalar LookEscolar sin fragmentar la experiencia del usuario. Una tienda, infinitas posibilidades.**

