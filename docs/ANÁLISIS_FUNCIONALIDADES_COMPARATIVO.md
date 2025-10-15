# 📊 Análisis Comparativo: EventPhotoManager vs PhotoAdmin

## Estado general (13 oct 2025)
- PhotoAdmin opera como la consola unificada desde `app/admin/photos/page.tsx`, reutilizando `components/admin/PhotoAdmin.tsx` con React Query y layout a tres paneles.
- Las acciones inline de carpetas (crear, renombrar, mover, eliminar) disparan mutaciones con invalidación selectiva de queries, manteniendo en sincronía árbol y grilla.
- La gestión de estudiantes se integra mediante `components/admin/shared/StudentManagement.tsx`, con altas/bajas y filtros por curso dentro del flujo de PhotoAdmin.
- La creación y administración de enlaces públicos se canaliza vía `ShareManager`, permitiendo generar escaparates para carpetas o selecciones con contraseña, expiración y refresco del historial.
- Sincronización filtro ⇄ query-string (`syncQueryParams`) y `EventContextBanner` conservan contexto específico de evento mientras se navega cross-evento.
- Drag & drop configurable (DND Kit), paneles redimensionables y panel de subida con lotes replican e incrementan la UX de EventPhotoManager.

## Paridad funcional (detalle)

| Bloque | Estado PhotoAdmin | Observaciones / pendientes |
| --- | --- | --- |
| Jerarquía de carpetas | ✅ Árbol jerárquico con contadores agregados, persistencia de expansión, creación desde cualquier nodo y ahora copy/paste funcional (duplica la estructura en el destino conservando jerarquía). | Evaluar si conviene copiar también los assets asociados o dejarlo como acción explícita en backend. |
| Acciones sobre carpetas | ✅ Mutaciones rename/move/delete con toasts y refresco de queries (`createFolderMutation`, `renameFolderMutation`, `moveFolderMutation`, `deleteFolderMutation`). | Consolidar validación de nombres duplicados en backend para evitar conflictos silenciosos. |
| Bulk de fotos | ✅ Selección múltiple, mover/eliminar con actualización optimista y creación de escaparates desde selección (`handleBulkMove`, `handleBulkDelete`, `handleCreateAlbum`). | Falta consolidar feedback granular cuando el backend rechaza parte del lote. |
| Drag & drop | ✅ Integrado vía `@dnd-kit` y configurable desde el modal de ajustes (`settings.enableDragAndDrop`). | Validar performance con colecciones > 500 ítems y registrar resultados. |
| Gestión de estudiantes | ✅ `StudentManagement` embebido permite listar, filtrar y crear estudiantes; se añadieron los flujos de asignación masiva (`AssignFolderPhotos`) y el importador CSV con autogeneración de carpetas (`BatchStudentManagement`). | Monitorear performance en eventos con >2k estudiantes y refinar feedback en importaciones parciales. |
| Compartir / escaparates | ✅ `handleCreateAlbum` + `ShareManager` soportan carpeta o selección, expiración, contraseña, sincronización con historial local y muestran métricas de actividad (accesos, IPs únicas, último uso). | Añadir vista consolidada de actividad sospechosa y revocaciones masivas directamente desde el gestor. |
| Contexto de evento | ✅ Banner (`EventContextBanner`) + sincronización de filtros con query string (`syncQueryParams`). | Documentar el reseteo cuando se llega desde rutas antiguas para evitar estados zombie. |
| UI/UX avanzada | ✅ Layout a tres paneles, panel de configuración, panel de subida por lotes y monitoreo de progreso. | Revisar variante compacta para dispositivos táctiles y confirmar accesibilidad de atajos. |

## Pendientes priorizados
1. **Duplicado completo de assets al copiar carpetas** – evaluar si el copy/paste debe clonar también archivos y asignaciones o si se mantiene la duplicación sólo estructural.
2. **Consolidar métricas y auditoría de enlaces** – `ShareManager` ya consume analíticas de actividad, pero falta explorar dashboards agregados (sospechas, IPs bloqueadas, etc.).
3. **Hardening de validaciones backend** – Validar renombrado duplicado y límites de lote en la API para evitar estados inconsistentes frente a ejecuciones concurrentes.
4. **Hardening de validaciones backend** – Validar renombrado duplicado y límites de lote en la API para evitar estados inconsistentes frente a ejecuciones concurrentes.

## Recomendaciones inmediatas
- Registrar prueba manual de arrastre y acciones masivas en PhotoAdmin antes de retirar EventPhotoManager.
- Asignar responsables y estimaciones a los pendientes anteriores dentro del backlog compartido.
- Mantener este documento actualizado tras cada entrega relevante (agregar fecha + cambios principales).
