# Guía de Migración - Sistema Unificado de Fotos

## ✅ Cambios Implementados

### 1. Redirects Automáticos
Los siguientes routes ahora redirigen al sistema unificado:

- `app/admin/events/[id]/library/page.tsx` → `/admin/photos?event_id=${eventId}`
- `app/admin/events/[id]/unified/page.tsx` → `/admin/photos?event_id=${eventId}`
- `app/admin/photos-unified/page.tsx` → `/admin/photos`

### 2. Componentes Deprecated
Los siguientes componentes han sido marcados como DEPRECATED:

- `components/admin/EventPhotoManager.tsx`
- `components/admin/UnifiedPhotoManagement.tsx`
- `components/admin/GroupPhotoManager.tsx`
- `components/admin/BulkPhotoManager.tsx`

### 3. Sistema Unificado
- **Punto de entrada único**: `/admin/photos`
- **Contexto de evento**: `/admin/photos?event_id={eventId}`
- **Componente principal**: `PhotoAdmin` en `components/admin/PhotoAdmin.tsx`

## 🚀 Cómo Usar el Sistema Unificado

### Para Vista General
```tsx
import Link from 'next/link';

// Enlace a vista general de fotos
<Link href="/admin/photos">
  <Button>Gestionar Fotos</Button>
</Link>
```

### Para Evento Específico
```tsx
import Link from 'next/link';

// Enlace a fotos de evento específico
<Link href={`/admin/photos?event_id=${eventId}`}>
  <Button>Fotos del Evento</Button>
</Link>
```

### Uso Directo del Componente
```tsx
import { PhotoAdmin } from '@/components/admin/PhotoAdmin';

export default function MyPhotoPage() {
  return (
    <PhotoAdmin
      className="h-screen"
      enableUpload={true}
      enableBulkOperations={true}
    />
  );
}
```

## 🗑️ Limpieza Pendiente

### Después de Validar (1-2 semanas):
1. Eliminar componentes deprecated completamente
2. Remover routes que ahora son redirects
3. Limpiar imports y referencias obsoletas

### Comandos para Limpieza Final:
```bash
# Eliminar componentes deprecated
rm components/admin/EventPhotoManager.tsx
rm components/admin/UnifiedPhotoManagement.tsx
rm components/admin/GroupPhotoManager.tsx
rm components/admin/BulkPhotoManager.tsx

# Eliminar routes obsoletos (después de validar redirects)
rm -rf app/admin/events/[id]/library/
rm -rf app/admin/events/[id]/unified/
rm -rf app/admin/photos-unified/
```

## 📊 Beneficios del Sistema Unificado

1. **Simplicidad**: Un solo punto de entrada para gestión de fotos
2. **Consistencia**: Una sola UI/UX en toda la aplicación  
3. **Mantenibilidad**: Menos código duplicado
4. **Performance**: Componente optimizado con virtualización
5. **Escalabilidad**: Soporte para jerarquía de 4 niveles

## 🔧 Solución de Problemas

### Si un enlace no funciona:
1. Verificar que el redirect esté en su lugar
2. Comprobar que `/admin/photos` esté funcionando
3. Revisar query parameters para contexto de evento

### Si faltan funcionalidades:
1. El sistema unificado incluye todas las funcionalidades anteriores
2. Verificar que `enableUpload` y `enableBulkOperations` estén habilitados
3. Revisar permisos de usuario

---

Migración completada: 2025-09-03T04:52:49.199Z
Sistema objetivo: /admin/photos (PhotoAdmin component)
