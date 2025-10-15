# Sharing System v2

Fecha: 11 de octubre de 2025

## Resumen

El nuevo sistema de compartición introduce un flujo unificado para definir el alcance de un enlace, seleccionar audiencias y programar la entrega desde la interfaz administrativa. El backend almacena la configuración en `scope_config`, registra audiencias en `share_audiences` y precalcula el contenido asociado mediante `share_token_contents` para garantizar accesos consistentes.

## Entidades clave

- `share_tokens.scope_config`: JSON con `{ scope, anchor_id, include_descendants, filters }` utilizado para resolver recursos.
- `share_audiences`: almacena cada audiencia (`family`, `group`, `manual`) junto a su estado de entrega.
- `share_token_contents`: cachea el listado de fotos asociadas a un share para acelerar la validación.

## API relevantes

| Endpoint | Método | Descripción |
| --- | --- | --- |
| `/api/share` | `POST` | Crea un share. Acepta `scopeConfig`, `audiences`, opciones de expiración y permisos. Devuelve `scopeConfig` normalizado y `audiencesCount`. |
| `/api/share/deliver` | `POST` | Registra audiencias (familias, grupos, correos) y marca la entrega como `pending`. |
| `/api/share?eventId=` | `GET` | Lista los enlaces de un evento con su `scopeConfig` y conteo de audiencias. |
| `/api/share/:id/audiences` | `GET` | Devuelve el detalle de audiencias para un share. |

## Flujo en la UI

1. Desde `/admin/events/[id]/share` se puede abrir el **Wizard** (botón "Abrir wizard").
2. Paso 1: elegir alcance (evento, carpeta o selección). La selección reutiliza las fotos marcadas en el EventPhotoManager, muestra miniaturas y permite sumar/quitar sin abandonar el wizard.
3. Paso 2: seleccionar audiencias (familias cargadas, grupos o correos manuales).
4. Paso 3: confirmar ajustes, escoger plantilla de entrega y generar el enlace.
5. El wizard crea el share (`/api/share`) y luego programa la entrega (`/api/share/deliver`).
6. El historial muestra cada enlace con botones para ver audiencias, reenviar o revocar.

## Gestor unificado de enlaces (octubre 2025)

- El componente `ShareManager` centraliza la gestión de enlaces y ahora se reutiliza tanto en `/admin/events/[id]` (Action Hub) como en `/admin/photos`.
- Desde el Action Hub el CTA “Compartir Evento” abre el gestor sin salir del tablero y permite crear enlaces para el evento completo en un click; la creación llama a `POST /api/share` y copia automáticamente la URL pública.
- En la biblioteca unificada de fotos el mismo gestor se habilita únicamente cuando existe un `event_id` activo; si no hay contexto se muestra el mensaje “Elegí un evento para gestionar enlaces” y los botones quedan deshabilitados para evitar estados ambiguos.
- Las acciones de copiar, refrescar y desactivar continúan apoyándose en `/api/share` (`GET`, `DELETE`) y actualizan la lista en vivo mediante la prop `refreshKey`.
- QA y soporte pueden remitir a este gestor para validar enlaces sin navegar a vistas heredadas; el modal también expone si un enlace está protegido con contraseña o ha expirado.

## Modal de Compartir (EventPhotoManager)

- El modal se abre automáticamente al generar un enlace desde la vista del evento y presenta primero un resumen del estado (activo/expirado), fecha de expiración y contador de audiencias.
- El enlace listo para copiar se muestra junto a la acción principal, disponible tanto en desktop (Dialog) como en mobile (Sheet responsivo con CTA fijo).
- La sección **Alcance del enlace** utiliza un `TabsList` para indicar si el share corresponde al evento completo, a una carpeta o a una selección; los cambios del alcance redirigen al wizard para mantener consistencia.
- El bloque de permisos incluye switches persistentes para descargas y comentarios que llaman a `PATCH /api/share/:id` y muestran feedback inmediato.
- El recordatorio de audiencias seleccionadas resume la cantidad sincronizada y mantiene el acceso directo al wizard.
- Las acciones de compartir agrupan WhatsApp, correo, sistema nativo y QR; la personalización de temas quedó en una sección colapsable para reducir ruido visual.
- El modal destaca cambios en permisos con chips de estado (habilitado/deshabilitado) y un bloque opcional para compartir con equipos internos, reutilizando el wizard cuando se necesita ajustar audiencias.

## Selección visual persistente (octubre 2025)

- `EventPhotoManager` persiste la selección de fotos en `usePhotoSelectionStore`, almacenando `id`, nombre de archivo, carpeta y etiquetas básicas.
- El wizard consume el mismo store: si el alcance es **Selección**, despliega la grilla de miniaturas, permite filtrar y quitar fotos y ofrece un buscador integrado (archivo, alumno o carpeta) para agregar nuevas sin volver al manager.
- El panel de selección usa `/api/admin/photos/selection` para hidratar metadatos y `/api/admin/photos/unified` para las búsquedas. Los cambios se reflejan al instante en ambos lados.
- Al confirmar el share, `photoIds` se envían desde el store real; ya no se aceptan IDs pegados manualmente.

## Compatibilidad

- Los shares existentes se migran automáticamente con `include_descendants=false` para mantener el comportamiento previo.
- `ProfessionalShareModal` muestra el `scope_config` asociado y ofrece acceso directo al wizard.

## Recomendaciones

- Para reenviar masivamente, utilizar el botón "Reenviar" del historial o invocar `/api/share/deliver` con las audiencias deseadas.
- Después de ajustes manuales en la base, ejecutar `npm run lint` y `npm run test` para validar el flujo.
