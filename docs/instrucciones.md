Roadmap inmediato (qué, por qué y para qué)
Configuración de storage (obligatorio)
Qué: Usar photo-private (privado) para originales y photos (público) para previews/watermarks.
Por qué: Evitar filtrar originales y bajar costos de egress.
Para qué: Servir miniaturas con marca de agua a usuarios sin exponer el original.
Generación de previews con watermark
Qué: Ejecutar el procesado para eventos existentes y asegurar que cada nuevo upload genere preview_path/watermark_path.
Por qué: Rendimiento y protección visual del contenido.
Para qué: Mostrar siempre imágenes ligeras y protegidas en la galería.
“Vista cliente” clara desde Admin
Qué: Agregar un botón “Vista cliente” en Admin/Events que abra /gallery/{eventId} y un botón “Compartir salón” que lleve a /admin/publish.
Por qué: Flujo operativo rápido sin buscar rutas manuales.
Para qué: Validar rápida la experiencia del cliente y compartir enlaces sin fricción.
Tienda pública en la galería de evento
Qué: Integrar carrito en PublicGallery (selección de fotos, resumen y checkout usando POST /api/gallery/checkout).
Por qué: Hoy existe el endpoint de checkout público pero no el UI de compra.
Para qué: Vender desde la galería pública con Mercado Pago (MVP completo).
Compartir “salita” (batch) por código
Qué: Usar /admin/publish para generar/rotar token de un “code” (salón) y compartir /f/{token}; mover fotos por code/carpeta.
Por qué: Evitar etiquetar alumno por alumno cuando se comparte por salón.
Para qué: Entrega masiva rápida a padres por curso/salón.
Flujo familias: unificar selección y checkout
Qué: Reemplazar la selección temporal de simple-page por el store de carrito y dirigir a /f/{token}/checkout.
Por qué: Hoy hay dos lógicas (selección vs carrito). Unificar reduce bugs y mejora analíticas.
Para qué: Experiencia consistente y métricas claras.
Control de acceso de galería pública
Qué: Gatear GET /api/gallery/[eventId] por flag public_gallery_enabled del evento.
Por qué: Poder publicar/ocultar una galería completa sin tocar código.
Para qué: Control editorial y evitar exposiciones accidentales.
Rendimiento y costos
Qué: Usar firma en lote (batch signed URLs) y paginación consistente; mantener TTL corto en previews.
Por qué: Menos latencia, menos llamadas y menor egress.
Para qué: Escalar a miles de fotos por evento sin penalizar UX.
Seguridad y abuso
Qué: Mantener rate limit en APIs públicas, logs, y solo firmar preview_path/watermark_path.
Por qué: Evitar scraping masivo y hotlinking abusivo.
Para qué: Proteger negocio y performance.
Pagos y conciliación
Qué: Verificar credenciales de MP, URL del webhook y manejo de estados pending/paid/failure; probar el E2E.
Por qué: Evitar órdenes “zombies” o pagos no conciliados.
Para qué: Cierre contable confiable.
Accesibilidad y UX
Qué: Asegurar aria-*, focus-visible y contraste en botones/diálogos de carrito/checkout.
Por qué: Inclusión y menor tasa de error en conversión.
Para qué: Mejor experiencia en móvil y desktop.
QA y testing
Qué: Tests de:
GET /api/gallery/[eventId] sirviendo previews/watermarks.
Integración: abrir modal, seleccionar fotos, checkout público y webhook.
Unit: componentes de carrito/CTA.
Por qué: Evitar regresiones al integrar carrito público.
Para qué: Confianza en despliegues.
Métricas
Qué: Centralizar métricas de vistas/egress por evento y por token (familia/salón).
Por qué: Entender uso y costos por cliente/evento.
Para qué: Optimizar precios y storage.
SEO/Indexación
Qué: noindex en páginas públicas de galería si se considera contenido sensible.
Por qué: Evitar indexado de previews con marca de agua.
Para qué: Control de exposición pública.
Roadmap siguiente (plus)
Descarga digital post-pago (original/alta) con expiración.
Packs/combos y cupones en checkout.
Emails automáticos con enlace post compra.
Entregables rápidos (prioridad)
Botón “Vista cliente” y “Compartir salón” en Admin.
Carrito y CTA en PublicGallery → POST /api/gallery/checkout.
Gate public_gallery_enabled en el endpoint público.
Job de watermark para eventos existentes.
Por qué en este orden
Primero habilitamos venta pública end-to-end (impacto directo en negocio).
Luego operatividad (compartir salón) y control (gates).
Después optimizaciones (rendimiento, métricas, SEO).