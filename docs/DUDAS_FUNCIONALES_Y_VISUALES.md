## Dudas funcionales y visuales (para revisión)

### 1) Etiquetado manual: endpoint correcto
- Hoy `TaggingModal` llama a `onTag(studentId, studentName)` y en `app/admin/photos/page.tsx` se resuelve con `POST /api/admin/tagging` usando `{ photoId, codeId: subjectId }` (carpetas).
- ¿Confirmamos que el etiquetado a alumnos debe usar `POST /api/admin/photos/assign-subject` con `{ photoId, subjectId }`? Esto resolvería el error visto y alinea con `photo_subjects`.

### 2) Previews en admin: evitar alta calidad
- En admin aún aparecen imágenes “pesadas” cuando falla el `preview_path` y se hace fallback a original.
- ¿Aprobamos política: nunca mostrar original como `preview`? Si falta `preview_path`, mostrar placeholder o intentar `watermark_path` primero.
- ¿Generamos previews WebP a tamaños fijos (p. ej., 512px y 1024px) post-upload?

### 3) Visibilidad en galería pública vs familia
- Pública (`/gallery/[eventId]`): solo fotos aprobadas.
- Familia (`/f/[token]`): ¿exige aprobación o basta asignación a `subject`? Definir para coherencia con moderación.

### 4) Unificación “modo QR”/“modo sesión”/manual
- Los tres flujos conviven. ¿Definimos prioridades de UX?
  - Manual para casos puntuales.
  - QR para sesiones en vivo.
  - Sesión para pre-lista completa.
- ¿Necesitamos métricas por modo de etiquetado?

### 5) Gestión de carpetas (codes)
- ¿Vamos a exponer UI clara de “sin carpeta” (null) y mover a códigos con DnD como flujo principal?
- ¿Se requiere crear códigos desde UI de fotos o solo desde Publish?

### 6) Importación CSV/Excel
- Confirmar formato de archivo y columnas mínimas (nombre, email, grado/sección, etc.).
- ¿Validación con `zod` en client antes de enviar a `/api/admin/subjects/bulk`?

### 7) Mercado Pago: fuente única de verdad de checkout
- Hoy conviven dos flujos: selección pública + create-preference y carrito familiar.
- ¿Unificamos en un único servicio con cálculo de totales consistente y auditoría?

### 8) Accesibilidad
- Confirmar `aria-label` en todos los botones críticos (modales, mover, aprobar, etiquetar, descargar).
- ¿Necesitamos “focus-visible” reforzado para acciones flotantes sobre tarjetas?

### 9) Rendimiento admin
- Cargar 100 fotos por página. ¿Paginación/virtualización suficiente? `VirtualPhotoGrid` está integrado; validar en colecciones grandes.
- ¿Preload de previews al abrir modal de preview?

### 10) Seguridad y registros
- ¿En producción forzamos auth en todos los endpoints admin (ya está con `withAuth`), y bloqueamos endpoints “simple/legacy”?
- ¿Retención de logs (webhook, tagging, deletes) y exportación periódica?


