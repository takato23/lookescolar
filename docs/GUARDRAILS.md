# GUARDRAILS.md

## Documentación mínima (guardrails)

Objetivo: mantener el proyecto enfocado y simple mientras construimos cimientos sólidos.

- Páginas habilitadas: Dashboard (`/admin`) y Fotos (`/admin/photos`).
- Flujo base: Subir fotos → generar previews → organizar en carpetas (opcional) → aprobar/desaprobar → tagging manual/QR (pospuesto si no es crítico).
- API mínima:
  - GET/DELETE    /api/admin/photos
  - POST          /api/admin/photos/simple-upload
  - POST          /api/admin/photos/download
  - PATCH         /api/admin/photos/:id/move
  - GET           /api/admin/publish/list?eventId={eventId}
  - POST          /api/admin/publish         (publicar todos los códigos de un evento)
  - POST          /api/admin/publish/revoke  (rotar token de un código)
  - POST          /api/admin/publish/unpublish (anular publicación de un código)

- Autenticación: mock en dev, real en prod (Supabase).

Política de documentación (por ahora):

- Mantener solo lo esencial para levantar y operar el flujo de Fotos.
- Evitar guías extensas o specs que no se usen hoy en el flujo mínimo.
- Cuando agreguemos funcionalidades, sumaremos docs puntuales y breves por feature.

Documentos que conservamos:

- `API_SPEC.md` (referencia base)
- `VINCULAR_SUPABASE.md` (conexión a Supabase)
- `GUARDRAILS.md` (este archivo)

Nota: cualquier doc adicional debe responder a una necesidad inmediata del MVP de Fotos. Si no es imprescindible, no se agrega todavía.