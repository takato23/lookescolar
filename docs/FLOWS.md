## Publicación

1. Admin publica un code → genera token y marca `is_published=true`.
2. Admin puede rotar token cuando quiera.
3. Se comparte `/f/[token]` o QR.
4. (Opcional) Despublicar o revocar token desde Admin.

## Selección de familia → Pedido pending → Export

1. Familia abre `/f/[token]` y ve galería.
2. Selecciona fotos y envía selección (paquete y contacto opcional).
3. Se crea `orders` con status `pending` y `order_items` con cada foto.
4. Admin exporta CSV y PDF de etiquetas en `/admin/orders`.

## Generar watermarks

1. Admin ejecuta POST `/api/admin/photos/watermark` por `eventId` o `photoIds`.
2. Se crean `previews` con marca “MUESTRA” y se actualiza `photos.watermark_path`.
3. La galería pública firma URLs hacia `watermark_path` (o `preview_path` si existe), nunca al original.


