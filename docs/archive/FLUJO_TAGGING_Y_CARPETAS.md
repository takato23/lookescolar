## Flujo de etiquetado y carpetas (admin → acceso de usuarios)

### Conceptos
- **Evento**: contenedor de fotos y sujetos (alumnos/familias).
- **Carpeta/Código (code_id)**: agrupador de fotos dentro de un evento (p. ej., por curso o lote). “Sin carpeta” = `code_id = null`.
- **Sujeto (subject)**: alumno/familia con token de acceso privado (`/f/[token]`).
- **Asignación**:
  - Por carpeta: setear `code_id` en `photos`.
  - Por sujeto: insertar relación en `photo_subjects (photo_id, subject_id)`.

### Subir fotos (admin)
1) Ir a `/admin/photos` → botón “Subir fotos”.
2) Opcional: seleccionar un evento; si no, se suben a la galería general del admin.
3) Procesos automáticos (si “Auto-proceso” activo): watermark → detección de QR → agrupación tentativa.
4) Resultado: fotos visibles con `preview_url` firmado, listas para aprobar/etiquetar.

### Modo QR (asignación rápida por token)
1) En `/admin/photos`, activar “Modo QR”.
2) Escanear un QR de un sujeto → queda seleccionado.
3) Seleccionar fotos → “Asignar a {sujeto}”.
4) Se crean filas en `photo_subjects`; la galería del sujeto (`/f/[token]`) mostrará estas fotos.

### Modo Sesión (flujo secuencial por lista de alumnos)
1) En `/admin/photos`, activar “Modo Sesión”.
2) Cargar/mostrar lista de sujetos del evento → navegar con anterior/siguiente.
3) Seleccionar fotos → “Asignar y continuar” (batch) → avanza al siguiente sujeto.

### Etiquetado manual (una foto → un sujeto)
1) En una tarjeta de foto → acción “Etiquetar alumno” → abre `TaggingModal`.
2) Buscar y seleccionar sujeto → confirmar → asigna la foto a ese sujeto.
3) Estado esperado: `photo_subjects` incluye el `subject_id`; la UI refleja “Etiquetada”.

Nota importante (alineación técnica): hoy el handler de tagging manual en admin usa `/api/admin/tagging` (carpetas), pero el etiquetado a alumnos debería llamar a `/api/admin/photos/assign-subject` con `{ photoId, subjectId }`. Recomendación: usar el endpoint de asignación a sujeto para `TaggingModal` (evita el error y unifica el modelo).

### Carpetas y “Mover a…”
- Arrastrar una foto a un código o usar “Mover a…” cambia su `code_id`.
- Filtro “sin carpeta” usa `codeId = 'null'` para listar fotos con `code_id = null`.
- Útil para agrupar por curso/lote antes de etiquetar a sujetos.

### Aprobación y visibilidad
- Admin: puede aprobar/desaprobar. Filtros: Aprobadas / Pendientes / Etiquetadas / Todas.
- Público por evento (`/gallery/[eventId]`): muestra fotos aprobadas.
- Familia por token (`/f/[token]`): muestra fotos asignadas al sujeto (según política de visibilidad definida).

### Accesos de usuario final
- Galería por token: `/f/[token]` → selección/checkout.
- Galería pública por evento: `/gallery/[eventId]` → exploración pública de aprobadas.

### Buenas prácticas (espacio y performance)
- Usar siempre `preview_path`/watermark como `preview_url` en UI (no el original) y URLs firmadas con expiración.
- Evitar fallback a original para “preview” salvo descarga explícita.
- Considerar job de generación de previews WebP y tamaños responsivos.

### Errores comunes
- Usar `/api/admin/tagging` (carpetas) cuando se desea asignar a un sujeto → usar `/api/admin/photos/assign-subject`.
- Falta de `eventId` al filtrar → usar `buildPhotosUrl` o `?event_id=`.
- Previews faltantes → generar `preview_path` en upload/process y no recurrir al original en UI.


