 LookEscolar — Hotfix & Simplificación del flujo de fotos (prioridad alta)
Contexto
La vista /admin/photos debe ser lo más simple posible: crear evento → subir fotos → watermark → agrupar por QR → publicar → links/QR para familias (checkout con MercadoPago). Ahora mismo hay errores 400/500 y la UI se volvió confusa.

Bugs a corregir (bloqueantes)
DELETE /api/admin/photos devuelve 400 al “Eliminar todas”

Back: en app/api/admin/photos/route.ts agregar soporte a dos formas de borrar:

{"photoIds": string[]} (borra seleccionadas)

{"eventId": UUID, "codeId": UUID | "null"} (borra por filtro actual; codeId:"null" = sin carpeta)

Validar con Zod, responder 200 { success:true, deleted:number }. Nunca 500 por inputs inválidos; devolver 400 JSON legible.

Front: en PhotoGalleryModern y app/admin/photos/page.tsx, si el usuario elige “Eliminar todas” con selección vacía, enviar el filtro actual (eventId, codeId) en el body. Deshabilitar el botón si no hay eventId.

Fotos/folders no cargan por 400 (falta eventId)

Regla global: nunca llamar /api/admin/photos sin event_id.

Crear helper buildPhotosUrl({ eventId, codeId='null', limit=100 }) que siempre incluya event_id y:

codeId==='null' → code_id=null

codeId=UUID → code_id=<uuid>

En /admin/photos, si no hay eventId en la URL:

Crear “Evento rápido” (POST /api/admin/events-simple o /api/admin/quick-setup) → eventId

router.replace('/admin/photos?eventId=<id>&codeId=null') y recién ahí cargar fotos.

PhotosSidebarFolders no debe pedir /api/admin/publish/list hasta tener eventId.

/api/admin/publish/list?eventId=... no debe 500

En su route: validar eventId (UUID). Si falta o es inválido, devolver 200 [] (o { rows: [] } si está en modo legacy), no 500.

UX: Carpetas (eventos/códigos) y acciones
Volver a mostrar “Carpetas” + crear evento/carpeta

Sidebar (components/admin/PhotosSidebarFolders.tsx):

Nodo raíz: Evento seleccionado.

Primer ítem fijo: “Sin carpeta” → codeId='null'.

Listado de códigos del evento (desde GET /api/admin/publish/list?eventId=…), con photos_count, chip “Publicado”.

Botones:

“Nuevo evento” → POST /api/admin/events { name } → redirect a ?eventId=<id>&codeId=null.

“Nueva carpeta” (código manual) → POST /api/admin/subjects (o el endpoint equivalente existente) para crear un code con code_value autogenerado y token. Refrescar lista.

Menú 3 puntos por carpeta: Publicar/Despublicar/Revocar, Copiar link, Ver QR, Descargar ZIP.

Deduplicar eventos por id. No renderizar nada hasta tener eventId.

UI: simplificar navegación
Reducir admin a 3 entradas básicas (lo demás a Avanzado)

En el sidebar admin: dejar Dashboard, Fotos, Pedidos. Mover el resto bajo un acordeón “Avanzado”.

En Dashboard dejar una tarjeta “Flujo rápido” (lleva a /admin/quick-flow).

Procesamiento/seguridad de imágenes
Previews de baja calidad con watermark

En el pipeline de watermark/preview:

Generar thumbnail webp máx. 1200px (lado mayor), quality ~70, watermark “Look Escolar” (opacidad ~0.25, centrada/repetida).

Guardar preview_path y servir siempre previews firmadas (signed URL) desde preview_path (o watermark_path), no el original.

En la pública /f/[token]/simple-page: usar esas previews; nunca firmar el original salvo post-compra.

Flujo “Publicar rápido” (encadenado)
Un botón que haga todo

En /admin/photos y /admin/quick-flow:

Upload múltiple → devolver photoIds.

POST /api/admin/photos/watermark { photoIds }.

POST /api/admin/anchor-detect { eventId, onlyMissing:true }.

POST /api/admin/group { eventId }.

POST /api/admin/publish { eventId }.

GET /api/admin/publish/list?eventId=… → modal “Listo para compartir” con:

Link /f/<token>/simple-page>

Botón Copiar

Ver QR

Abrir como padre

Toasts encadenados: “Subiendo…”, “Aplicando watermark…”, “Agrupando por QR…”, “Publicando…”, “Listo: links”.

Checkout familia (MercadoPago)
Confirmar checkout end-to-end

Pública /f/<token>/simple-page: seleccionar fotos → Carrito → POST /api/payments/create-preference → redirigir a MP (sandbox) → páginas de success/pending/failure ya existentes.

Si MP no está configurado en .env, mostrar banner “Modo prueba” pero no bloquear publicación.

Accesibilidad y detalles visuales
Ajustes rápidos de UI ya detectados

En PhotoGalleryModern: tipografía de preview/checkbox legible (no blanco sobre blanco), hover con scale 1.01 sin desbordar, rounded-xl overflow-hidden, bg-card text-card-foreground.

Empty states: “Aún no hay fotos. Arrastrá o Subí fotos.”

QA — Checklist de verificación (manual, 3 minutos)
/admin/photos sin query → crea evento y redirige a ?eventId=<uuid>&codeId=null sin 400.

Subo 3 fotos → veo thumbnails con watermark.

“Publicar rápido” → obtengo tokens y puedo abrir /f/<token>/simple-page.

En sidebar, “Sin carpeta” y carpetas con photos_count. “Nueva carpeta” crea un código y aparece en la lista.

“Eliminar todas” en “Sin carpeta” → DELETE /api/admin/photos con { eventId, codeId:'null' } → 200 y recarga.

Checkout con MP sandbox llega a success/pending.

Notas de implementación
Loggear en dev (console.debug) URL finales de fetch de fotos: deben incluir siempre event_id y code_id.

Respetar shape backend actual:

/api/admin/photos → { success, photos: [...], counts? }

/api/admin/publish/list?eventId=… → array simple (si falta eventId, legacy { rows: [] })

Cualquier validación inválida → 400 JSON, nunca HTML 500.

Si algo no se puede completar en un solo PR, dividir en:

Bugfix crítico (DELETE + fetch con eventId)

Sidebar & crear evento/carpeta

Publicar rápido + previews

Checkout QA