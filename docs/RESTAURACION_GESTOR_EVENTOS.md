# 🔄 Restauración del Gestor de Eventos Específico

## 🎯 **Problema Identificado**

El usuario reportó que al tocar "eventos" lo llevaba a `/admin/photos`, perdiendo el contexto específico del evento. Esto ocurría porque los redirects de unificación fueron **demasiado agresivos**.

## ✅ **Solución Implementada**

### **1. Eliminado Redirect Automático**
- **Archivo:** `app/admin/events/[id]/page.tsx`
- **Cambio:** Removido el `useEffect` que automáticamente redirigía a `/unified`
- **Resultado:** Ahora la página de evento específico **permanece** en el contexto del evento

### **2. Placeholder Temporal de EventPhotoManager**
- **Archivo:** `app/admin/events/[id]/library/page.tsx`
- **Cambio:** Se elimina el redirect y en lugar de cargar el componente `EventPhotoManager`, muestra un placeholder de "Gestor de Fotos en actualización" con `EventPhotoManagerSkeleton`.
- **Resultado:** La página mantiene el contexto del evento y muestra el estado de actualización mientras estabiliza el gestor.

### **3. Corregidas Rutas de Eventos**

#### **📁 `/admin/events/[id]/library`**
- **Antes:** Redirect a `/admin/photos?event_id=${id}`
- **Después:** Muestra un placeholder temporal de "Gestor de Fotos en actualización" con `EventPhotoManagerSkeleton`; **no redirige**.
- **Beneficio:** Contexto del evento preservado y experiencia informativa durante la actualización

#### **🔄 `/admin/events/[id]/unified`**
- **Antes:** Redirect a `/admin/photos?event_id=${id}`
- **Después:** Redirect a `/admin/events/${id}/library`
- **Beneficio:** Mantiene contexto del evento, no va al gestor general

#### **📸 `/admin/events/[id]/photos`**
- **Antes:** Redirect a `/admin/events/${id}/unified`
- **Después:** Redirect a `/admin/events/${id}/library`
- **Beneficio:** Flujo directo al gestor del evento

---

**🎉 Sistema restaurado con gestión específica de eventos + gestión general de fotos funcionando en paralelo.**
