# Arquitectura objetivo del servidor MCP

## Objetivo

Definir cómo evolucionará el servidor MCP de LookEscolar para cubrir las
consultas operativas que recibimos por chat, manteniendo compatibilidad con las
herramientas existentes y preparando la siguiente etapa de automatizaciones,
notificaciones y analítica asistida.

## Alcance y supuestos

- El dispatcher MCP actual (Express + `@modelcontextprotocol/sdk`) se amplía con
  clasificación de intents y orquestación multi-tool sin romper el contrato
  vigente (`tools/list`, `tools/call`).
- Supabase continúa como datastore principal; consideramos Redis o Upstash
  opcional para colas/eventos de baja latencia.
- El motor de intents usará embeddings (`pgvector`) combinados con reglas
  determinísticas mientras entrenamos un clasificador más rico.
- Necesitamos acordar un `sessionId` estable en `CallToolRequest._meta` para
  preservar memoria conversacional.

## Flujos de negocio priorizados (7)

1. Curación de fotos (búsqueda, aprobación, reorganización, firmas temporales).
2. Gestión de catálogo y paquetes comerciales.
3. Monitoreo y actualización de pedidos (SLA, logística, resúmenes ejecutivos).
4. Configuración de tienda pública y experiencias (temas, compartir enlaces).
5. Notificaciones y seguimiento proactivo (Slack/Email/SMS, recordatorios).
6. Analítica y recomendaciones (ventas, cohortes, performance de eventos).
7. Automatizaciones operativas (QR, tareas programadas, workflows de órdenes).

## Catálogo de herramientas MCP

### Existentes (fase 1)

| Dominio | Tool | Intención principal | Servicio base |
| --- | --- | --- | --- |
| Fotos | `buscar_fotos` | Listar y filtrar fotos de un evento | `gallery.service`, `unified-photo.service` |
| Fotos | `aprobar_fotos` | Aprobar/rechazar lotes con feedback | `photo.service` |
| Fotos | `mover_fotos` | Reorganizar fotos en carpetas | `folder.service` |
| Fotos | `generar_urls_fotos` | Obtener URLs firmadas | `share.service`, `url-batching.service` |
| Fotos | `crear_carpeta_evento` | Crear carpetas jerárquicas | `folder.service` |
| Fotos | `listar_carpetas_evento` | Navegar estructura de carpetas | `folder.service` |
| Catálogo | `crear_paquete` | Generar combos/compras guiadas | `catalog.service` |
| Pedidos | `consultar_pedidos` | Consultar vista unificada con métricas | `enhanced-order.service` |
| Pedidos | `actualizar_pedido` | Cambiar estado, prioridades, logística | `order-workflow.service` |
| Pedidos | `resumen_pedidos` | Sintetizar pendientes/overdue | `order-workflow.service` |
| Analítica | `estadisticas_ventas` | Métricas y forecast de ventas | `order-analytics.service` |

### Nuevas herramientas planificadas (fase 2/3)

| Dominio | Tool propuesto | Intención | Servicios base | Notas |
| --- | --- | --- | --- | --- |
| Pedidos | `orders.follow_up` | Generar recordatorios o tareas sobre pedidos atrasados | `order-workflow.service`, `order-export.service` | **Implementada** (`orders_follow_up`), devuelve acciones sugeridas. |
| Pedidos | `orders.schedule_job` | Programar jobs (reenvíos, recálculos) vía scheduler | `order-workflow.service`, `supabase.functions` | Requiere cola o cron existente. |
| Notificaciones | `notifications.dispatch` | Enviar mensajes a Slack/Email/SMS | `share.service`, conector externo (a definir) | Necesita decidir proveedor y plantillas. |
| Notificaciones | `notifications.subscribe` | Administrar destinos y triggers | `public-access.service`, `order-security.service` | Persistir en Supabase tabla `notification_channels`. |
| Analítica | `analytics.event_insights` | Resumen inteligente por evento | `photo-stats.service`, `order-analytics.service` | **Implementada** (`analytics_event_insights`). |
| Analítica | `analytics.historical_report` | Descargar o vincular reportes PDF/CSV | `order-export.service`, `pdf.service` | Puede devolver link firmado. |
| Tienda | `store.theme_preview` | Generar preview temático y validaciones | `gallery-theme.service`, `store-config.service` | **Implementada** (`store_theme_preview`); evaluar cache para snapshots. |
| Automatización | `workflows.run_playbook` | Ejecutar secuencias multi-tool (p.ej. onboarding evento) | Orquestador MCP, `folder-publish.service`, `store-initialization.service` | Usa intents compuestos y reintentos. |
| Automatización | `qr.batch_status` | Revisar lotes QR y errores | `qr-batch-processing.service`, `qr-analytics.service` | **Implementada** (`qr_batch_status`), monitorea actividad y errores. |

## Flujo de intents y orquestación

1. **Ingesta**: El mensaje saliente del modelo se procesa en `dispatcher`. Si no
   declara `tool`, pasa por el clasificador.
2. **Clasificación**: Se calculan embeddings (pgvector) contra catálogo de
   intents y se aplican reglas (regex/cues). Se obtiene `intentId` + score.
3. **Resolución**: El `IntentRouter` consulta `ToolRegistry` (mapa `intentId`
   → tool o playbook). Puede devolver múltiples llamadas secuenciales.
4. **Ejecución**: Se ejecuta cada tool con `context` enriquecido (memoria,
   parámetros por defecto, metadata del usuario). Se soporta cancelación vía
   `AbortSignal` y reintentos exponenciales.
5. **Respuesta**: El `ResponseBuilder` consolida texto + `_meta` estructurada,
   adjunta acciones recomendadas y actualiza la memoria.

## Gestión de contexto conversacional

- **Memoria de sesión** (temporal): estructura in-memory asociada a
  `sessionId`, con ventana deslizante (10-15 turnos) almacenada en Redis o en un
  `Map` local durante la sesión.
- **Historial persistente** (Supabase): tabla `mcp_conversations` con mensajes,
  tool calls, scores y etiquetas. Sirve para analítica y reentrenamiento.
- **Contexto expandido** (snapshots): registros agregados por canal (chat web,
  notificaciones, automatizaciones) que permiten hand-off entre agentes.
- **Resumen automático**: tras n turnos, se genera un sumario con
  `analytics.event_insights` para acotar contexto futuro.

## Componentes técnicos

- `IntentClassifier`: módulo nuevo con embeddings, reglas y `OpenAI Responses`
  como fallback.
- `ToolRegistry`: catálogo tipado (dominio, permisos, dependencias).
- `PlaybookOrchestrator`: ejecuta secuencias multi-tool, maneja transacciones y
  reintentos.
- `ContextStore`: API para leer/escribir memoria de sesión e historial
  persistente.
- `NotificationHub`: wrapper unificado para Slack/Email/SMS con colas y
  observabilidad.

## Entregables de Step2

- Documento de arquitectura (este archivo) con catálogo, flujos y contexto.
- Mapa de intents → tools/playbooks, publicado como YAML (`docs/mcp-intents.yaml`).
- Esquema de tablas/colecciones para contexto conversacional en Supabase.
- Listado de dependencias técnicas y responsables para su provisión.

## Dependencias técnicas y decisiones

| Tema | Prioridad | Dueño propuesto | Estado |
| --- | --- | --- | --- |
| `pgvector` en Supabase productivo | Alta | Equipo Data | Validar activación y costos |
| Redis/Upstash para sesiones MCP | Media | Plataforma | Evaluar límites gratuitos |
| Conectores externos (Slack/Email) | Alta | Integraciones | Seleccionar proveedor/API |
| Tabla `mcp_conversations` + índices | Alta | Backend | Diseñar y migrar |
| Playbooks parametrizables | Media | Backend | Definir formato JSON/YAML |
| Operacionalizar scheduler jobs | Media | Backend | Reusar cron existente (`/api/admin/orders/scheduled-jobs`) |

## Riesgos y mitigaciones

- **Latencia en clasificación**: cache de intents frecuentes y límite de tokens
  en contexto; considerar embeddings offline por dominio.
- **Falta de `sessionId` estable**: acordar convención (`X-Session-Id` o
  `_meta.session`) y fallback a hash del usuario + timestamp.
- **Conectores externos sin owner**: bloquear la fase 3 hasta asignar equipo y
  acceso a credenciales.
- **Complejidad de playbooks**: comenzar con plantillas declarativas simples y
  escalar a motor de estado sólo si es necesario.

## Próximos pasos hacia Step3

1. Publicar `docs/mcp-intents.yaml` con taxonomy inicial (dueño: Backend).
2. Generar tickets para cada tool nueva con dependencia identificada.
3. Probar clasificador mínimo viable (embeddings + reglas) en entorno local.
4. Preparar pruebas unitarias de `IntentClassifier` y `PlaybookOrchestrator`.
