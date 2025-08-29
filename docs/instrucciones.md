# Instrucciones y Roadmap Inmediato

## Roadmap inmediato (qué, por qué y para qué)

### Configuración de storage (obligatorio)
Qué: Usar `photos-private` (privado) para almacenar tanto los **originales** como las **previews** y **watermarks**.
Por qué: Evitar buckets públicos y exponer originales; servir miniaturas protegidas mediante URLs firmadas con TTL corto.
Para qué: Garantizar rendimiento y seguridad, reducir egress y controlar el acceso.

### Generación de previews con watermark
Qué: Asegurar que cada upload ejecute el procesamiento con Sharp para generar un `preview_path` con marca de agua en el bucket `photos-private`.
Por qué: Proteger visualmente el contenido y ofrecer imágenes ligeras en la galería.
Para qué: Mostrar siempre WebP optimizado y watermarked a familias y público.

### “Vista cliente” clara desde Admin
Qué: Agregar un botón “Vista cliente” en Admin/Events que abra `/gallery/{eventId}` y un botón “Compartir salón” que lleve a `/admin/publish`.
Por qué: Facilitar validación rápida de la experiencia de cliente sin buscar rutas manuales.
Para qué: Mejorar la operativa y acelerar el feedback.

### Tienda pública en la galería de evento
Qué: Integrar carrito en PublicGallery (selección de fotos, resumen y checkout usando **POST `/api/family/checkout`**).
Por qué: Hoy existe el endpoint de checkout público pero no está conectado al UI.
Para qué: Vender directamente desde la galería pública usando Mercado Pago (MVP completo).

### Compartir “salita” (batch) por código
Qué: Usar `/admin/publish` para generar/rotar token de un “salón” y compartir `/f/{token}`; mover fotos por carpeta.
Por qué: Evitar etiquetar alumno por alumno cuando se comparte por salón.
Para qué: Entrega masiva rápida a padres por curso.

### Flujo familias: unificar selección y checkout
Qué: Reemplazar la lógica de selección simple por el store de carrito y dirigir a `/f/{token}/checkout`.
Por qué: Unificar reduce bugs y mejora analíticas.
Para qué: Experiencia consistente y métricas claras.

### Control de acceso de galería pública
Qué: Gatear GET `/api/gallery/[eventId]` con flag `public_gallery_enabled` en la tabla `events`.
Por qué: Permitir publicar u ocultar galerías completas sin desplegar código.
Para qué: Control editorial y evitar exposiciones accidentales.

### Rendimiento y costos
Qué: Usar batch signed URLs, paginación consistente y TTL corto en previews.
Por qué: Menos latencia, menos llamadas y menor egress.
Para qué: Escalar a miles de fotos por evento sin penalizar UX.

### Seguridad y abuso
Qué: Mantener rate limits en APIs públicas, registrar logs y firmar solo previews.
Por qué: Evitar scraping masivo y hotlinking abusivo.
Para qué: Proteger negocio y performance.

### Pagos y conciliación
Qué: Verificar credenciales de Mercado Pago, webhook URL y manejo de estados `pending/paid/failed`.
Por qué: Evitar órdenes “zombies” o pagos no conciliados.
Para qué: Cierre contable confiable.

### Accesibilidad y UX
Qué: Asegurar `aria-*`, `focus-visible` y contraste en botones/diálogos de carrito y checkout.
Por qué: Inclusión y menor tasa de error en conversión.
Para qué: Mejor experiencia en móvil y desktop.

### QA y testing
Qué: Tests de:
- GET `/api/gallery/[eventId]` sirviendo previews.
- Integración: abrir modal, seleccionar fotos, checkout público y webhook.
- Unit: componentes de carrito/CTA.
Por qué: Evitar regresiones.
Para qué: Confianza en despliegues.

### Métricas
Qué: Centralizar métricas de vistas/egress por evento y por token (familia/salón).
Por qué: Entender uso y costos.
Para qué: Optimizar precios y storage.

### SEO/Indexación
Qué: `noindex` en páginas públicas de galería si el contenido es sensible.
Por qué: Evitar indexado de previews con marca de agua.
Para qué: Controlar exposición pública.

## Roadmap siguiente (plus)
- Descarga digital post-pago (original/alta) con expiración.
- Packs/combos y cupones en checkout.
- Emails automáticos con enlace post compra.

## Entregables rápidos (prioridad)
1. Botón “Vista cliente” y “Compartir salón” en Admin.
2. Carrito y CTA en PublicGallery → **POST `/api/family/checkout`**.
3. Gateo `public_gallery_enabled` en el endpoint público.
4. Job de watermark para eventos existentes.

**Por qué en este orden:** Primero habilitamos venta pública end-to-end, luego operatividad y control, y finalmente optimizaciones.