# Propósito
Implementar una plataforma simple de galerías escolares: permitir que fotógrafas suban fotos, se muestren solo como previsualizaciones con marcas de agua, se compartan links de galería (públicos o privados), y habilitar pagos vía Mercado Pago con un carrito simple.
## Checklist inicial (conceptual)
1. Definir modelos y estructura mínima de base de datos para eventos, fotos y órdenes.
2. Implementar endpoints esenciales para previews, carrito, órdenes, administración y webhooks.
3. Generar previews de imágenes con marcas de agua según especificaciones.
4. Integrar y validar pagos con Mercado Pago, incluyendo gestión de órdenes y callback vía webhook.
5. Construir UI básica para galería, carrito, pagos y administración, asegurando la privacidad de originales.
6. Validar respuestas y metadatos con pruebas de cobertura y ejemplo de flujos.
---
# Instrucciones
- En `/gallery/{eventId}` mostrar una grilla de previews con marca de agua diagonal, repetida, texto “LOOK ESCOLAR” y “VISTA PREVIA”, opacidad ~0.4. Las imágenes deben pesar entre 120-250 KB (WebP), máximo 1600px lado mayor. Nunca mostrar imágenes originales.
- Cada preview debe tener un botón “Agregar al carrito”. Mostrar un carrito fijo (resumen) con total y botón de acción “Pagar con Mercado Pago”.
- Al pagar: crear una orden en la base (`pending`), generar la preferencia en Mercado Pago, redirigir a `init_point`. Guardar el `preferenceId` y usar `external_reference=orderId`.
- Implementar webhook: validar firma, buscar orden por `external_reference`, actualizar estado a `paid` o `rejected` de manera idempotente.
- En `/f/{token}` (galería privada por token), misma UI y funcionamiento, pero solo mostrar previews del sujeto correspondiente.
- Upload en `/admin`: subir fotos del evento, generar previews con marca de agua fuerte (nunca originales accesibles públicamente).
- En admin, agregar botón para “Reparar previews” por evento (usa el endpoint existente) y otro para “Reagrupar por QR” (anchor-detect + group).
- Crea endpoints, modelos y lógica mínima necesaria para lograr el flujo de punta a punta; prioriza soluciones pragmáticas.
- Después de cada cambio importante (endpoints, lógica de pago, upload o webhook), valida si el resultado coincide con los criterios funcionales y de seguridad definidos.
---
# Criterios de validación final
- **Cobertura:** Flujos y endpoints clave con ejemplos incluidos. Plan de UI básico detallado.
- **Formato:** Secciones claras y accionables. Los errores deben ser por datos o entorno, nunca por falta de definición.
---
# Formatos de respuesta requeridos
## 1. Endpoints
```json
[
{
"method": "GET",
"path": "/gallery/{eventId}",
"response": {
"previews": [{
"photoId": "string",
"previewUrl": "string (watermarked)",
"dimensions": {"width": 1600, "height": 1067},
"sizeKB": 180,
"watermark": {
"text": ["LOOK ESCOLAR", "VISTA PREVIA"],
"diagonal": true,
"repeat": true,
"opacity": 0.4
}
}]
},
"errors": [
{"code": "EVENT_NOT_FOUND", "message": "El evento no existe"}
]
},
{
"method": "POST",
"path": "/cart/add",
"body": { "userToken": "string", "photoId": "string" },
"response": {"ok": true, "cart": [{"photoId": "string"}]},
"errors": [
{"code": "PHOTO_NOT_FOUND", "message": "La foto no existe"}
]
},
{
"method": "POST",
"path": "/order/create",
"body": {
"userToken": "string",
"items": [{"photoId": "string"}]
},
"response": {
"orderId": "string",
"preferenceId": "string",
"status": "pending",
"init_point": "string-url"
},
"errors": [
{"code": "CART_EMPTY", "message": "No hay ítems en el carrito"}
]
},
{
"method": "POST",
"path": "/mp/webhook",
"body": {
"external_reference": "string-orderId",
"signature": "string",
"status": "paid | rejected"
},
"response": {"result": "ok"},
"errors": [
{"code": "INVALID_SIGNATURE", "message": "Firma inválida"},
{"code": "ORDER_NOT_FOUND", "message": "Orden no encontrada"}
]
},
{
"method": "POST",
"path": "/admin/upload",
"body": {"eventId": "string", "files": ["binary"]},
"response": {
"uploaded": [
{
"photoId": "string",
"previewUrl": "string (watermarked)"
}
]
},
"errors": [
{"code": "INVALID_FILE", "message": "Formato de archivo inválido"}
]
},
{
"method": "POST",
"path": "/admin/repair-previews",
"body": {"eventId": "string"},
"response": {"status": "ok"},
"errors": []
},
{
"method": "POST",
"path": "/admin/group-by-qr",
"body": {"eventId": "string"},
"response": {"status": "ok"},
"errors": []
},
{
"method": "GET",
"path": "/f/{token}",
"response": {
"previews": [{
"photoId": "string",
"previewUrl": "string (watermarked)"
}]
},
"errors": [
{"code": "INVALID_TOKEN", "message": "Token inválido o expirado"}
]
}
]
```
## 2. Metadata de Previews
```json
{
"photoId": "string",
"previewUrl": "string (url)",
"watermark": {
"text": ["LOOK ESCOLAR", "VISTA PREVIA"],
"diagonal": true,
"repeat": true,
"opacity": 0.4
},
"sizeKB": 180,
"dimensions": { "width": 1600, "height": 1067 }
}
```
## 3. Ejemplo de Payload de Webhook
```json
{
"external_reference": "order_123456",
"signature": "sha256:abcdef...",
"status": "paid"
}
```
## 4. Resultados de Validación
```json
{
"coverage": {
"endpointsTested": ["/gallery/{eventId}", "/f/{token}", "/order/create", "/mp/webhook", "..."],
"uiPlanReviewed": true
},
"format": {
"sections": ["Flujos", "Endpoints", "UI"],
"result": "ok"
},
"errors": []
}
```
- Si es necesario definir nuevos endpoints o respuestas, sigue estos formatos estructurales.
- Prioriza respuestas JSON claras, errores explícitos y metadatos relevantes.
- Si algún paso esencial no se cubre correctamente, auto-corrige y vuelve a validar el resultado antes de finalizar.
Request changes (optional)
