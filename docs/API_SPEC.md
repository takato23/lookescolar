# API Specification

## Publicación y Selección V1

### Etiquetado y Procesamiento de Fotos (Batch Ops)
POST /api/admin/photos/watermark
  - Body: `{ eventId: string }` or `{ photoIds: string[] }`
  - Response: `{ processed: number }
`  
POST /api/admin/anchor-detect
  - Body: `{ eventId: string, onlyMissing?: boolean }`
  - Response: `{ detected: number }
`  
POST /api/admin/group
  - Body: `{ eventId: string }`
  - Response: `{ assigned: number }
`

### Publicación de Códigos
POST /api/admin/publish
  - Body: `{ codeId: string }` to publish a single code  
  - OR: `{ eventId: string }` to publish all codes for an event (Quick Publish)
  - Response: for single: `{ token: string, url: string }`,  
    for batch: `{ rowsPublished: number }`

POST /api/admin/publish/revoke
  - Body: `{ codeId: string }`
  - Response: `{ token: string, url: string }`

POST /api/admin/publish/unpublish
  - Body: `{ codeId: string }`
  - Response: `{ ok: boolean }`

GET /api/admin/publish/list[?eventId={uuid}]
  - Query: optional `eventId` to filter
  - Response: `[{ id, event_id, code_value, token, is_published, photos_count }, ...]`

### Órdenes y Export
GET /api/admin/orders/export?eventId={uuid}&courseId={uuid}
  - Response: CSV stream of orders

GET /api/admin/orders/labels?eventId={uuid}&orderIds={id,id,...}
  - Response: PDF stream of shipping labels

### Selección y Checkout Público
POST /api/public/selection
  - Body: `{ token: string, selectedPhotoIds: string[], package: string, contact?: { name,email,phone } }`
  - Response: `{ ok: boolean, orderId: string }`

POST /api/family/checkout
  - Body: `{ token: string, items: { photoId, priceType, quantity }[], contactInfo: { name,email,phone } }`
  - Response: `{ preferenceId: string, checkoutUrl: string }`

POST /api/family/order/status
  - Body: `{ orderId: string }` or query by token
  - Response: `{ status: string, order: {...} }`

### Pagos (Mercado Pago)
POST /api/payments/create-preference
  - Body: `{ orderId: string }`
  - Response: `{ preferenceId: string, initPoint: string }`

POST /api/payments/webhook
  - Headers: `x-signature`
  - Body: raw JSON webhook from MP
  - Response: `{ received: true }`

## Deprecated
- GET/POST `/api/storage/signed-url` is removed in production.  
  Use server-side helper `signedUrlForKey()` and pass signed URLs to client.  
  Endpoint remains only for development/debug.
