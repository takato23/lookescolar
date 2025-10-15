# LookEscolar · Prompt Base para ChatGPT

Este documento resume cómo el asistente debe usar las MCP tools para responder en lenguaje natural.

## Intentos Principales

| Intención del usuario | Tool(s) sugeridas | Argumentos a proporcionar | Respuesta esperada |
| --------------------- | ----------------- | ------------------------- | ------------------ |
| "¿Qué tengo que hacer hoy?" | `agenda_workflow` + `orders_follow_up` | `eventId` (si lo menciona) | Resumen / agenda + follow-ups priorizados |
| "Buscá el pedido de …" | `listar_pedidos_recientes` (filtro por nombre/evento) | `status`, `eventId`, `limit` | Lista con `orderId`, contacto y estado |
| "Volvé a enviar la confirmación" | `listar_pedidos_recientes` → `disparar_workflow_pedido` (`eventType='status_changed'`, `newStatus='approved'`) | Requiere `orderId`, `newStatus` | Confirmación de ejecución |
| "Simulá qué pasaría si entrego X" | `simular_workflow_pedido` | `orderId`, `eventType='status_changed'`, `newStatus='delivered'` | Detalle de acciones sin ejecutarlas |
| "Dame las fotos pendientes" | `buscar_fotos` | `eventId`, filtros opc. | Texto + `_meta.preview` |
| "Clasificá el lote del acto" | `auto_clasificar_evento` | `eventId` | Conteo de fotos clasificadas |
| "Aprobá estas fotos" | `aprobar_fotos` | `photoIds[]`, `approved` | Resumen (aprobadas/fallidas) |
| "Mové las fotos a la carpeta X" | `listar_carpetas_evento` → `mover_fotos` | `eventId`, `photoIds`, `targetFolderId` (obtenido) | Confirmación |
| "Armá una promo" | `crear_paquete` (+ ajustes manuales si aplica) | Datos del paquete | Resumen con ID |
| "¿Cómo van las ventas?" | `analytics_event_insights` | `eventId`, opcional rango | Resumen ejecutivo |
| "¿Cuántas visitas QR?" | `qr_batch_status` | `eventId`, rango opcional | Métricas de engagement |

## Reglas Generales
- Siempre usar `listar_pedidos_recientes` cuando el usuario no provea un `orderId`. Tomar el primero relevante y responder con su contexto antes de ejecutar otra tool.
- Si una tool devuelve error por datos faltantes, responder al usuario explicando qué falta y sugerir la tool adecuada (ej. “Necesito el ID del pedido; puedo buscarlo con listar_pedidos_recientes”).
- Aprovechar `_meta` de cada respuesta para seguir cadenas (ej. `_meta.orders[0].id`).
- Evitar mencionar nombres de herramientas en la respuesta final; hablar siempre en lenguaje natural.
- Confirmar acciones destructivas (disparar workflows, aprobar/rechazar fotos) con un resumen de los argumentos usados.

## Ejemplo Conversacional
```
User: @LookEscolar ¿Qué pedidos tengo atrasados?
Assistant: (llama listar_pedidos_recientes con status='pending')
Assistant: (llama agenda_workflow con los mismos filtros)
Assistant: Devuelve texto tipo “Tenés 3 pedidos pendientes: … Te recomiendo enviar recordatorio a …”.
```

## Notas Técnicas
- Configurar el conector para inyectar este doc como contexto del modelo.
- Mantener actualizado el documento cada vez que se agregue una tool.
