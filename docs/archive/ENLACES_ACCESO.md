## Enlaces de acceso (admin y público)

### Admin
- Dashboard: `/admin`
- Eventos: `/admin/events`
- Crear evento: `/admin/events/new`
- Fotos (galería admin): `/admin/photos`
  - Filtros por query: `?eventId={uuid}&codeId={uuid|'null'}`
- Publicar (códigos/lista): `/admin/publish`
- Órdenes: `/admin/orders`
- Métricas: `/admin/performance`
- Configuración: `/admin/settings`

### Público / Familia
- Galería por evento (pública SSR): `/gallery/{eventId}`
- Acceso por token (familia): `/f/{token}`
  - Checkout: `/f/{token}/checkout`
  - Éxito: `/f/{token}/payment-success`
  - Pendiente: `/f/{token}/payment-pending`
  - Error: `/f/{token}/payment-failure`

### APIs principales (referencia rápida)
- Admin
  - Eventos: `GET/POST /api/admin/events`, `GET /api/admin/events-simple`
  - Fotos: `GET/DELETE /api/admin/photos`, `POST /api/admin/photos/simple-upload`
  - Tagging
    - Por sujeto: `POST /api/admin/photos/assign-subject`
    - Por carpeta: `POST /api/admin/tagging` (set `code_id`)
  - Publish: `GET /api/admin/publish/list`
  - Órdenes: `GET /api/admin/orders`, `PATCH /api/admin/orders/{id}`, `GET /api/admin/orders/export`
- Público/Familia
  - Selección pública: `POST /api/public/selection`
  - Checkout: `POST /api/family/checkout`
  - Estado de orden: `POST /api/family/order/status`
- Pagos (MP)
  - Crear preferencia: `POST /api/payments/create-preference`
  - Webhook: `POST /api/payments/webhook`


