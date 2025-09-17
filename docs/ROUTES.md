# Admin Routes — Eventos 2.0

- app/admin/events/page.tsx — Lista de eventos
- app/admin/events/[id]/page.tsx — Resumen actual (legacy)
- app/admin/events/[id]/albums/page.tsx — Subcarpetas/álbumes del evento
- app/admin/events/[id]/students/page.tsx — Alumnos del evento
- app/admin/events/[id]/orders/page.tsx — Pedidos del evento
- app/admin/events/[id]/settings/page.tsx — Ajustes (General/Privacy/Download/Store)
- app/admin/store-settings/page.tsx — Configuración de Tienda Global (store-settings UI)

Utilidades
- lib/routes/admin.ts — computePhotoAdminUrl(eventId, folderId?)