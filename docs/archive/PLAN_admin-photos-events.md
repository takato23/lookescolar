# PLAN_admin-photos-events.md

## 🎯 Objetivo de la Iteración

Mejora iterativa y acotada de las páginas `/admin/events` y `/admin/photos` para prepararlas como secciones demo-ready con UX pulida, funcionalidades claras y navegación intuitiva.

**Alcance específico**: Solo páginas admin de eventos y fotos, componentes relacionados, sin tocar pagos/familia/DB schema.

---

## ✅ Checklist de UX/Funcionalidad

### 📅 /admin/events (Lista)

#### Filtros y Búsqueda
- [ ] **Filtro por texto**: Búsqueda por nombre/escuela con debounce 300ms
- [ ] **Filtro por estado**: Activo/Inactivo/Todos con badges visuales claros
- [ ] **Ordenamiento**: Recientes, Antiguos, Alfabético, por Actividad
- [ ] **Contador dinámico**: "X eventos encontrados (Y total)" en header

#### Acciones Rápidas por Fila
- [ ] **Gestionar fotos**: Link directo a `/admin/photos?eventId=${id}`
- [ ] **Reparar previews**: Botón que ejecuta endpoint de watermark regeneration
- [ ] **Publicar rápido**: Botón que copia link público `/gallery/${id}` al clipboard
- [ ] **Copiar link personalizado**: Si tiene tokens, copia link familiar
- [ ] **Ver estadísticas**: Hover/tooltip con métricas expandidas

#### Métricas Resumidas por Evento
- [ ] **Fotos**: Total/aprobadas con indicador visual de progreso
- [ ] **Última subida**: Timestamp relativo ("hace 2 horas")
- [ ] **Estudiantes**: Número de familias con tokens activos
- [ ] **Ingresos**: Revenue total con indicador de crecimiento
- [ ] **Estado QR**: Badge si hay fotos sin carpeta

#### Header y Navegación
- [ ] **Breadcrumbs**: Dashboard > Eventos
- [ ] **Header compacto**: Eliminar doble barra, espacios muertos
- [ ] **Botón crear evento**: Prominente, con ícono plus, en esquina superior derecha
- [ ] **Filtros en barra**: Búsqueda + filtros + ordenamiento en una línea

---

### 📋 /admin/events/[id] (Detalle)

#### Sistema de Pestañas
- [ ] **Pestaña Resumen**: Métricas, acciones rápidas, distribución escolar
- [ ] **Pestaña Estudiantes**: CSV uploader visible, gestión de carpetas/subjects
- [ ] **Pestaña Fotos**: Navegación a galería, estadísticas de fotos, link a admin
- [ ] **Pestaña Publicar**: Tokens, links públicos, herramientas de compartir

#### Importar CSV de Estudiantes (Mover aquí)
- [ ] **Ubicar en pestaña Estudiantes**: Sacar de donde esté y poner prominente
- [ ] **Hacer visible**: Título claro, descripción de formato esperado
- [ ] **Progress indicator**: Mostrar progreso de carga e importación
- [ ] **Validación previa**: Preview de datos antes de confirmar importación

#### Botones de Acción Principal
- [ ] **Reparar previews**: Con feedback de progreso y resultado
- [ ] **Reagrupar por QR**: Ejecutar endpoint de agrupación automática
- [ ] **Copiar link público**: `/gallery/${id}` con tooltip de confirmación
- [ ] **Ir a Fotos del evento**: Botón prominente a admin photos filtrado

#### Navegación Mejorada
- [ ] **Breadcrumbs**: Dashboard > Eventos > [Nombre Evento]
- [ ] **Botón volver**: Consistente, en posición fija
- [ ] **Navegación entre pestañas**: Keyboard support, URLs con hash
- [ ] **Estados de carga**: Skeletons específicos por pestaña

---

### 📸 /admin/photos

#### Contexto de Evento Fijo
- [ ] **Chip de contexto**: Si viene con ?eventId, mostrar chip con nombre evento
- [ ] **Opción "ver todas"**: Link para quitar filtro de evento
- [ ] **Información contextual**: "Subiendo a [Evento]" en header
- [ ] **Navegación de vuelta**: Botón claro para volver al evento

#### Sistema de Filtros Avanzado
- [ ] **Evento**: Dropdown con eventos disponibles + "Todos"
- [ ] **Carpeta/código**: Filtro por subject_id con nombres legibles
- [ ] **Estado**: Aprobada/Pendiente con badges coloridos
- [ ] **Taggeada**: Con tag/Sin tag + "Sin carpeta" específico
- [ ] **Fecha**: Subidas hoy/esta semana/este mes/rango personalizado
- [ ] **Búsqueda**: Por filename, evento, carpeta con highlighting

#### Toggle Vista Grid/Lista
- [ ] **Persistir en localStorage**: Recordar preferencia del usuario
- [ ] **Vista Grid**: Thumbnails + overlay con acciones rápidas
- [ ] **Vista Lista**: Tabla con columnas: Preview, Filename, Evento, Carpeta, Estado, Fecha
- [ ] **Density toggle**: Compacta/Normal/Cómoda para cantidad de items por vista

#### Selección Múltiple y Acciones
- [ ] **Checkbox por item**: Selección individual con Shift+click para rango
- [ ] **Select all visible**: Botón que selecciona solo los filtrados
- [ ] **Barra de acciones**: Aparece cuando hay selección, sticky al scroll
- [ ] **Aprobar lote**: Batch approval con confirmación
- [ ] **Eliminar lote**: Con confirmación y count específico
- [ ] **Mover a carpeta**: Modal con lista de carpetas disponibles
- [ ] **Tag/Untag lote**: Asignar o quitar de carpetas específicas

#### Post-Subida Experience
- [ ] **Toast contextual**: "X fotos subidas al evento [nombre]"
- [ ] **Auto-refresh**: Actualizar lista automáticamente sin perder filtros
- [ ] **Scroll to new**: Si es posible, hacer scroll a las fotos recién subidas
- [ ] **Quick actions**: En toast, botones rápidos "Ver fotos" "Etiquetar ahora"

#### Performance y Accesibilidad
- [ ] **Lazy loading**: Intersection Observer para imágenes fuera de viewport
- [ ] **Responsive images**: width/height attributes, multiple sizes
- [ ] **Loading states**: `loading="lazy"`, `decoding="async"`
- [ ] **Srcset/sizes**: Para diferentes densidades de pantalla
- [ ] **Blur placeholder**: Durante carga de thumbnails
- [ ] **Solo previews**: NUNCA mostrar originales, siempre watermarked previews
- [ ] **Alt text descriptivo**: Para screen readers
- [ ] **Keyboard navigation**: Tab order lógico, shortcuts principales

---

## ✔️ Criterios de Aceptación

### Funcionalidad
- [ ] Filtros funcionan sin recargar página
- [ ] Selección múltiple mantiene estado al cambiar filtros
- [ ] Acciones por lote muestran feedback en tiempo real
- [ ] Auto-refresh no pierde contexto de filtros/selección
- [ ] URLs son bookmarkeables (filtros en query params)

### Performance
- [ ] Primera carga < 3s con 100+ fotos
- [ ] Scroll smooth con 500+ items en vista
- [ ] Filtros responden < 300ms
- [ ] Lazy loading funciona correctamente

### UX/Accesibilidad
- [ ] Navegación clara entre secciones
- [ ] Estados vacíos con CTAs útiles
- [ ] Mensajes de error específicos y accionables
- [ ] Responsive en mobile (320px+)
- [ ] Keyboard navigation completa
- [ ] Screen reader friendly

### Visual/Consistencia
- [ ] Mantiene liquid-glass design system
- [ ] Iconografía consistente (Lucide icons)
- [ ] Loading states uniformes
- [ ] Hover/focus states claros
- [ ] Spacing coherente (Tailwind)

---

## 🧪 Plan de Pruebas Manuales

### /admin/events
1. **Filtro y búsqueda**: Escribir nombre evento, ver filtrado inmediato
2. **Acciones rápidas**: Click en "Gestionar fotos" lleva a photos filtradas
3. **Reparar previews**: Click muestra progreso, mensaje de confirmación
4. **Copiar link**: Click copia al clipboard, muestra toast confirmación
5. **Métricas**: Hover en stats muestra tooltip con detalle
6. **Responsive**: Resize ventana, verificar mobile layout
7. **Navegación**: Breadcrumbs funcionan, botón crear evento visible
8. **Estados vacíos**: Con 0 eventos, mostrar estado vacío útil

### /admin/events/[id]
1. **Pestañas**: Click en cada pestaña carga contenido correcto
2. **Importar CSV**: Pestaña Estudiantes muestra uploader prominente
3. **Acciones**: Botones ejecutan acción correcta con feedback
4. **Navegación**: Breadcrumbs y botón volver funcionan
5. **URLs**: Pestañas cambian URL, refresh mantiene pestaña activa

### /admin/photos
1. **Filtro evento**: Query param ?eventId filtra correctamente
2. **Toggle vista**: Grid/Lista persiste en localStorage
3. **Selección múltiple**: Shift+click selecciona rango, actions bar aparece
4. **Post-subida**: Toast muestra, lista se actualiza, mantiene filtros
5. **Performance**: Scroll con 200+ fotos es smooth, lazy loading funciona
6. **Responsive**: Mobile layout usable, touch targets adecuados
7. **Accessibility**: Tab navigation, screen reader labels
8. **Filtros avanzados**: Combinación de múltiples filtros funciona

---

## ⚠️ Riesgos y Mitigación

### Riesgo: Cambios rompen funcionalidad existente
**Probabilidad**: Media | **Impacto**: Alto
**Mitigación**: 
- Testing exhaustivo de happy paths existentes
- Mantener backward compatibility en APIs
- Feature flags para rollback rápido

### Riesgo: Performance degradation con muchas fotos
**Probabilidad**: Media | **Impacto**: Medio
**Mitigación**:
- Implementar paginación virtual
- Optimizar queries de base de datos
- Monitoreo de performance con Core Web Vitals

### Riesgo: UX confuso para usuarios existentes
**Probabilidad**: Baja | **Impacto**: Medio
**Mitigación**:
- Mantener flows principales intactos
- Progressive enhancement vs. breaking changes
- User feedback loop durante development

### Riesgo: Mobile experience degradada
**Probabilidad**: Baja | **Impacto**: Alto
**Mitigación**:
- Mobile-first development approach
- Testing en dispositivos reales
- Touch interaction optimization

---

## 📋 Limitaciones Aceptadas

### No Hacer en Esta Iteración
- ❌ No modificar endpoints de pagos/checkout/webhook
- ❌ No cambiar esquema de base de datos ni migraciones
- ❌ No romper compatibilidad de API existente
- ❌ No tocar sistema de tokens familiares
- ❌ No rediseñar componentes de UI base (mantener liquid-glass)
- ❌ No implementar real-time updates (WebSocket/SSE)
- ❌ No agregar analytics/tracking avanzado

### Trade-offs Conscientes
- **Simplicidad vs. Features**: Preferir UX clara sobre funcionalidad avanzada
- **Performance vs. Real-time**: Usar polling/refresh manual vs. auto-updates
- **Móvil vs. Desktop**: Optimizar para mobile pero mantener desktop usable
- **Accesibilidad vs. Complejidad**: Implementar basics, no certificación completa

---

---

## 🖼️ Galerías Cliente (Extensión del Plan)

Basándome en el análisis del sistema de compartir, también incluyo mejoras para garantizar que las galerías públicas y familiares sean consistentes y funcionen correctamente.

### 📍 /gallery/[eventId] (Galería Pública)

#### Consistencia de Diseño
- [ ] **Mantener liquid-glass theme**: Aplicar mismo sistema de diseño de admin
- [ ] **Header consistente**: Similar estilo a admin pero adaptado para cliente
- [ ] **Loading states**: Skeletons coherentes con el resto de la app
- [ ] **Responsive design**: Mobile-first como en admin

#### Funcionalidad de Compartir
- [ ] **Validación de evento**: Error user-friendly si evento no existe/inactivo
- [ ] **Empty state mejorado**: Guía clara si no hay fotos aprobadas
- [ ] **SEO optimizado**: Meta tags correctos para compartir en redes
- [ ] **Performance**: Lazy loading y optimización de imágenes

### 🏠 /f/[token] (Galería Familiar)

#### Sistema Unificado
- [ ] **Feature flag integration**: Manejar transición a UnifiedGallery
- [ ] **Legacy fallback**: SimpleGalleryPage como backup
- [ ] **Token validation**: Mensajes de error claros y accionables
- [ ] **Session management**: Carrito y favoritos persistentes

#### UX Familiar Mejorada
- [ ] **Header familiar**: Información contextual del estudiante/evento
- [ ] **Filtros básicos**: Favoritos, seleccionadas, todas
- [ ] **Cart experience**: Checkout flow claro y confiable
- [ ] **Mobile optimization**: Touch interactions optimizadas

### 🔗 Sistema de Compartir desde Admin

#### /admin/events/[id] - Pestaña Publicar
- [ ] **Copiar link público**: `/gallery/${id}` con tooltip confirmación
- [ ] **Generar tokens familiares**: CSV export y plantilla email  
- [ ] **Vista previa**: Botón para ver como cliente
- [ ] **Estadísticas de acceso**: Tracking básico de vistas

#### /admin/events - Acciones Rápidas
- [ ] **Publicar rápido**: Botón que copia link público
- [ ] **Estado de publicación**: Badge visual si evento público/privado
- [ ] **Link personalizado**: Si tiene tokens, mostrar opción familia

---

## 🧪 Plan de Pruebas Ampliado

### Flujo Completo de Compartir
1. **Admin crea evento**: Verifica creación exitosa, estadísticas en cero
2. **Sube fotos**: Verifica que aparecen en galería admin y contador actualiza
3. **Aprueba fotos**: Marca como aprobadas, verifica que aparecen en galería pública
4. **Copia link público**: Va a `/gallery/[id]`, verifica que fotos aparecen
5. **Genera tokens**: Exporta CSV, verifica formato correcto
6. **Acceso familiar**: Va a `/f/[token]`, verifica galería personalizada
7. **Test de checkout**: Proceso de compra familiar completo

### Estados de Error
8. **Link público evento inactivo**: Error user-friendly, no 404 técnico
9. **Token inválido/expirado**: Mensaje claro con pasos a seguir  
10. **Galería sin fotos**: Empty state con instrucciones
11. **Mobile responsive**: Todas las galerías usables en mobile

---

**Estimación Actualizada**: 4-5 días de desarrollo + 1.5 días de testing
**Prioridad**: Alto - Demo-ready experience + sistema compartir funcional
**Dependencies**: Ninguna, todo self-contained